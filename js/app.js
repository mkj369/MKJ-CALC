/* ============================================================
   MKJ CALC — app controller v2
   Router (home → modes → calculator) + input + evaluation
   ============================================================ */
(function () {
  'use strict';

  var E = window.MKJEngine;
  var LAY = window.MKJLayouts;
  var MODES = window.MKJModes;

  var $ = function (id) { return document.getElementById(id); };

  /* ------------------------------------------------------------
     state
     ------------------------------------------------------------ */
  var state = {
    model: 'esplus',
    mode: 'calc',
    view: 'home',
    angle: 'deg',
    format: 'norm',
    complexFormat: 'rect',
    theme: 'dark',
    sound: true,
    haptic: true,
    autoFraction: true,

    expr: '',
    caret: 0,
    ans: 0,
    vars: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, M: 0 },
    shift: false,
    alpha: false,
    storeArmed: false,
    result: '0',
    isError: false,
    rawValue: null,
    sdStage: 0,
    history: [],
    histIndex: -1,
    memory: 0
  };

  var STORE_KEY = 'mkjcalc.v2';

  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        model: state.model,
        angle: state.angle,
        format: state.format,
        complexFormat: state.complexFormat,
        theme: state.theme,
        sound: state.sound,
        haptic: state.haptic,
        autoFraction: state.autoFraction,
        vars: state.vars,
        history: state.history.slice(0, 80),
        matrices: state.matrices,
        vectors: state.vectors,
        tableExpr: state.tableExpr,
        tableStart: state.tableStart,
        tableEnd: state.tableEnd,
        tableStep: state.tableStep,
        statX: state.statX, statY: state.statY,
        solveExpr: state.solveExpr
      }));
    } catch (e) { /* quota / private mode */ }
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      ['model', 'angle', 'format', 'complexFormat', 'theme'].forEach(function (k) {
        if (s[k]) state[k] = s[k];
      });
      if (typeof s.autoFraction === 'boolean') state.autoFraction = s.autoFraction;
      ['sound', 'haptic'].forEach(function (k) {
        if (typeof s[k] === 'boolean') state[k] = s[k];
      });
      if (s.vars) Object.keys(state.vars).forEach(function (k) {
        if (typeof s.vars[k] === 'number') state.vars[k] = s.vars[k];
      });
      if (Array.isArray(s.history)) state.history = s.history;
      if (state.history.length) state.histIndex = -1;
      ['matrices', 'vectors', 'tableExpr', 'tableStart', 'tableEnd', 'tableStep',
       'statX', 'statY', 'solveExpr'].forEach(function (k) {
        if (s[k] !== undefined) state[k] = s[k];
      });
      if (!LAY[state.model]) state.model = 'esplus';
    } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------
     audio + haptics
     ------------------------------------------------------------ */
  var audioCtx = null;
  function click(freq) {
    if (!state.sound) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var t = audioCtx.currentTime;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq || 820;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.045, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    } catch (e) { /* ignore */ }
  }

  function haptic(ms) {
    if (!state.haptic) return;
    if (navigator.vibrate) { try { navigator.vibrate(ms || 8); } catch (e) { /* ignore */ } }
  }

  /* ------------------------------------------------------------
     toast
     ------------------------------------------------------------ */
  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 1600);
  }

  /* ------------------------------------------------------------
     router
     ------------------------------------------------------------ */
  function show(view) {
    state.view = view;
    $('viewHome').hidden = view !== 'home';
    $('viewModes').hidden = view !== 'modes';
    $('viewCalc').hidden = view !== 'calc';
    document.body.dataset.view = view;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ------------------------------------------------------------
     model picker
     ------------------------------------------------------------ */
  var MODEL_META = {
    esplus: {
      name: '991 ES Plus',
      desc: 'Classic pad · natural display · 16 modes',
      tags: ['Classic pad', '∫ / d/dx', 'STO · RCL'],
      accent: '#ff9b3d', screen: ['#c9d8c4', '#a9bba4'],
      shape: 'classic', rows: 4, round: false
    },
    explus: {
      name: '991 EX Plus',
      desc: 'ClassWiz pad · menu keys · spreadsheet',
      tags: ['ClassWiz', 'Spreadsheet', '4×4 matrix'],
      accent: '#47b3ff', screen: ['#cfe0e6', '#b3c8d0'],
      shape: 'classwiz', rows: 4, round: false
    },
    cw: {
      name: '991 CW',
      desc: 'Flat pad · circular keys · HOME menu',
      tags: ['Circular keys', 'Math Box', '4-gradation'],
      accent: '#7de2c3', screen: ['#c4d3d0', '#a9bbb7'],
      shape: 'cw', rows: 4, round: true
    }
  };

  function buildModelCards() {
    var host = $('modelCards');
    host.innerHTML = '';
    LAY.order.forEach(function (id) {
      var meta = MODEL_META[id];
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'model-card' + (state.model === id ? ' selected' : '');
      card.style.setProperty('--mc', meta.accent);
      card.style.setProperty('--mc-screen', meta.screen[0]);
      card.style.setProperty('--mc-screen2', meta.screen[1]);

      var prev = document.createElement('div');
      prev.className = 'mc-preview shape-' + meta.shape;
      prev.innerHTML =
        '<div class="mc-brand">MKJ</div>' +
        '<div class="mc-screen"></div>' +
        '<div class="mc-pad">' +
          '<span class="mc-nav"></span>' +
        '</div>' +
        '<div class="mc-keys ' + (meta.round ? 'round' : '') + '">' +
          new Array(16).fill('<i></i>').join('') +
        '</div>';

      var body = document.createElement('div');
      body.className = 'mc-body';
      body.innerHTML =
        '<div class="mc-name">MKJ · ' + meta.name + '</div>' +
        '<div class="mc-desc">' + meta.desc + '</div>' +
        '<div class="mc-tags">' + meta.tags.map(function (t) {
          return '<span class="mc-tag">' + t + '</span>';
        }).join('') + '</div>';

      var go = document.createElement('div');
      go.className = 'mc-go';
      go.textContent = '›';

      card.appendChild(prev);
      card.appendChild(body);
      card.appendChild(go);
      card.addEventListener('click', function () {
        state.model = id;
        saveState();
        click(680);
        buildModelCards();
        enterModes();
      });
      host.appendChild(card);
    });
  }

  /* ------------------------------------------------------------
     mode grid
     ------------------------------------------------------------ */
  function buildModeGrid() {
    var layout = LAY[state.model];
    var grid = $('modeGrid');
    grid.innerHTML = '';
    $('barModel').textContent = layout.plate;
    document.body.dataset.model = state.model;

    MODES.order.forEach(function (id) {
      var m = MODES[id];
      if (!m) return;
      if (m.models && m.models.indexOf(state.model) < 0) return;
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'mode-card';
      card.style.setProperty('--mcc', m.color);
      card.innerHTML =
        '<div class="mode-icon">' + m.icon + '</div>' +
        '<div class="mode-name">' + m.name + '</div>' +
        '<div class="mode-desc">' + m.desc + '</div>';
      card.addEventListener('click', function () {
        click(700);
        openMode(id);
      });
      grid.appendChild(card);
    });
  }

  function enterModes() {
    buildModeGrid();
    show('modes');
  }

  /* ------------------------------------------------------------
     keypad
     ------------------------------------------------------------ */
  function buildCompactKeypad() {
    var wrap = document.createElement('div');
    wrap.className = 'compact-pad';
    var bar = document.createElement('div');
    bar.className = 'compact-actions';
    [
      ['AC', 'ac', 'ac'], ['DEL', 'del', 'del'], ['=', 'equals', 'enter']
    ].forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ck ' + item[2];
      b.textContent = item[0];
      b.addEventListener('click', function () {
        click(700); haptic(8);
        runCommand(item[1]);
      });
      bar.appendChild(b);
    });
    wrap.appendChild(bar);

    var pad = document.createElement('div');
    pad.className = 'compact-keys';
    ['7', '8', '9', '×', '4', '5', '6', '÷', '1', '2', '3', '+', '0', '.', '(', '−']
      .forEach(function (label) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ck';
        b.textContent = label;
        b.addEventListener('click', function () {
          click(840); haptic(8);
          insert(label === '×' ? '*' : label === '÷' ? '/' : label === '−' ? '-' : label);
        });
        pad.appendChild(b);
      });
    wrap.appendChild(pad);
    return wrap;
  }

  /* build one key button */
  function makeKey(key) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'key ' + (key.c || '');
    if (key.shape) b.classList.add('shape-' + key.shape);
    if (key.span > 1) b.classList.add(key.span === 2 ? 'wide' : 'wide3');

    if (key.s) {
      var sh = document.createElement('span');
      sh.className = 'k-shift';
      sh.textContent = key.s;
      b.appendChild(sh);
    }
    if (key.a) {
      var al = document.createElement('span');
      al.className = 'k-alpha';
      al.textContent = key.a;
      b.appendChild(al);
    }
    var lab = document.createElement('span');
    lab.className = 'k-label ' + (key.sm || '');
    lab.textContent = key.l;
    b.appendChild(lab);

    b.addEventListener('click', function (ev) {
      ev.preventDefault();
      pressKey(key);
      b.classList.add('flashkey');
      setTimeout(function () { b.classList.remove('flashkey'); }, 260);
    });
    return b;
  }

  /* navigation pad: ▲ ◀ ▶ ▼ around a round centre */
  function makeNavPad() {
    var pad = document.createElement('div');
    pad.className = 'navpad';
    var spec = [
      ['', 'nav-spacer nav-a'], ['▲', 'nav-up'], ['', 'nav-spacer nav-b'],
      ['◀', 'nav-left'], ['', 'nav-centre'], ['▶', 'nav-right'],
      ['', 'nav-spacer nav-c'], ['▼', 'nav-down'], ['', 'nav-spacer nav-d']
    ];
    spec.forEach(function (item) {
      if (item[0] === '') {
        var sp = document.createElement('span');
        sp.className = item[1];
        pad.appendChild(sp);
        return;
      }
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'nav-key ' + item[1];
      b.textContent = item[0];
      var cmd = item[1] === 'nav-up' ? 'up' : item[1] === 'nav-down' ? 'down'
              : item[1] === 'nav-left' ? 'left' : 'right';
      b.addEventListener('click', function () {
        click(640); haptic(6);
        runCommand(cmd);
      });
      pad.appendChild(b);
    });
    var centre = pad.querySelector('.nav-centre');
    centre.addEventListener('click', function () { click(700); evaluateCurrent(); });
    return pad;
  }

  function renderKeypad() {
    renderKeypadInto($('keypad'), true);
  }

  function renderKeypadInto(pad, withDevice) {
    var layout = LAY[state.model];
    pad.innerHTML = '';
    if (pad.id === 'keypad') pad.classList.toggle('cols-6', layout.cols === 6);

    /* ---- upper cluster: SHIFT / ALPHA · nav pad · MENU · ON ---- */
    if (withDevice) {
      var cluster = document.createElement('div');
      cluster.className = 'key-cluster';

      var left = document.createElement('div');
      left.className = 'cluster-left';
      left.appendChild(makeKey(layout.top[0]));
      left.appendChild(makeKey(layout.top[1]));
      cluster.appendChild(left);

      cluster.appendChild(makeNavPad());

      var right = document.createElement('div');
      right.className = 'cluster-right';
      var menuKey = layout.top[3];
      var onKey = layout.top[4];
      menuKey.shape = menuKey.shape || 'round';
      onKey.shape = onKey.shape || 'round';
      right.appendChild(makeKey(menuKey));
      right.appendChild(makeKey(onKey));
      cluster.appendChild(right);

      pad.appendChild(cluster);
    }

    /* ---- main rows ---- */
    layout.rows.forEach(function (row) {
      row.forEach(function (key) {
        pad.appendChild(makeKey(key));
      });
    });

    document.body.classList.toggle('shift-on', state.shift);
    document.body.classList.toggle('alpha-on', state.alpha);
    document.body.dataset.shape = layout.shape || 'classic';
  }

  /* press a key, honouring SHIFT / ALPHA modifiers */
  function pressKey(key) {
    click(key.act === 'cmd' ? 620 : 840);
    haptic(8);

    if (key.act === 'cmd' && key.v === 'shift') {
      state.shift = !state.shift;
      state.alpha = false;
      renderScreen(); renderKeypad();
      return;
    }
    if (key.act === 'cmd' && key.v === 'alpha') {
      state.alpha = !state.alpha;
      state.shift = false;
      renderScreen(); renderKeypad();
      return;
    }
    if (state.shift && key.s) {
      state.shift = false;
      if (key.sv) {
        if (isCmd(key.sv)) runCommand(key.sv);
        else insert(key.sv);
      } else {
        toast(key.s + ' has no function on this model');
      }
      renderKeypad();
      return;
    }
    if (state.alpha && key.a) {
      state.alpha = false;
      insert(key.av || key.a);
      renderKeypad();
      return;
    }
    if (state.shift || state.alpha) {
      state.shift = false;
      state.alpha = false;
      renderKeypad();
    }

    if (key.act === 'cmd') runCommand(key.v);
    else insert(key.v);
  }

  var COMMANDS = {
    off: 1, on: 1, ac: 1, del: 1, equals: 1, sd: 1, left: 1, right: 1, up: 1, down: 1,
    mode: 1, home: 1, settings: 1, tools: 1, catalog: 1, variable: 1, ans: 1,
    mplus: 1, mminus: 1, sto: 1, rcl: 1, eng: 1, drg: 1, calc: 1, solve: 1, rand: 1,
    shift: 1, alpha: 1
  };
  function isCmd(v) { return typeof v === 'string' && COMMANDS[v] === 1; }

  /* ------------------------------------------------------------
     expression input
     ------------------------------------------------------------ */
  function insert(text) {
    if (text == null) return;
    if (state.storeArmed) {
      if (/^[A-FM]$/.test(text)) { storeTo(text); return; }
      state.storeArmed = false;
    }
    state.expr = state.expr.slice(0, state.caret) + text + state.expr.slice(state.caret);
    state.caret += text.length;
    state.isError = false;
    state.sdStage = 0;
    renderScreen();
  }

  function backspace() {
    if (!state.caret) return;
    var left = state.expr.slice(0, state.caret);
    var tokens = [
      'sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(', 'sinh⁻¹(', 'cosh⁻¹(', 'tanh⁻¹(',
      'sin(', 'cos(', 'tan(', 'sinh(', 'cosh(', 'tanh(',
      'log(', 'ln(', 'exp(', 'Abs(', 'Conjg(', 'Arg(', 'Re(', 'Im(',
      'nCr(', 'nPr(', 'gcd(', 'lcm(', 'Pol(', 'Rec(', 'randInt(',
      'round(', 'floor(', 'ceil(', 'frac(', 'sign(', 'min(', 'max(',
      '∑(', 'Π(', '∫(', 'd/dx(', '√(', '∛(', '×10^(', '^(1/', '^(-1)'
    ];
    var cut = 1;
    for (var i = 0; i < tokens.length; i++) {
      if (left.slice(-tokens[i].length) === tokens[i]) { cut = tokens[i].length; break; }
    }
    state.expr = state.expr.slice(0, state.caret - cut) + state.expr.slice(state.caret);
    state.caret -= cut;
    state.isError = false;
    state.sdStage = 0;
    renderScreen();
  }

  function clearAll() {
    state.expr = '';
    state.caret = 0;
    state.result = '0';
    state.altText = '';
    state.isError = false;
    state.rawValue = null;
    state.sdStage = 0;
    state.shift = false;
    state.alpha = false;
    state.storeArmed = false;
    state.histIndex = -1;
    renderScreen(); renderKeypad();
  }

  /* ------------------------------------------------------------
     screen rendering
     ------------------------------------------------------------ */
  function renderScreen() {
    var layout = LAY[state.model];
    $('plateModel').textContent = layout.model || layout.plate;
    $('plateSeries').textContent = layout.series || '';
    $('plateSub').textContent = layout.sub;
    $('footModel').textContent = layout.foot;
    $('calcSubtitle').textContent = layout.plate;
    $('calcTitle').textContent = (MODES[state.mode] || MODES.calc).name;

    var before = state.expr.slice(0, state.caret);
    var after = state.expr.slice(state.caret);
    var exprEl = $('expr');
    exprEl.innerHTML = '';
    var s1 = document.createElement('span');
    s1.textContent = before;
    var c = document.createElement('span');
    c.className = 'caret-char';
    var nextChar = after.charAt(0);
    c.textContent = nextChar || ' ';
    if (nextChar) c.classList.add('caret-on');
    var s2 = document.createElement('span');
    s2.textContent = after.slice(1);
    exprEl.appendChild(s1); exprEl.appendChild(c); exprEl.appendChild(s2);

    var res = $('result');
    res.textContent = state.result;
    var res2 = $('result2');
    if (res2) res2.textContent = state.altText || '';
    res.className = 'result' +
      (state.isError ? ' error' : '') +
      (state.result.length > 22 ? ' tiny' : state.result.length > 13 ? ' small' : '');

    $('modeLabel').textContent = modeTag(state.mode);
    $('angleLabel').textContent = state.angle === 'deg' ? 'D' : state.angle === 'rad' ? 'R' : 'G';

    var flags = {
      S: state.shift,
      A: state.alpha,
      M: state.vars.M !== 0,
      STO: state.storeArmed,
      i: state.complexFormat === 'polar' && (state.mode === 'complex' || state.mode === 'calc'),
      R: state.angle === 'rad'
    };
    Array.prototype.forEach.call($('flags').children, function (f) {
      f.classList.toggle('on', !!flags[f.dataset.flag]);
    });

    var hint = '';
    if (state.isError) hint = 'CHECK INPUT';
    else if (state.storeArmed) hint = 'STO ▸ PICK A VARIABLE';
    else if (state.shift) hint = 'SHIFT ACTIVE';
    else if (state.alpha) hint = 'ALPHA ACTIVE';
    else if (state.sdStage === 1) hint = 'FRACTION VIEW';
    else if (state.sdStage === 2) hint = 'π VIEW';
    else if (state.mode !== 'calc') hint = (MODES[state.mode] || {}).name || '';
    else hint = state.expr ? 'PRESS = TO EVALUATE' : 'PRESS A KEY TO START';
    $('screenHint').textContent = hint;
  }

  function modeTag(mode) {
    return {
      calc: 'COMP', complex: 'CMPLX', stat: 'STAT', matrix: 'MATRIX',
      vector: 'VECTOR', equation: 'EQN', basen: 'BASE', ratio: 'RATIO',
      table: 'TABLE', solve: 'SOLVE', verify: 'VERIFY', constants: 'CONST'
    }[mode] || 'COMP';
  }

  /* ------------------------------------------------------------
     evaluation
     ------------------------------------------------------------ */
  function evalCtx(extraVars) {
    var vars = Object.assign({}, state.vars, { M: state.memory }, extraVars || {});
    return {
      angle: state.angle,
      ans: state.ans,
      vars: vars,
      complex: complexMode(),
      tol: 1e-10
    };
  }

  function complexMode() {
    return state.mode === 'complex' || state.mode === 'equation';
  }

  function displayFormat() {
    return {
      format: state.format,
      complex: complexMode(),
      complexFormat: state.complexFormat,
      angle: state.angle
    };
  }

  function evaluateCurrent() {
    var src = state.expr.trim();
    if (!src) {
      state.result = E.formatValue(state.ans, displayFormat());
      renderScreen();
      return;
    }
    try {
      var value = E.evaluate(src, evalCtx());
      if (E.C.isPair(value)) {
        state.result = E.formatValue(value, displayFormat());
        state.rawValue = value;
      } else {
        var z = E.C.to(value);
        if (Math.abs(z.im) < 1e-12 && state.format === 'norm') {
          var fr = E.fractionOf(z.re);
          state._fraction = fr;
        } else {
          state._fraction = null;
        }
        state.rawValue = value;
        state.ans = Math.abs(z.im) < 1e-12 ? z.re : E.C.abs(value);
        state.result = E.formatValue(value, displayFormat());
        /* norm mode: show a clean fraction automatically (like S⇔D default) */
        if (state.format === 'norm' && Math.abs(z.im) < 1e-12 && state._fraction && state.autoFraction !== false) {
          state.result = E.fractionText(state._fraction);
          state.sdStage = 1;
        }
      }
      /* alternative form shown on the second line (textbook feel) */
      state.altText = '';
      if (!E.C.isPair(state.rawValue)) {
        var alt = E.C.to(state.rawValue);
        if (Math.abs(alt.im) < 1e-12) {
          var pf = E.piFraction(alt.re);
          if (pf && state.result.indexOf(pf) < 0) state.altText = pf;
          else if (state._fraction && state.result.indexOf(E.fractionText(state._fraction)) < 0) {
            state.altText = E.fractionText(state._fraction);
          }
        }
      }
      state.isError = false;
      state.sdStage = 0;
      $('result').classList.remove('flash');
      void $('result').offsetWidth;
      $('result').classList.add('flash');

      state.history.unshift({ expr: src, result: state.result, mode: state.mode, ts: Date.now() });
      if (state.history.length > 80) state.history.pop();
      state.histIndex = -1;
      saveState();
      renderHistory();
      renderScreen();
    } catch (err) {
      state.result = (err && err.message) || 'Math ERROR';
      state.altText = '';
      state.isError = true;
      state.sdStage = 0;
      click(180);
      haptic(40);
      renderScreen();
    }
  }

  /* S⇔D cycling: decimal → fraction → π → decimal */
  function toggleSD() {
    if (state.isError) { evaluateCurrent(); return; }
    if (state.rawValue == null) {
      /* nothing evaluated yet: evaluate first if there is an expression */
      if (state.expr.trim()) evaluateCurrent();
      return;
    }
    var v = state.rawValue;
    if (E.C.isPair(v)) { toast('Result is a pair'); return; }
    var z = E.C.to(v);
    if (Math.abs(z.im) > 1e-12) {
      state.complexFormat = state.complexFormat === 'rect' ? 'polar' : 'rect';
      $('selComplex').value = state.complexFormat;
      state.result = E.formatValue(v, displayFormat());
      renderScreen(); saveState();
      return;
    }
    var x = z.re;
    var fr = E.fractionOf(x);
    var pi = E.piFraction(x);
    var stages = [];
    stages.push(E.formatValue(x, { format: 'norm', complex: true }));
    if (fr) stages.push(E.fractionText(fr));
    if (pi && stages.indexOf(pi) < 0) stages.push(pi);
    if (stages.length === 1) { toast('No alternative form'); return; }
    state.sdStage = (state.sdStage + 1) % stages.length;
    state.result = stages[state.sdStage];
    state.altText = stages.filter(function (t, i) { return i !== state.sdStage; }).slice(0, 1).join('') || '';
    if (state.sdStage > 0 && fr && state.result === E.fractionText(fr)) state._fraction = fr;
    renderScreen();
  }

  /* ------------------------------------------------------------
     commands
     ------------------------------------------------------------ */
  function runCommand(cmd) {
    switch (cmd) {
      case 'off': screenOff(); break;
      case 'on': clearAll(); break;
      case 'ac': clearAll(); break;
      case 'del': backspace(); break;
      case 'equals': evaluateCurrent(); break;
      case 'sd': toggleSD(); break;
      case 'left': state.caret = Math.max(0, state.caret - 1); renderScreen(); break;
      case 'right': state.caret = Math.min(state.expr.length, state.caret + 1); renderScreen(); break;
      case 'up': histBrowse(-1); break;
      case 'down': histBrowse(1); break;
      case 'mode': case 'home': enterModes(); break;
      case 'settings': case 'tools': openSettings(); break;
      case 'catalog': openCatalog(); break;
      case 'variable': openVars('insert'); break;
      case 'ans': insert('Ans'); break;
      case 'mplus':
        state.memory += state.ans;
        state.vars.M = state.memory;
        state.result = E.formatValue(state.memory, displayFormat());
        saveState(); renderScreen();
        toast('M = ' + state.result);
        break;
      case 'mminus':
        state.memory -= state.ans;
        state.vars.M = state.memory;
        state.result = E.formatValue(state.memory, displayFormat());
        saveState(); renderScreen();
        toast('M = ' + state.result);
        break;
      case 'sto': openVars('store'); break;
      case 'rcl': openVars('recall'); break;
      case 'eng':
        state.format = state.format === 'eng' ? 'norm' : 'eng';
        $('selFormat').value = state.format;
        if (state.rawValue != null && !E.C.isPair(state.rawValue)) {
          state.rawValue = E.C.to(state.rawValue);
          state.result = E.formatValue(state.rawValue, displayFormat());
        }
        saveState(); renderScreen();
        toast('Format: ' + state.format.toUpperCase());
        break;
      case 'drg':
        state.angle = state.angle === 'deg' ? 'rad' : state.angle === 'rad' ? 'grad' : 'deg';
        $('selAngle').value = state.angle;
        saveState(); renderScreen();
        toast('Angle: ' + state.angle.toUpperCase());
        break;
      case 'calc': openCalcDialog(); break;
      case 'solve': openMode('solve'); break;
      case 'rand': insert('rand'); break;
      default: /* unknown command */ break;
    }
  }

  function screenOff() {
    state.result = '';
    state.expr = '';
    state.caret = 0;
    renderScreen();
    $('screen').classList.add('is-off');
    $('screenHint').textContent = '';
    var restore = function () {
      $('screen').classList.remove('is-off');
      clearAll();
      document.removeEventListener('pointerdown', restore);
    };
    document.addEventListener('pointerdown', restore);
  }

  function histBrowse(dir) {
    if (!state.history.length) return;
    if (state.histIndex === -1) state.histIndex = dir < 0 ? 0 : -1;
    else state.histIndex = Math.min(state.history.length - 1, Math.max(0, state.histIndex + dir));
    var item = state.history[state.histIndex];
    if (!item) return;
    state.expr = item.expr;
    state.caret = state.expr.length;
    state.result = item.result;
    state.isError = false;
    renderScreen();
  }

  /* ------------------------------------------------------------
     modes
     ------------------------------------------------------------ */
  var activeModeApi = null;

  function openMode(id) {
    var m = MODES[id];
    if (!m) return;
    state.mode = id;
    var ws = $('workspace');
    ws.innerHTML = '';
    activeModeApi = null;

    var panelModes = ['calc', 'complex'];
    var isPanel = panelModes.indexOf(id) >= 0;

    if (!isPanel && m.render) {
      ws.hidden = false;
      var api = makeApi();
      activeModeApi = api;
      try { m.render(ws, api); } catch (err) {
        ws.innerHTML = '<div class="mode-out is-error">' + err.message + '</div>';
      }

      /* compact keypad for mode workspaces */
      var basic = buildCompactKeypad();
      ws.appendChild(basic);

      /* expandable full keypad */
      var fullWrap = document.createElement('div');
      fullWrap.hidden = true;
      var fullPad = document.createElement('div');
      fullPad.className = 'keypad';
      fullWrap.appendChild(fullPad);
      ws.appendChild(fullWrap);
      renderKeypadInto(fullPad);

      var toggle = document.createElement('button');
      toggle.className = 'btn ghost pad-toggle';
      toggle.textContent = '⌨ Full keypad';
      toggle.addEventListener('click', function () {
        fullWrap.hidden = !fullWrap.hidden;
        toggle.textContent = fullWrap.hidden ? '⌨ Full keypad' : '⌨ Hide full keypad';
      });
      ws.appendChild(toggle);

      $('padArea').hidden = true;
    } else {
      ws.hidden = true;
      $('padArea').hidden = false;
    }

    show('calc');
    renderKeypad();
    renderScreen();
  }

  /* API handed to mode modules */
  function makeApi() {
    return {
      state: state,
      engine: E,
      toast: toast,
      insertInto: function (text) { insert(text); },
      saveState: saveState,
      calcBind: function () { /* main LCD is used */ },
      calcKey: function (cmd) { runCommand(cmd); },
      calcReformat: function () {
        if (state.rawValue != null) state.result = E.formatValue(state.rawValue, displayFormat());
        renderScreen();
      }
    };
  }

  /* ------------------------------------------------------------
     panels
     ------------------------------------------------------------ */
  var openPanelId = null;

  function openPanel(id) {
    closePanel();
    var p = $(id);
    if (!p) return;
    p.hidden = false;
    $('overlay').hidden = false;
    openPanelId = id;
  }
  function closePanel() {
    if (openPanelId) { $(openPanelId).hidden = true; openPanelId = null; }
    $('overlay').hidden = true;
  }

  function openSheet(title, bodyHtml, footHtml) {
    $('sheetTitle').textContent = title;
    $('sheetBody').innerHTML = bodyHtml;
    var foot = $('sheetFoot');
    foot.innerHTML = footHtml || '';
    foot.hidden = !footHtml;
    openPanel('sheet');
    return $('sheetBody');
  }

  /* settings */
  function openSettings() {
    $('selAngle').value = state.angle;
    $('selFormat').value = state.format;
    $('selComplex').value = state.complexFormat;
    $('selTheme').value = state.theme;
    $('selSound').value = state.sound ? 'on' : 'off';
    $('selHaptic').value = state.haptic ? 'on' : 'off';
    $('selAutoFrac').value = state.autoFraction ? 'on' : 'off';
    openPanel('panelSettings');
  }

  /* catalog */
  function openCatalog() {
    var body = $('catalogBody');
    body.innerHTML = '';
    LAY.catalog.forEach(function (group) {
      var g = document.createElement('div');
      g.className = 'cat-group';
      var h = document.createElement('h4');
      h.textContent = group.group;
      g.appendChild(h);
      var items = document.createElement('div');
      items.className = 'cat-items';
      group.items.forEach(function (item) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'cat-item';
        b.textContent = item;
        b.addEventListener('click', function () {
          insert(item);
          closePanel();
        });
        items.appendChild(b);
      });
      g.appendChild(items);
      body.appendChild(g);
    });
    openPanel('panelCatalog');
  }

  /* variables */
  function openVars(mode) {
    state.varsMode = mode;
    $('varsTitle').textContent =
      mode === 'store' ? 'Store answer in a variable' :
      mode === 'recall' ? 'Recall a variable' : 'Insert a variable';
    $('varsNote').textContent =
      mode === 'store' ? 'Ans এর মান ভেরিয়েবলে রাখা হবে।' :
      mode === 'recall' ? 'ভেরিয়েবলের মান রেজাল্ট লাইনে বসবে।' :
      'এক্সপ্রেশনে ভেরিয়েবল বসাবে।';
    renderVars();
    openPanel('panelVars');
  }

  function renderVars() {
    var grid = $('varsGrid');
    grid.innerHTML = '';
    Object.keys(state.vars).forEach(function (name) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'var-btn';
      var t = document.createElement('b');
      t.textContent = name;
      var v = document.createElement('span');
      var val = name === 'M' ? state.memory : state.vars[name];
      v.textContent = E.formatValue(val, { format: 'norm' });
      b.appendChild(t); b.appendChild(v);
      b.addEventListener('click', function () {
        if (state.varsMode === 'store') {
          state.vars[name] = state.ans;
          if (name === 'M') state.memory = state.ans;
          toast('Ans → ' + name);
          saveState();
          closePanel();
        } else if (state.varsMode === 'recall') {
          state.ans = val;
          state.rawValue = val;
          state.result = E.formatValue(val, displayFormat());
          state.isError = false;
          renderScreen();
          toast(name + ' = ' + state.result);
          closePanel();
        } else {
          insert(name);
          closePanel();
        }
      });
      grid.appendChild(b);
    });
  }

  /* store via keypad */
  function storeTo(name) {
    state.vars[name] = state.ans;
    if (name === 'M') state.memory = state.ans;
    state.storeArmed = false;
    state.result = E.formatValue(state.ans, displayFormat());
    saveState();
    renderScreen();
    toast('Ans → ' + name);
  }

  /* history */
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
      d.innerHTML = '<div class="hist-expr"></div><div class="hist-res"></div>';
      d.querySelector('.hist-expr').textContent = item.expr;
      d.querySelector('.hist-res').textContent = item.result;
      d.addEventListener('click', function () {
        state.expr = item.expr;
        state.caret = state.expr.length;
        state.result = item.result;
        state.isError = false;
        if (item.mode && MODES[item.mode] && item.mode !== state.mode) openMode(item.mode);
        closePanel();
        renderScreen();
      });
      list.appendChild(d);
    });
  }

  /* CALC — evaluate with temporary variable values */
  function variablesInExpression(expr) {
    var found = [];
    var re = /(?:^|[^A-Za-z])([A-FM])(?![A-Za-z])/g;
    var m;
    while ((m = re.exec(expr))) {
      if (found.indexOf(m[1]) < 0) found.push(m[1]);
    }
    return found;
  }

  function openCalcDialog() {
    var names = variablesInExpression(state.expr);
    if (!names.length) { evaluateCurrent(); return; }
    var body = $('calcVarsBody');
    body.innerHTML = '';
    var inputs = {};
    names.forEach(function (name) {
      var wrap = document.createElement('label');
      wrap.className = 'field';
      wrap.innerHTML = '<span>' + name + '</span>';
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.inputMode = 'decimal';
      inp.value = String(state.vars[name]);
      inp.style.fontFamily = 'var(--font-num)';
      inputs[name] = inp;
      wrap.appendChild(inp);
      body.appendChild(wrap);
    });
    var note = document.createElement('div');
    note.className = 'panel-note';
    note.textContent = 'এই মানগুলো শুধু এই হিসাবের জন্য ব্যবহার হবে।';
    body.appendChild(note);
    openPanel('panelCalc');

    $('calcRun').onclick = function () {
      var overrides = {};
      Object.keys(inputs).forEach(function (n) {
        try {
          var v = E.evaluate(inputs[n].value || '0', { angle: state.angle, vars: {} });
          overrides[n] = E.C.isC(v) ? v.re : v;
        } catch (e) { overrides[n] = 0; }
      });
      closePanel();
      substituteAndEvaluate(overrides);
    };
  }

  function substituteAndEvaluate(overrides) {
    try {
      var val = E.evaluate(state.expr, evalCtx(overrides));
      state.rawValue = val;
      state.result = E.formatValue(val, displayFormat());
      state.isError = false;
      var z = E.C.to(val);
      if (Math.abs(z.im) < 1e-12) { state.ans = z.re; state._fraction = E.fractionOf(z.re); }
      state.sdStage = 0;
      state.history.unshift({ expr: state.expr, result: state.result, mode: state.mode, ts: Date.now() });
      saveState(); renderHistory(); renderScreen();
    } catch (e) {
      state.result = e.message;
      state.isError = true;
      renderScreen();
    }
  }

  /* ------------------------------------------------------------
     physical keyboard
     ------------------------------------------------------------ */
  function onKeyDown(ev) {
    var tag = (ev.target && ev.target.tagName) || '';
    if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (state.view !== 'calc') {
      if (ev.key === 'Escape' && openPanelId) return;
      return;
    }
    var k = ev.key;

    if (/^[0-9.]$/.test(k)) { insert(k); ev.preventDefault(); return; }
    if ('+-*/^()%'.indexOf(k) >= 0) { insert(k); ev.preventDefault(); return; }

    switch (k) {
      case 'Enter': case '=':
        if (ev.shiftKey) toggleSD(); else evaluateCurrent();
        ev.preventDefault(); return;
      case 'Backspace': backspace(); ev.preventDefault(); return;
      case 'Escape': if (openPanelId) closePanel(); else clearAll(); ev.preventDefault(); return;
      case 'Delete': clearAll(); ev.preventDefault(); return;
      case 'ArrowLeft': state.caret = Math.max(0, state.caret - 1); renderScreen(); ev.preventDefault(); return;
      case 'ArrowRight': state.caret = Math.min(state.expr.length, state.caret + 1); renderScreen(); ev.preventDefault(); return;
      case 'ArrowUp': histBrowse(-1); ev.preventDefault(); return;
      case 'ArrowDown': histBrowse(1); ev.preventDefault(); return;
      default: break;
    }
    if (k === 's' || k === 'S') { state.shift = !state.shift; state.alpha = false; renderKeypad(); renderScreen(); ev.preventDefault(); return; }
    if (k === 'a' || k === 'A') { state.alpha = !state.alpha; state.shift = false; renderKeypad(); renderScreen(); ev.preventDefault(); return; }
    if (k === 'p') { insert('π'); ev.preventDefault(); return; }
    if (k === 'e') { insert('e'); ev.preventDefault(); return; }
    if (k === 'i') { insert('i'); ev.preventDefault(); return; }
    if (k === 'x' || k === 'y') { insert(k); ev.preventDefault(); return; }
    if (/^[A-FM]$/.test(k)) { insert(k); ev.preventDefault(); return; }
    if (k === ',') { insert(','); ev.preventDefault(); return; }
  }

  /* ------------------------------------------------------------
     wiring
     ------------------------------------------------------------ */
  function wire() {
    $('backToHome').addEventListener('click', function () { buildModelCards(); show('home'); });
    $('backToModes').addEventListener('click', enterModes);
    $('openSettings').addEventListener('click', openSettings);
    $('openSettings2').addEventListener('click', openSettings);
    $('openHistory2').addEventListener('click', function () { renderHistory(); openPanel('panelHistory'); });
    $('openVars2').addEventListener('click', function () { openVars('insert'); });
    $('openHelp2').addEventListener('click', function () { openPanel('panelHelp'); });

    $('overlay').addEventListener('click', closePanel);
    Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (b) {
      b.addEventListener('click', closePanel);
    });

    $('selAngle').addEventListener('change', function (e) {
      state.angle = e.target.value; saveState(); renderScreen();
    });
    $('selFormat').addEventListener('change', function (e) {
      state.format = e.target.value; saveState();
      if (state.rawValue != null) state.result = E.formatValue(state.rawValue, displayFormat());
      renderScreen();
    });
    $('selComplex').addEventListener('change', function (e) {
      state.complexFormat = e.target.value; saveState();
      if (state.rawValue != null) state.result = E.formatValue(state.rawValue, displayFormat());
      renderScreen();
    });
    $('selTheme').addEventListener('change', function (e) {
      state.theme = e.target.value;
      document.body.dataset.theme = state.theme;
      saveState();
    });
    $('selSound').addEventListener('change', function (e) {
      state.sound = e.target.value === 'on';
      saveState();
      if (state.sound) click(820);
    });
    $('selAutoFrac').addEventListener('change', function (e) {
      state.autoFraction = e.target.value === 'on';
      saveState();
      if (state.rawValue != null) {
        var z = E.C.to(state.rawValue);
        state._fraction = Math.abs(z.im) < 1e-12 ? E.fractionOf(z.re) : null;
        state.result = E.formatValue(state.rawValue, displayFormat());
        if (state.autoFraction && state._fraction) { state.result = E.fractionText(state._fraction); state.sdStage = 1; }
      }
      renderScreen();
    });
    $('selHaptic').addEventListener('change', function (e) {
      state.haptic = e.target.value === 'on';
      saveState();
    });
    $('clearHistory').addEventListener('click', function () {
      state.history = [];
      saveState();
      renderHistory();
      toast('History cleared');
    });

    document.addEventListener('keydown', onKeyDown);
  }

  /* ------------------------------------------------------------
     boot
     ------------------------------------------------------------ */
  function boot() {
    loadState();
    document.body.dataset.model = state.model;
    document.body.dataset.theme = state.theme;
    buildModelCards();
    buildModeGrid();
    wire();
    renderKeypad();
    renderScreen();
    renderHistory();
    show('home');
  }

  window.MKJApp = {
    state: state,
    keys: function () {
      var layout = LAY[state.model];
      return layout.top.concat.apply(layout.top, layout.rows);
    },
    press: function (label) {
      var all = window.MKJApp.keys();
      var key = all.filter(function (k) { return k.l === label; })[0];
      if (key) pressKey(key);
      return key;
    },
    openMode: openMode,
    evaluate: evaluateCurrent
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
