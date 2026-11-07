/* ============================================================
   MKJ CALC — keypads v5 (device faithful)
   ============================================================ */
(function (global) {
  'use strict';

  function K(l, v, o) {
    o = o || {};
    return {
      l: l, v: v, act: o.act || 'ins',
      s: o.s || null, sv: o.sv || null,
      c: o.c || '', sm: o.sm || '', round: !!o.round, wide: !!o.wide,
      ic: o.ic || null,        /* inline svg icon id */
      cap: o.cap || null,      /* caption printed under a control key */
      gr: o.gr || 0, gc: o.gc || 0, grs: o.grs || 1,
      sub: o.sub || null       /* tiny label under the glyph */
    };
  }
  function CMD(l, cmd, o) { o = o || {}; o.act = 'cmd'; return K(l, cmd, o); }

  /* ---------------- dense numeric block (5 cols) ---------------- */
  function numRows(variant) {
    return [
      [
        K('7', '7', { c: 'n', s: 'x̂', al2: 'x̂' }), K('8', '8', { c: 'n' }), K('9', '9', { c: 'n' }),
        CMD('DEL', 'del', { c: 'd', ic: 'del', icOnly: true }), CMD('AC', 'ac', { c: 'a' })
      ],
      [
        K('4', '4', { c: 'n', al2: 'A' }), K('5', '5', { c: 'n' }), K('6', '6', { c: 'n' }),
        K('×', '*', { c: 'o' }), K('÷', '/', { c: 'o' })
      ],
      [
        K('1', '1', { c: 'n', al2: 'B' }), K('2', '2', { c: 'n' }), K('3', '3', { c: 'n' }),
        K('+', '+', { c: 'o' }), K('−', '-', { c: 'o' })
      ],
      variant === 'cw'
        ? [
            K('0', '0', { c: 'n', al2: 'x' }), K('.', '.', { c: 'n' }), K('×10ˣ', '×10^(', { c: 'f', sm: 'sm' }),
            CMD('FORMAT', 'sd', { c: 'd ring', sm: 'xs' }),
            CMD('EXE', 'equals', { c: 'e', sm: 'sm' })
          ]
        : [
            K('0', '0', { c: 'n', al2: 'x' }), K('.', '.', { c: 'n' }),
            K('(', '(', { c: 'f', s: '%', sv: '%' }), K(')', ')', { c: 'f', s: ',', sv: ',' }),
            CMD('=', 'equals', { c: 'e' })
          ]
    ];
  }

  /* ============================================================
     991 CW — exact ClassWiz layout
     ============================================================ */
  var CW = {
    id: 'cw',
    name: '991 CW',
    plate: 'MKJ-991CW',
    model: '991CW',
    series: 'MKJ',
    brand: 'MKJ CALC',
    cols: 6,
    shape: 'cw',
    home: true,           /* icon home screen */
    /* explicit device positions: ctl(r,c[,span]) — 6 columns / 3 rows */
    /* the tall scroll rocker lives on the right edge, its own element */
    rocker: true,
    controls: [
      CMD('ON', 'on', { c: 'ctl', ic: 'power', gr: 1, gc: 1, cap: 'ON' }),
      CMD('HOME', 'home', { c: 'ctl', ic: 'home', gr: 1, gc: 2 }),
      CMD('', 'up', { c: 'ctl nav', ic: 'up', gr: 1, gc: 4 }),
      CMD('SETTINGS', 'settings', { c: 'ctl', ic: 'gear', gr: 2, gc: 1, cap: 'SETTINGS' }),
      CMD('MENU', 'modes', { c: 'ctl', ic: 'menu', gr: 2, gc: 2, cap: ' MENU' }),
      CMD('', 'left', { c: 'ctl nav', ic: 'left', gr: 2, gc: 3 }),
      CMD('', 'ok', { c: 'ctl ok', gr: 2, gc: 4 }),
      CMD('', 'right', { c: 'ctl nav', ic: 'right', gr: 2, gc: 5 }),
      CMD('SHIFT', 'shift', { c: 'shift', ic: 'shift', gr: 3, gc: 1, cap: 'SHIFT' }),
      CMD('VARIABLE', 'variable', { c: 'ctl', ic: 'var', gr: 3, gc: 2, cap: 'VARIABLE' }),
      CMD('FUNCTION', 'catalog', { c: 'ctl', ic: 'func', gr: 3, gc: 3, cap: 'FUNCTION' }),
      CMD('', 'down', { c: 'ctl nav', ic: 'down', gr: 3, gc: 4 }),
      CMD('CATALOG', 'catalog', { c: 'ctl', ic: 'book', gr: 3, gc: 5, cap: 'CATALOG' }),
      CMD('TOOLS', 'tools', { c: 'ctl', ic: 'tools', gr: 3, gc: 6, cap: 'TOOLS' })
    ],
    rows: [
      [
        K('1/x', '^(-1)', { s: 'x!', sv: '!', c: 'f' }),
        K('x²', '²', { s: 'x³', sv: '³', c: 'f' }),
        K('√', '√(', { s: '∛', sv: '∛(', c: 'f' }),
        K('x^', '^', { s: 'ˣ√', sv: '^(1/', c: 'f' }),
        K('x³', '³', { s: 'x⁻¹', sv: '^(-1)', c: 'f', sm: 'sm' }),
        K('log', 'log(', { s: '10ˣ', sv: '×10^(', c: 'f' })
      ],
      [
        CMD('Ans', 'ans', { s: 'DRG', sv: 'drg', c: 'f' }),
        K('sin', 'sin(', { s: 'sin⁻¹', sv: 'sin⁻¹(', c: 'f' }),
        K('cos', 'cos(', { s: 'cos⁻¹', sv: 'cos⁻¹(', c: 'f' }),
        K('tan', 'tan(', { s: 'tan⁻¹', sv: 'tan⁻¹(', c: 'f' }),
        K('(', '(', { s: '%', sv: '%', c: 'f' }),
        K(')', ')', { s: ',', sv: ',', c: 'f' })
      ]
    ].concat(numRows('cw')),
    extra: [
      K('ln', 'ln(', { c: 'f' }),
      K('e', 'e', { c: 'f' }),
      K('π', 'π', { c: 'f' }),
      K('x!', '!', { c: 'f' }),
      K('Abs', 'Abs(', { c: 'f' }),
      K('nCr', 'nCr(', { c: 'f' })
    ],
    modes: ['calc', 'complex', 'stat', 'dist', 'matrix', 'vector', 'equation',
            'inequality', 'basen', 'ratio', 'table', 'spreadsheet', 'solve',
            'verify', 'mathbox', 'constants']
  };

  /* ============================================================
     991 EX PLUS
     ============================================================ */
  var EX = {
    id: 'explus',
    name: '991 EX Plus',
    plate: 'MKJ-991EX PLUS',
    model: '991EX',
    series: 'MKJ CLASS',
    brand: 'MKJ CALC',
    cols: 5,
    shape: 'classwiz',
    controls: [
      { keys: [
        CMD('SHIFT', 'shift', { c: 'shift', sm: 'xs' }),
        CMD('ALPHA', 'alpha', { c: 'alpha', sm: 'xs' }),
        null,
        CMD('MENU', 'mode', { c: 'ctl', sm: 'xs', round: true }),
        CMD('ON', 'on', { c: 'ctl', sm: 'xs', round: true })
      ] },
      { keys: [
        CMD('◀', 'left', { c: 'ctl nav', ic: 'left' }),
        CMD('▲', 'up', { c: 'ctl nav', ic: 'up' }),
        CMD('OK', 'ok', { c: 'ctl ok' }),
        CMD('▼', 'down', { c: 'ctl nav', ic: 'down' }),
        CMD('▶', 'right', { c: 'ctl nav', ic: 'right' })
      ] }
    ],
    rows: [
      [
        CMD('CALC', 'calc', { c: 'f', sm: 'xs' }),
        CMD('SOLVE', 'solve', { c: 'f', sm: 'xs' }),
        K('∫dx', '∫(', { s: 'd/dx', sv: 'd/dx(', c: 'f', sm: 'xs' }),
        K('x²', '²', { s: 'x³', sv: '³', c: 'f' }),
        K('x^', '^', { s: 'ˣ√', sv: '^(1/', c: 'f' })
      ],
      [
        K('√', '√(', { s: '∛', sv: '∛(', c: 'f' }),
        K('log', 'log(', { s: '10ˣ', sv: '×10^(', c: 'f' }),
        K('ln', 'ln(', { s: 'eˣ', sv: 'exp(', c: 'f' }),
        K('x⁻¹', '^(-1)', { s: 'x!', sv: '!', c: 'f', sm: 'sm' }),
        K('(-)', '-', { s: '∠', sv: '∠', c: 'f' })
      ],
      [
        K('sin', 'sin(', { s: 'sin⁻¹', sv: 'sin⁻¹(', c: 'f' }),
        K('cos', 'cos(', { s: 'cos⁻¹', sv: 'cos⁻¹(', c: 'f' }),
        K('tan', 'tan(', { s: 'tan⁻¹', sv: 'tan⁻¹(', c: 'f' }),
        K('nCr', 'nCr(', { s: 'nPr', sv: 'nPr(', c: 'f', sm: 'sm' }),
        K('Σ', '∑(', { s: 'Π', sv: 'Π(', c: 'f' })
      ],
      [
        K('π', 'π', { s: 'e', sv: 'e', c: 'f' }),
        K('e', 'e', { s: 'i', sv: 'i', c: 'f' }),
        K('%', '%', { s: 'Abs', sv: 'Abs(', c: 'f' }),
        CMD('M+', 'mplus', { s: 'M−', sv: 'mminus', c: 'f', sm: 'sm' }),
        CMD('STO', 'sto', { s: 'RCL', sv: 'rcl', c: 'f' })
      ]
    ].concat(numRows()),
    extra: [],
    modes: ['calc', 'complex', 'stat', 'dist', 'matrix', 'vector', 'equation',
            'inequality', 'basen', 'ratio', 'table', 'spreadsheet', 'solve',
            'verify', 'mathbox', 'constants']
  };

  /* ============================================================
     991 ES PLUS
     ============================================================ */
  var ES = {
    id: 'esplus',
    name: '991 ES Plus',
    plate: 'MKJ-991ES PLUS',
    model: '991ES',
    series: 'MKJ SERIES',
    brand: 'MKJ CALC',
    cols: 5,
    shape: 'classic',
    controls: [
      { keys: [
        CMD('SHIFT', 'shift', { c: 'shift', sm: 'xs' }),
        CMD('ALPHA', 'alpha', { c: 'alpha', sm: 'xs' }),
        null,
        CMD('MODE', 'mode', { c: 'ctl', sm: 'xs', round: true }),
        CMD('ON', 'on', { c: 'ctl', sm: 'xs', round: true })
      ] },
      { keys: [
        CMD('◀', 'left', { c: 'ctl nav', ic: 'left' }),
        CMD('▲', 'up', { c: 'ctl nav', ic: 'up' }),
        CMD('OK', 'ok', { c: 'ctl ok' }),
        CMD('▼', 'down', { c: 'ctl nav', ic: 'down' }),
        CMD('▶', 'right', { c: 'ctl nav', ic: 'right' })
      ] }
    ],
    rows: [
      [
        CMD('CALC', 'calc', { c: 'f', sm: 'xs' }),
        CMD('SOLVE', 'solve', { c: 'f', sm: 'xs' }),
        K('∫dx', '∫(', { s: 'd/dx', sv: 'd/dx(', c: 'f', sm: 'xs' }),
        K('x²', '²', { s: 'x³', sv: '³', c: 'f' }),
        K('x^', '^', { s: 'ˣ√', sv: '^(1/', c: 'f' })
      ],
      [
        K('√', '√(', { s: '∛', sv: '∛(', c: 'f' }),
        K('log', 'log(', { s: '10ˣ', sv: '×10^(', c: 'f' }),
        K('ln', 'ln(', { s: 'eˣ', sv: 'exp(', c: 'f' }),
        K('(-)', '-', { s: '∠', sv: '∠', c: 'f' }),
        K('°′″', '°', { s: 'ENG', sv: 'eng', c: 'f', sm: 'xs' })
      ],
      [
        K('hyp', 'sinh(', { s: 'sinh⁻¹', sv: 'sinh⁻¹(', c: 'f', sm: 'xs' }),
        K('sin', 'sin(', { s: 'sin⁻¹', sv: 'sin⁻¹(', c: 'f' }),
        K('cos', 'cos(', { s: 'cos⁻¹', sv: 'cos⁻¹(', c: 'f' }),
        K('tan', 'tan(', { s: 'tan⁻¹', sv: 'tan⁻¹(', c: 'f' }),
        K('Abs', 'Abs(', { s: 'Conjg', sv: 'Conjg(', c: 'f', sm: 'sm' })
      ],
      [
        K('x!', '!', { s: 'nPr', sv: 'nPr(', c: 'f' }),
        K('nCr', 'nCr(', { s: 'Π', sv: 'Π(', c: 'f', sm: 'sm' }),
        K('Σ', '∑(', { s: 'Pol', sv: 'Pol(', c: 'f' }),
        K('x⁻¹', '^(-1)', { c: 'f', sm: 'sm' }),
        CMD('S⇔D', 'sd', { c: 'f', sm: 'sm' })
      ],
      [
        K('π', 'π', { s: 'e', sv: 'e', c: 'f' }),
        K('e', 'e', { s: 'i', sv: 'i', c: 'f' }),
        K('%', '%', { s: 'Abs', sv: 'Abs(', c: 'f' }),
        CMD('M+', 'mplus', { s: 'M−', sv: 'mminus', c: 'f', sm: 'sm' }),
        CMD('STO', 'sto', { s: 'RCL', sv: 'rcl', c: 'f' })
      ]
    ].concat(numRows()),
    extra: [],
    modes: ['calc', 'complex', 'stat', 'dist', 'matrix', 'vector', 'equation',
            'inequality', 'basen', 'ratio', 'table', 'spreadsheet', 'solve',
            'verify', 'mathbox', 'constants']
  };

  /* ---------------- catalog ---------------- */
  var CATALOG = [
    { group: 'Numeric', items: ['x²', 'x³', '^(-1)', '^(1/', '^', '√(', '∛(', 'Abs(', 'x!', '%'] },
    { group: 'Logarithm', items: ['log(', 'ln(', '10^(', 'exp('] },
    { group: 'Trigonometry', items: ['sin(', 'cos(', 'tan(', 'sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(',
                                     'sinh(', 'cosh(', 'tanh('] },
    { group: 'Complex', items: ['i', 'Conjg(', 'Arg(', 'Re(', 'Im(', '∠'] },
    { group: 'Probability', items: ['nCr(', 'nPr(', '!', 'rand', 'randInt('] },
    { group: 'Integer', items: ['gcd(', 'lcm(', 'floor(', 'ceil(', 'round(', 'frac(', 'sign(', 'min(', 'max('] },
    { group: 'Calculus', items: ['∫(', 'd/dx(', '∑(', 'Π('] },
    { group: 'Variables', items: ['A', 'B', 'C', 'D', 'E', 'F', 'M', 'x', 'y'] },
    { group: 'Constants', items: ['π', 'e', 'i', 'Ans'] }
  ];

  global.MKJLayouts = {
    esplus: ES, explus: EX, cw: CW,
    order: ['cw', 'explus', 'esplus'],
    catalog: CATALOG
  };

})(window);
