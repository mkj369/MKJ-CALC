/* ============================================================
   MKJ CALC — keypad layouts v2 (full function sets)

   key = {
     l    : main label
     v    : inserted text        (act 'ins')
     act  : 'ins' | 'cmd'
     s    : SHIFT label          sv : SHIFT insert / command
     a    : ALPHA label          av : ALPHA insert
     c    : css class            sm : label size ('xs' | 'sm')
     span : grid columns
   }
   ============================================================ */
(function (global) {
  'use strict';

  function K(l, v, o) {
    o = o || {};
    return {
      l: l, v: v, act: o.act || 'ins', s: o.s || null, sv: o.sv || null,
      a: o.a || null, av: o.av || null, c: o.c || '', sm: o.sm || '', span: o.span || 1
    };
  }
  function CMD(l, cmd, o) {
    o = o || {}; o.act = 'cmd';
    return K(l, cmd, o);
  }

  /* shared number block -------------------------------------- */
  function numbers(extra) {
    return [
      K('7', '7', { c: 'num' }), K('8', '8', { c: 'num' }), K('9', '9', { c: 'num' }),
      K('×', '*', { c: 'op' }), K('÷', '/', { c: 'op' }),
      K('4', '4', { c: 'num' }), K('5', '5', { c: 'num' }), K('6', '6', { c: 'num' }),
      K('+', '+', { c: 'op' }), K('−', '-', { c: 'op' }),
      K('1', '1', { c: 'num' }), K('2', '2', { c: 'num' }), K('3', '3', { c: 'num' }),
      K('(', '(', { c: 'op', s: '%', sv: '%' }), K(')', ')', { c: 'op', s: ',', sv: ',' })
    ];
  }

  /* ============================================================
     991 ES PLUS
     ============================================================ */
  var ES = {
    id: 'esplus',
    name: '991 ES Plus',
    plate: 'MKJ-991ES PLUS',
    sub: 'NATURAL DISPLAY · MKJ SERIES',
    foot: 'MKJ CALC · 991 ES Plus',
    cols: 5,
    modes: ['calc', 'complex', 'stat', 'matrix', 'vector', 'equation', 'basen', 'ratio', 'table', 'solve', 'verify', 'constants'],
    keys: [
      CMD('SHIFT', 'shift', { c: 'shiftkey', s: 'OFF', sv: 'off' }),
      CMD('ALPHA', 'alpha', { c: 'alphakey' }),
      CMD('▲', 'up', { c: 'dpad', s: 'REPLAY' }),
      CMD('MODE', 'mode', { c: 'fn', s: 'SETUP', sv: 'settings' }),
      CMD('ON', 'on', { c: 'fn' }),

      CMD('◀', 'left', { c: 'dpad' }),
      CMD('▼', 'down', { c: 'dpad' }),
      CMD('▶', 'right', { c: 'dpad' }),
      CMD('CATALOG', 'catalog', { c: 'fn', sm: 'xs' }),
      CMD('S⇔D', 'sd', { c: 'fn' }),

      CMD('CALC', 'calc', { c: 'fn', sm: 'xs' }),
      CMD('SOLVE', 'solve', { c: 'fn', sm: 'xs', s: 'SOLVE', sv: 'solve' }),
      K('∫dx', '∫(', { c: 'fn', sm: 'sm', s: 'd/dx', sv: 'd/dx(' }),
      K('x²', '²', { c: 'fn', s: 'x³', sv: '³' }),
      K('x^', '^', { c: 'fn', s: 'ˣ√', sv: '^(1/' }),

      K('√', '√(', { c: 'fn', s: '∛', sv: '∛(' }),
      K('log', 'log(', { c: 'fn', s: '10ˣ', sv: '×10^(' }),
      K('ln', 'ln(', { c: 'fn', s: 'eˣ', sv: 'exp(' }),
      K('(-)', '-', { c: 'fn', s: '∠', sv: '∠', a: 'A', av: 'A' }),
      K('°′″', '°', { c: 'fn', sm: 'sm', s: 'ENG', sv: 'eng', a: 'B', av: 'B' }),

      K('hyp', 'sinh(', { c: 'fn', s: 'sinh⁻¹', sv: 'sinh⁻¹(', a: 'C', av: 'C' }),
      K('sin', 'sin(', { c: 'fn', s: 'sin⁻¹', sv: 'sin⁻¹(', a: 'D', av: 'D' }),
      K('cos', 'cos(', { c: 'fn', s: 'cos⁻¹', sv: 'cos⁻¹(', a: 'E', av: 'E' }),
      K('tan', 'tan(', { c: 'fn', s: 'tan⁻¹', sv: 'tan⁻¹(', a: 'F', av: 'F' }),
      K('Abs', 'Abs(', { c: 'fn', s: 'Conjg', sv: 'Conjg(' }),

      K('x!', '!', { c: 'fn', s: 'nPr', sv: 'nPr(' }),
      K('nCr', 'nCr(', { c: 'fn', sm: 'sm', s: 'Π', sv: 'Π(' }),
      K('Σ', '∑(', { c: 'fn', s: 'Pol', sv: 'Pol(' }),
      K('M+', 'mplus', { act: 'cmd', c: 'fn', s: 'M−', sv: 'mminus' }),
      K('STO', 'sto', { act: 'cmd', c: 'fn', s: 'RCL', sv: 'rcl', a: 'M', av: 'M' }),

      /* number block */
      K('7', '7', { c: 'num' }), K('8', '8', { c: 'num' }), K('9', '9', { c: 'num' }),
      CMD('DEL', 'del', { c: 'del' }), CMD('AC', 'ac', { c: 'ac', s: 'OFF', sv: 'off' }),

      K('4', '4', { c: 'num' }), K('5', '5', { c: 'num' }), K('6', '6', { c: 'num' }),
      K('×', '*', { c: 'op' }), K('÷', '/', { c: 'op' }),

      K('1', '1', { c: 'num' }), K('2', '2', { c: 'num' }), K('3', '3', { c: 'num' }),
      K('+', '+', { c: 'op' }), K('−', '-', { c: 'op' }),

      K('0', '0', { c: 'num' }), K('.', '.', { c: 'num', s: 'Ran#', sv: 'rand' }),
      K('(', '(', { c: 'op', s: '%', sv: '%' }), K(')', ')', { c: 'op', s: ',', sv: ',' }),
      K('×10ˣ', '×10^(', { c: 'fn', sm: 'xs', s: 'π', sv: 'π' }),

      CMD('Ans', 'ans', { c: 'fn', s: 'DRG', sv: 'drg' }),
      CMD('RCL', 'rcl', { c: 'fn' }),
      CMD('ENG', 'eng', { c: 'fn', sm: 'xs' }),
      K('%', '%', { c: 'fn', s: 'π', sv: 'π' }),
      CMD('=', 'equals', { c: 'enter', s: '≈', sv: 'sd' })
    ]
  };

  /* ============================================================
     991 EX PLUS
     ============================================================ */
  var EX = {
    id: 'explus',
    name: '991 EX Plus',
    plate: 'MKJ-991EX PLUS',
    sub: 'MKJ CLASS · NATURAL DISPLAY',
    foot: 'MKJ CALC · 991 EX Plus',
    cols: 5,
    modes: ['calc', 'complex', 'stat', 'matrix', 'vector', 'equation', 'basen', 'ratio', 'table', 'solve', 'verify', 'constants'],
    keys: [
      CMD('SHIFT', 'shift', { c: 'shiftkey', s: 'OFF', sv: 'off' }),
      CMD('ALPHA', 'alpha', { c: 'alphakey' }),
      CMD('▲', 'up', { c: 'dpad' }),
      CMD('MENU', 'mode', { c: 'fn', s: 'SETUP', sv: 'settings' }),
      CMD('ON', 'on', { c: 'fn' }),

      CMD('◀', 'left', { c: 'dpad' }),
      CMD('▼', 'down', { c: 'dpad' }),
      CMD('▶', 'right', { c: 'dpad' }),
      CMD('CATALOG', 'catalog', { c: 'fn', sm: 'xs' }),
      CMD('S⇔D', 'sd', { c: 'fn' }),

      CMD('CALC', 'calc', { c: 'fn', sm: 'xs' }),
      CMD('SOLVE', 'solve', { c: 'fn', sm: 'xs' }),
      K('∫dx', '∫(', { c: 'fn', sm: 'sm', s: 'd/dx', sv: 'd/dx(' }),
      K('Σ', '∑(', { c: 'fn', s: 'Π', sv: 'Π(' }),
      K('x²', '²', { c: 'fn', s: 'x³', sv: '³' }),

      K('x^', '^', { c: 'fn', s: 'ˣ√', sv: '^(1/' }),
      K('√', '√(', { c: 'fn', s: '∛', sv: '∛(' }),
      K('log', 'log(', { c: 'fn', s: '10ˣ', sv: '×10^(' }),
      K('ln', 'ln(', { c: 'fn', s: 'eˣ', sv: 'exp(' }),
      K('x⁻¹', '^(-1)', { c: 'fn', sm: 'sm', s: 'x!', sv: '!' }),

      K('sin', 'sin(', { c: 'fn', s: 'sin⁻¹', sv: 'sin⁻¹(', a: 'D', av: 'D' }),
      K('cos', 'cos(', { c: 'fn', s: 'cos⁻¹', sv: 'cos⁻¹(', a: 'E', av: 'E' }),
      K('tan', 'tan(', { c: 'fn', s: 'tan⁻¹', sv: 'tan⁻¹(', a: 'F', av: 'F' }),
      K('hyp', 'sinh(', { c: 'fn', s: 'sinh⁻¹', sv: 'sinh⁻¹(' }),
      K('(-)', '-', { c: 'fn', s: '∠', sv: '∠', a: 'A', av: 'A' }),
      K('°′″', '°', { c: 'fn', sm: 'sm', s: 'ENG', sv: 'eng', a: 'B', av: 'B' }),

      K('Abs', 'Abs(', { c: 'fn', s: 'Conjg', sv: 'Conjg(', a: 'C', av: 'C' }),
      K('°′″', '°', { c: 'fn', sm: 'sm', s: 'ENG', sv: 'eng' }),
      K('nCr', 'nCr(', { c: 'fn', sm: 'sm', s: 'nPr', sv: 'nPr(' }),
      K('M+', 'mplus', { act: 'cmd', c: 'fn', s: 'M−', sv: 'mminus', a: 'M', av: 'M' }),
      K('STO', 'sto', { act: 'cmd', c: 'fn', s: 'RCL', sv: 'rcl' }),

      K('7', '7', { c: 'num' }), K('8', '8', { c: 'num' }), K('9', '9', { c: 'num' }),
      CMD('DEL', 'del', { c: 'del' }), CMD('AC', 'ac', { c: 'ac', s: 'OFF', sv: 'off' }),

      K('4', '4', { c: 'num' }), K('5', '5', { c: 'num' }), K('6', '6', { c: 'num' }),
      K('×', '*', { c: 'op' }), K('÷', '/', { c: 'op' }),

      K('1', '1', { c: 'num' }), K('2', '2', { c: 'num' }), K('3', '3', { c: 'num' }),
      K('+', '+', { c: 'op' }), K('−', '-', { c: 'op' }),

      K('0', '0', { c: 'num' }), K('.', '.', { c: 'num', s: 'Ran#', sv: 'rand' }),
      K('(', '(', { c: 'op', s: '%', sv: '%' }), K(')', ')', { c: 'op', s: ',', sv: ',' }),
      CMD('Ans', 'ans', { c: 'fn' }),

      K('×10ˣ', '×10^(', { c: 'fn', sm: 'xs', s: 'π', sv: 'π' }),
      K('%', '%', { c: 'fn', s: 'e', sv: 'e' }),
      CMD('ENG', 'eng', { c: 'fn', sm: 'xs' }),
      CMD('=', 'equals', { c: 'enter', span: 2, s: '≈', sv: 'sd' })
    ]
  };

  /* ============================================================
     991 CW
     ============================================================ */
  var CW = {
    id: 'cw',
    name: '991 CW',
    plate: 'MKJ-991CW',
    sub: 'MKJ CW · HIGH-PERFORMANCE',
    foot: 'MKJ CALC · 991 CW',
    cols: 5,
    flat: true,
    modes: ['calc', 'complex', 'stat', 'matrix', 'vector', 'equation', 'basen', 'ratio', 'table', 'solve', 'verify', 'constants'],
    keys: [
      CMD('SHIFT', 'shift', { c: 'shiftkey', s: 'OFF', sv: 'off' }),
      CMD('ALPHA', 'alpha', { c: 'alphakey' }),
      CMD('▲', 'up', { c: 'dpad' }),
      CMD('SETTINGS', 'settings', { c: 'fn', sm: 'xs' }),
      CMD('ON', 'on', { c: 'fn' }),

      CMD('◀', 'left', { c: 'dpad' }),
      CMD('▼', 'down', { c: 'dpad' }),
      CMD('▶', 'right', { c: 'dpad' }),
      CMD('CATALOG', 'catalog', { c: 'fn', sm: 'xs' }),
      CMD('DEL', 'del', { c: 'del' }),

      CMD('HOME', 'home', { c: 'home', sm: 'xs' }),
      CMD('FORMAT', 'sd', { c: 'ghost', sm: 'xs' }),
      CMD('TOOLS', 'tools', { c: 'ghost', sm: 'xs' }),
      CMD('VARIABLE', 'variable', { c: 'ghost', sm: 'xs' }),
      CMD('AC', 'ac', { c: 'ac', s: 'OFF', sv: 'off' }),

      K('x²', '²', { c: 'fn', s: 'x³', sv: '³' }),
      K('x^', '^', { c: 'fn', s: 'ˣ√', sv: '^(1/' }),
      K('√', '√(', { c: 'fn', s: '∛', sv: '∛(' }),
      K('log', 'log(', { c: 'fn', s: 'logₐ', sv: 'log(' }),
      K('ln', 'ln(', { c: 'fn', s: 'eˣ', sv: 'exp(' }),

      K('x⁻¹', '^(-1)', { c: 'fn', sm: 'sm', s: 'x!', sv: '!' }),
      K('sin', 'sin(', { c: 'fn', s: 'sin⁻¹', sv: 'sin⁻¹(', a: 'D', av: 'D' }),
      K('cos', 'cos(', { c: 'fn', s: 'cos⁻¹', sv: 'cos⁻¹(', a: 'E', av: 'E' }),
      K('tan', 'tan(', { c: 'fn', s: 'tan⁻¹', sv: 'tan⁻¹(', a: 'F', av: 'F' }),
      K('(-)', '-', { c: 'fn', s: '∠', sv: '∠', a: 'A', av: 'A' }),
      K('°′″', '°', { c: 'fn', sm: 'sm', s: 'ENG', sv: 'eng', a: 'B', av: 'B' }),

      K('Abs', 'Abs(', { c: 'fn', s: 'Conjg', sv: 'Conjg(', a: 'C', av: 'C' }),
      K('°′″', '°', { c: 'fn', sm: 'sm', s: 'ENG', sv: 'eng', a: 'B', av: 'B' }),
      K('nCr', 'nCr(', { c: 'fn', sm: 'sm', s: 'nPr', sv: 'nPr(' }),
      K('∫', '∫(', { c: 'fn', s: 'd/dx', sv: 'd/dx(' }),
      K('Σ', '∑(', { c: 'fn', s: 'Π', sv: 'Π(' }),

      K('7', '7', { c: 'num' }), K('8', '8', { c: 'num' }), K('9', '9', { c: 'num' }),
      K('×', '*', { c: 'op' }), K('÷', '/', { c: 'op' }),

      K('4', '4', { c: 'num' }), K('5', '5', { c: 'num' }), K('6', '6', { c: 'num' }),
      K('+', '+', { c: 'op' }), K('−', '-', { c: 'op' }),

      K('1', '1', { c: 'num' }), K('2', '2', { c: 'num' }), K('3', '3', { c: 'num' }),
      K('(', '(', { c: 'op', s: '%', sv: '%' }), K(')', ')', { c: 'op', s: ',', sv: ',' }),

      K('0', '0', { c: 'num' }), K('.', '.', { c: 'num', s: 'Ran#', sv: 'rand' }),
      K('×10ˣ', '×10^(', { c: 'fn', sm: 'xs' }),
      K('π', 'π', { c: 'fn', s: 'e', sv: 'e' }),
      K('e', 'e', { c: 'fn', s: 'i', sv: 'i' }),

      CMD('Ans', 'ans', { c: 'fn', s: 'M+', sv: 'mplus', a: 'M', av: 'M' }),
      CMD('STO', 'sto', { c: 'fn' }),
      CMD('RCL', 'rcl', { c: 'fn' }),
      CMD('=', 'equals', { c: 'enter', span: 2, s: '≈', sv: 'sd' })
    ]
  };

  /* ============================================================
     Catalog — every function reachable on every model
     ============================================================ */
  var CATALOG = [
    { group: 'Math', items: ['Abs(', 'x²', 'x³', '^(-1)', '^(1/', '^', 'sqrt(', '∛('] },
    { group: 'Log / Exp', items: ['log(', 'ln(', 'log(', 'exp(', '×10^('] },
    { group: 'Trig', items: ['sin(', 'cos(', 'tan(', 'sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(',
                             'sinh(', 'cosh(', 'tanh(', 'sinh⁻¹(', 'cosh⁻¹(', 'tanh⁻¹('] },
    { group: 'Complex', items: ['i', 'Conjg(', 'Arg(', 'Re(', 'Im(', 'Abs('] },
    { group: 'Combinatorics', items: ['nCr(', 'nPr(', '!'] },
    { group: 'Number theory', items: ['gcd(', 'lcm(', 'floor(', 'ceil(', 'round(', 'frac(', 'sign(', 'min(', 'max('] },
    { group: 'Calculus', items: ['∫(', 'd/dx(', '∑(', 'Π('] },
    { group: 'Coordinate', items: ['Pol(', 'Rec(', '∠'] },
    { group: 'Random', items: ['rand', 'randInt('] },
    { group: 'Constants', items: ['π', 'e', 'i'] },
    { group: 'Variables', items: ['A', 'B', 'C', 'D', 'E', 'F', 'M', 'x', 'y'] },
    { group: 'Insert', items: [',', '%', '°', 'Ans'] }
  ];

  global.MKJLayouts = {
    esplus: ES, explus: EX, cw: CW,
    order: ['esplus', 'explus', 'cw'],
    catalog: CATALOG
  };

})(window);
