/* ============================================================
   MKJ CALC — controller v4 (fast, mobile first)
   ============================================================ */
(function () {
  'use strict';

  var E = window.MKJEngine;
  var LAY = window.MKJLayouts;
  var MODES = window.MKJModes;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------------- state ---------------- */
  var S = {
    model: 'esplus',
    mode: 'calc',
    angle: 'deg',
    format: 'norm',
    complexFormat: 'rect',
    theme: 'dark',
    sound: true,
    haptic: true,
    expr: '',
    caret: 0,
    ans: 0,
    vars: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, M: 0 },
    shift: false,
    alpha: false,
    storeArmed: false,
    result: '0',
    resultSub: '',
    isError: false,
    raw: null,
    sdStage: 0,
    frac: null,
    history: [],
    varMode: 'insert'
  };

  var KEY = 'mkjcalc.v4';

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        model: S.model, angle: S.angle, format: S.format,
        complexFormat: S.complexFormat, theme: S.theme,
        sound: S.sound, haptic: S.haptic,
        vars: S.vars, history: S.history.slice(0, 60)
      }));
    } catch (e) {}
  }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || '{}');
      ['model', 'angle', 'format', 'complexFormat', 'theme'].forEach(function (k) {
        if (d[k]) S[k] = d[k];
      });
      if (typeof d.sound === 'boolean') S.sound = d.sound;
      if (typeof d.haptic === 'boolean') S.haptic = d.haptic;
      if (d.vars) Object.keys(S.vars).forEach(function (k) {
        if (typeof d.vars[k] === 'number') S.vars[k] = d.vars[k];
      });
      if (Array.isArray(d.history)) S.history = d.history;
      if (!LAY[S.model]) S.model = 'esplus';
    } catch (e) {}
  }

  /* ---------------- sound / haptics ---------------- */
  var ac = null;
  function beep(freq) {
    if (!S.sound) return;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      var t = ac.currentTime;
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square';
      o.frequency.value = freq || 900;
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(.04, t + .004);
      g.gain.exponentialRampToValueAtTime(.0001, t + .04);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + .05);
    } catch (e) {}
  }
  function buzz() {
    if (S.haptic && navigator.vibrate) { try { navigator.vibrate(6); } catch (e) {} }
  }

  var toastT = null;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.hidden = true; }, 1500);
  }

  /* ---------------- sheets ---------------- */
  var openSheet = null;
  function show(id) {
    if (openSheet) $(openSheet).hidden = true;
    openSheet = id;
    if (!id) { $('scrim').hidden = true; return; }
    $('scrim').hidden = false;
    $(id).hidden = false;
  }
  function closeSheet() { show(null); }

  /* ---------------- LCD ---------------- */
  function fmtOpts() {
    return {
      format: S.format,
      complex: S.mode === 'complex' || S.mode === 'equation',
      complexFormat: S.complexFormat,
      angle: S.angle
    };
  }

  function paintExpr() {
    var b = S.expr.slice(0, S.caret);
    var a = S.expr.slice(S.caret);
    $('exprBefore').textContent = b;
    var c = $('caretChar');
    var ch = a.charAt(0);
    c.textContent = ch || ' ';
    c.className = 'cur' + (S.shift ? '' : '');
    $('exprAfter').textContent = a.slice(1);
    $('lcd').scrollLeft = 0;
  }

  function paint() {
    var lay = LAY[S.model];
    $('topPlate').textContent = lay.plate;
    $('plateModel').textContent = lay.model;
    $('plateSeries').textContent = lay.series;
    $('plateSub').textContent = lay.sub;
    $('topMode').textContent = (MODES[S.mode] || MODES.calc).name;
    $('lcdMode').textContent = ({
      calc: 'COMP', complex: 'CMPLX', stat: 'STAT', dist: 'DIST', matrix: 'MATRIX',
      vector: 'VECTOR', equation: 'EQN', inequality: 'INEQ', basen: 'BASE',
      ratio: 'RATIO', table: 'TABLE', spreadsheet: 'SHEET', solve: 'SOLVE',
      verify: 'VERIFY', mathbox: 'MATH', constants: 'CONST'
    })[S.mode] || 'COMP';
    $('lcdAngle').textContent = S.angle === 'deg' ? 'D' : S.angle === 'rad' ? 'R' : 'G';

    var flags = { S: S.shift, A: S.alpha, M: S.vars.M !== 0, STO: S.storeArmed, i: S.complexFormat === 'polar' };
    Array.prototype.forEach.call($('lcd').querySelectorAll('.flags span'), function (el) {
      if (flags[el.dataset.f]) el.classList.add('on'); else el.classList.remove('on');
    });

    paintExpr();
    var r = $('result');
    r.textContent = S.result;
    r.className = 'lcd-res' + (S.isError ? ' err' : '') +
      (S.result.length > 24 ? ' xs' : S.result.length > 13 ? ' sm' : '');
    $('resultSub').textContent = S.resultSub || '';
    document.body.classList.toggle('shift-on', S.shift);
    document.body.classList.toggle('alpha-on', S.alpha);
  }

  /* ---------------- keypad ---------------- */
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt !== undefined) n.textContent = txt;
    return n;
  }

  function keyEl(key) {
    var b = el('button', 'key ' + (key.c || ''));
    if (key.shape) b.classList.add(key.shape);
    if (key.s) b.classList.add('has-shift');
    if (key.span > 1) b.classList.add('wide');

    if (key.s) b.appendChild(el('span', 'sh', key.s));
    if (key.a) b.appendChild(el('span', 'al', key.a));
    b.appendChild(el('span', 'lab ' + (key.sm || ''), key.l));

    b.addEventListener('click', function (ev) {
      ev.preventDefault();
      beep(key.act === 'cmd' ? 640 : 880);
      buzz();
      press(key);
    }, { passive: false });
    return b;
  }

  function navPad() {
    var n = el('div', 'nav');
    var order = [['', ''], ['▲', 'up'], ['', ''], ['◀', 'left'], ['•', 'enter'], ['▶', 'right'], ['', ''], ['▼', 'down'], ['', '']];
    order.forEach(function (o) {
      if (!o[1]) { n.appendChild(el('span')); return; }
      var b = el('button', o[1] === 'enter' ? 'centre' : '', o[0] === '•' ? '' : o[0]);
      b.type = 'button';
      b.addEventListener('click', function () { beep(700); run(o[1]); });
      n.appendChild(b);
    });
    return n;
  }

  function buildPad() {
    var lay = LAY[S.model];
    var pad = $('pad');
    pad.innerHTML = '';

    var cluster = el('div', 'cluster');
    var l = el('div', 'cl-l');
    l.appendChild(keyEl(lay.top[0]));
    l.appendChild(keyEl(lay.top[1]));
    cluster.appendChild(l);
    cluster.appendChild(navPad());
    var r = el('div', 'cl-r');
    r.appendChild(keyEl(lay.top[3]));
    r.appendChild(keyEl(lay.top[4]));
    cluster.appendChild(r);
    pad.appendChild(cluster);

    lay.rows.forEach(function (row) {
      row.forEach(function (k) { pad.appendChild(keyEl(k)); });
    });
    document.body.dataset.model = S.model;
  }

  /* ---------------- input ---------------- */
  function insert(txt) {
    if (txt == null) return;
    if (S.storeArmed) {
      if (/^[A-FM]$/.test(txt)) { storeTo(txt); return; }
      S.storeArmed = false;
    }
    S.expr = S.expr.slice(0, S.caret) + txt + S.expr.slice(S.caret);
    S.caret += txt.length;
    S.isError = false;
    paint();
  }

  var TOKENS = ['sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(', 'sinh⁻¹(', 'cosh⁻¹(', 'tanh⁻¹(',
    'sin(', 'cos(', 'tan(', 'sinh(', 'cosh(', 'tanh(', 'log(', 'ln(', 'exp(',
    'Abs(', 'Conjg(', 'Arg(', 'Re(', 'Im(', 'nCr(', 'nPr(', 'gcd(', 'lcm(',
    'Pol(', 'Rec(', 'randInt(', 'round(', 'floor(', 'ceil(', 'frac(', 'sign(',
    'min(', 'max(', '∑(', 'Π(', '∫(', 'd/dx(', '√(', '∛(', '×10^(', '^(1/', '^(-1)'];

  function del() {
    if (!S.caret) return;
    var left = S.expr.slice(0, S.caret);
    var cut = 1;
    for (var i = 0; i < TOKENS.length; i++) {
      if (left.slice(-TOKENS[i].length) === TOKENS[i]) { cut = TOKENS[i].length; break; }
    }
    S.expr = S.expr.slice(0, S.caret - cut) + S.expr.slice(S.caret);
    S.caret -= cut;
    S.isError = false;
    paint();
  }

  function clearAll() {
    S.expr = '';
    S.caret = 0;
    S.result = '0';
    S.resultSub = '';
    S.isError = false;
    S.raw = null;
    S.frac = null;
    S.sdStage = 0;
    S.shift = false;
    S.alpha = false;
    S.storeArmed = false;
    paint();
  }

  /* ---------------- evaluate ---------------- */
  function ctx(extra) {
    var vars = {};
    Object.keys(S.vars).forEach(function (k) { vars[k] = S.vars[k]; });
    if (extra) Object.keys(extra).forEach(function (k) { vars[k] = extra[k]; });
    return {
      angle: S.angle, ans: S.ans, vars: vars,
      complex: S.mode === 'complex' || S.mode === 'equation'
    };
  }

  function showValue(v) {
    var z = E.C.isPair(v) ? null : E.C.to(v);
    S.raw = v;
    if (z && Math.abs(z.im) < 1e-12) {
      S.ans = z.re;
      S.frac = E.fractionOf(z.re);
    } else {
      S.frac = null;
    }
    if (!z) S.ans = 0;

    S.result = E.formatValue(v, fmtOpts());
    S.sdStage = 0;

    /* second line: alternative form */
    S.resultSub = '';
    if (z && Math.abs(z.im) < 1e-12) {
      var fr = S.frac ? E.fractionText(S.frac) : null;
      var pi = E.piFraction(z.re);
      var dec = E.formatValue(z.re, { format: 'norm', complex: false });
      if (fr && S.result === fr) S.resultSub = dec;
      else if (pi && S.result === pi) S.resultSub = dec;
      else if (pi) S.resultSub = pi;
      else if (fr) S.resultSub = fr;
    }
    S.isError = false;
  }

  function equals() {
    var src = S.expr.trim();
    if (!src) { S.result = E.formatValue(S.ans, fmtOpts()); paint(); return; }
    try {
      var v = E.evaluate(src, ctx());
      showValue(v);
      S.history.unshift({ e: src, r: S.result });
      if (S.history.length > 60) S.history.pop();
      save();
      beep(1100);
      paint();
    } catch (err) {
      S.result = (err && err.message) || 'Math ERROR';
      S.resultSub = '';
      S.isError = true;
      beep(200);
      paint();
    }
  }

  function toggleSD() {
    if (S.raw == null) { equals(); return; }
    if (E.C.isPair(S.raw)) { toast('Result is a pair'); return; }
    var z = E.C.to(S.raw);
    if (Math.abs(z.im) > 1e-12) {
      S.complexFormat = S.complexFormat === 'rect' ? 'polar' : 'rect';
      $('setComplex').value = S.complexFormat;
      S.result = E.formatValue(S.raw, fmtOpts());
      paint(); save();
      return;
    }
    var x = z.re;
    var forms = [E.formatValue(x, { format: 'norm', complex: false })];
    var fr = E.fractionOf(x);
    if (fr) forms.push(E.fractionText(fr));
    var pi = E.piFraction(x);
    if (pi && forms.indexOf(pi) < 0) forms.push(pi);
    if (forms.length < 2) { toast('No other form'); return; }
    S.sdStage = (S.sdStage + 1) % forms.length;
    S.result = forms[S.sdStage];
    paint();
  }

  function storeTo(name) {
    S.vars[name] = S.ans;
    S.storeArmed = false;
    S.result = E.formatValue(S.ans, fmtOpts());
    paint(); save();
    toast('Ans → ' + name);
  }

  /* ---------------- key press ---------------- */
  var CMD = {
    off: 1, on: 1, ac: 1, del: 1, equals: 1, sd: 1, left: 1, right: 1, up: 1, down: 1,
    mode: 1, home: 1, settings: 1, tools: 1, catalog: 1, variable: 1, ans: 1,
    mplus: 1, mminus: 1, sto: 1, rcl: 1, eng: 1, drg: 1, calc: 1, solve: 1, rand: 1,
    shift: 1, alpha: 1
  };

  function press(key) {
    if (key.act === 'cmd' && key.v === 'shift') {
      S.shift = !S.shift; S.alpha = false; paint(); return;
    }
    if (key.act === 'cmd' && key.v === 'alpha') {
      S.alpha = !S.alpha; S.shift = false; paint(); return;
    }
    if (S.shift && key.s) {
      S.shift = false;
      if (key.sv) { CMD[key.sv] ? run(key.sv) : insert(key.sv); }
      else toast(key.s + ' — no function');
      paint();
      return;
    }
    if (S.alpha && key.a) {
      S.alpha = false;
      insert(key.av || key.a);
      paint();
      return;
    }
    if (S.shift || S.alpha) { S.shift = false; S.alpha = false; }
    if (key.act === 'cmd') run(key.v);
    else insert(key.v);
  }

  function run(cmd) {
    switch (cmd) {
      case 'ac': case 'on': clearAll(); break;
      case 'off': clearAll(); toast('MKJ CALC'); break;
      case 'del': del(); break;
      case 'equals': equals(); break;
      case 'sd': toggleSD(); break;
      case 'ans': insert('Ans'); break;
      case 'left': S.caret = Math.max(0, S.caret - 1); paint(); break;
      case 'right': S.caret = Math.min(S.expr.length, S.caret + 1); paint(); break;
      case 'up': browse(-1); break;
      case 'down': browse(1); break;
      case 'mode': case 'home': showModes(); break;
      case 'settings': case 'tools': openMenu(); break;
      case 'catalog': openCatalog(); break;
      case 'variable': openVars('insert'); break;
      case 'sto': openVars('store'); break;
      case 'rcl': openVars('recall'); break;
      case 'mplus':
        S.vars.M += S.ans;
        S.result = E.formatValue(S.vars.M, fmtOpts());
        paint(); save(); toast('M = ' + S.result);
        break;
      case 'mminus':
        S.vars.M -= S.ans;
        S.result = E.formatValue(S.vars.M, fmtOpts());
        paint(); save(); toast('M = ' + S.result);
        break;
      case 'eng':
        S.format = S.format === 'eng' ? 'norm' : 'eng';
        $('setFormat').value = S.format;
        if (S.raw != null) S.result = E.formatValue(S.raw, fmtOpts());
        paint(); save(); toast('Format: ' + S.format.toUpperCase());
        break;
      case 'drg':
        S.angle = S.angle === 'deg' ? 'rad' : S.angle === 'rad' ? 'grad' : 'deg';
        $('setAngle').value = S.angle;
        paint(); save(); toast('Angle: ' + S.angle.toUpperCase());
        break;
      case 'calc': openCalc(); break;
      case 'solve': openMode('solve'); break;
      case 'rand': insert('rand'); break;
    }
  }

  function browse(dir) {
    if (!S.history.length) return;
    var i = Math.min(S.history.length - 1, Math.max(0, (S.histI == null ? -1 : S.histI) + dir));
    S.histI = i;
    S.expr = S.history[i].e;
    S.caret = S.expr.length;
    S.result = S.history[i].r;
    S.isError = false;
    paint();
  }

  /* ---------------- sheets content ---------------- */
  var MODEL_INFO = {
    esplus: { name: 'MKJ-991ES PLUS', desc: 'Classic pad · 417 functions', shape: '' },
    explus: { name: 'MKJ-991EX PLUS', desc: 'ClassWiz pad · 552 functions', shape: '' },
    cw: { name: 'MKJ-991CW', desc: 'Circular keys · 4-gradation LCD', shape: 'cw' }
  };

  function openModels() {
    var list = $('modelList');
    list.innerHTML = '';
    LAY.order.forEach(function (id) {
      var info = MODEL_INFO[id];
      var b = el('button', 'mrow' + (S.model === id ? ' on' : ''));
      var th = el('div', 'thumb ' + info.shape);
      th.appendChild(el('div', 't-scr'));
      var ks = el('div', 't-keys');
      for (var i = 0; i < 16; i++) ks.appendChild(el('i'));
      th.appendChild(ks);
      b.appendChild(th);
      var t = el('div');
      t.appendChild(el('b', null, info.name));
      t.appendChild(el('small', null, info.desc));
      b.appendChild(t);
      if (S.model === id) b.appendChild(el('span', 'tick', '✓'));
      b.addEventListener('click', function () {
        S.model = id;
        document.body.dataset.model = id;
        buildPad();
        paint();
        save();
        closeSheet();
        toast(info.name);
      });
      list.appendChild(b);
    });
    show('sheetModels');
  }

  function showModes() {
    var grid = $('modeGrid');
    grid.innerHTML = '';
    MODES.order.forEach(function (id) {
      var m = MODES[id];
      if (!m) return;
      var b = el('button', 'mcard' + (S.mode === id ? ' on' : ''));
      var i = el('div', 'mi', m.icon);
      i.style.background = m.color;
      b.appendChild(i);
      b.appendChild(el('b', null, m.name));
      b.appendChild(el('small', null, m.desc));
      b.addEventListener('click', function () {
        closeSheet();
        openMode(id);
      });
      grid.appendChild(b);
    });
    show('sheetModes');
  }

  function openMenu() {
    $('setAngle').value = S.angle;
    $('setFormat').value = S.format;
    $('setComplex').value = S.complexFormat;
    $('setTheme').value = S.theme;
    $('setSound').value = S.sound ? 'on' : 'off';
    $('setHaptic').value = S.haptic ? 'on' : 'off';
    show('sheetMenu');
  }

  function openHistory() {
    var list = $('histList');
    list.innerHTML = '';
    if (!S.history.length) { list.appendChild(el('p', 'empty', 'No calculations yet')); }
    S.history.forEach(function (h) {
      var d = el('div', 'hitem');
      d.appendChild(el('div', 'e', h.e));
      d.appendChild(el('div', 'r', h.r));
      d.addEventListener('click', function () {
        S.expr = h.e;
        S.caret = h.e.length;
        S.result = h.r;
        S.isError = false;
        closeSheet();
        paint();
      });
      list.appendChild(d);
    });
    show('sheetHistory');
  }

  function openVars(mode) {
    S.varMode = mode;
    $('varsTitle').textContent = mode === 'store' ? 'Store Ans' : mode === 'recall' ? 'Recall' : 'Variables';
    $('varsHint').textContent = mode === 'store'
      ? 'Ans এর মান ভেরিয়েবলে রাখা হবে'
      : mode === 'recall' ? 'ভেরিয়েবলের মান রেসাল্ট লাইনে বসবে' : 'এক্সপ্রেশনে ভেরিয়েবল বসাবে';
    var g = $('varGrid');
    g.innerHTML = '';
    Object.keys(S.vars).forEach(function (k) {
      var b = el('button', 'vbtn');
      b.appendChild(el('b', null, k));
      b.appendChild(el('span', null, E.formatValue(S.vars[k], { format: 'norm' })));
      b.addEventListener('click', function () {
        if (mode === 'store') { S.vars[k] = S.ans; save(); closeSheet(); toast('Ans → ' + k); }
        else if (mode === 'recall') {
          S.ans = S.vars[k];
          S.raw = S.vars[k];
          S.result = E.formatValue(S.vars[k], fmtOpts());
          S.isError = false;
          closeSheet(); paint();
        } else { insert(k); closeSheet(); }
      });
      g.appendChild(b);
    });
    show('sheetVars');
  }

  function openCatalog() {
    var host = $('catList');
    host.innerHTML = '';
    LAY.catalog.forEach(function (grp) {
      var g = el('div', 'cat-g');
      g.appendChild(el('h4', null, grp.group));
      var row = el('div', 'cat-i');
      grp.items.forEach(function (it) {
        var b = el('button', null, it);
        b.addEventListener('click', function () { insert(it); closeSheet(); });
        row.appendChild(b);
      });
      g.appendChild(row);
      host.appendChild(g);
    });
    show('sheetCatalog');
  }

  /* CALC — ask for variable values */
  function openCalc() {
    var found = [];
    var re = /(?:^|[^A-Za-z])([A-FM])(?![A-Za-z])/g, m;
    while ((m = re.exec(S.expr))) if (found.indexOf(m[1]) < 0) found.push(m[1]);
    if (!found.length) { equals(); return; }
    var body = $('calcBody');
    body.innerHTML = '';
    var inputs = {};
    found.forEach(function (n) {
      var row = el('label', 'cvar');
      row.appendChild(el('span', null, n + ' ='));
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.inputMode = 'decimal';
      inp.value = String(S.vars[n]);
      inputs[n] = inp;
      row.appendChild(inp);
      body.appendChild(row);
    });
    $('calcGo').onclick = function () {
      var ov = {};
      Object.keys(inputs).forEach(function (n) {
        try {
          var v = E.evaluate(inputs[n].value || '0', { angle: S.angle, vars: {} });
          ov[n] = E.C.isC(v) ? v.re : v;
        } catch (e) { ov[n] = 0; }
      });
      closeSheet();
      try {
        showValue(E.evaluate(S.expr, ctx(ov)));
        paint();
      } catch (e) {
        S.result = e.message; S.isError = true; paint();
      }
    };
    show('sheetCalc');
  }

  /* ---------------- workspace / modes ---------------- */
  var wsApi = null;

  function openMode(id) {
    var m = MODES[id];
    if (!m) return;
    S.mode = id;

    /* Calculate / Complex use the main LCD + keypad, no workspace */
    if (id === 'calc' || id === 'complex') {
      $('workspace').hidden = true;
      paint();
      toast(m.name);
      return;
    }

    var ws = $('workspace');
    ws.innerHTML = '';

    var head = el('div', 'ws-head');
    var back = el('button', 'ico', '‹');
    back.addEventListener('click', function () {
      ws.hidden = true;
      S.mode = 'calc';
      paint();
      showModes();
    });
    head.appendChild(back);
    head.appendChild(el('b', null, m.name));
    var keyBtn = el('button', 'ico', '⌨');
    keyBtn.title = 'number pad';
    head.appendChild(keyBtn);
    ws.appendChild(head);

    var body = el('div', 'ws-body');
    ws.appendChild(body);

    if (m.render) {
      wsApi = makeApi(body);
      try { m.render(body, wsApi); }
      catch (e) { body.innerHTML = '<div class="out err">' + e.message + '</div>'; }
    }

    /* on-screen number pad for form-based modes */
    var padHost = el('div', 'minipad');
    padHost.dataset.pad = '1';
    ws.querySelectorAll('input').forEach(function (inp, i) { if (i === 0) inp.dataset.first = '1'; });
    var focused = null;
    function bindInputs() {
      var list = [].slice.call(ws.querySelectorAll('input'));
      if (!focused || !list.length) focused = list[0] || null;
      list.forEach(function (inp) {
        inp.addEventListener('focus', function () { focused = inp; });
        inp.addEventListener('input', function () { focused = inp; });
        inp.addEventListener('click', function () { focused = inp; });
      });
    }
    bindInputs();
    ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '−'].forEach(function (k) {
      var b = el('button', null, k);
      b.addEventListener('click', function () {
        if (!focused) { bindInputs(); if (!focused) return; }
        var val = k === '−' ? '-' : k;
        focused.value += val;
        focused.dispatchEvent(new Event('input', { bubbles: true }));
      });
      padHost.appendChild(b);
    });
    var delBtn = el('button', 'act', 'DEL');
    delBtn.addEventListener('click', function () {
      if (!focused) return;
      focused.value = focused.value.slice(0, -1);
      focused.dispatchEvent(new Event('input', { bubbles: true }));
    });
    var acBtn = el('button', 'act', 'AC');
    acBtn.addEventListener('click', function () {
      if (!focused) return;
      focused.value = '';
      focused.dispatchEvent(new Event('input', { bubbles: true }));
    });
    padHost.appendChild(delBtn);
    padHost.appendChild(acBtn);
    body.appendChild(padHost);

    keyBtn.addEventListener('click', function () {
      padHost.hidden = !padHost.hidden;
    });

    ws.hidden = false;
    paint();
  }

  function makeApi(body) {
    return {
      state: S,
      engine: E,
      el: el,
      toast: toast,
      insert: insert,
      save: save,
      field: function (label, input) {
        var f = el('label', 'f');
        f.appendChild(el('span', null, label));
        f.appendChild(input);
        return f;
      },
      input: function (opts) {
        var i = document.createElement('input');
        i.type = 'text';
        i.inputMode = opts && opts.numeric ? 'decimal' : 'text';
        if (opts && opts.value !== undefined) i.value = opts.value;
        if (opts && opts.placeholder) i.placeholder = opts.placeholder;
        return i;
      },
      select: function (opts, value) {
        var s = document.createElement('select');
        opts.forEach(function (o) {
          var op = document.createElement('option');
          op.value = o[0]; op.textContent = o[1];
          if (o[0] === value) op.selected = true;
          s.appendChild(op);
        });
        return s;
      },
      panel: function (title, sub) {
        var p = el('div', 'pnl');
        if (title) p.appendChild(el('h3', null, title));
        if (sub) p.appendChild(el('p', 's', sub));
        body.appendChild(p);
        return p;
      },
      out: function (host) {
        var o = el('div', 'out');
        o.innerHTML = '<span class="muted">—</span>';
        host.appendChild(o);
        return o;
      },
      setOut: function (o, html, err) {
        o.innerHTML = html;
        o.classList.toggle('err', !!err);
      },
      btn: function (label, cls, fn) {
        var b = el('button', 'btn ' + (cls || ''), label);
        b.addEventListener('click', fn);
        return b;
      }
    };
  }

  /* ---------------- wiring ---------------- */
  function wire() {
    $('btnModels').addEventListener('click', openModels);
    $('btnModes').addEventListener('click', showModes);
    $('btnMenu').addEventListener('click', openMenu);
    $('scrim').addEventListener('click', closeSheet);
    document.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function (ev) { ev.stopPropagation(); closeSheet(); });
    });

    $('btnHistory').addEventListener('click', openHistory);
    $('btnVars').addEventListener('click', function () { openVars('insert'); });
    $('btnCatalog').addEventListener('click', openCatalog);
    $('btnHelp').addEventListener('click', function () { show('sheetHelp'); });
    $('clearHist').addEventListener('click', function () {
      S.history = []; save(); openHistory(); toast('History cleared');
    });

    $('setAngle').addEventListener('change', function (e) { S.angle = e.target.value; save(); paint(); });
    $('setFormat').addEventListener('change', function (e) {
      S.format = e.target.value; save();
      if (S.raw != null) S.result = E.formatValue(S.raw, fmtOpts());
      paint();
    });
    $('setComplex').addEventListener('change', function (e) {
      S.complexFormat = e.target.value; save();
      if (S.raw != null) S.result = E.formatValue(S.raw, fmtOpts());
      paint();
    });
    $('setTheme').addEventListener('change', function (e) {
      S.theme = e.target.value;
      document.body.dataset.theme = S.theme;
      save();
    });
    $('setSound').addEventListener('change', function (e) {
      S.sound = e.target.value === 'on'; save();
      if (S.sound) beep(900);
    });
    $('setHaptic').addEventListener('change', function (e) { S.haptic = e.target.value === 'on'; save(); });

    document.addEventListener('keydown', onKey);
  }

  function onKey(ev) {
    var tag = (ev.target && ev.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (!$('workspace').hidden) return;

    var k = ev.key;
    if (/^[0-9.]$/.test(k)) { insert(k); ev.preventDefault(); return; }
    if ('+-*/^()%'.indexOf(k) >= 0) { insert(k); ev.preventDefault(); return; }
    switch (k) {
      case 'Enter': case '=': equals(); ev.preventDefault(); return;
      case 'Backspace': del(); ev.preventDefault(); return;
      case 'Escape': if (openSheet) closeSheet(); else clearAll(); ev.preventDefault(); return;
      case 'ArrowLeft': S.caret = Math.max(0, S.caret - 1); paint(); ev.preventDefault(); return;
      case 'ArrowRight': S.caret = Math.min(S.expr.length, S.caret + 1); paint(); ev.preventDefault(); return;
      case 'ArrowUp': browse(-1); ev.preventDefault(); return;
      case 'ArrowDown': browse(1); ev.preventDefault(); return;
    }
    if (k === 'p') { insert('π'); ev.preventDefault(); return; }
    if (k === 'e') { insert('e'); ev.preventDefault(); return; }
    if (k === 'i') { insert('i'); ev.preventDefault(); return; }
    if (/^[A-Fa-fMmyx]$/.test(k)) { insert(k.toUpperCase()); ev.preventDefault(); return; }
  }

  /* ---------------- boot ---------------- */
  function boot() {
    load();
    document.body.dataset.model = S.model;
    document.body.dataset.theme = S.theme;
    buildPad();
    wire();
    paint();
  }

  window.MKJApp = { state: S, press: press, openMode: openMode, equals: equals };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
