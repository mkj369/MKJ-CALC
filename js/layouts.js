/* ============================================================
   MKJ CALC — keypad layouts for the three models
   Key object:
     { l: label, s: shift label, a: alpha tint, c: css class,
       act: 'ins' | 'cmd', v: value / command, sm: label size }
   ============================================================ */
(function (global) {
  'use strict';

  function k(label, value, opts) {
    var o = opts || {};
    return {
      l: label,
      v: value,
      act: o.act || 'ins',
      s: o.s || null,
      c: o.c || '',
      span: o.span || 1,
      sm: o.sm || ''
    };
  }

  function cmd(label, command, opts) {
    var o = opts || {};
    o.act = 'cmd';
    return k(label, command, o);
  }

  /* ----------------------------------------------------------
     991 ES PLUS — classic layout
     ---------------------------------------------------------- */
  var ES_PLUS = {
    id: 'esplus',
    name: '991 ES Plus',
    plate: 'MKJ-991ES PLUS',
    sub: 'NATURAL DISPLAY · MKJ SERIES',
    foot: 'MKJ CALC · 991 ES Plus',
    cols: 5,
    keys: [
      // row 1
      cmd('SHIFT', 'shift', { c: 'shiftkey' }),
      cmd('ALPHA', 'alpha', { c: 'alphakey' }),
      cmd('▲', 'histPrev', { c: 'dpad' }),
      cmd('MODE', 'setup', { c: 'fn', s: 'SETUP' }),
      cmd('ON', 'on', { c: 'fn' }),

      // row 2
      cmd('◀', 'left', { c: 'dpad' }),
      cmd('▼', 'histNext', { c: 'dpad' }),
      cmd('▶', 'right', { c: 'dpad' }),
      cmd('S⇔D', 'sd', { c: 'fn' }),
      cmd('DEL', 'del', { c: 'del' }),

      // row 3
      k('x²', '²', { s: 'x³', c: 'fn' }),
      k('√', '√(', { s: '∛', c: 'fn' }),
      k('x⁻¹', '^(-1)', { s: 'x!', c: 'fn' }),
      k('log', 'log(', { s: '10ˣ', c: 'fn' }),
      k('ln', 'ln(', { s: 'eˣ', c: 'fn' }),

      // row 4
      k('sin', 'sin(', { s: 'sin⁻¹', c: 'fn' }),
      k('cos', 'cos(', { s: 'cos⁻¹', c: 'fn' }),
      k('tan', 'tan(', { s: 'tan⁻¹', c: 'fn' }),
      k('x!', '!', { c: 'fn' }),
      k('Abs', 'Abs(', { c: 'fn' }),

      // row 5
      k('π', 'π', { s: '%', c: 'fn' }),
      k('e', 'e', { c: 'fn' }),
      k('(-)', '-', { c: 'fn' }),
      k('nCr', 'nCr(', { s: 'nPr', c: 'fn' }),
      k('hyp', 'sinh(', { s: 'sinh⁻¹', c: 'fn' }),

      // number pad
      k('7', '7', { c: 'num' }),
      k('8', '8', { c: 'num' }),
      k('9', '9', { c: 'num' }),
      k('×', '*', { c: 'op' }),
      k('÷', '/', { c: 'op' }),

      k('4', '4', { c: 'num' }),
      k('5', '5', { c: 'num' }),
      k('6', '6', { c: 'num' }),
      k('+', '+', { c: 'op' }),
      k('−', '-', { c: 'op' }),

      k('1', '1', { c: 'num' }),
      k('2', '2', { c: 'num' }),
      k('3', '3', { c: 'num' }),
      k('(', '(', { c: 'op' }),
      k(')', ')', { c: 'op' }),

      k('0', '0', { c: 'num' }),
      k('.', '.', { c: 'num' }),
      k('×10ˣ', '×10^(', { c: 'fn' }),
      cmd('Ans', 'ans', { c: 'fn' }),
      cmd('AC', 'ac', { c: 'ac' }),

      cmd('M+', 'mplus', { c: 'fn' }),
      cmd('STO', 'sto', { c: 'fn' }),
      cmd('RCL', 'rcl', { c: 'fn' }),
      cmd('=', 'equals', { c: 'enter', span: 2 })
    ]
  };

  /* ----------------------------------------------------------
     991 EX PLUS — class-based, extra menu keys
     ---------------------------------------------------------- */
  var EX_PLUS = {
    id: 'explus',
    name: '991 EX Plus',
    plate: 'MKJ-991EX PLUS',
    sub: 'MKJ CLASS · NATURAL DISPLAY',
    foot: 'MKJ CALC · 991 EX Plus',
    cols: 5,
    keys: [
      cmd('SHIFT', 'shift', { c: 'shiftkey' }),
      cmd('ALPHA', 'alpha', { c: 'alphakey' }),
      cmd('▲', 'histPrev', { c: 'dpad' }),
      cmd('MENU', 'setup', { c: 'fn', s: 'SETUP' }),
      cmd('ON', 'on', { c: 'fn' }),

      cmd('◀', 'left', { c: 'dpad' }),
      cmd('▼', 'histNext', { c: 'dpad' }),
      cmd('▶', 'right', { c: 'dpad' }),
      k('x²', '²', { s: 'x³', c: 'fn' }),
      cmd('DEL', 'del', { c: 'del' }),

      k('√', '√(', { s: '∛', c: 'fn' }),
      k('x⁻¹', '^(-1)', { c: 'fn' }),
      k('log', 'log(', { s: '10ˣ', c: 'fn' }),
      k('ln', 'ln(', { s: 'eˣ', c: 'fn' }),
      cmd('AC', 'ac', { c: 'ac' }),

      k('sin', 'sin(', { s: 'sin⁻¹', c: 'fn' }),
      k('cos', 'cos(', { s: 'cos⁻¹', c: 'fn' }),
      k('tan', 'tan(', { s: 'tan⁻¹', c: 'fn' }),
      k('x!', '!', { c: 'fn' }),
      k('Abs', 'Abs(', { c: 'fn' }),

      k('π', 'π', { c: 'fn' }),
      k('e', 'e', { c: 'fn' }),
      k('(-)', '-', { c: 'fn' }),
      k('nCr', 'nCr(', { s: 'nPr', c: 'fn' }),
      k('Rnd', 'round(', { c: 'fn' }),

      cmd('nCr', 'ncr', { c: 'fn', sm: 'xs' }),
      cmd('nPr', 'npr', { c: 'fn', sm: 'xs' }),
      cmd('GCD', 'gcd', { c: 'fn', sm: 'xs' }),
      cmd('LCM', 'lcm', { c: 'fn', sm: 'xs' }),
      k('×10ˣ', '×10^(', { c: 'fn', sm: 'xs' }),

      k('7', '7', { c: 'num' }),
      k('8', '8', { c: 'num' }),
      k('9', '9', { c: 'num' }),
      k('×', '*', { c: 'op' }),
      k('÷', '/', { c: 'op' }),

      k('4', '4', { c: 'num' }),
      k('5', '5', { c: 'num' }),
      k('6', '6', { c: 'num' }),
      k('+', '+', { c: 'op' }),
      k('−', '-', { c: 'op' }),

      k('1', '1', { c: 'num' }),
      k('2', '2', { c: 'num' }),
      k('3', '3', { c: 'num' }),
      k('(', '(', { c: 'op' }),
      k(')', ')', { c: 'op' }),

      k('0', '0', { c: 'num' }),
      k('.', '.', { c: 'num' }),
      k('%', '%', { c: 'fn' }),
      cmd('Ans', 'ans', { c: 'fn' }),
      cmd('S⇔D', 'sd', { c: 'fn' }),

      cmd('M+', 'mplus', { c: 'fn' }),
      cmd('RCL', 'rcl', { c: 'fn' }),
      cmd('STO', 'sto', { c: 'fn' }),
      cmd('=', 'equals', { c: 'enter', span: 2 })
    ]
  };

  /* ----------------------------------------------------------
     991 CW — flat pad, round HOME
     ---------------------------------------------------------- */
  var CW = {
    id: 'cw',
    name: '991 CW',
    plate: 'MKJ-991CW',
    sub: 'MKJ CW · HIGH-PERFORMANCE',
    foot: 'MKJ CALC · 991 CW',
    cols: 5,
    keys: [
      cmd('SHIFT', 'shift', { c: 'shiftkey' }),
      cmd('ALPHA', 'alpha', { c: 'alphakey' }),
      cmd('▲', 'histPrev', { c: 'dpad' }),
      cmd('SETTINGS', 'setup', { c: 'fn', sm: 'xs' }),
      cmd('ON', 'on', { c: 'fn' }),

      cmd('◀', 'left', { c: 'dpad' }),
      cmd('▼', 'histNext', { c: 'dpad' }),
      cmd('▶', 'right', { c: 'dpad' }),
      cmd('DEL', 'del', { c: 'del' }),
      cmd('AC', 'ac', { c: 'ac' }),

      k('x²', '²', { s: 'x³', c: 'fn' }),
      k('xʸ', '^', { c: 'fn' }),
      k('√', '√(', { s: '∛', c: 'fn' }),
      k('x⁻¹', '^(-1)', { c: 'fn' }),
      k('log', 'log(', { s: '10ˣ', c: 'fn' }),

      k('ln', 'ln(', { s: 'eˣ', c: 'fn' }),
      k('sin', 'sin(', { s: 'sin⁻¹', c: 'fn' }),
      k('cos', 'cos(', { s: 'cos⁻¹', c: 'fn' }),
      k('tan', 'tan(', { s: 'tan⁻¹', c: 'fn' }),
      k('π', 'π', { c: 'fn' }),

      k('e', 'e', { c: 'fn' }),
      k('x!', '!', { c: 'fn' }),
      k('Abs', 'Abs(', { c: 'fn' }),
      k('(-)', '-', { c: 'fn' }),
      k('nCr', 'nCr(', { s: 'nPr', c: 'fn', sm: 'xs' }),

      cmd('FORMAT', 'sd', { c: 'ghost', sm: 'xs' }),
      cmd('CATALOG', 'help', { c: 'ghost', sm: 'xs' }),
      cmd('TOOLS', 'setup', { c: 'ghost', sm: 'xs' }),
      cmd('VARIABLE', 'rcl', { c: 'ghost', sm: 'xs' }),
      k('×10ˣ', '×10^(', { c: 'fn', sm: 'xs' }),

      k('7', '7', { c: 'num' }),
      k('8', '8', { c: 'num' }),
      k('9', '9', { c: 'num' }),
      k('×', '*', { c: 'op' }),
      k('÷', '/', { c: 'op' }),

      k('4', '4', { c: 'num' }),
      k('5', '5', { c: 'num' }),
      k('6', '6', { c: 'num' }),
      k('+', '+', { c: 'op' }),
      k('−', '-', { c: 'op' }),

      k('1', '1', { c: 'num' }),
      k('2', '2', { c: 'num' }),
      k('3', '3', { c: 'num' }),
      k('(', '(', { c: 'op' }),
      k(')', ')', { c: 'op' }),

      k('0', '0', { c: 'num' }),
      k('.', '.', { c: 'num' }),
      k('%', '%', { c: 'fn' }),
      cmd('Ans', 'ans', { c: 'fn' }),
      cmd('HOME', 'home', { c: 'home round' }),

      cmd('M+', 'mplus', { c: 'fn' }),
      cmd('RCL', 'rcl', { c: 'fn' }),
      cmd('STO', 'sto', { c: 'fn' }),
      cmd('=', 'equals', { c: 'enter', span: 2 })
    ]
  };

  global.MKJLayouts = {
    esplus: ES_PLUS,
    explus: EX_PLUS,
    cw: CW,
    order: ['esplus', 'explus', 'cw']
  };

})(window);
