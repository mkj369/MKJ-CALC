/* ============================================================
   MKJ CALC — modes (v2)
   Every mode is a self-contained module:
     { id, name, icon, desc, models:[...], render(root, app) }
   app provides: toast, openCalcKeypad, insertInto, setResult,
                 state, engine
   ============================================================ */
(function (global) {
  'use strict';

  var E = global.MKJEngine;

  /* helpers ------------------------------------------------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function field(label, input) {
    var w = el('label', 'fld');
    w.appendChild(el('span', null, label));
    w.appendChild(input);
    return w;
  }
  function input(attrs) {
    var i = document.createElement('input');
    i.type = attrs.type || 'text';
    i.inputMode = attrs.inputMode || 'text';
    i.placeholder = attrs.placeholder || '';
    if (attrs.value !== undefined) i.value = attrs.value;
    if (attrs.cls) i.className = attrs.cls;
    if (attrs.min !== undefined) i.min = attrs.min;
    if (attrs.max !== undefined) i.max = attrs.max;
    if (attrs.step !== undefined) i.step = attrs.step;
    return i;
  }
  function select(options, value) {
    var s = document.createElement('select');
    options.forEach(function (o) {
      var op = document.createElement('option');
      op.value = o[0]; op.textContent = o[1];
      if (o[0] === value) op.selected = true;
      s.appendChild(op);
    });
    return s;
  }
  function btn(label, cls, onClick) {
    var b = el('button', 'btn ' + (cls || ''), label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }
  function panel(root) {
    return el('div', 'mode-panel');
  }
  function head(root, title, subtitle) {
    var h = el('div', 'mode-head');
    h.appendChild(el('h3', null, title));
    if (subtitle) h.appendChild(el('p', null, subtitle));
    root.appendChild(h);
    return h;
  }
  function outBox(root) {
    var o = el('div', 'mode-out');
    o.innerHTML = '<span class="out-empty">Result appears here</span>';
    root.appendChild(o);
    return o;
  }
  function setOut(box, html, isErr) {
    box.innerHTML = html;
    box.classList.toggle('is-error', !!isErr);
  }
  function attachPad(container, getInputs, app) {
    var focused = null;
    function bind() {
      var list = typeof getInputs === 'function' ? getInputs() : getInputs;
      focused = list[0] || null;
      list.forEach(function (inp) {
        inp.addEventListener('focus', function () { focused = inp; });
        inp.addEventListener('click', function () { focused = inp; });
        inp.addEventListener('input', function () { focused = inp; });
      });
      return list;
    }
    bind();
    var pad = numPad(function (key) {
      if (!focused) bind();
      if (!focused) return;
      var start = focused.selectionStart !== null ? focused.selectionStart : focused.value.length;
      var end = focused.selectionEnd !== null ? focused.selectionEnd : start;
      focused.value = focused.value.slice(0, start) + key + focused.value.slice(end);
      var pos = start + key.length;
      focused.setSelectionRange && focused.setSelectionRange(pos, pos);
      focused.dispatchEvent(new Event('input', { bubbles: true }));
    }, function () {
      if (!focused) return;
      focused.value = '';
      focused.dispatchEvent(new Event('input', { bubbles: true }));
    }, function () {
      if (!focused) return;
      focused.value = focused.value.slice(0, -1);
      focused.dispatchEvent(new Event('input', { bubbles: true }));
    });
    if (app && app.setDock) app.setDock(function (dock) { dock.appendChild(pad); });
    else container.appendChild(pad);
    return { pad: pad, rebind: bind };
  }

  function parseNum(s) {
    var v = E.evaluate(String(s || '0').replace(/,/g, ' '), { angle: 'deg', vars: {} });
    if (E.C.isC(v) && Math.abs(v.im) > 1e-12) throw new Error('real only');
    return E.C.isC(v) ? v.re : v;
  }
  function rowsValue(text, sep) {
    return String(text || '')
      .split(sep || /[\s,;]+/)
      .filter(function (t) { return t.trim() !== ''; })
      .map(function (t) { return t.trim(); });
  }

  /* compact number pad — the workspace shows exactly one at a time */
  function numPad(onKey, onClear, onDel, app) {
    var wrap = el('div', 'minipad');
    ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '(-)'].forEach(function (label) {
      var b = el('button', 'mp-key', label);
      b.type = 'button';
      b.addEventListener('click', function () {
        onKey(label === '(-)' ? '-' : label);
      });
      wrap.appendChild(b);
    });
    var row = el('div', 'minipad-actions');
    var del = el('button', 'mp-key mp-del', 'DEL');
    del.type = 'button';
    del.addEventListener('click', onDel);
    var ac = el('button', 'mp-key mp-ac', 'AC');
    ac.type = 'button';
    ac.addEventListener('click', onClear);
    row.appendChild(del); row.appendChild(ac);
    wrap.appendChild(row);
    return wrap;
  }

  /* ============================================================
     CALCULATE
     ============================================================ */
  var Calculate = {
    id: 'calc', name: 'Calculate', icon: '=', color: '#5aa9ff',
    desc: 'Basic arithmetic and functions',
    models: ['esplus', 'explus', 'cw'],
    render: function (root, app) {
      var p = panel(root);
      head(p, 'Calculate', 'Type an expression and press =');
      var box = outBox(p);
      root.appendChild(p);

      app.calcBind(box);
      return { onKey: function (k) { app.calcKey(k); } };
    }
  };

  /* ============================================================
     COMPLEX
     ============================================================ */
  var ComplexMode = {
    id: 'complex', name: 'Complex', icon: 'i', color: '#a78bfa',
    desc: 'a+bi arithmetic, polar form',
    models: ['esplus', 'explus', 'cw'],
    render: function (root, app) {
      var p = panel(root);
      head(p, 'Complex', 'Results in a+bi unless you pick polar');
      var fmt = select([['rect', 'a+bi (rectangular)'], ['polar', 'r∠θ (polar)']], app.state.complexFormat);
      fmt.addEventListener('change', function () {
        app.state.complexFormat = fmt.value;
        app.calcReformat();
      });
      p.appendChild(field('Display', fmt));
      var box = outBox(p);
      root.appendChild(p);
      app.calcBind(box);
      return { onKey: function (k) { app.calcKey(k); } };
    }
  };

  /* ============================================================
     BASE-N
     ============================================================ */
  var BaseNMode = {
    id: 'basen', name: 'Base-N', icon: '01', color: '#34d399',
    desc: 'DEC / HEX / BIN / OCT',
    models: ['esplus', 'explus', 'cw'],
    render: function (root, app) {
      var p = panel(root);
      head(p, 'Base-N', 'Choose the input base, then type digits');
      var base = select([['10', 'DEC (10)'], ['16', 'HEX (16)'], ['2', 'BIN (2)'], ['8', 'OCT (8)']],
        String(app.state.baseInput || 10));
      var mode = select([['signed', 'Signed (two’s complement off)'], ['unsigned', 'Word size 32-bit']],
        app.state.baseWord || 'signed');

      var pad = el('div', 'numpad');
      var expr = el('div', 'basen-expr', '0');
      var out = el('div', 'mode-out');

      var value = { dec: 0, text: '0' };

      function refresh() {
        expr.textContent = value.text || '0';
        var b = parseInt(base.value, 10);
        var dec = value.dec;
        out.innerHTML =
          '<div class="basen-grid">' +
          row('<b>DEC</b>', String(dec)) +
          row('<b>HEX</b>', E.BaseN.fromDecimal(dec, 16)) +
          row('<b>BIN</b>', E.BaseN.fromDecimal(dec, 2)) +
          row('<b>OCT</b>', E.BaseN.fromDecimal(dec, 8)) +
          '</div>';
        out.classList.remove('is-error');
        pad.querySelectorAll('[data-digit]').forEach(function (b2) {
          var d = parseInt(b2.dataset.digit, 16);
          var valid = d < b;
          b2.disabled = !valid;
        });
      }
      function row(a, b) { return '<div class="basen-row"><span>' + a + '</span><code>' + b + '</code></div>'; }

      base.addEventListener('change', function () {
        value.text = '0'; value.dec = 0; refresh();
      });

      function pushDigit(d) {
        if (value.text === '0') value.text = '';
        value.text += d;
        try {
          value.dec = E.BaseN.toDecimal(value.text, parseInt(base.value, 10));
        } catch (e) {
          app.toast('Invalid digit for this base');
        }
        refresh();
      }

      p.appendChild(field('Input base', base));
      p.appendChild(field('Word size', mode));
      p.appendChild(expr);

      var digits = '0123456789ABCDEF'.split('');
      digits.forEach(function (d) {
        var b = el('button', 'np-key', d);
        b.type = 'button';
        b.dataset.digit = d;
        b.addEventListener('click', function () { pushDigit(d); });
        pad.appendChild(b);
      });
      var ops = [
        ['+', function () { applyOp('+'); }],
        ['−', function () { applyOp('-'); }],
        ['AND', function () { applyOp('&'); }],
        ['OR', function () { applyOp('|'); }],
        ['XOR', function () { applyOp('^'); }],
        ['NOR', function () { applyOp('nor'); }],
        ['DEL', function () {
          value.text = value.text.slice(0, -1) || '0';
          value.dec = E.BaseN.toDecimal(value.text || '0', parseInt(base.value, 10));
          refresh();
        }],
        ['AC', function () { value.text = '0'; value.dec = 0; refresh(); }]
      ];
      ops.forEach(function (o) {
        var b = el('button', 'np-key np-op', o[0]);
        b.type = 'button';
        b.addEventListener('click', o[1]);
        pad.appendChild(b);
      });

      /* binary operations via a pending slot */
      var pending = null;
      function applyOp(op) {
        if (pending === null) {
          pending = { op: op, a: value.dec };
          value.text = '0'; value.dec = 0;
          refresh();
          expr.textContent = E.BaseN.fromDecimal(pending.a, parseInt(base.value, 10)) + ' ' + op;
          return;
        }
        var a = pending.a, b = value.dec, res = 0, opName = pending.op;
        switch (opName) {
          case '+': res = a + b; break;
          case '-': res = a - b; break;
          case '&': res = a & b; break;
          case '|': res = a | b; break;
          case '^': res = a ^ b; break;
          case 'nor': res = ~(a | b); break;
        }
        value.dec = res;
        value.text = E.BaseN.fromDecimal(res, parseInt(base.value, 10));
        pending = null;
        refresh();
      }

      p.appendChild(pad);
      p.appendChild(out);
      root.appendChild(p);
      refresh();
    }
  };

  /* ============================================================
     STATISTICS
     ============================================================ */
  var Statistics = {
    id: 'stat', name: 'Statistics', icon: 'σ', color: '#fbbf24',
    desc: '1-var & 2-var, regression',
    models: ['esplus', 'explus', 'cw'],
    render: function (root, app) {
      var p = panel(root);
      head(p, 'Statistics', 'Paste lists of numbers; commas or spaces');
      var type = select([
        ['1', '1-Variable'],
        ['2', '2-Variable (x, y)']
      ], app.state.statType || '1');
      var freqOn = app.settings && app.settings().freq;
      var xs = input({ placeholder: 'x:  1, 2, 3, 4', value: app.state.statX || '' });
      var fs = input({ placeholder: 'freq: 1, 2, 1, 3', value: app.state.statF || '' });
      var fWrap = field('frequency', fs);
      fWrap.style.display = freqOn ? '' : 'none';
      var ys = input({ placeholder: 'y:  2, 4, 6, 8', value: app.state.statY || '' });
      var yWrap = field('y values', ys);
      var regWrap = el('div', 'fld-group');

      var reg = select([['lin', 'Linear  y = a·x + b'], ['quad', 'Quadratic  y = a·x² + b·x + c']],
        app.state.statReg || 'lin');
      var stats = el('div', 'stat-grid');

      function update() {
        yWrap.style.display = type.value === '2' ? '' : 'none';
        regWrap.style.display = type.value === '2' ? '' : 'none';
        var xv = [], yv = [];
        try { xv = rowsValue(xs.value).map(parseNum); } catch (e) { app.toast('Check x values'); }
        try { yv = rowsValue(ys.value).map(parseNum); } catch (e) { app.toast('Check y values'); }
        if (!xv.length) { stats.innerHTML = '<div class="out-empty">Enter values to see statistics</div>'; return; }

        /* Frequency ON weights each x by its frequency column */
        var fv = [];
        if (freqOn && fs.value.trim()) {
          try { fv = rowsValue(fs.value).map(parseNum); } catch (e) { app.toast('Check frequency values'); }
          if (fv.length !== xv.length) { fv = []; app.toast('Frequency count must match x count'); }
          if (fv.length) {
            var expanded = [];
            xv.forEach(function (x, i) {
              var k = Math.round(fv[i]) || 0;
              for (var j = 0; j < k; j++) expanded.push(x);
            });
            xv = expanded;
          }
        }
        var s = E.Stat.summary(xv);
        var html = grid([
          ['n', s.n], ['Σx', s.sum], ['Σx²', s.sumSq], ['x̄', s.mean],
          ['median', s.median], ['mode', E.Stat.mode(xv)],
          ['σx (pop)', s.sdP], ['sx (samp)', s.sdS],
          ['min', s.min], ['Q1', E.Stat.q1(xv)],
          ['Q3', E.Stat.q3(xv)], ['max', s.max]
        ]);
        if (type.value === '2' && yv.length === xv.length && xv.length > 1) {
          var sy = E.Stat.summary(yv);
          html += grid([['Σy', sy.sum], ['Σy²', sy.sumSq], ['ȳ', sy.mean], ['σy', sy.sdP], ['sy', sy.sdS]]);
          try {
            if (reg.value === 'lin') {
              var r = E.Stat.linearRegression(xv, yv);
              html += '<div class="reg-box"><b>Linear regression</b>' +
                '<code>y = ' + fmt(r.a) + 'x + ' + fmt(r.b) + '</code>' +
                '<span>r = ' + fmt(r.r) + ' · r² = ' + fmt(r.r2) + '</span></div>';
            } else {
              var q = E.Stat.quadraticRegression(xv, yv);
              html += '<div class="reg-box"><b>Quadratic regression</b>' +
                '<code>y = ' + fmt(q.a) + 'x² + ' + fmt(q.b) + 'x + ' + fmt(q.c) + '</code></div>';
            }
          } catch (e) { /* not enough data */ }
        }
        stats.innerHTML = html;
        app.state.statX = xs.value; app.state.statY = ys.value; app.state.statF = fs.value;
        app.state.statType = type.value; app.state.statReg = reg.value;
      }
      function fmt(v) { return E.formatValue(v, { format: 'norm' }); }
      function grid(items) {
        return '<div class="stat-grid-inner">' + items.map(function (it) {
          return '<div class="stat-cell"><span>' + it[0] + '</span><b>' + fmt(it[1]) + '</b></div>';
        }).join('') + '</div>';
      }

      type.addEventListener('change', update);
      reg.addEventListener('change', update);
      xs.addEventListener('input', update);
      ys.addEventListener('input', update);
      fs.addEventListener('input', update);

      p.appendChild(field('Data type', type));
      p.appendChild(field('x values', xs));
      p.appendChild(fWrap);
      p.appendChild(yWrap);
      regWrap.appendChild(field('Regression', reg));
      p.appendChild(regWrap);
      p.appendChild(stats);
      root.appendChild(p);

      /* distribution calculator */
      var dp = panel(root);
      head(dp, 'Distribution', 'Normal distribution helpers');
      var dsel = select([['npd', 'P(x)  probability density'],
                         ['ncd', 'Q(x)  lower cumulative'],
                         ['ncdf', 'between a and b'],
                         ['inv', 'inverse normal (p → x)']], 'npd');
      var dselLabel = { npd: 'P(x)', ncd: 'Q(x)', ncdf: 'Q(b) − Q(a)', inv: 'x from p' };
      var mu = input({ placeholder: 'μ = 0', value: '0' });
      var sd = input({ placeholder: 'σ = 1', value: '1' });
      var xx = input({ placeholder: 'x = 1', value: '1' });
      var bb = input({ placeholder: 'b = 2', value: '2' });
      var dout = outBox(dp);
      function dUpdate() {
        try {
          var m = parseNum(mu.value), s = parseNum(sd.value);
          var x = parseNum(xx.value), b = parseNum(bb.value);
          if (s <= 0) throw new Error('σ must be > 0');
          var v;
          if (dsel.value === 'npd') v = E.Stat.normalPdf(x, m, s);
          else if (dsel.value === 'ncd') v = E.Stat.normalCdf(x, m, s);
          else if (dsel.value === 'ncdf') v = E.Stat.normalCdf(b, m, s) - E.Stat.normalCdf(x, m, s);
          else v = m + s * E.Stat.normalInv(x);
          setOut(dout, '<span class="out-label">' + (dselLabel[dsel.value] || dsel.value) + '</span><b>' + E.formatValue(v, { format: 'norm' }) + '</b>');
        } catch (e) {
          setOut(dout, e.message, true);
        }
      }
      [mu, sd, xx, bb].forEach(function (i) { i.addEventListener('input', dUpdate); });
      dsel.addEventListener('change', function () {
        bb.parentNode.style.display = (dsel.value === 'ncdf') ? '' : 'none';
        dUpdate();
      });
      dp.appendChild(field('Function', dsel));
      dp.appendChild(field('μ (mean)', mu));
      dp.appendChild(field('σ (sd)', sd));
      dp.appendChild(field('x / p', xx));
      var bWrap = field('b (upper)', bb);
      bWrap.style.display = 'none';
      dp.appendChild(bWrap);
      dp.appendChild(dout);
      root.appendChild(dp);
      update(); dUpdate();
    }
  };

  /* ============================================================
     MATRIX
     ============================================================ */
  var MatrixMode = {
    id: 'matrix', name: 'Matrix', icon: '▦', color: '#f472b6',
    desc: 'Define up to 4 matrices, compute',
    models: ['esplus', 'explus', 'cw'],
    render: function (root, app) {
      var p = panel(root);
      head(p, 'Matrix', 'Define matrices, then compute with A, B, C');
      var mats = app.state.matrices || (app.state.matrices = {
        A: [[1, 2], [3, 4]],
        B: [[5, 6], [7, 8]],
        C: [[1, 0], [0, 1]]
      });
      var current = 'A';
      var size = { r: mats.A.length, c: mats.A[0].length };

      var tabs = el('div', 'seg-tabs');
      ['A', 'B', 'C'].forEach(function (name, idx) {
        var b = el('button', 'seg' + (idx === 0 ? ' active' : ''), 'Matrix ' + name);
        b.type = 'button';
        b.addEventListener('click', function () {
          current = name;
          tabs.querySelectorAll('.seg').forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          size = { r: mats[name].length, c: mats[name][0].length };
          rr.value = size.r; cc.value = size.c;
          buildGrid();
        });
        tabs.appendChild(b);
      });

      var rr = select([['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']], '2');
      var cc = select([['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']], '2');
      var grid = el('div', 'matrix-grid');
      var mout = outBox(p);

      function buildGrid() {
        var r = parseInt(rr.value, 10), c = parseInt(cc.value, 10);
        var old = mats[current];
        var fresh = [];
        for (var i = 0; i < r; i++) {
          fresh[i] = [];
          for (var j = 0; j < c; j++) {
            fresh[i][j] = (old[i] && old[i][j] !== undefined) ? old[i][j] : 0;
          }
        }
        mats[current] = fresh;
        grid.style.gridTemplateColumns = 'repeat(' + c + ', minmax(0,1fr))';
        grid.innerHTML = '';
        for (var i2 = 0; i2 < r; i2++) {
          for (var j2 = 0; j2 < c; j2++) {
            (function (i3, j3) {
              var inp = input({ value: String(mats[current][i3][j3]), cls: 'matrix-cell' });
              inp.addEventListener('input', function () {
                mats[current][i3][j3] = parseFloat(inp.value) || 0;
                writeBack();
              });
              grid.appendChild(inp);
            })(i2, j2);
          }
        }
      }
      function writeBack() { app.saveState && app.saveState(); }

      rr.addEventListener('change', buildGrid);
      cc.addEventListener('change', buildGrid);

      var opSel = select([
        ['detA', 'det(A)'], ['invA', 'A⁻¹'], ['trA', 'tr(A)'], ['tA', 'Aᵀ'],
        ['A+B', 'A + B'], ['A-B', 'A − B'], ['A×B', 'A × B'], ['kA', 'k × A'],
        ['detB', 'det(B)'], ['invB', 'B⁻¹'],
        ['system', 'Solve A·X = B (n×n)']
      ], 'detA');
      var kInp = input({ value: '2', placeholder: 'k' });
      kInp.parentNode && 0;

      function compute() {
        try {
          var A = mats.A, B = mats.B;
          var res, html;
          function sameSize(X, Y) {
            return X.length === Y.length && X[0].length === Y[0].length;
          }
          switch (opSel.value) {
            case 'detA': res = E.Matrix.det(A); html = num(res); break;
            case 'detB': res = E.Matrix.det(B); html = num(res); break;
            case 'trA': res = E.Matrix.trace(A); html = num(res); break;
            case 'tA': html = mat(E.Matrix.transpose(A)); break;
            case 'invA':
              if (A.length !== A[0].length) throw new Error('A must be square');
              html = mat(E.Matrix.inv(A)); break;
            case 'invB': html = mat(E.Matrix.inv(B)); break;
            case 'A+B':
              if (!sameSize(A, B)) throw new Error('A and B must be the same size');
              html = mat(E.Matrix.add(A, B)); break;
            case 'A-B':
              if (!sameSize(A, B)) throw new Error('A and B must be the same size');
              html = mat(E.Matrix.sub(A, B)); break;
            case 'A×B':
              if (A[0].length !== B.length) throw new Error('Columns of A must equal rows of B');
              html = mat(E.Matrix.mul(A, B)); break;
            case 'kA': html = mat(E.Matrix.scalar(A, parseFloat(kInp.value) || 0)); break;
            case 'system': {
              var n = A.length;
              if (A.some(function (r2) { return r2.length !== n; })) throw new Error('A must be square');
              if (B.length < n || B[0].length < 1) throw new Error('Set B to ' + n + ' rows × 1 column');
              var bvec = B.slice(0, n).map(function (r2) { return r2[0]; });
              var sol = E.Matrix.solveLinear(A, bvec);
              if (!sol) throw new Error('No unique solution');
              html = sol.map(function (v, i) { return '<div class="sys-row">x' + (i + 1) + ' = <b>' + num(v) + '</b></div>'; }).join('');
              break;
            }
          }
          setOut(mout, html || '');
        } catch (err) {
          setOut(mout, err.message, true);
        }
      }
      function num(v) { return '<b>' + E.formatValue(v, { format: 'norm' }) + '</b>'; }
      function mat(M) {
        return '<div class="mat-render" style="grid-template-columns:repeat(' + M[0].length + ',auto)">' +
          M.map(function (r2) {
            return r2.map(function (v) { return '<span>' + E.formatValue(v, { format: 'norm' }) + '</span>'; }).join('');
          }).join('') + '</div>';
      }

      p.appendChild(tabs);
      var sizeRow = el('div', 'fld-row');
      sizeRow.appendChild(field('rows', rr));
      sizeRow.appendChild(field('cols', cc));
      p.appendChild(sizeRow);
      p.appendChild(grid);

      var opRow = el('div', 'fld-row');
      opRow.appendChild(field('Operation', opSel));
      opRow.appendChild(field('k', kInp));
      p.appendChild(opRow);

      var b = btn('Compute', 'primary', compute);
      p.appendChild(b);
      p.appendChild(mout);
      root.appendChild(p);

      /* equation solver */
      var ep = panel(root);
      head(ep, 'Equation', 'Polynomial roots (real & complex)');
      var deg = select([['2', 'Quadratic  ax² + bx + c = 0'], ['3', 'Cubic  ax³ + bx² + cx + d = 0']], '2');
      var coefs = {};
      var coefWrap = el('div', 'coef-grid');
      var eout = outBox(ep);
      function buildCoefs() {
        coefWrap.innerHTML = '';
        var list = deg.value === '2' ? ['a', 'b', 'c'] : ['a', 'b', 'c', 'd'];
        list.forEach(function (name) {
          var i = input({ value: coefs[name] !== undefined ? coefs[name] : '1', placeholder: name });
          i.addEventListener('input', function () { coefs[name] = i.value; solveEq(); });
          coefs[name] = coefs[name] === undefined ? '1' : coefs[name];
          coefWrap.appendChild(field(name, i));
        });
      }
      function solveEq() {
        try {
          var a = parseNum(coefs.a || 0), b2 = parseNum(coefs.b || 0), c2 = parseNum(coefs.c || 0);
          if (deg.value === '2') {
            if (Math.abs(a) < 1e-14) {
              if (Math.abs(b2) < 1e-14) throw new Error('Not an equation');
              setOut(eout, 'x = <b>' + E.formatValue(-c2 / b2, { format: 'norm' }) + '</b>');
              return;
            }
            var disc = b2 * b2 - 4 * a * c2;
            var r1, r2;
            if (disc >= 0) {
              r1 = (-b2 + Math.sqrt(disc)) / (2 * a);
              r2 = (-b2 - Math.sqrt(disc)) / (2 * a);
              setOut(eout, 'x₁ = <b>' + E.formatValue(r1, { format: 'norm' }) + '</b><br>x₂ = <b>' + E.formatValue(r2, { format: 'norm' }) + '</b>');
            } else {
              var re = -b2 / (2 * a), im = Math.sqrt(-disc) / (2 * a);
              var z1 = E.C.make(re, im), z2 = E.C.make(re, -im);
              setOut(eout, 'x₁ = <b>' + E.formatValue(z1, { format: 'norm', complex: true }) + '</b><br>x₂ = <b>' + E.formatValue(z2, { format: 'norm', complex: true }) + '</b>');
            }
          } else {
            var d2 = parseNum(coefs.d || 0);
            var roots = cubicRoots(a, b2, c2, d2);
            setOut(eout, roots.map(function (z, i) {
              return 'x' + (i + 1) + ' = <b>' + E.formatValue(z, { format: 'norm', complex: true }) + '</b>';
            }).join('<br>'));
          }
        } catch (e) { setOut(eout, e.message, true); }
      }
      deg.addEventListener('change', function () { buildCoefs(); solveEq(); });
      ep.appendChild(field('Degree', deg));
      ep.appendChild(coefWrap);
      ep.appendChild(eout);
      root.appendChild(ep);
      buildCoefs(); solveEq();
      buildGrid(); compute();
    }
  };

  /* cubic solver (Cardano + complex) */
  function cubicRoots(a, b, c, d) {
    if (Math.abs(a) < 1e-14) throw new Error('a cannot be 0');
    var p = b / a, q = c / a, r = d / a;
    var Q = (3 * q - p * p) / 9;
    var R = (9 * p * q - 27 * r - 2 * p * p * p) / 54;
    var D = Q * Q * Q + R * R;
    var zs = [];
    if (D >= 0) {
      var sQ = Math.sqrt(D);
      var S = Math.cbrt(R + sQ);
      var T = Math.cbrt(R - sQ);
      zs.push(E.C.make(S + T - p / 3, 0));
      var realPart = -(S + T) / 2 - p / 3;
      var imagPart = (S - T) * Math.sqrt(3) / 2;
      zs.push(E.C.make(realPart, imagPart));
      zs.push(E.C.make(realPart, -imagPart));
    } else {
      var theta = Math.acos(R / Math.sqrt(-(Q * Q * Q)));
      var twoSqrtQ = 2 * Math.sqrt(-Q);
      for (var k = 0; k < 3; k++) {
        zs.push(E.C.make(twoSqrtQ * Math.cos((theta + 2 * Math.PI * k) / 3) - p / 3, 0));
      }
    }
    return zs.map(function (z) { return E.C.clean(z); });
  }

  /* ============================================================
     VECTOR
     ============================================================ */
  var VectorMode = {
    id: 'vector', name: 'Vector', icon: '→', color: '#38bdf8',
    desc: '3-D vectors, dot & cross product',
    models: ['esplus', 'explus', 'cw'],
    render: function (root, app) {
      var p = panel(root);
      head(p, 'Vector', 'Vectors in 3-D (x, y, z)');
      var vs = app.state.vectors || (app.state.vectors = {
        a: [1, 2, 3], b: [4, 5, 6]
      });
      var rows = el('div', 'vec-inputs');
      ['a', 'b'].forEach(function (name) {
        var line = el('div', 'vec-line');
        line.appendChild(el('span', 'vec-name', name));
        ['x', 'y', 'z'].forEach(function (axis, i) {
          var inp = input({ value: String(vs[name][i]), cls: 'vec-cell' });
          inp.addEventListener('input', function () {
            vs[name][i] = parseFloat(inp.value) || 0;
            compute();
          });
          line.appendChild(inp);
        });
        rows.appendChild(line);
      });
      var opSel = select([
        ['a+b', 'a + b'], ['a-b', 'a − b'], ['dot', 'a · b'],
        ['cross', 'a × b'], ['absA', '|a|'], ['absB', '|b|'],
        ['angle', 'Angle between a and b'], ['unitA', 'Unit vector â']
      ], 'dot');
      var out = outBox(p);

      function compute() {
        var a = vs.a, b = vs.b;
        var r;
        switch (opSel.value) {
          case 'a+b': r = a.map(function (v, i) { return v + b[i]; }); break;
          case 'a-b': r = a.map(function (v, i) { return v - b[i]; }); break;
          case 'dot': r = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; break;
          case 'cross': r = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; break;
          case 'absA': r = Math.hypot(a[0], a[1], a[2]); break;
          case 'absB': r = Math.hypot(b[0], b[1], b[2]); break;
          case 'angle': {
            var dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
            var den = Math.hypot(a[0], a[1], a[2]) * Math.hypot(b[0], b[1], b[2]);
            r = den ? Math.acos(dot / den) * 180 / Math.PI : 0;
            break;
          }
          case 'unitA': {
            var m = Math.hypot(a[0], a[1], a[2]) || 1;
            r = a.map(function (v) { return v / m; });
            break;
          }
        }
        var fmtV = E.formatValue;
        if (Array.isArray(r)) {
          setOut(out, '<b>(' + r.map(function (v) { return fmtV(v, { format: 'norm' }); }).join(', ') + ')</b>');
        } else {
          setOut(out, (opSel.value === 'angle' ? '<span class="out-label">θ in degrees</span>' : '') +
            '<b>' + fmtV(r, { format: 'norm' }) + '</b>');
        }
      }
      opSel.addEventListener('change', compute);
      p.appendChild(rows);
      p.appendChild(field('Operation', opSel));
      p.appendChild(out);
      root.appendChild(p);
      compute();
    }
  };

  /* ============================================================
     EQUATION (standalone quadratic/cubic + linear system)
     ============================================================ */
  var EquationMode = {
    id: 'equation', name: 'Equation', icon: 'x²', color: '#fb923c',
    desc: 'Simultaneous, quadratic → quartic',
    models: ['esplus', 'explus', 'cw'],
    render: function (root, app) {
      var p = panel(root);
      head(p, 'Polynomial', 'Roots of a polynomial equation');
      var deg = select([['2', 'ax² + bx + c = 0'], ['3', 'ax³ + bx² + cx + d = 0'],
                        ['4', 'ax⁴ + bx³ + cx² + dx + e = 0']], app.state.eqDegree || '2');
      var box = el('div', 'coef-grid');
      var vals = app.state.eqCoefs || { a: '1', b: '0', c: '-4', d: '0', e: '0' };
      var out = outBox(p);
      var labels = ['a', 'b', 'c', 'd', 'e'];

      function build() {
        box.innerHTML = '';
        var n = parseInt(deg.value, 10);
        for (var i = 0; i < n + 1; i++) {
          (function (name) {
            var inp = input({ value: vals[name] !== undefined ? vals[name] : (name === 'a' ? '1' : '0') });
            inp.addEventListener('input', function () {
              vals[name] = inp.value;
              app.state.eqCoefs = vals;
              run();
            });
            box.appendChild(field(name, inp));
          })(labels[i]);
        }
      }
      function run() {
        try {
          var n = parseInt(deg.value, 10);
          var coeffs = [];
          for (var i = 0; i <= n; i++) coeffs.push(parseNum(vals[labels[i]] || '0'));
          if (Math.abs(coeffs[0]) < 1e-14) throw new Error('a cannot be 0');
          var roots = E.polyRoots(coeffs);
          var html = roots.map(function (z, i) {
            var c = E.C.clean(z);
            return '<div class="root-row"><span>x' + (i + 1) + ' =</span><b>' +
              E.formatValue(c, { format: 'norm', complex: true }) + '</b></div>';
          }).join('');
          setOut(out, html);
          app.state.eqDegree = deg.value;
        } catch (e) { setOut(out, e.message, true); }
      }
      deg.addEventListener('change', function () { build(); run(); });
      p.appendChild(field('Type', deg));
      p.appendChild(box);
      p.appendChild(out);
      root.appendChild(p);

      /* number pad that types into whichever coefficient box was touched */
      var padApi = attachPad(p, function () {
        return Array.prototype.slice.call(box.querySelectorAll('input'));
      }, app);
      deg.addEventListener('change', function () { setTimeout(padApi.rebind, 0); });
      build(); run();

      /* simultaneous linear equations */
      var sp = panel(root);
      head(sp, 'Simultaneous', 'a₁x + b₁y + … = d₁');
      var nSel = select([['2', '2 unknowns'], ['3', '3 unknowns'], ['4', '4 unknowns']], app.state.simSize || '2');
      var host = el('div', 'sim-host');
      var sout = outBox(sp);
      var grid = {};
      function buildSim() {
        host.innerHTML = '';
        grid = {};
        var n = parseInt(nSel.value, 10);
        for (var i = 0; i < n; i++) {
          var line = el('div', 'sim-line');
          for (var j = 0; j < n + 1; j++) {
            if (j === n) line.appendChild(el('span', 'sim-plus', '='));
            else if (j > 0) line.appendChild(el('span', 'sim-plus', '+'));
            var inp = input({ value: '0', cls: 'sim-cell' });
            grid[i + ',' + j] = inp;
            line.appendChild(inp);
          }
          var span = el('span', 'sim-tag', '(' + (i + 1) + ')');
          host.appendChild(line);
        }
        simRun();
      }
      function simRun() {
        try {
          var n = parseInt(nSel.value, 10);
          var A = [], b = [];
          for (var i = 0; i < n; i++) {
            A[i] = [];
            for (var j = 0; j < n; j++) A[i][j] = parseFloat(grid[i + ',' + j].value) || 0;
            b[i] = parseFloat(grid[i + ',' + n].value) || 0;
          }
          var sol = E.Matrix.solveLinear(A, b);
          if (!sol) throw new Error('No unique solution');
          setOut(sout, sol.map(function (v, i) {
            return '<div class="root-row"><span>x' + (i + 1) + ' =</span><b>' +
              E.formatValue(v, { format: 'norm' }) + '</b></div>';
          }).join(''));
          app.state.simSize = nSel.value;
        } catch (e) { setOut(sout, e.message, true); }
      }
      host.addEventListener('input', simRun);
      nSel.addEventListener('change', buildSim);
      sp.appendChild(field('Size', nSel));
      sp.appendChild(host);
      sp.appendChild(sout);
      root.appendChild(sp);
      buildSim();
    }
  };

  /* ============================================================
     INEQUALITY
     ============================================================ */
  var InequalityMode = {
    id: 'inequality', name: 'Inequality', icon: '≤', color: '#60a5fa',
    desc: 'Solve ax²+bx+c ≤ 0 etc.',
    models: ['esplus', 'explus', 'cw'],
    render: function (root, app) {
      var p = panel(root);
      head(p, 'Inequality', 'Solution range for an inequality');
      var deg = select([['2', '2nd degree'], ['3', '3rd degree'], ['4', '4th degree']], app.state.ineqDegree || '2');
      var rel = select([['>', '> 0'], ['≥', '≥ 0'], ['<', '< 0'], ['≤', '≤ 0']], app.state.ineqRel || '<');
      var box = el('div', 'coef-grid');
      var out = outBox(p);
      var labels = ['a', 'b', 'c', 'd', 'e'];
      var vals = app.state.ineqCoefs || { a: '1', b: '0', c: '-4', d: '0', e: '0' };

      function build() {
        box.innerHTML = '';
        var n = parseInt(deg.value, 10);
        for (var i = 0; i < n + 1; i++) {
          (function (name) {
            var inp = input({ value: vals[name] !== undefined ? vals[name] : (name === 'a' ? '1' : '0') });
            inp.addEventListener('input', function () { vals[name] = inp.value; run(); });
            box.appendChild(field(name, inp));
          })(labels[i]);
        }
      }
      function run() {
        try {
          var n = parseInt(deg.value, 10);
          var coeffs = [];
          for (var i = 0; i <= n; i++) coeffs.push(parseNum(vals[labels[i]] || '0'));
          if (Math.abs(coeffs[0]) < 1e-14) throw new Error('a cannot be 0');
          var sol = E.solveInequality(coeffs, rel.value);
          var txt = E.inequalityText(sol);
          setOut(out, '<b>' + txt + '</b>' +
            '<div class="out-sub">' + (sol.length ? sol.length + ' interval(s)' : 'empty set') + '</div>');
          app.state.ineqCoefs = vals; app.state.ineqDegree = deg.value; app.state.ineqRel = rel.value;
        } catch (e) { setOut(out, e.message, true); }
      }
      deg.addEventListener('change', function () { build(); run(); });
      rel.addEventListener('change', run);
      p.appendChild(field('Degree', deg));
      p.appendChild(field('Relation', rel));
      p.appendChild(box);
      p.appendChild(out);
      root.appendChild(p);
      build(); run();
    }
  };

  /* ============================================================
     DISTRIBUTION (normal / binomial / poisson)
     ============================================================ */
  var DistMode = {
    id: 'dist', name: 'Distribution', icon: 'Φ', color: '#f0abfc',
    desc: 'Normal, binomial, Poisson',
    models: ['esplus', 'explus', 'cw'],
    render: function (root, app) {
      var p = panel(root);
      head(p, 'Distribution', 'Probability functions');
      var kind = select([
        ['normal', 'Normal distribution'],
        ['binomial', 'Binomial distribution'],
        ['poisson', 'Poisson distribution']
      ], app.state.distKind || 'normal');
      var fnSel = select([], 'pd');
      var argsHost = el('div', 'fld-row');
      var out = outBox(p);

      var ARGS = {
        normal: [['mu', 'μ mean', '0'], ['sd', 'σ sd', '1'], ['x', 'x / lower', '1'], ['b', 'b upper', '2']],
        binomial: [['n', 'n trials', '10'], ['p', 'p prob', '0.5'], ['x', 'x value', '3']],
        poisson: [['lam', 'λ mean', '3'], ['x', 'x value', '2']]
      };

      var inputs = {};

      function buildFns() {
        fnSel.innerHTML = '';
        var opts = kind.value === 'normal'
          ? [['pd', 'P(x)  probability density'], ['cd', 'Q(x)  cumulative ≤ x'],
             ['between', 'Q(b) − Q(a)'], ['inv', 'inverse (p → x)']]
          : kind.value === 'binomial'
            ? [['pd', 'P(x = k)'], ['cd', 'P(x ≤ k)'], ['between', 'P(a ≤ x ≤ b)']]
            : [['pd', 'P(x = k)'], ['cd', 'P(x ≤ k)'], ['between', 'P(a ≤ x ≤ b)']];
        opts.forEach(function (o) {
          var op = document.createElement('option');
          op.value = o[0]; op.textContent = o[1];
          fnSel.appendChild(op);
        });
        fnSel.value = 'pd';
      }

      function buildArgs() {
        argsHost.innerHTML = '';
        inputs = {};
        var list = ARGS[kind.value];
        list.forEach(function (a) {
          var inp = input({ value: app.state['dist_' + kind.value + '_' + a[0]] || a[2] });
          inputs[a[0]] = inp;
          inp.addEventListener('input', function () {
            app.state['dist_' + kind.value + '_' + a[0]] = inp.value;
            run();
          });
          argsHost.appendChild(field(a[1], inp));
        });
        run();
      }

      function run() {
        try {
          var f = fnSel.value;
          var v;
          if (kind.value === 'normal') {
            var mu = parseNum(inputs.mu.value), sd = parseNum(inputs.sd.value);
            var x = parseNum(inputs.x.value), b = parseNum(inputs.b ? inputs.b.value : '0');
            if (sd <= 0) throw new Error('σ must be > 0');
            if (f === 'pd') v = E.Stat.normalPdf(x, mu, sd);
            else if (f === 'cd') v = E.Stat.normalCdf(x, mu, sd);
            else if (f === 'between') v = E.Stat.normalCdf(b, mu, sd) - E.Stat.normalCdf(x, mu, sd);
            else v = mu + sd * E.Stat.normalInv(x);
          } else if (kind.value === 'binomial') {
            var n = Math.round(parseNum(inputs.n.value));
            var pp = parseNum(inputs.p.value);
            var k = Math.round(parseNum(inputs.x.value));
            if (pp < 0 || pp > 1) throw new Error('0 ≤ p ≤ 1');
            if (f === 'pd') v = E.Dist.binomialPdf(k, n, pp);
            else if (f === 'cd') v = E.Dist.binomialCdf(k, n, pp);
            else {
              v = 0;
              for (var i = 0; i <= k; i++) v += E.Dist.binomialPdf(i, n, pp);
            }
          } else {
            var lam = parseNum(inputs.lam.value);
            var kk = Math.round(parseNum(inputs.x.value));
            if (lam <= 0) throw new Error('λ must be > 0');
            v = f === 'pd' ? E.Dist.poissonPdf(kk, lam) : E.Dist.poissonCdf(kk, lam);
          }
          setOut(out, '<span class="out-label">' + fnSel.options[fnSel.selectedIndex].text + '</span><b>' +
            E.formatValue(v, { format: 'norm' }) + '</b>');
        } catch (e) { setOut(out, e.message, true); }
      }

      kind.addEventListener('change', function () { buildFns(); buildArgs(); });
      fnSel.addEventListener('change', run);
      p.appendChild(field('Type', kind));
      p.appendChild(field('Function', fnSel));
      p.appendChild(argsHost);
      p.appendChild(out);
      root.appendChild(p);
      buildFns(); buildArgs();
    }
  };

  /* ============================================================
     SPREADSHEET
     ============================================================ */
  var SpreadsheetMode = {
    id: 'spreadsheet', name: 'Spreadsheet', icon: '▦', color: '#4ade80',
    desc: 'Cells with =A1+B1 formulas',
    models: ['esplus', 'explus', 'cw'],
    render: function (root, app) {
      var p = panel(root);
      head(p, 'Spreadsheet', 'Type numbers or formulas like =A1+B1');
      var raw = app.state.sheet || [
        ['1', '2', '=A1+B1', '', ''],
        ['4', '5', '=A2+B2', '', ''],
        ['=SUM(A1:A2)', '', '', '', '']
      ];
      var rows = 8, cols = 5;

      var bar = el('div', 'sheet-bar');
      var addr = el('span', 'sheet-addr', 'A1');
      var fx = input({ placeholder: 'value or =formula', cls: 'sheet-input' });
      bar.appendChild(addr);
      bar.appendChild(fx);

      var table = el('div', 'sheet-grid');
      table.style.gridTemplateColumns = '26px repeat(' + cols + ', minmax(0,1fr))';

      var cells = [];
      var active = { r: 0, c: 0 };

      function header() {
        var h = el('div', 'sheet-head', '');
        table.appendChild(h);
        for (var c = 0; c < cols; c++) {
          table.appendChild(el('div', 'sheet-head', String.fromCharCode(65 + c)));
        }
      }

      function paint() {
        var values;
        try {
          values = E.Sheet.evaluate(raw, rows, cols, { angle: app.state.angle, vars: app.state.vars });
        } catch (e) { values = []; }

        cells.forEach(function (row, r) {
          row.forEach(function (cell, c) {
            var v = values[r] ? values[r][c] : '';
            cell.textContent = (typeof v === 'number')
              ? E.formatValue(v, { format: 'norm' })
              : String(v === undefined ? '' : v);
            cell.classList.toggle('is-error', v === 'ERROR');
            cell.classList.toggle('is-active', active.r === r && active.c === c);
          });
        });
        addr.textContent = String.fromCharCode(65 + active.c) + (active.r + 1);
        fx.value = raw[active.r] && raw[active.r][active.c] !== undefined ? raw[active.r][active.c] : '';
        app.state.sheet = raw;
      }

      header();
      for (var r = 0; r < rows; r++) {
        table.appendChild(el('div', 'sheet-head sheet-rowh', String(r + 1)));
        var line = [];
        for (var c = 0; c < cols; c++) {
          if (!raw[r]) raw[r] = [];
          var cell = el('div', 'sheet-cell', '');
          (function (r2, c2, node) {
            node.addEventListener('click', function () {
              active = { r: r2, c: c2 };
              paint();
              fx.focus();
            });
          })(r, c, cell);
          line.push(cell);
          table.appendChild(cell);
        }
        cells.push(line);
      }

      fx.addEventListener('input', function () {
        if (!raw[active.r]) raw[active.r] = [];
        raw[active.r][active.c] = fx.value;
        paint();
      });
      fx.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          active = { r: Math.min(rows - 1, active.r + 1), c: active.c };
          paint();
        }
      });

      p.appendChild(bar);
      p.appendChild(table);
      var help = el('div', 'panel-note');
      help.textContent = 'Formula: =A1+B1, =A1*2, =SUM(A1:A3), =AVERAGE(A1:A3), =MAX(A1:A3), =MIN(A1:A3)';
      p.appendChild(help);
      root.appendChild(p);
      paint();
    }
  };

  /* ============================================================
     MATH BOX (dice / coin)
     ============================================================ */
  var MathBoxMode = {
    id: 'mathbox', name: 'Math Box', icon: '⚄', color: '#fca5a5',
    desc: 'Dice roll & coin toss',
    models: ['esplus', 'explus', 'cw'],
    render: function (root, app) {
      var p = panel(root);
      head(p, 'Math Box', 'Probability simulations');
      var diceOut = el('div', 'mode-out dice-out');
      var coinOut = el('div', 'mode-out');
      var stats = { rolls: [], flips: { H: 0, T: 0 } };

      var row1 = el('div', 'fld-row');
      var faces = select([['6', '2 faces (coin)'], ['6', '6-sided'], ['8', '8-sided'], ['12', '12-sided'], ['20', '20-sided']], '6');
      faces.options[0].value = '2';
      var count = input({ value: '1' });
      row1.appendChild(field('Die', faces));
      row1.appendChild(field('Rolls', count));
      p.appendChild(row1);

      var rollBtn = btn('Roll dice', 'primary', function () {
        var n = Math.max(1, Math.min(200, Math.round(parseNum(count.value) || 1)));
        var sides = parseInt(faces.value, 10);
        var results = [];
        for (var i = 0; i < n; i++) results.push(1 + Math.floor(Math.random() * sides));
        var sum = results.reduce(function (a, b) { return a + b; }, 0);
        diceOut.innerHTML = '<span class="out-label">' + n + ' × d' + sides + '</span>' +
          '<div class="dice-res">' + results.slice(0, 40).map(function (v) {
            return '<span class="die">' + v + '</span>';
          }).join('') + '</div>' +
          '<div class="out-sub">sum ' + sum + ' · mean ' + (sum / n).toFixed(4) + '</div>';
      });
      p.appendChild(rollBtn);
      p.appendChild(diceOut);

      var coinBtn = btn('Toss coin ×10', 'ghost', function () {
        for (var i = 0; i < 10; i++) {
          if (Math.random() < 0.5) stats.flips.H++; else stats.flips.T++;
        }
        var total = stats.flips.H + stats.flips.T;
        coinOut.innerHTML = '<span class="out-label">coin tosses</span>' +
          '<b>H ' + stats.flips.H + ' · T ' + stats.flips.T + '</b>' +
          '<div class="out-sub">' + total + ' tosses · P(H)=' +
          (stats.flips.H / total).toFixed(4) + '</div>';
      });
      p.appendChild(coinBtn);
      p.appendChild(coinOut);
      root.appendChild(p);

      var rp = panel(root);
      head(rp, 'Random numbers', 'Uniform between two bounds');
      var lo = input({ value: '1' });
      var hi = input({ value: '100' });
      var randOut = outBox(rp);
      rp.appendChild(field('min', lo));
      rp.appendChild(field('max', hi));
      rp.appendChild(btn('Generate', 'primary', function () {
        try {
          var a = Math.ceil(parseNum(lo.value)), b = Math.floor(parseNum(hi.value));
          if (b < a) throw new Error('max must be ≥ min');
          var vals = [];
          for (var i = 0; i < 6; i++) vals.push(a + Math.floor(Math.random() * (b - a + 1)));
          setOut(randOut, '<b>' + vals.join(', ') + '</b>');
        } catch (e) { setOut(randOut, e.message, true); }
      }));
      rp.appendChild(randOut);
      root.appendChild(rp);
    }
  };

  /* ============================================================
     RATIO
     ============================================================ */
  var RatioMode = {
    id: 'ratio', name: 'Ratio', icon: '∶', color: '#22d3ee',
    desc: 'a : b = c : x',
    models: ['esplus', 'explus', 'cw'],
    render: function (root, app) {
      var p = panel(root);
      head(p, 'Ratio', 'Solve a : b = c : d for any single unknown');
      var vals = { a: '2', b: '3', c: '8', d: '' };
      var row = el('div', 'ratio-row');
      var inputs = {};
      ['a', 'b', 'c', 'd'].forEach(function (n, idx) {
        if (idx === 1) row.appendChild(el('span', 'ratio-sep', ':'));
        if (idx === 2) row.appendChild(el('span', 'ratio-sep', '='));
        if (idx === 3) row.appendChild(el('span', 'ratio-sep', ':'));
        var i = input({ value: vals[n], placeholder: n, cls: 'ratio-cell' });
        inputs[n] = i;
        i.addEventListener('input', function () { run(); });
        row.appendChild(i);
      });
      var out = outBox(p);
      function run() {
        try {
          var a = inputs.a.value, b = inputs.b.value, c = inputs.c.value, d = inputs.d.value;
          var known = [a, b, c, d].filter(function (v) { return v !== ''; }).length;
          if (known < 3) { setOut(out, '<span class="out-empty">Fill three of the four values</span>'); return; }
          var A = a !== '' ? parseNum(a) : null;
          var B = b !== '' ? parseNum(b) : null;
          var Cc = c !== '' ? parseNum(c) : null;
          var D = d !== '' ? parseNum(d) : null;
          var x, name;
          if (A === null) { x = B * Cc / D; name = 'a'; }
          else if (B === null) { x = A * D / Cc; name = 'b'; }
          else if (Cc === null) { x = A * D / B; name = 'c'; }
          else { x = B * Cc / A; name = 'd'; }
          var fr = E.fractionOf(x);
          var extra = fr ? ' <span class="out-alt">= ' + E.fractionText(fr) + '</span>' : '';
          setOut(out, name + ' = <b>' + E.formatValue(x, { format: 'norm' }) + '</b>' + extra);
        } catch (e) { setOut(out, e.message, true); }
      }
      p.appendChild(row);
      attachPad(p, function () { return ['a','b','c','d'].map(function (k) { return inputs[k]; }); }, app);
      p.appendChild(out);
      root.appendChild(p);
      run();
    }
  };

  /* ============================================================
     TABLE
     ============================================================ */
  var TableMode = {
    id: 'table', name: 'Table', icon: '▤', color: '#c084fc',
    desc: 'f(x) table with step',
    models: ['esplus', 'explus', 'cw'],
    render: function (root, app) {
      var p = panel(root);
      head(p, 'Table', 'Generate a value table for f(x)');
      var fx = input({ placeholder: 'f(x) = x² − 2', value: app.state.tableExpr || 'x^2-2', cls: 'mono' });
      var start = input({ value: app.state.tableStart || '1' });
      var end = input({ value: app.state.tableEnd || '10' });
      var step = input({ value: app.state.tableStep || '1' });
      var gx = input({ placeholder: 'g(x)  (optional)', value: app.state.tableG || '', cls: 'mono' });
      var out = el('div', 'table-out');
      function run() {
        try {
          if (!fx.value.trim()) throw new Error('Enter f(x)');
          var a = parseNum(start.value), b = parseNum(end.value), h = parseNum(step.value);
          if (h === 0) throw new Error('step ≠ 0');
          var count = Math.floor((b - a) / h) + 1;
          if (count > 400) throw new Error('Too many rows');
          var rows = [];
          var gExpr = gx.value.trim();
          for (var i = 0; i < count; i++) {
            var x = a + i * h;
            var y = E.evaluate(fx.value, { angle: app.state.angle, vars: { x: x, ans: 0 }, complex: true });
            var g = gExpr ? E.evaluate(gExpr, { angle: app.state.angle, vars: { x: x, ans: 0 }, complex: true }) : null;
            rows.push('<tr><td>' + E.formatValue(x, { format: 'norm' }) + '</td><td>' +
              E.formatValue(y, { format: 'norm', complex: true }) + '</td>' +
              (gExpr ? '<td>' + E.formatValue(g, { format: 'norm', complex: true }) + '</td>' : '') + '</tr>');
          }
          out.innerHTML = '<table class="calc-table"><thead><tr><th>x</th><th>f(x)</th>' +
            (gExpr ? '<th>g(x)</th>' : '') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table>';
          app.state.tableExpr = fx.value; app.state.tableStart = start.value;
          app.state.tableEnd = end.value; app.state.tableStep = step.value;
          app.state.tableG = gx.value;
        } catch (e) {
          out.innerHTML = '<div class="mode-out is-error">' + e.message + '</div>';
        }
      }
      [fx, start, end, step, gx].forEach(function (i) { i.addEventListener('input', run); });
      p.appendChild(field('f(x)', fx));
      p.appendChild(field('g(x)', gx));
      var row = el('div', 'fld-row');
      row.appendChild(field('start', start));
      row.appendChild(field('end', end));
      row.appendChild(field('step', step));
      p.appendChild(row);
      attachPad(p, [start, end, step], app);
      p.appendChild(out);
      root.appendChild(p);
      run();
    }
  };

  /* ============================================================
     VERIFY
     ============================================================ */
  var VerifyMode = {
    id: 'verify', name: 'Verify', icon: '✓', color: '#4ade80',
    desc: 'Check an equation is true',
    models: ['esplus', 'explus', 'cw'],
    render: function (root, app) {
      var p = panel(root);
      head(p, 'Verify', 'Compare two expressions');
      var left = input({ placeholder: 'left side, e.g. 2+3', value: '2+3' });
      var right = input({ placeholder: 'e.g. 5', value: '5' });
      var tol = select([['0', 'exact (1e-12)'], ['0.001', '1e-3'], ['0.01', '1e-2']], '0');
      var out = outBox(p);
      function run() {
        try {
          var A = E.evaluate(left.value, { angle: app.state.angle, vars: {} });
          var B = E.evaluate(right.value, { angle: app.state.angle, vars: {} });
          var eps = parseFloat(tol.value) || 1e-12;
          var equal = E.C.abs(E.C.sub(A, B)) <= Math.max(eps, 1e-12);
          var sym = equal ? '<span class="ok-mark">TRUE</span>' : '<span class="no-mark">FALSE</span>';
          setOut(out, '<div class="verify-line">' +
            '<code>' + E.formatValue(A, { format: 'norm', complex: true }) + '</code>' +
            (equal ? ' = ' : ' ≠ ') +
            '<code>' + E.formatValue(B, { format: 'norm', complex: true }) + '</code></div>' + sym,
            !equal);
        } catch (e) { setOut(out, e.message, true); }
      }
      [left, right].forEach(function (i) { i.addEventListener('input', run); });
      tol.addEventListener('change', run);
      p.appendChild(field('Left side', left));
      p.appendChild(field('Right side', right));
      p.appendChild(field('Tolerance', tol));
      p.appendChild(out);
      root.appendChild(p);
      run();
    }
  };

  /* ============================================================
     SOLVE
     ============================================================ */
  var SolveMode = {
    id: 'solve', name: 'Solve', icon: 'ƒ', color: '#f87171',
    desc: 'Numeric root of f(x) = 0',
    models: ['esplus', 'explus', 'cw'],
    render: function (root, app) {
      var p = panel(root);
      head(p, 'Solve', 'Find x where f(x) = 0 (Newton + bisection)');
      var fx = input({ placeholder: 'x² − 2  or  x²=2', value: app.state.solveExpr || 'x^2-2', cls: 'mono' });
      var guess = input({ value: app.state.solveGuess || '1' });
      var variable = select([['x', 'variable x'], ['y', 'variable y']], 'x');
      var out = outBox(p);

      function run() {
        try {
          var g = guess.value.trim() === '' ? 1 : parseNum(guess.value);
          var root = E.solve(fx.value, g, makeCtx(app));
          var check = E.evaluate(fx.value.indexOf('=') >= 0 ? fx.value.split('=')[0] + '-(' + fx.value.split('=')[1] + ')' : fx.value,
            { angle: app.state.angle, vars: obj(variable.value, root), complex: true });
          setOut(out,
            '<span class="out-label">root</span><b>' + variable.value + ' = ' +
            E.formatValue(root, { format: 'norm' }) + '</b>' +
            '<div class="out-sub">f(x) = ' + E.formatValue(check, { format: 'norm', complex: true }) + '</div>');
          app.state.solveExpr = fx.value;
          app.state.solveGuess = guess.value;
        } catch (e) {
          setOut(out, e.message, true);
        }
      }
      function obj(k, v) { var o = {}; o[k] = v; return o; }
      function makeCtx(a) { return { angle: a.state.angle, ans: a.state.ans, vars: obj(variable.value, 0), complex: true }; }

      [fx, guess].forEach(function (i) { i.addEventListener('input', run); });
      variable.addEventListener('change', run);
      p.appendChild(field('Equation', fx));
      p.appendChild(field('Initial guess', guess));
      p.appendChild(field('Variable', variable));
      p.appendChild(btn('Solve', 'primary', run));
      attachPad(p, [guess], app);
      p.appendChild(out);
      root.appendChild(p);
      run();
    }
  };

  /* ============================================================
     CONSTANTS
     ============================================================ */
  var ConstantsMode = {
    id: 'constants', name: 'Constants', icon: 'π', color: '#93c5fd',
    desc: 'Physical constants library',
    models: ['esplus', 'explus', 'cw'],
    render: function (root, app) {
      var p = panel(root);
      head(p, 'Constants', 'Tap a constant to copy its value');
      var query = input({ placeholder: 'Search a constant…', value: '' });
      p.appendChild(query);
      var list = [
        ['c', 'speed of light', '299 792 458 m/s'],
        ['g', 'standard gravity', '9.80665 m/s²'],
        ['G', 'gravitational constant', '6.67430e-11'],
        ['h', 'Planck constant', '6.62607015e-34'],
        ['ℏ', 'reduced Planck', '1.054571817e-34'],
        ['k', 'Boltzmann constant', '1.380649e-23'],
        ['NA', 'Avogadro constant', '6.02214076e23'],
        ['R', 'gas constant', '8.314462618'],
        ['F', 'Faraday constant', '96485.33212'],
        ['me', 'electron mass', '9.1093837015e-31'],
        ['mp', 'proton mass', '1.67262192369e-27'],
        ['mn', 'neutron mass', '1.67492749804e-27'],
        ['qe', 'elementary charge', '1.602176634e-19'],
        ['u', 'atomic mass unit', '1.66053906660e-27'],
        ['σ', 'Stefan–Boltzmann', '5.670374419e-8'],
        ['ε0', 'electric constant', '8.8541878128e-12'],
        ['μ0', 'magnetic constant', '1.25663706212e-6'],
        ['atm', 'standard atmosphere', '101 325 Pa']
      ];
      var grid = el('div', 'const-grid');
      p.appendChild(grid);

      function draw() {
        var q = String(query.value || '').trim().toLowerCase();
        grid.innerHTML = '';
        var shown = 0;
        list.forEach(function (c) {
          var hay = (c[0] + ' ' + c[1] + ' ' + c[2]).toLowerCase();
          if (q && hay.indexOf(q) < 0) return;
          shown++;
          var b = el('button', 'const-item');
          b.type = 'button';
          b.innerHTML = '<b>' + c[0] + '</b><span>' + c[1] + '</span><small>' + c[2] + '</small>';
          b.addEventListener('click', function () {
            /* insert the numeric value, not the symbol: the value is what a
               calculator is allowed to promise. */
            var val = E.PHYS[c[0]];
            app.insertInto(String(val));
            app.toast(c[0] + ' = ' + val);
          });
          grid.appendChild(b);
        });
        if (!shown) grid.innerHTML = '<p class="hint">No constant matches that search.</p>';
      }
      query.addEventListener('input', draw);
      draw();
      root.appendChild(p);
    }
  };

  /* ============================================================
     register
     ============================================================ */
  global.MKJModes = {
    calc: Calculate,
    complex: ComplexMode,
    stat: Statistics,
    matrix: MatrixMode,
    vector: VectorMode,
    equation: EquationMode,
    basen: BaseNMode,
    ratio: RatioMode,
    table: TableMode,
    verify: VerifyMode,
    solve: SolveMode,
    constants: ConstantsMode,
    inequality: InequalityMode,
    dist: DistMode,
    spreadsheet: SpreadsheetMode,
    mathbox: MathBoxMode,
    order: ['calc', 'complex', 'stat', 'dist', 'matrix', 'vector', 'equation',
            'inequality', 'basen', 'ratio', 'table', 'spreadsheet', 'solve',
            'verify', 'mathbox', 'constants']
  };

})(window);
