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
    model: 'cw',
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
    vars: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, M: 0, x: 0, y: 0, z: 0 },
    ioMode: 'math',
    freq: false,
    contrast: 3,
    lang: 'en',
    fracMode: true,
    digits: 10,
    sciDigits: 10,
    shift: false,
    alpha: false,
    hsel: 0,
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
        ioMode: S.ioMode, freq: S.freq, contrast: S.contrast, lang: S.lang,
        fracMode: S.fracMode, digits: S.digits, sciDigits: S.sciDigits,
        vars: S.vars, history: S.history.slice(0, 60)
      }));
    } catch (e) {}
  }
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || '{}');
      ['model', 'angle', 'format', 'complexFormat', 'theme', 'ioMode', 'lang'].forEach(function (k) {
        if (d[k]) S[k] = d[k];
      });
      if (typeof d.sound === 'boolean') S.sound = d.sound;
      if (typeof d.haptic === 'boolean') S.haptic = d.haptic;
      if (typeof d.freq === 'boolean') S.freq = d.freq;
      if (typeof d.fracMode === 'boolean') S.fracMode = d.fracMode;
      if (typeof d.contrast === 'number') S.contrast = d.contrast;
      if (typeof d.digits === 'number') S.digits = d.digits;
      if (typeof d.sciDigits === 'number') S.sciDigits = d.sciDigits;
      if (d.vars) Object.keys(S.vars).forEach(function (k) {
        if (typeof d.vars[k] === 'number') S.vars[k] = d.vars[k];
      });
      if (Array.isArray(d.history)) S.history = d.history;
      if (!LAY[S.model]) S.model = 'cw';
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
      angle: S.angle,
      digits: S.digits,
      sciDigits: S.sciDigits
    };
  }

  /* the LCD shows maths, not raw engine syntax */
  function pretty(src) {
    return String(src)
      .replace(/\*/g, '×').replace(/\//g, '÷')
      .replace(/×10\^\(/g, '×10^(')
      .replace(/([0-9)])-/g, '$1−')
      .replace(/^-/, '−')
      .replace(/sqrt\(/g, '√(').replace(/cbrt\(/g, '∛(')
      .replace(/\^\^/g, '^');
  }

  /* Linear input, natural display: a simple `a/b` with no nesting is shown as a
     stacked fraction so the entry reads like the real calculator's Natural I/O.
     Anything more complex falls back to the linear form. */
  function naturalise(txt) {
    /* only whole-token digit runs: 1/8 -> stacked, (1+2)/(3+4) -> linear */
    return txt.replace(/(^|[^0-9\])])([0-9]+)[\/÷]([0-9]+)(?![0-9])/g,
      '$1<span class="fx"><i>$2</i><b>$3</b></span>');
  }

  var NATURAL = true;   /* Input/Output = MathI/O shows simple fractions stacked */

  function paintExpr() {
    var b = pretty(S.expr.slice(0, S.caret));
    var a = pretty(S.expr.slice(S.caret));
    var stacked = NATURAL && (S.ioMode || 'math') === 'math';
    if (stacked) {
      /* the caret splits the text, so the fraction across the caret stays linear */
      $('exprBefore').innerHTML = naturalise(b);
      $('exprAfter').innerHTML = naturalise(a.slice(1));
    } else {
      $('exprBefore').textContent = b;
      $('exprAfter').textContent = a.slice(1);
    }
    var c = $('caretChar');
    var ch = a.charAt(0);
    c.textContent = ch || ' ';
    c.className = 'cur' + (S.shift ? '' : '');
    $('lcd').scrollLeft = 0;
  }

  function paint() {
    var lay = LAY[S.model];
    $('topPlate').textContent = lay.plate;
    $('topMode').textContent = LCD_MENU ? LCD_MENU.title
      : (S.home ? 'Home' : (MODES[S.mode] || MODES.calc).name);
    $('plateBrand').textContent = lay.brand || 'MKJ CALC';
    $('plateModel').textContent = lay.model;
    $('footModel').textContent = lay.model;
    setHome(S.home);
    if (LCD_MENU) { $('screenMain').hidden = true; $('homeScreen').hidden = true; $('lcdMenu').hidden = false; }
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
    b.dataset.v = key.v;
    b.dataset.act = key.act || 'ins';
    b.setAttribute('aria-label', key.cap || key.l || key.v);
    if (key.shape) b.classList.add(key.shape);
    if (key.s) b.classList.add('has-shift');
    if (key.span > 1) b.classList.add('wide');

    if (key.s) b.appendChild(el('span', 'sh', key.s));
    if (key.a) b.appendChild(el('span', 'al', key.a));
    if (key.ic) b.appendChild(svgIcon(key.ic));
    if (key.l && !key.icOnly) b.appendChild(el('span', 'lab ' + (key.sm || ''), key.l));
    if (key.icOnly) b.classList.add('ic-only');
    if (key.cap) b.appendChild(el('span', 'cap', key.cap));
    if (key.al2) b.appendChild(el('span', 'al2', key.al2));

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

  /* inline svg glyphs for the CW control keys */
  var ICONS = {
    power: 'M12 3v8M7.5 5.6a7 7 0 1 0 9 0',
    home: 'M4 11.5 12 4l8 7.5M6.5 10.5V20h11v-9.5',
    gear: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM19 12l1.6-1.2-1.4-2.6-1.9.7-1.4-.8-.3-2h-3l-.3 2-1.4.8-1.9-.7-1.4 2.6L7 12l-1.6 1.2 1.4 2.6 1.9-.7 1.4.8.3 2h3l.3-2 1.4-.8 1.9.7 1.4-2.6Z',
    left: 'M14.5 6.5 9 12l5.5 5.5',
    right: 'M9.5 6.5 15 12l-5.5 5.5',
    var: 'M3.5 8.5h3l4 7h4M8 8.5h3M14.5 15.5h6M17.5 12.5v6',
    func: 'M8 4.5v15M8 12h6.5M14.5 4.5v6',
    book: 'M12 6.5c-2-1.6-4.5-1.7-6.5-1.6v12c2-.1 4.5 0 6.5 1.6 2-1.6 4.5-1.7 6.5-1.6v-12c-2-.1-4.5 0-6.5 1.6ZM12 6.5v12',
    tools: 'M9.8 13.2a3.4 3.4 0 0 0 4.6-4.6L17 6l1 1-2.6 2.6a3.4 3.4 0 0 1-4.6 4.6L5 20l-1-1 5.8-5.8Z',
    shift: 'M6 14.5 12 8.5l6 6M12 8.5v7',
    del: 'M9.7 6.2h9.6a1 1 0 0 1 1 1v9.6a1 1 0 0 1-1 1H9.7L4 12l5.7-5.8Z',
    up: 'M12 18.5V6M6.5 11.5 12 6l5.5 5.5',
    down: 'M12 5.5V18M6.5 12.5 12 18l5.5-5.5',
    menu: 'M6.5 8.5h11M6.5 12h11M6.5 15.5h11'
  };

  function svgIcon(name) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'kic' + (name === 'del' ? ' fill' : ''));
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', ICONS[name] || '');
    svg.appendChild(p);
    if (name === 'del') {
      var x = document.createElementNS(NS, 'path');
      x.setAttribute('class', 'x');
      x.setAttribute('d', 'M11.6 9.6l4.8 4.8M16.4 9.6l-4.8 4.8');
      svg.appendChild(x);
    }
    return svg;
  }


  /* keep the whole device on one screen: size keys from the free height */
  function fitKeys() {
    var pad = $('pad'), dev = $('device'), lcd = $('lcd');
    if (!pad || !dev || !lcd) return;
    var lay = LAY[S.model];
    var wide = pad.clientWidth || dev.clientWidth - 22;
    if (!wide) return;

    /* screen keeps a device-like share of the body, pad gets the rest */
    var devH = dev.clientHeight || 620;
    var lcdH = Math.round(Math.min(Math.max(devH * 0.165, 84), 140));
    lcd.style.height = lcdH + 'px';

    var used = 0;
    Array.prototype.forEach.call(dev.children, function (c) {
      if (c === pad || c === lcd) return;
      var cs = getComputedStyle(c);
      used += c.getBoundingClientRect().height +
              parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
    });
    var dcs = getComputedStyle(dev);
    used += parseFloat(dcs.paddingTop) + parseFloat(dcs.paddingBottom);

    /* the pad is a flex child: whatever the screen did not take is ours */
    pad.style.height = 'auto';
    var avail = pad.clientHeight || Math.max(140, devH - used - lcdH - 10);
    var isCW = lay.shape === 'cw';
    var groups = isCW ? 3 : (lay.controls || []).length;
    var groupsW = isCW ? groups * 0.82 : groups;      /* CW control rows are short */
    var keyRows = lay.rows.length;
    var gapX = 0;                        /* the desktop pitch is the column */
    var keyRatio = 0.80;                 /* keys are ~78% of their pitch */
    var free = avail - 12 - (keyRows - 1) * 8;
    var byH = Math.floor(free / (keyRows + groups * 0.82));
    var byW = Math.floor((wide - 10) / lay.cols);
    var kw = Math.max(16, Math.min(byH, byW));

    pad.style.setProperty('--kw', kw + 'px');
    pad.style.setProperty('--kd', Math.round(kw * 0.83) + 'px');
    pad.style.setProperty('--kgx', '0px');

    /* converge on the biggest key size that still fits the device */
    function measure() {
      var h = 0;
      Array.prototype.forEach.call(pad.children, function (c) {
        var cs = getComputedStyle(c);
        h += c.getBoundingClientRect().height +
             parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
      });
      return h;
    }
    for (var pass = 0; pass < 10; pass++) {
      var slack = pad.clientHeight - measure();
      var step = slack > 0
        ? Math.max(1, Math.floor(slack / (keyRows + groupsW)))
        : Math.min(-1, Math.ceil(slack / (keyRows + groupsW)));
      if ((slack > 0 && step <= 0) || (slack < 0 && step >= 0)) break;
      var next = Math.min(byW, kw + step);
      if (next === kw) break;
      kw = Math.max(14, next);
      pad.style.setProperty('--kw', kw + 'px');
      pad.style.setProperty('--kd', Math.round(kw * 0.83) + 'px');
      pad.style.setProperty('--kd', Math.round(kw * 0.83) + 'px');
      if (kw <= 14) break;
    }
    /* guarantee no overflow on very short screens */
    for (var guard = 0; guard < 24 && pad.scrollHeight > pad.clientHeight + 1; guard++) {
      kw = Math.max(14, kw - 1);
      pad.style.setProperty('--kw', kw + 'px');
      pad.style.setProperty('--kd', Math.round(kw * 0.83) + 'px');
      if (kw === 14) break;
    }
  }

  var wsDock = null;               /* the single workspace keypad host */
  var fitTimer = 0;
  function fitSoon() {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitKeys, 60);
  }
  window.addEventListener('resize', fitSoon);
  window.addEventListener('orientationchange', fitSoon);

  function buildPad() {
    var lay = LAY[S.model] || LAY[LAY.order[0]];
    if (!lay) return;
    S.model = lay.id;
    var pad = $('pad');
    pad.innerHTML = '';
    pad.dataset.shape = lay.shape;

    /* layout objects are either a flat list (CW) or rows of {keys:[...]} */
    var flatControls = !!lay.controls && lay.controls.length && !lay.controls[0].keys;

    if (flatControls) {
      /* three fixed control rows + the tall scroll rocker on the right */
      var block = el('div', 'ctlblock');
      block.style.gridTemplateColumns = 'repeat(' + lay.cols + ', 1fr)';
      lay.controls.forEach(function (k) {
        var b = keyEl(k);
        if (k.gr) b.style.gridRow = k.gr;
        if (k.gc) b.style.gridColumn = k.gc;
        block.appendChild(b);
      });
      if (lay.rocker) {
        var rk = el('div', 'rocker');
        [['up', 'scrollup'], ['down', 'scrolldown']].forEach(function (pair) {
          rk.appendChild(keyEl({ l: '', v: pair[1], act: 'cmd', c: 'ctl rock', ic: pair[0] }));
        });
        block.appendChild(rk);
      }
      pad.appendChild(block);
    } else {
      (lay.controls || []).forEach(function (row) {
        var wrap = el('div', 'ctlrow');
        wrap.style.gridTemplateColumns = 'repeat(' + lay.cols + ', 1fr)';
        row.keys.forEach(function (k) {
          if (!k) wrap.appendChild(el('span', 'ctlspace'));
          else wrap.appendChild(keyEl(k));
        });
        pad.appendChild(wrap);
      });
    }

    lay.rows.forEach(function (row) {
      var wrap = el('div', 'krow');
      wrap.style.gridTemplateColumns = 'repeat(' + lay.cols + ', 1fr)';
      row.forEach(function (k) { wrap.appendChild(keyEl(k)); });
      for (var i = row.length; i < lay.cols; i++) wrap.appendChild(el('span', 'gapkey'));
      pad.appendChild(wrap);
    });

    document.body.dataset.model = S.model;
    document.body.dataset.shape = lay.shape;
    $('classwizLine').hidden = !lay.home;
    setHome(!!lay.home && S.home);
    fitKeys();
  }

  /* ---- CW style icon home screen inside the LCD ---- */
  var HOME_ICONS = [
    { m: 'calc', t: 'Calculate', g: '1+1' },
    { m: 'stat', t: 'Statistics', g: 'σ' },
    { m: 'dist', t: 'Distribution', g: 'Φ' },
    { m: 'spreadsheet', t: 'Spreadsheet', g: '▦' },
    { m: 'table', t: 'Table', g: '▤' },
    { m: 'equation', t: 'Equation', g: 'x=y' },
    { m: 'inequality', t: 'Inequality', g: 'x>y' },
    { m: 'complex', t: 'Complex', g: 'i' },
    { m: 'basen', t: 'Base-N', g: '1010' },
    { m: 'matrix', t: 'Matrix', g: '[ ]' },
    { m: 'vector', t: 'Vector', g: '→' },
    { m: 'ratio', t: 'Ratio', g: 'a:b' },
    { m: 'solve', t: 'Solve', g: 'ƒ' },
    { m: 'verify', t: 'Verify', g: '✓' },
    { m: 'mathbox', t: 'Math Box', g: '⚄' },
    { m: 'constants', t: 'Constants', g: 'π' }
  ];

  function homeMove(d) {
    var n = HOME_ICONS.length;
    S.hsel = ((S.hsel + d) % n + n) % n;
    markHomeSel();
    var el0 = $('homeScreen').children[S.hsel];
    if (el0 && el0.scrollIntoView) {
      try { el0.scrollIntoView({ block: 'nearest' }); } catch (e) {}
    }
  }

  function markHomeSel() {
    Array.prototype.forEach.call($('homeScreen').children, function (c, i) {
      c.classList.toggle('sel', i === S.hsel);
    });
  }

  function homeOpen() {
    var ic = HOME_ICONS[S.hsel] || HOME_ICONS[0];
    S.home = false;
    $('homeScreen').hidden = true;
    $('screenMain').hidden = false;
    openMode(ic.m);
  }

  function renderHome() {
    var host = $('homeScreen');
    if (!host) return;
    host.innerHTML = '';
    HOME_ICONS.forEach(function (ic) {
      var b = el('button', 'hicon');
      b.appendChild(el('span', 'hg', ic.g));
      b.appendChild(el('span', 'ht', ic.t));
      b.dataset.mode = ic.m;
      b.addEventListener('click', function () {
        S.hsel = HOME_ICONS.indexOf(ic);
        markHomeSel();
        homeOpen();
      });
      host.appendChild(b);
    });
    markHomeSel();
  }

  function setHome(on) {
    S.home = !!on;
    var hs = $('homeScreen');
    if (!hs) return;
    if (!S.model || !LAY[S.model].home) on = false;
    hs.hidden = !on;
    $('screenMain').hidden = !!on;
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
    /* list results (vectors, random lists) and factorisations carry their own text */
    if (v && v.list) {
      S.result = v.text || '[' + v.list.join('  ') + ']';
      S.raw = null; S.frac = null; S.sdStage = 0; S.isError = false;
      S.resultSub = v.list.length + ' element' + (v.list.length === 1 ? '' : 's');
      return;
    }
    var z = E.C.isPair(v) ? null : E.C.to(v);
    S.raw = v;
    if (z && Math.abs(z.im) < 1e-12) {
      S.ans = z.re;
      S.frac = E.fractionOf(z.re);
    } else {
      S.frac = null;
    }
    if (!z) S.ans = 0;

    S.result = S.fracMode === false ? decimalOnly(v) : E.formatValue(v, fmtOpts());
    S.sdStage = 0;

    /* second line: alternative form */
    S.resultSub = '';
    if (z && Math.abs(z.im) < 1e-12 && S.fracMode !== false && S.format !== 'frac' && S.format !== 'pi') {
      var fr = S.frac ? E.fractionText(S.frac) : null;
      var pi = E.piFraction(z.re);
      var dec = E.formatValue(z.re, { format: 'norm', complex: false });
      if (fr && S.result === fr) S.resultSub = dec;
      else if (pi && S.result === pi) S.resultSub = dec;
      else if (pi) S.resultSub = pi;
      else if (fr) S.resultSub = fr;
    }
    if (v && v.text) S.resultSub = v.text;
    S.isError = false;
  }

  /* Fraction Result = Off: always show the decimal, never an automatic fraction */
  function decimalOnly(v) {
    if (v && v.list) return E.formatValue(v, { format: 'norm' });
    return E.formatValue(v, { format: 'norm', complex: S.mode === 'complex' || S.mode === 'equation',
      complexFormat: S.complexFormat, angle: S.angle, digits: S.digits, sciDigits: S.sciDigits });
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
    /* an open LCD menu (SETTINGS / FORMAT / TOOLS) owns the keypad */
    if (LCD_MENU && (key.act === 'cmd')) {
      var nav = ['up', 'down', 'scrollup', 'scrolldown', 'ok', 'equals', 'ac', 'left'];
      if (nav.indexOf(key.v) >= 0) { lcdMenuKey(key.v); return; }
      if (key.v === 'home' || key.v === 'on') { closeLcdMenu(); return; }
      return;
    }
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
      case 'equals': if (S.home) homeOpen(); else equals(); break;
      case 'sd': openLcdMenu('Number Format', FORMAT_ITEMS); break;
      case 'ans': insert('Ans'); break;
      case 'left':
        if (S.home) homeMove(-1);
        else { S.caret = Math.max(0, S.caret - 1); paint(); }
        break;
      case 'right':
        if (S.home) homeMove(1);
        else { S.caret = Math.min(S.expr.length, S.caret + 1); paint(); }
        break;
      case 'up': if (S.home) homeMove(-4); else browse(-1); break;
      case 'down': if (S.home) homeMove(4); else browse(1); break;
      case 'scrollup': if (S.home) homeMove(-1); else browse(-1); break;
      case 'scrolldown': if (S.home) homeMove(1); else browse(1); break;
      case 'mode':
      case 'modes':
        if (LCD_MENU) closeLcdMenu();
        showModes();
        break;
      case 'home':
        S.home = true;
        $('workspace').hidden = true;
        S.mode = 'calc';
        paint();
        break;
      case 'ok': if (S.home) homeOpen(); else showModes(); break;
      case 'settings':
        openLcdMenu('Settings', SETTINGS_ITEMS);
        break;
      case 'tools':
        openLcdMenu('Tools', TOOLS_ITEMS);
        break;
      case 'catalog': openCatalog(); break;
      case 'function': openVars('insert'); break;
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
        S.home = !!LAY[id].home;
        S.mode = 'calc';
        $('workspace').hidden = true;
        paint();
        save();
        closeSheet();
        toast(info.name);
      });
      list.appendChild(b);
    });
    show('sheetModels');
  }


  /* ============================================================
     LCD menus — SETTINGS / FORMAT / TOOLS
     Rendered inside the display exactly like the CW system menus.
     Arrow keys move, OK/EXE selects, AC/left backs out.
     ============================================================ */
  var LCD_MENU = null;   /* { title, items:[{id,label,value,opts,help}], i, depth } */

  var ANGLE_OPTS = [['deg', 'Degree'], ['rad', 'Radian'], ['grad', 'Gradian']];
  var FORMAT_OPTS = [
    ['norm', 'Norm 1'], ['fix2', 'Fix 2'], ['fix3', 'Fix 3'], ['fix4', 'Fix 4'],
    ['sci', 'Sci'], ['eng', 'Eng'], ['frac', 'Fraction'], ['pi', 'π-form']
  ];
  var COMPLEX_OPTS = [['rect', 'a+bi'], ['polar', 'r∠θ']];
  var IO_OPTS = [['math', 'MathI/O'], ['line', 'LineI/O']];
  var FREQ_OPTS = [['off', 'Frequency: Off'], ['on', 'Frequency: On']];

  var SETTINGS_ITEMS = [
    { id: 'angle', label: 'Angle Unit', get: function () { return S.angle; }, opts: ANGLE_OPTS,
      set: function (v) { S.angle = v; } },
    { id: 'io', label: 'Input/Output', get: function () { return S.ioMode || 'math'; }, opts: IO_OPTS,
      set: function (v) { S.ioMode = v; } },
    { id: 'format', label: 'Number Format', get: function () { return S.format; }, opts: FORMAT_OPTS,
      set: function (v) { S.format = v; } },
    { id: 'complex', label: 'Complex Result', get: function () { return S.complexFormat; }, opts: COMPLEX_OPTS,
      set: function (v) { S.complexFormat = v; } },
    { id: 'freq', label: 'Frequency', get: function () { return S.freq ? 'on' : 'off'; }, opts: FREQ_OPTS,
      set: function (v) { S.freq = v === 'on'; } },
    { id: 'contrast', label: 'Display Contrast', get: function () { return String(S.contrast == null ? 3 : S.contrast); },
      opts: [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']],
      set: function (v) { S.contrast = Number(v); applyContrast(); } },
    { id: 'lang', label: 'Language', get: function () { return S.lang || 'en'; },
      opts: [['en', 'English'], ['bn', 'বাংলা']],
      set: function (v) { S.lang = v; applyLang(); } },
    { id: 'sound', label: 'Key Sound', get: function () { return S.sound ? 'on' : 'off'; },
      opts: [['on', 'On'], ['off', 'Off']], set: function (v) { S.sound = v === 'on'; } },
    { id: 'haptic', label: 'Vibration', get: function () { return S.haptic ? 'on' : 'off'; },
      opts: [['on', 'On'], ['off', 'Off']], set: function (v) { S.haptic = v === 'on'; } },
    { id: 'reset', label: 'Reset', get: function () { return 'All'; },
      opts: [['all', 'Reset all'], ['cancel', 'Cancel']],
      set: function (v) { if (v === 'all') doReset(); } }
  ];

  var FORMAT_ITEMS = [
    { id: 'sd', label: 'S ⇔ D  Result Form', get: function () { return 'Toggle'; },
      opts: [['go', 'Toggle now']],
      set: function () { closeLcdMenu(); toggleSD(); } },
    { id: 'fmt', label: 'Number Format', get: function () { return S.format; }, opts: FORMAT_OPTS,
      set: function (v) { S.format = v; if (S.raw != null && S.mode === 'calc') S.result = E.formatValue(S.raw, fmtOpts()); } },
    { id: 'frac', label: 'Fraction Result', get: function () { return S.fracMode ? 'on' : 'off'; },
      opts: [['on', 'On'], ['off', 'Off']], set: function (v) { S.fracMode = v === 'on'; } },
    { id: 'dec', label: 'Display Digits', get: function () { return String(S.digits == null ? 10 : S.digits); },
      opts: [['6', '6'], ['8', '8'], ['10', '10'], ['12', '12']],
      set: function (v) { S.digits = Number(v); } },
    { id: 'sci', label: 'Sci. Sig. Digits', get: function () { return String(S.sciDigits == null ? 10 : S.sciDigits); },
      opts: [['4', '4'], ['6', '6'], ['8', '8'], ['10', '10']],
      set: function (v) { S.sciDigits = Number(v); } }
  ];

  var TOOLS_ITEMS = [
    { id: 'hist', label: 'Calculation History', get: function () { return String(S.history.length); },
      opts: [['open', 'Open history'], ['clear', 'Clear history']],
      set: function (v) { closeLcdMenu(); if (v === 'open') openHistory(); else { S.history = []; save(); paint(); toast(L('cleared')); } } },
    { id: 'vars', label: 'Variable Manager', get: function () { return 'A – F, x, y, z'; },
      opts: [['open', 'Open variables']], set: function () { closeLcdMenu(); openVars('insert'); } },
    { id: 'catalog', label: 'Function Catalog', get: function () { return '…'; },
      opts: [['open', 'Open catalog']], set: function () { closeLcdMenu(); openCatalog(); } },
    { id: 'about', label: 'About', get: function () { return 'MKJ-991CW'; },
      opts: [['open', 'Precision Meets Intelligence']], set: function () { closeLcdMenu(); } }
  ];

  function optLabel(opts, v) {
    for (var i = 0; i < opts.length; i++) if (opts[i][0] === v) return opts[i][1];
    return v;
  }

  function openLcdMenu(title, items) {
    LCD_MENU = { title: title, items: items, i: 0, depth: 0 };
    S.home = false;
    $('homeScreen').hidden = true;
    $('screenMain').hidden = true;
    renderLcdMenu();
    paint();
  }

  function closeLcdMenu() {
    LCD_MENU = null;
    var host = $('lcdMenu');
    if (host) host.hidden = true;
    $('screenMain').hidden = false;
    paint();
  }

  function renderLcdMenu() {
    var host = $('lcdMenu');
    if (!host) return;
    if (!LCD_MENU) { host.hidden = true; return; }
    host.hidden = false;
    host.classList.toggle('sub', LCD_MENU.depth > 0);
    var m = LCD_MENU;
    var html = '<div class="lm-title">' + (m.depth ? 'Select' : m.title) + '</div><div class="lm-list">';

    if (m.depth === 0) {
      m.items.forEach(function (it, i) {
        var val = it.get ? it.get() : '';
        var shown = it.opts ? optLabel(it.opts, val) : val;
        html += '<div class="lm-row' + (i === m.i ? ' on' : '') + '" data-i="' + i + '">' +
                  '<span>' + it.label + '</span><b>' + shown + '</b></div>';
      });
    } else {
      var it = m.items[m.i];
      var cur = it.get ? it.get() : '';
      it.opts.forEach(function (o, j) {
        html += '<div class="lm-row' + (o[0] === cur ? ' on' : '') + '" data-o="' + j + '">' +
                  '<span>' + o[1] + '</span><b>' + (o[0] === cur ? '✓' : '') + '</b></div>';
      });
    }
    html += '</div>';
    host.innerHTML = html;

    var onRow = host.querySelector('.lm-row.on');
    if (onRow && onRow.scrollIntoView) {
      try { onRow.scrollIntoView({ block: 'nearest' }); } catch (e) {}
    }

    Array.prototype.forEach.call(host.querySelectorAll('.lm-row'), function (row) {
      row.addEventListener('click', function () {
        if (row.dataset.o != null) { chooseOption(Number(row.dataset.o)); }
        else { LCD_MENU.i = Number(row.dataset.i); enterItem(); }
      });
    });
  }

  function enterItem() {
    var it = LCD_MENU.items[LCD_MENU.i];
    if (!it) return;
    if (it.opts) { LCD_MENU.depth = 1; renderLcdMenu(); }
  }

  function chooseOption(j) {
    var it = LCD_MENU.items[LCD_MENU.i];
    if (!it || !it.opts[j]) return;
    it.set(it.opts[j][0]);
    LCD_MENU.depth = 0;
    renderLcdMenu();
    paint();
    save();
  }

  function lcdMenuKey(v) {
    var m = LCD_MENU;
    if (!m) return false;
    if (m.depth === 0) {
      if (v === 'up' || v === 'scrollup') { m.i = (m.i - 1 + m.items.length) % m.items.length; renderLcdMenu(); return true; }
      if (v === 'down' || v === 'scrolldown') { m.i = (m.i + 1) % m.items.length; renderLcdMenu(); return true; }
      if (v === 'ok' || v === 'equals') { enterItem(); return true; }
      if (v === 'ac' || v === 'left') { closeLcdMenu(); return true; }
      return true;   /* swallow the pad while a menu is open */
    }
    var it = m.items[m.i];
    var cur = it.get ? it.get() : '';
    var idx = 0;
    it.opts.forEach(function (o, j) { if (o[0] === cur) idx = j; });
    if (v === 'up' || v === 'scrollup') { chooseOption((idx - 1 + it.opts.length) % it.opts.length); return true; }
    if (v === 'down' || v === 'scrolldown') { chooseOption((idx + 1) % it.opts.length); return true; }
    if (v === 'ok' || v === 'equals') { chooseOption(idx); return true; }
    if (v === 'ac' || v === 'left') { m.depth = 0; renderLcdMenu(); return true; }
    return true;
  }

  function applyContrast() {
    var v = S.contrast == null ? 3 : S.contrast;
    var lcd = $('lcd');
    if (lcd) lcd.style.setProperty('--contrast', String((v - 3) * 0.12));
    document.body.dataset.contrast = v;
  }

  function applyLang() {
    var lang = S.lang === 'bn' ? 'bn' : 'en';
    document.documentElement.lang = lang;
    document.body.dataset.lang = lang;
    if (LCD_MENU) renderLcdMenu();
  }

  function doReset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    S.angle = 'deg'; S.format = 'norm'; S.complexFormat = 'rect';
    S.sound = true; S.haptic = true; S.theme = 'dark';
    S.contrast = 3; S.lang = 'en'; S.ioMode = 'math'; S.freq = false;
    S.vars = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, M: 0, x: 0, y: 0, z: 0 };
    S.history = [];
    applyContrast(); applyLang(); save(); paint();
    toast(L('reset'));
  }

  function modeIds() { return MODES.order.slice(); }

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

  /* UI strings the calculator itself shows. Maths notation never changes. */
  var STR = {
    en: {
      vars: 'Variables', store: 'Store Ans', recall: 'Recall',
      storeHint: 'Write the value of Ans into the variable',
      recallHint: 'The variable value is placed in the result line',
      insertHint: 'Insert a variable into the expression',
      cleared: 'History cleared', reset: 'Reset complete'
    },
    bn: {
      vars: 'ভেরিয়েবল', store: 'Ans সংরক্ষণ', recall: 'রিকল',
      storeHint: 'Ans এর মান ভেরিয়েবলে রাখা হবে',
      recallHint: 'ভেরিয়েবলের মান রেসল্ট লাইনে বসবে',
      insertHint: 'এক্সপ্রেশনে ভেরিয়েবল বসাবে',
      cleared: 'হিস্ট্রি মুছে ফেলা হয়েছে', reset: 'রিসেট সম্পন্ন'
    }
  };
  function L(key) { return (STR[S.lang] || STR.en)[key] || STR.en[key]; }

  function openVars(mode) {
    S.varMode = mode;
    Array.prototype.forEach.call(document.querySelectorAll('#varTabs button'), function (b) {
      b.classList.toggle('on', b.dataset.vm === mode);
      if (!b.dataset.wired) {
        b.dataset.wired = '1';
        b.addEventListener('click', function () { openVars(b.dataset.vm); });
      }
    });
    $('varsTitle').textContent = mode === 'store' ? L('store') : mode === 'recall' ? L('recall') : L('vars');
    $('varsHint').textContent = mode === 'store' ? L('storeHint')
      : mode === 'recall' ? L('recallHint') : L('insertHint');
    var g = $('varGrid');
    g.innerHTML = '';
    Object.keys(S.vars).forEach(function (k) {
      var b = el('button', 'vbtn');
      b.appendChild(el('b', null, k));
      b.appendChild(el('span', null, E.formatValue(S.vars[k], { format: 'norm' })));
      b.addEventListener('click', function () {
        if (mode === 'store') { S.vars[k] = S.ans; save(); closeSheet(); toast('Ans → ' + k); paint(); }
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
    S.home = false;
    setHome(false);

    /* Calculate / Complex use the main LCD + keypad, no workspace */
    if (id === 'calc' || id === 'complex') {
      $('workspace').hidden = true;
      paint();          /* the mode name is already shown in the top bar */
      return;
    }

    var ws = $('workspace');
    ws.innerHTML = '';

    var head = el('div', 'ws-head');
    var back = el('button', 'ico', '‹');
    back.addEventListener('click', function () {
      ws.hidden = true;
      S.mode = 'calc';
      if (LAY[S.model].home) S.home = true;
      paint();
    });
    head.appendChild(back);
    head.appendChild(el('b', null, m.name));
    var keyBtn = el('button', 'ico', '⌨');
    keyBtn.title = 'number pad';
    head.appendChild(keyBtn);
    ws.appendChild(head);

    var body = el('div', 'ws-body');
    ws.appendChild(body);
    var dock = el('div', 'ws-dock');
    ws.appendChild(dock);
    wsDock = dock;

    if (m.render) {
      wsApi = makeApi(body, dock);
      try { m.render(body, wsApi); }
      catch (e) { body.innerHTML = '<div class="out err">' + e.message + '</div>'; }
    }

    /* the workspace keypad is mounted by the mode itself through setDock();
       if a mode has inputs but mounted none, fall back to a shared pad */
    if (!dock.children.length && ws.querySelector('input')) mountFallbackPad(dock, ws);
    if (!dock.children.length) keyBtn.classList.add('off');

    keyBtn.addEventListener('click', function () {
      if (keyBtn.classList.contains('off')) return;
      dock.hidden = !dock.hidden;
      keyBtn.classList.toggle('on', !dock.hidden);
    });

    ws.hidden = false;
    paint();
  }

  /* shared fallback keypad for modes that only expose plain inputs */
  function mountFallbackPad(dock, ws) {
    var focused = null;
    function bind() {
      var list = [].slice.call(ws.querySelectorAll('input'));
      list.forEach(function (inp) {
        if (inp.dataset.padBound) return;
        inp.dataset.padBound = '1';
        inp.addEventListener('focus', function () { focused = inp; });
        inp.addEventListener('click', function () { focused = inp; });
        inp.addEventListener('input', function () { focused = inp; });
      });
      if (!focused || !list.length) focused = list[0] || null;
    }
    bind();
    var wrap = el('div', 'minipad');
    ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '(-)'].forEach(function (k) {
      var b = el('button', 'mp-key', k);
      b.type = 'button';
      b.addEventListener('click', function () {
        if (!focused) { bind(); if (!focused) return; }
        focused.value += (k === '(-)' ? '-' : k);
        focused.dispatchEvent(new Event('input', { bubbles: true }));
      });
      wrap.appendChild(b);
    });
    var row = el('div', 'minipad-actions');
    [['DEL', 'mp-del', function () {
      if (!focused) return;
      focused.value = focused.value.slice(0, -1);
      focused.dispatchEvent(new Event('input', { bubbles: true }));
    }], ['AC', 'mp-ac', function () {
      if (!focused) return;
      focused.value = '';
      focused.dispatchEvent(new Event('input', { bubbles: true }));
    }]].forEach(function (d) {
      var b = el('button', 'mp-key ' + d[1], d[0]);
      b.type = 'button';
      b.addEventListener('click', d[2]);
      row.appendChild(b);
    });
    wrap.appendChild(row);
    dock.appendChild(wrap);
  }

  function makeApi(body, dock) {
    if (dock) wsDock = dock;
    return {
      state: S,
      dock: dock || null,
      settings: function () { return { freq: !!S.freq, frac: S.fracMode !== false, ioMode: S.ioMode || 'math' }; },
      pushHistory: function (expr, res) {
        S.history.unshift({ e: expr, r: res });
        if (S.history.length > 60) S.history.pop();
        save();
      },
      vars: S.vars,
      setDock: function (fn) {
        if (!wsDock) return;
        wsDock.innerHTML = '';
        if (fn) fn(wsDock);
        else wsDock.style.display = 'none';
      },
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
      S.history = []; save(); openHistory(); toast(L('cleared'));
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

    var k = ev.key, mod = ev.ctrlKey || ev.metaKey;

    /* ---- hardware keys that mirror the physical keypad ---- */
    if (mod) {
      if (k === 'r' || k === 'R') { ev.preventDefault(); clearAll(); return; }        /* AC  */
      if (k === 'h' || k === 'H') { ev.preventDefault(); S.home = true; paint(); return; }
      return;
    }
    switch (k) {
      case 'Enter':
        ev.preventDefault();
        if (LCD_MENU) { lcdMenuKey('equals'); return; }
        if (S.home) { homeOpen(); return; }
        equals(); return;
      case '=':
        ev.preventDefault();
        if (LCD_MENU) { lcdMenuKey('equals'); return; }
        equals(); return;
      case 'Backspace': ev.preventDefault(); if (LCD_MENU) return; del(); return;
      case 'Delete': ev.preventDefault(); clearAll(); return;                          /* AC  */
      case 'Escape':
        ev.preventDefault();
        if (LCD_MENU) { closeLcdMenu(); return; }
        if (openSheet) { closeSheet(); return; }
        if (!$('homeScreen').hidden) return;
        clearAll(); return;
      case 'ArrowLeft':
        ev.preventDefault();
        if (LCD_MENU) { lcdMenuKey('left'); return; }
        if (S.home) { homeMove(-1); return; }
        S.caret = Math.max(0, S.caret - 1); paint(); return;
      case 'ArrowRight':
        ev.preventDefault();
        if (S.home) { homeMove(1); return; }
        S.caret = Math.min(S.expr.length, S.caret + 1); paint(); return;
      case 'ArrowUp': ev.preventDefault(); if (LCD_MENU) { lcdMenuKey('up'); return; } if (S.home) homeMove(-4); else browse(-1); return;
      case 'ArrowDown': ev.preventDefault(); if (LCD_MENU) { lcdMenuKey('down'); return; } if (S.home) homeMove(4); else browse(1); return;
      /* F-keys map to the CW control cluster */
      case 'F1': ev.preventDefault(); press({ act: 'cmd', v: 'shift' }); return;
      case 'F2': ev.preventDefault(); openVars('insert'); return;
      case 'F3': ev.preventDefault(); openCatalog(); return;
      case 'F4': ev.preventDefault(); openLcdMenu('Settings', SETTINGS_ITEMS); return;
      case 'F5': ev.preventDefault(); showModes(); return;
      case 'F9': ev.preventDefault(); openLcdMenu('Number Format', FORMAT_ITEMS); return;
    }
    if (/^[0-9.]$/.test(k)) { insert(k); ev.preventDefault(); return; }
    if ('+-*/^()%'.indexOf(k) >= 0) { insert(k); ev.preventDefault(); return; }
    if (k === 'p') { insert('π'); ev.preventDefault(); return; }
    if (k === 'e') { insert('e'); ev.preventDefault(); return; }
    if (k === 'i') { insert('i'); ev.preventDefault(); return; }
    if (/^[A-Fa-fMmyxz]$/.test(k)) { insert(k.toUpperCase()); ev.preventDefault(); return; }
    if (k === '!') { insert('!'); ev.preventDefault(); return; }
    if (k === 'r' && ev.altKey) { insert('√('); ev.preventDefault(); return; }
  }

  /* ---------------- boot ---------------- */
  function boot() {
    load();
    /* keep the toast inside the device shell, not floating under it */
    var t = $('toast'), dev = $('device');
    if (t && dev && t.parentNode !== dev) dev.appendChild(t);
    document.body.dataset.model = S.model;
    document.body.dataset.theme = S.theme;
    try {
      applyContrast();
      applyLang();
      buildPad();
      renderHome();
      wire();
      S.home = !!LAY[S.model].home;
      paint();
    } catch (err) {
      /* never leave a dead, keyless device on screen */
      if (window.console) console.error('MKJ CALC boot:', err);
      S.model = 'cw'; S.mode = 'calc'; S.home = false;
      try {
        buildPad(); renderHome(); wire(); paint();
      } catch (e2) {
        var pad = $('pad');
        if (pad) pad.innerHTML = '<div class="boot-err">Reload the page</div>';
      }
    }
  }

  window.MKJApp = {
    state: S, press: press, openMode: openMode, equals: equals,
    save: save, load: load, paint: paint, modeIds: modeIds
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
