/* ============================================================
   MKJ CALC — keypad layouts v3 (real-device look)

   A layout is
     {
       id, name, plate, sub, foot, series,
       colors: { body, key, keyAlt, ... } (CSS handles most)
       top: [ key, key, {nav:true}, key, key ]      ← upper cluster
       rows: [ [key ×5], ... ]                      ← main grid
     }

   key = {
     l  : main label        v  : insert text (act 'ins')
     act: 'ins' | 'cmd'     c  : extra css class (num/op/enter/ac/del...)
     s / sv : SHIFT label + shift insert or command
     a / av : ALPHA label + alpha insert
     shape  : 'circle' | 'pill' | 'round'   (device styling)
     sm     : 'sm' | 'xs' label size       span : grid columns
   }
   ============================================================ */
(function (global) {
  'use strict';

  function K(l, v, o) {
    o = o || {};
    return {
      l: l, v: v, act: o.act || 'ins',
      s: o.s || null, sv: o.sv || null,
      a: o.a || null, av: o.av || null,
      c: o.c || '', sm: o.sm || '', span: o.span || 1, shape: o.shape || ''
    };
  }
  function CMD(l, cmd, o) { o = o || {}; o.act = 'cmd'; return K(l, cmd, o); }
  var NAV = { nav: true };

  /* ------------------------------------------------------------
     shared blocks
     ------------------------------------------------------------ */
  function numberBlock() {
    return [
      [
        K('7', '7', { c: 'num' }), K('8', '8', { c: 'num' }), K('9', '9', { c: 'num' }),
        CMD('DEL', 'del', { c: 'del' }),
        CMD('AC', 'ac', { c: 'ac', s: 'OFF', sv: 'off' })
      ],
      [
        K('4', '4', { c: 'num' }), K('5', '5', { c: 'num' }), K('6', '6', { c: 'num' }),
        K('×', '*', { c: 'op' }), K('÷', '/', { c: 'op' })
      ],
      [
        K('1', '1', { c: 'num' }), K('2', '2', { c: 'num' }), K('3', '3', { c: 'num' }),
        K('+', '+', { c: 'op' }), K('−', '-', { c: 'op' })
      ],
      [
        K('0', '0', { c: 'num' }), K('.', '.', { c: 'num', s: 'Ran#', sv: 'rand' }),
        K('(', '(', { c: 'op', s: '%', sv: '%' }),
        K(')', ')', { c: 'op', s: ',', sv: ',' }),
        CMD('=', 'equals', { c: 'enter', s: '≈', sv: 'sd' })
      ]
    ];
  }

  /* π e % M+ STO row */
  function memoryRow() {
    return [
      K('π', 'π', { c: 'fn', s: 'e', sv: 'e' }),
      K('e', 'e', { c: 'fn', s: 'i', sv: 'i' }),
      K('%', '%', { c: 'fn', s: 'Abs', sv: 'Abs(' }),
      CMD('M+', 'mplus', { c: 'fn', s: 'M−', sv: 'mminus', a: 'M', av: 'M' }),
      CMD('STO', 'sto', { c: 'fn', s: 'RCL', sv: 'rcl' })
    ];
  }

  /* ×10ˣ ENG DRG Ran# Ans row */
  function utilityRow() {
    return [
      K('×10ˣ', '×10^(', { c: 'fn', sm: 'xs' }),
      CMD('ENG', 'eng', { c: 'fn', sm: 'xs' }),
      CMD('DRG', 'drg', { c: 'fn', sm: 'xs', s: 'SETUP', sv: 'settings' }),
      CMD('Ran#', 'rand', { c: 'fn', sm: 'xs' }),
      CMD('Ans', 'ans', { c: 'fn' })
    ];
  }

  /* ------------------------------------------------------------
     991 ES Plus — classic pad
     ------------------------------------------------------------ */
  var ES = {
    id: 'esplus',
    name: '991 ES Plus',
    plate: 'MKJ-991ES PLUS',
    model: 'MKJ-991ES',
    series: 'MKJ SERIES',
    sub: 'NATURAL DISPLAY · 417 FUNCTIONS',
    foot: 'MKJ CALC · 991 ES Plus',
    cols: 5,
    shape: 'classic',
    top: [
      CMD('SHIFT', 'shift', { c: 'shiftkey', s: 'OFF', sv: 'off', shape: 'pill' }),
      CMD('ALPHA', 'alpha', { c: 'alphakey', shape: 'pill' }),
      NAV,
      CMD('MODE', 'mode', { c: 'menu', s: 'SETUP', sv: 'settings', shape: 'round', sm: 'xs' }),
      CMD('ON', 'on', { c: 'onkey', shape: 'round', sm: 'xs' })
    ],
    rows: [
      [
        CMD('CALC', 'calc', { c: 'fn', sm: 'xs' }),
        CMD('SOLVE', 'solve', { c: 'fn', sm: 'xs' }),
        K('∫dx', '∫(', { c: 'fn', sm: 'sm', s: 'd/dx', sv: 'd/dx(' }),
        K('x²', '²', { c: 'fn', s: 'x³', sv: '³' }),
        K('x^', '^', { c: 'fn', s: 'ˣ√', sv: '^(1/' })
      ],
      [
        K('√', '√(', { c: 'fn', s: '∛', sv: '∛(' }),
        K('log', 'log(', { c: 'fn', s: '10ˣ', sv: '×10^(' }),
        K('ln', 'ln(', { c: 'fn', s: 'eˣ', sv: 'exp(' }),
        K('(-)', '-', { c: 'fn', s: '∠', sv: '∠', a: 'A', av: 'A' }),
        K('°′″', '°', { c: 'fn', sm: 'sm', s: 'ENG', sv: 'eng', a: 'B', av: 'B' })
      ],
      [
        K('hyp', 'sinh(', { c: 'fn', s: 'sinh⁻¹', sv: 'sinh⁻¹(', a: 'C', av: 'C' }),
        K('sin', 'sin(', { c: 'fn', s: 'sin⁻¹', sv: 'sin⁻¹(', a: 'D', av: 'D' }),
        K('cos', 'cos(', { c: 'fn', s: 'cos⁻¹', sv: 'cos⁻¹(', a: 'E', av: 'E' }),
        K('tan', 'tan(', { c: 'fn', s: 'tan⁻¹', sv: 'tan⁻¹(', a: 'F', av: 'F' }),
        K('Abs', 'Abs(', { c: 'fn', s: 'Conjg', sv: 'Conjg(' })
      ],
      [
        K('x!', '!', { c: 'fn', s: 'nPr', sv: 'nPr(' }),
        K('nCr', 'nCr(', { c: 'fn', sm: 'sm', s: 'Π', sv: 'Π(' }),
        K('Σ', '∑(', { c: 'fn', s: 'Pol', sv: 'Pol(' }),
        K('x⁻¹', '^(-1)', { c: 'fn', sm: 'sm' }),
        CMD('S⇔D', 'sd', { c: 'fn', sm: 'sm' })
      ],
      memoryRow()
    ].concat(numberBlock(), [utilityRow()]),
    modes: ['calc', 'complex', 'stat', 'dist', 'matrix', 'vector', 'equation',
            'inequality', 'basen', 'ratio', 'table', 'spreadsheet', 'solve',
            'verify', 'mathbox', 'constants']
  };

  /* ------------------------------------------------------------
     991 EX Plus — ClassWiz pad
     ------------------------------------------------------------ */
  var EX = {
    id: 'explus',
    name: '991 EX Plus',
    plate: 'MKJ-991EX PLUS',
    model: 'MKJ-991EX',
    series: 'MKJ CLASS',
    sub: 'NATURAL DISPLAY · 552 FUNCTIONS',
    foot: 'MKJ CALC · 991 EX Plus',
    cols: 5,
    shape: 'classwiz',
    top: [
      CMD('SHIFT', 'shift', { c: 'shiftkey', s: 'OFF', sv: 'off', shape: 'pill' }),
      CMD('ALPHA', 'alpha', { c: 'alphakey', shape: 'pill' }),
      NAV,
      CMD('MENU', 'mode', { c: 'menu', s: 'SETUP', sv: 'settings', shape: 'round', sm: 'xs' }),
      CMD('ON', 'on', { c: 'onkey', shape: 'round', sm: 'xs' })
    ],
    rows: [
      [
        CMD('CALC', 'calc', { c: 'fn', sm: 'xs' }),
        CMD('SOLVE', 'solve', { c: 'fn', sm: 'xs' }),
        K('∫dx', '∫(', { c: 'fn', sm: 'sm', s: 'd/dx', sv: 'd/dx(' }),
        K('x²', '²', { c: 'fn', s: 'x³', sv: '³' }),
        K('x^', '^', { c: 'fn', s: 'ˣ√', sv: '^(1/' })
      ],
      [
        K('√', '√(', { c: 'fn', s: '∛', sv: '∛(' }),
        K('log', 'log(', { c: 'fn', s: '10ˣ', sv: '×10^(' }),
        K('ln', 'ln(', { c: 'fn', s: 'eˣ', sv: 'exp(' }),
        K('x⁻¹', '^(-1)', { c: 'fn', sm: 'sm', s: 'x!', sv: '!' }),
        K('(-)', '-', { c: 'fn', s: '∠', sv: '∠', a: 'A', av: 'A' })
      ],
      [
        K('sin', 'sin(', { c: 'fn', s: 'sin⁻¹', sv: 'sin⁻¹(', a: 'D', av: 'D' }),
        K('cos', 'cos(', { c: 'fn', s: 'cos⁻¹', sv: 'cos⁻¹(', a: 'E', av: 'E' }),
        K('tan', 'tan(', { c: 'fn', s: 'tan⁻¹', sv: 'tan⁻¹(', a: 'F', av: 'F' }),
        K('hyp', 'sinh(', { c: 'fn', s: 'sinh⁻¹', sv: 'sinh⁻¹(', a: 'C', av: 'C' }),
        K('°′″', '°', { c: 'fn', sm: 'sm', s: 'ENG', sv: 'eng', a: 'B', av: 'B' })
      ],
      [
        K('Abs', 'Abs(', { c: 'fn', s: 'Conjg', sv: 'Conjg(' }),
        K('nCr', 'nCr(', { c: 'fn', sm: 'sm', s: 'nPr', sv: 'nPr(' }),
        K('Σ', '∑(', { c: 'fn', s: 'Π', sv: 'Π(' }),
        K('Pol', 'Pol(', { c: 'fn', sm: 'sm', s: 'Rec', sv: 'Rec(' }),
        CMD('S⇔D', 'sd', { c: 'fn', sm: 'sm' })
      ],
      memoryRow()
    ].concat(numberBlock(), [utilityRow()]),
    modes: ['calc', 'complex', 'stat', 'dist', 'matrix', 'vector', 'equation',
            'inequality', 'basen', 'ratio', 'table', 'spreadsheet', 'solve',
            'verify', 'mathbox', 'constants']
  };

  /* ------------------------------------------------------------
     991 CW — flat pad with circular function keys
     ------------------------------------------------------------ */
  var CW = {
    id: 'cw',
    name: '991 CW',
    plate: 'MKJ-991CW',
    model: 'MKJ-991CW',
    series: 'MKJ CW',
    sub: 'HIGH-PERFORMANCE · 4-GRADATION DISPLAY',
    foot: 'MKJ CALC · 991 CW',
    cols: 5,
    shape: 'cw',
    top: [
      CMD('SHIFT', 'shift', { c: 'shiftkey', s: 'OFF', sv: 'off', shape: 'pill' }),
      CMD('ALPHA', 'alpha', { c: 'alphakey', shape: 'pill' }),
      NAV,
      CMD('HOME', 'home', { c: 'menu', shape: 'round', sm: 'xs' }),
      CMD('ON', 'on', { c: 'onkey', shape: 'round', sm: 'xs' })
    ],
    rows: [
      [
        CMD('SETTINGS', 'settings', { c: 'cw-fn', sm: 'xs', shape: 'circle' }),
        CMD('FORMAT', 'sd', { c: 'cw-fn', sm: 'xs', shape: 'circle' }),
        CMD('CATALOG', 'catalog', { c: 'cw-fn', sm: 'xs', shape: 'circle' }),
        CMD('TOOLS', 'tools', { c: 'cw-fn', sm: 'xs', shape: 'circle' }),
        CMD('VARIABLE', 'variable', { c: 'cw-fn', sm: 'xs', shape: 'circle' })
      ],
      [
        K('x²', '²', { c: 'cw-fn', shape: 'circle', s: 'x³', sv: '³' }),
        K('x^', '^', { c: 'cw-fn', shape: 'circle', s: 'ˣ√', sv: '^(1/' }),
        K('√', '√(', { c: 'cw-fn', shape: 'circle', s: '∛', sv: '∛(' }),
        K('log', 'log(', { c: 'cw-fn', shape: 'circle', sm: 'sm', s: '10ˣ', sv: '×10^(' }),
        K('ln', 'ln(', { c: 'cw-fn', shape: 'circle', sm: 'sm', s: 'eˣ', sv: 'exp(' })
      ],
      [
        K('sin', 'sin(', { c: 'cw-fn', shape: 'circle', sm: 'sm', s: 'sin⁻¹', sv: 'sin⁻¹(', a: 'D', av: 'D' }),
        K('cos', 'cos(', { c: 'cw-fn', shape: 'circle', sm: 'sm', s: 'cos⁻¹', sv: 'cos⁻¹(', a: 'E', av: 'E' }),
        K('tan', 'tan(', { c: 'cw-fn', shape: 'circle', sm: 'sm', s: 'tan⁻¹', sv: 'tan⁻¹(', a: 'F', av: 'F' }),
        K('(-)', '-', { c: 'cw-fn', shape: 'circle', sm: 'sm', s: '∠', sv: '∠', a: 'A', av: 'A' }),
        K('x⁻¹', '^(-1)', { c: 'cw-fn', shape: 'circle', sm: 'xs', s: 'x!', sv: '!', a: 'C', av: 'C' })
      ],
      [
        K('Abs', 'Abs(', { c: 'cw-fn', shape: 'circle', sm: 'sm', s: 'Conjg', sv: 'Conjg(' }),
        K('nCr', 'nCr(', { c: 'cw-fn', shape: 'circle', sm: 'xs', s: 'nPr', sv: 'nPr(' }),
        K('∫', '∫(', { c: 'cw-fn', shape: 'circle', sm: 'sm', s: 'd/dx', sv: 'd/dx(' }),
        K('Σ', '∑(', { c: 'cw-fn', shape: 'circle', sm: 'sm', s: 'Π', sv: 'Π(' }),
        K('°′″', '°', { c: 'cw-fn', shape: 'circle', sm: 'xs', s: 'ENG', sv: 'eng' })
      ],
      memoryRow()
    ].concat(numberBlock(), [utilityRow()]),
    modes: ['calc', 'complex', 'stat', 'dist', 'matrix', 'vector', 'equation',
            'inequality', 'basen', 'ratio', 'table', 'spreadsheet', 'solve',
            'verify', 'mathbox', 'constants']
  };

  /* ------------------------------------------------------------
     Catalog
     ------------------------------------------------------------ */
  var CATALOG = [
    { group: 'Numeric', items: ['x²', 'x³', '^(-1)', '^(1/', '^', '√(', '∛(', 'Abs(', 'x!', '%'] },
    { group: 'Logarithm', items: ['log(', 'ln(', 'log(', 'exp(', '×10^('] },
    { group: 'Trigonometry', items: ['sin(', 'cos(', 'tan(', 'sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(',
                                     'sinh(', 'cosh(', 'tanh(', 'sinh⁻¹(', 'cosh⁻¹(', 'tanh⁻¹('] },
    { group: 'Complex', items: ['i', 'Conjg(', 'Arg(', 'Re(', 'Im(', '∠'] },
    { group: 'Probability', items: ['nCr(', 'nPr(', '!', 'rand', 'randInt('] },
    { group: 'Integer', items: ['gcd(', 'lcm(', 'floor(', 'ceil(', 'round(', 'frac(', 'sign(', 'min(', 'max('] },
    { group: 'Calculus', items: ['∫(', 'd/dx(', '∑(', 'Π('] },
    { group: 'Coordinate', items: ['Pol(', 'Rec('] },
    { group: 'Variables', items: ['A', 'B', 'C', 'D', 'E', 'F', 'M', 'x', 'y'] },
    { group: 'Constants', items: ['π', 'e', 'i', 'Ans'] }
  ];

  global.MKJLayouts = {
    esplus: ES, explus: EX, cw: CW,
    order: ['esplus', 'explus', 'cw'],
    catalog: CATALOG
  };

})(window);
