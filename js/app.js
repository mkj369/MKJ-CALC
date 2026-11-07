/* ============================================================
   MKJ CALC — app controller
   ============================================================ */
(function () {
  'use strict';

  var E = window.MKJEngine;
  var L = window.MKJLayouts;

  /* ---------------- state ---------------- */
  var state = {
    model: 'esplus',
    theme: 'dark',
    angle: 'deg',
    format: 'norm',
    sound: true,
    expr: '',
    caret: 0,
    ans: 0,
    vars: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, M: 0 },
    shift: false,
    alpha: false,
    storeArmed: false,
    varsMode: 'recall',
    result: '0',
    isError: false,
    showFraction: false,
    lastRaw: null,
    history: [],
    histIndex: -1
  };

  /* ---------------- DOM ---------------- */
  var $ = function (id) { return document.getElementById(id); };
  var elExpr = $('expr');
  var elResult = $('result');
  var elHint = $('screenHint');
  var elKeypad = $('keypad');
  var elFlags = $('flags');
  var elMode = $('modeLabel');
  var elAngle = $('angleLabel');
  var elScreen = $('screen');
  var elOverlay = $('overlay');
  var elToast = $('toast');
  var toastTimer = null;

  function toast(msg) {
    if (!elToast) return;
    elToast.textContent = msg;
    elToast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { elToast.hidden = true; }, 1400);
  }

  /* ---------------- storage ---------------- */
  var STORE_KEY = 'mkjcalc.state.v1';

  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        model: state.model,
        theme: state.theme,
        angle: state.angle,
        format: state.format,
        sound: state.sound,
        vars: state.vars,
        history: state.history.slice(0, 60)
      }));
    } catch (e) { /* ignore */ }
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s.model && L[s.model]) state.model = s.model;
      if (s.theme) state.theme = s.theme;
      if (s.angle) state.angle = s.angle;
      if (s.format) state.format = s.format;
      if (typeof s.sound === 'boolean') state.sound = s.sound;
      if (s.vars) Object.keys(state.vars).forEach(function (key) {
        if (typeof s.vars[key] === 'number') state.vars[key] = s.vars[key];
      });
      if (Array.isArray(s.history)) state.history = s.history;
    } catch (e) { /* ignore */ }
  }

  /* ---------------- audio click ---------------- */
  var audioCtx = null;
  function click(freq) {
    if (!state.sound) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var t = audioCtx.currentTime;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq || 820;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.05, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t); osc.stop(t + 0.05);
    } catch (e) { /* ignore */ }
  }

  /* ---------------- rendering ---------------- */
  function renderScreen() {
    // expression with caret
    var before = state.expr.slice(0, state.caret);
    var after = state.expr.slice(state.caret);
    elExpr.innerHTML = '';
    var s1 = document.createElement('span');
    s1.textContent = before;
    var c = document.createElement('span');
    c.className = 'caret-char';
    c.textContent = after.charAt(0) || ' ';
    if (after.charAt(0)) c.classList.add('caret-on');
    var s2 = document.createElement('span');
    s2.textContent = after.slice(1);
    elExpr.appendChild(s1);
    elExpr.appendChild(c);
    elExpr.appendChild(s2);

    // result
    elResult.textContent = state.result;
    elResult.className = 'result' +
      (state.isError ? ' error' : '') +
      (state.result.length > 13 ? ' small' : '');

    elMode.textContent = state.storeArmed ? 'STO' : 'COMP';
    elAngle.textContent = state.angle === 'deg' ? 'D' : state.angle === 'rad' ? 'R' : 'G';

    // flags
    var flags = { S: state.shift, A: state.alpha, M: state.vars.M !== 0, STO: state.storeArmed, R: state.angle === 'rad' };
    Array.prototype.forEach.call(elFlags.children, function (f) {
      f.classList.toggle('on', !!flags[f.dataset.flag]);
    });

    // hint
    if (state.isError) elHint.textContent = 'PLEASE CHECK YOUR INPUT';
    else if (state.storeArmed) elHint.textContent = 'STO ▸ SELECT A VARIABLE';
    else if (state.shift) elHint.textContent = 'SHIFT ACTIVE';
    else if (state.showFraction) elHint.textContent = 'S⇔D FRACTION VIEW';
    else elHint.textContent = state.expr ? '' : 'Press a key to start';

    elScreen.classList.toggle('is-off', false);
  }

  function renderKeys() {
    var layout = L[state.model];
    document.body.dataset.model = state.model;
    document.body.dataset.theme = state.theme;

    $('plateModel').textContent = layout.plate;
    $('plateSub').textContent = layout.sub;
    $('footModel').textContent = layout.foot;

    elKeypad.className = 'keypad' + (layout.cols === 6 ? ' cols-6' : '');
    elKeypad.innerHTML = '';

    layout.keys.forEach(function (key) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'key ' + (key.c || '');
      if (key.span > 1) b.classList.add('wide');
      b.dataset.act = key.act;
      b.dataset.value = key.v;

      if (key.s) {
        var sh = document.createElement('span');
        sh.className = 'k-shift';
        sh.textContent = key.s;
        b.appendChild(sh);
      }
      var lab = document.createElement('span');
      lab.className = 'k-label ' + (key.sm || '');
      lab.textContent = key.l;
      b.appendChild(lab);

      b.addEventListener('click', function (ev) {
        ev.preventDefault();
        pressKey(key);
      });
      elKeypad.appendChild(b);
    });

    elKeypad.classList.toggle('shift-on', state.shift);
  }

  function renderModelButtons() {
    Array.prototype.forEach.call(document.querySelectorAll('.model-btn'), function (b) {
      b.classList.toggle('active', b.dataset.model === state.model);
      b.setAttribute('aria-selected', b.dataset.model === state.model ? 'true' : 'false');
    });
  }

  /* ---------------- input handling ---------------- */
  function insert(text) {
    if (state.storeArmed) {
      // typing a letter while STO is armed stores the answer
      if (/^[A-F]$/.test(text)) { storeTo(text); return; }
      state.storeArmed = false;
    }
    state.expr = state.expr.slice(0, state.caret) + text + state.expr.slice(state.caret);
    state.caret += text.length;
    state.isError = false;
    state.showFraction = false;
    renderScreen();
  }

  function backspace() {
    if (state.caret === 0) return;
    // delete multi-char tokens like 'sin(' , 'Abs(' , '^(-1)' atomically-ish
    var left = state.expr.slice(0, state.caret);
    var m = left.match(/(sin⁻¹\(|cos⁻¹\(|tan⁻¹\(|sinh⁻¹\(|cosh⁻¹\(|tanh⁻¹\(|√\(|Abs\(|sin\(|cos\(|tan\(|sinh\(|cosh\(|tanh\(|log\(|ln\(|nCr\(|nPr\(|×10\^\(|\^\(-1\)|Ans)$/);
    var cut = m ? m[1].length : 1;
    state.expr = state.expr.slice(0, state.caret - cut) + state.expr.slice(state.caret);
    state.caret -= cut;
    state.isError = false;
    state.showFraction = false;
    renderScreen();
  }

  function clearAll() {
    state.expr = '';
    state.caret = 0;
    state.result = '0';
    state.isError = false;
    state.showFraction = false;
    state.shift = false;
    state.alpha = false;
    state.storeArmed = false;
    state.histIndex = -1;
    renderScreen();
  }

  function toggleShift() {
    state.shift = !state.shift;
    state.alpha = false;
    renderScreen();
  }
  function toggleAlpha() {
    state.alpha = !state.alpha;
    state.shift = false;
    renderScreen();
  }

  /* ---------------- evaluation ---------------- */
  function compute(expr) {
    if (!expr.trim()) return null;
    var val = E.evaluate(expr, {
      angle: state.angle,
      ans: state.ans,
      vars: state.vars
    });
    return val;
  }

  function showResult(val) {
    state.lastRaw = val;
    state.ans = val;
    var text = E.formatNumber(val, { format: state.format });

    // offer fraction when it's a clean small fraction and mode is norm
    var fr = state.format === 'norm' ? E.fractionOf(val) : null;
    state._fraction = fr;
    state._decimal = text;
    state.result = text;
    state.isError = false;
    state.showFraction = false;
    elResult.classList.remove('flash');
    void elResult.offsetWidth;
    elResult.classList.add('flash');
  }

  function showError(msg) {
    state.result = msg || 'Syntax ERROR';
    state.isError = true;
    state.showFraction = false;
    renderScreen();
    click(180);
  }

  function equals() {
    if (!state.expr.trim()) {
      // pressing = on an empty screen re-shows Ans
      state.result = E.formatNumber(state.ans, { format: state.format });
      renderScreen();
      return;
    }
    try {
      var val = compute(state.expr);
      if (val === null) return;
      showResult(val);
      pushHistory(state.expr, state.result);
      state.histIndex = -1;
      // after '=', move expression to result line behaviour: keep expr
      renderScreen();
    } catch (err) {
      showError(err && err.message ? err.message : 'Math ERROR');
    }
  }

  function pushHistory(expr, result) {
    state.history.unshift({ expr: expr, result: result, model: state.model });
    if (state.history.length > 60) state.history.pop();
    saveState();
    renderHistory();
  }

  /* ---------------- S⇔D ---------------- */
  function toggleSD() {
    if (state.isError) return;
    if (state.showFraction) {
      state.result = state._decimal || state.result;
      state.showFraction = false;
    } else if (state._fraction) {
      state.result = E.formatFraction(state._fraction);
      state.showFraction = true;
    } else {
      // try converting the typed expression to a decimal / fraction
      var fr = E.fractionOf(state.ans);
      if (fr) {
        state.result = E.formatFraction(fr);
        state._fraction = fr;
        state.showFraction = true;
      } else {
        state.result = E.formatNumber(state.ans, { format: 'sci' });
        state.showFraction = false;
      }
    }
    renderScreen();
  }

  /* ---------------- store / recall ---------------- */
  function armStore() {
    state.storeArmed = true;
    state.shift = false;
    state.alpha = false;
    renderScreen();
  }

  function storeTo(name) {
    state.vars[name] = state.ans;
    state.storeArmed = false;
    state.result = E.formatNumber(state.ans, { format: state.format });
    renderScreen();
    saveState();
  }

  function recallVar(name) {
    var v = state.vars[name];
    if (state.varsMode === 'store' || state.storeArmed) {
      state.storeArmed = false;
      state.varsMode = 'recall';
      storeTo(name);
      toast('Ans → ' + name);
      closePanel();
      return;
    }
    state.ans = v;
    state.result = E.formatNumber(v, { format: state.format });
    state._fraction = E.fractionOf(v);
    state._decimal = state.result;
    state.isError = false;
    closePanel();
    renderScreen();
    toast(name + ' = ' + state.result);
  }

  function openVars(mode) {
    state.varsMode = mode;
    $('varsTitle').textContent = mode === 'store' ? 'Store to variable' : 'Recall variable';
    $('varsNote').textContent = mode === 'store'
      ? 'Tap a variable to store the current answer (Ans).'
      : 'Tap a variable to recall its value.';
    renderVars();
    openPanel('panelVars');
  }

  function renderVars() {
    var grid = $('varsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    Object.keys(state.vars).forEach(function (name) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'var-btn';
      var t = document.createElement('b');
      t.textContent = name;
      var v = document.createElement('span');
      v.textContent = E.formatNumber(state.vars[name], { format: 'norm' });
      b.appendChild(t); b.appendChild(v);
      b.addEventListener('click', function () { recallVar(name); });
      grid.appendChild(b);
    });
  }

  /* ---------------- key dispatch ---------------- */
  function pressKey(key) {
    click(key.act === 'cmd' ? 620 : 840);

    // SHIFT-prefixed behaviour for insertion keys
    var label = key.l;

    if (key.act === 'cmd') {
      runCommand(key.v);
      return;
    }

    if (state.shift && key.s) {
      var shifted = key.s;
      // shifted function that maps to a function name
      var map = {
        'x³': '³',
        '∛': '∛(',
        'x!': '!',
        '10ˣ': '×10^(',
        'eˣ': 'exp(',
        'sin⁻¹': 'sin⁻¹(',
        'cos⁻¹': 'cos⁻¹(',
        'tan⁻¹': 'tan⁻¹(',
        'sinh⁻¹': 'sinh⁻¹(',
        'nPr': 'nPr(',
        'e': 'e'
      };
      insert(map[shifted] || shifted);
      state.shift = false;
      renderScreen();
      return;
    }

    // plain insertion
    insert(key.v);
    if (state.shift) { state.shift = false; renderScreen(); }

    // if STO armed and a variable-looking key was pressed
    if (state.storeArmed && /^[A-F]$/.test(label)) {
      storeTo(label);
    }
  }

  function runCommand(cmd) {
    switch (cmd) {
      case 'shift': toggleShift(); break;
      case 'alpha': toggleAlpha(); break;
      case 'del': backspace(); break;
      case 'ac': clearAll(); break;
      case 'equals': equals(); break;
      case 'sd': toggleSD(); break;
      case 'ans': insert('Ans'); break;
      case 'mplus':
        state.vars.M += state.ans;
        state.result = E.formatNumber(state.vars.M, { format: state.format });
        renderScreen(); saveState();
        break;
      case 'rcl': openVars('recall'); break;
      case 'sto': openVars('store'); break;
      case 'setup': openPanel('panelSetup'); break;
      case 'help': openPanel('panelHelp'); break;
      case 'home': clearAll(); break;
      case 'calc':
      case 'solve':
        equals();
        break;
      case 'ncr': insert('nCr('); break;
      case 'npr': insert('nPr('); break;
      case 'gcd': insert('gcd('); break;
      case 'lcm': insert('lcm('); break;
      case 'left': state.caret = Math.max(0, state.caret - 1); renderScreen(); break;
      case 'right': state.caret = Math.min(state.expr.length, state.caret + 1); renderScreen(); break;
      case 'histPrev': browseHistory(-1); break;
      case 'histNext': browseHistory(1); break;
      case 'on': clearAll(); break;
      default: break;
    }
  }

  function browseHistory(dir) {
    if (!state.history.length) return;
    if (state.histIndex === -1 && dir < 0) state.histIndex = 0;
    else state.histIndex = Math.min(state.history.length - 1, Math.max(0, state.histIndex + dir));
    var item = state.history[state.histIndex];
    if (!item) return;
    state.expr = item.expr;
    state.caret = state.expr.length;
    state.result = item.result;
    state.isError = false;
    renderScreen();
  }

  /* ---------------- panels ---------------- */
  var openPanelId = null;

  function openPanel(id) {
    closePanel();
    var p = $(id);
    if (!p) return;
    p.hidden = false;
    elOverlay.hidden = false;
    openPanelId = id;
  }

  function closePanel() {
    if (openPanelId) {
      $(openPanelId).hidden = true;
      openPanelId = null;
    }
    elOverlay.hidden = true;
  }

  function renderHistory() {
    var list = $('historyList');
    if (!list) return;
    if (!state.history.length) {
      list.innerHTML = '<div class="hist-empty">No calculations yet.</div>';
      return;
    }
    list.innerHTML = '';
    state.history.forEach(function (item) {
      var d = document.createElement('div');
      d.className = 'hist-item';
      var e = document.createElement('div');
      e.className = 'hist-expr';
      e.textContent = item.expr;
      var r = document.createElement('div');
      r.className = 'hist-res';
      r.textContent = item.result;
      d.appendChild(e); d.appendChild(r);
      d.addEventListener('click', function () {
        state.expr = item.expr;
        state.caret = state.expr.length;
        state.result = item.result;
        state.isError = false;
        closePanel();
        renderScreen();
      });
      list.appendChild(d);
    });
  }

  /* ---------------- keyboard ---------------- */
  function onKeyDown(ev) {
    var k = ev.key;
    if (ev.target.tagName === 'SELECT' || ev.target.tagName === 'INPUT') return;

    if (/^[0-9.]$/.test(k)) { insert(k); ev.preventDefault(); return; }
    if (k === '+' || k === '-' || k === '*' || k === '/' || k === '^') { insert(k); ev.preventDefault(); return; }
    if (k === '(' || k === ')') { insert(k); ev.preventDefault(); return; }
    if (k === '%') { insert('%'); ev.preventDefault(); return; }

    if (k === 'Enter' || k === '=') {
      if (ev.shiftKey) toggleSD(); else equals();
      ev.preventDefault(); return;
    }
    if (k === 'Backspace') { backspace(); ev.preventDefault(); return; }
    if (k === 'Escape') { clearAll(); ev.preventDefault(); return; }
    if (k === 'Delete') { clearAll(); ev.preventDefault(); return; }
    if (k === 'ArrowLeft') { runCommand('left'); ev.preventDefault(); return; }
    if (k === 'ArrowRight') { runCommand('right'); ev.preventDefault(); return; }
    if (k === 'ArrowUp') { runCommand('histPrev'); ev.preventDefault(); return; }
    if (k === 'ArrowDown') { runCommand('histNext'); ev.preventDefault(); return; }
    if (k === 's' || k === 'S') { toggleShift(); ev.preventDefault(); return; }
    if (k === 'a' || k === 'A') { toggleAlpha(); ev.preventDefault(); return; }

    // letters → constants / functions typed directly
    var lower = k.toLowerCase();
    if (lower === 'p') { insert('π'); ev.preventDefault(); return; }
    if (lower === 'e') { insert('e'); ev.preventDefault(); return; }
    if (lower === 'x') { insert('x'); ev.preventDefault(); return; }
  }

  /* ---------------- setup wiring ---------------- */
  function wireSetup() {
    $('selAngle').value = state.angle;
    $('selFormat').value = state.format;
    $('selTheme').value = state.theme;
    $('selSound').value = state.sound ? 'on' : 'off';

    $('selAngle').addEventListener('change', function (e) {
      state.angle = e.target.value;
      $('btnDegRad').textContent = state.angle === 'deg' ? 'DEG' : state.angle === 'rad' ? 'RAD' : 'GRAD';
      saveState(); renderScreen();
    });
    $('selFormat').addEventListener('change', function (e) {
      state.format = e.target.value;
      if (state.lastRaw !== null) {
        state.result = E.formatNumber(state.lastRaw, { format: state.format });
        renderScreen();
      }
      saveState();
    });
    $('selTheme').addEventListener('change', function (e) {
      state.theme = e.target.value;
      document.body.dataset.theme = state.theme;
      saveState();
    });
    $('selSound').addEventListener('change', function (e) {
      state.sound = e.target.value === 'on';
      saveState();
    });

    $('btnSetup').addEventListener('click', function () { openPanel('panelSetup'); });
    $('btnHistory').addEventListener('click', function () { renderHistory(); openPanel('panelHistory'); });
    $('btnHelp').addEventListener('click', function () { openPanel('panelHelp'); });

    $('btnDegRad').addEventListener('click', function () {
      state.angle = state.angle === 'deg' ? 'rad' : state.angle === 'rad' ? 'grad' : 'deg';
      $('selAngle').value = state.angle;
      this.textContent = state.angle === 'deg' ? 'DEG' : state.angle === 'rad' ? 'RAD' : 'GRAD';
      this.classList.toggle('on', state.angle !== 'deg');
      saveState(); renderScreen();
    });

    $('clearHistory').addEventListener('click', function () {
      state.history = [];
      saveState();
      renderHistory();
    });

    elOverlay.addEventListener('click', closePanel);
    Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (b) {
      b.addEventListener('click', closePanel);
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && openPanelId) { closePanel(); ev.stopPropagation(); }
    }, true);
  }

  function wireModels() {
    Array.prototype.forEach.call(document.querySelectorAll('.model-btn'), function (b) {
      b.addEventListener('click', function () {
        state.model = b.dataset.model;
        state.shift = false;
        state.alpha = false;
        state.storeArmed = false;
        renderModelButtons();
        renderKeys();
        renderScreen();
        saveState();
        click(700);
      });
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    loadState();
    document.body.dataset.model = state.model;
    document.body.dataset.theme = state.theme;
    renderModelButtons();
    renderKeys();
    renderScreen();
    renderHistory();
    wireModels();
    wireSetup();
    document.addEventListener('keydown', onKeyDown);
    $('btnDegRad').textContent = state.angle === 'deg' ? 'DEG' : state.angle === 'rad' ? 'RAD' : 'GRAD';

    // welcome hint
    state.result = '0';
    renderScreen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // expose for debugging
  window.MKJApp = { state: state, pressKey: pressKey };
})();
