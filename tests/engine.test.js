/*!
 * MKJ CALC — engine + app test suite
 * Run:  node tests/run.js          (no dependencies)
 *       node tests/run.js --verbose
 */
'use strict';

var path = require('path');
var fs = require('fs');

/* ------------------------------------------------------------------ */
/* tiny harness                                                       */
/* ------------------------------------------------------------------ */
var PASS = 0, FAIL = 0, GROUP = '';
var failures = [];
var verbose = process.argv.indexOf('--verbose') >= 0;

function group(name) { GROUP = name; if (verbose) console.log('\n# ' + name); }

function ok(cond, label, extra) {
  if (cond) { PASS++; if (verbose) console.log('  ✓ ' + label); }
  else {
    FAIL++;
    failures.push(GROUP + ' › ' + label + (extra ? '  — ' + extra : ''));
    console.log('  ✗ ' + label + (extra ? '  — ' + extra : ''));
  }
}

function eq(got, want, label) {
  ok(got === want, label, 'got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want));
}

function close(got, want, label, eps) {
  var e = eps == null ? 1e-9 : eps;
  ok(Math.abs(got - want) <= e, label, 'got ' + got + ', want ' + want);
}

function throws(fn, label) {
  var threw = false, msg = '';
  try { fn(); } catch (e) { threw = true; msg = e && e.message; }
  ok(threw, label, 'did not throw ' + msg);
}

function loadEngine() {
  var win = {};
  var src = fs.readFileSync(path.join(__dirname, '..', 'js', 'engine.js'), 'utf8');
  var hat = new Function('window', 'global', 'module', src + '\nreturn window;');
  hat(win, win, { exports: {} });
  return win.MKJEngine;
}

var E = loadEngine();

function ev(src, opts) {
  var o = opts || {};
  return E.evaluate(src, {
    angle: o.angle || 'deg',
    ans: o.ans || 0,
    vars: o.vars || {},
    complex: !!o.complex,
    tol: o.tol
  });
}
function num(src, opts) { return ev(src, opts).re; }
function txt(src, opts) { return E.formatValue(ev(src, opts), { format: (opts && opts.format) || 'norm', complex: !!(opts && opts.complex) }); }

/* ================================================================== */
group('arithmetic');
/* ================================================================== */
eq(num('1+2*3'), 7, 'precedence: 1+2×3');
eq(num('(1+2)*3'), 9, 'parentheses');
eq(num('2^3^2'), 512, 'right-associative power');
eq(num('-3^2'), -9, 'unary minus binds below power');
eq(num('(-3)^2'), 9, 'negative base in parentheses');
eq(num('10/4'), 2.5, 'division');
eq(num('0.1+0.2'), 0.3, 'float cleanup 0.1+0.2');
eq(num('5!'), 120, 'factorial');
eq(num('10%'), 0.1, 'percent');
eq(num('2(3+4)'), 14, 'implicit multiplication with parens');
eq(num('3×10^(4)'), 30000, 'engineering ×10^ entry');
close(num('2^0.5'), Math.SQRT2, 'fractional power', 1e-11);

/* ================================================================== */
group('mod / integer');
/* ================================================================== */
eq(num('7 mod 3'), 1, '7 mod 3');
eq(num('2^10 mod 7'), 2, 'precedence with mod');
eq(num('10 mod 4 mod 3'), 2, 'mod is left-associative');
eq(num('GCD(48,18)'), 6, 'GCD two args');
eq(num('GCD(48,18,30)'), 6, 'GCD three args (CW supports up to 10)');
eq(num('LCM(4,6,8)'), 24, 'LCM three args');
eq(num('isPrime(97)'), 1, 'isPrime(97)');
eq(num('isPrime(91)'), 0, 'isPrime(91)=0');
eq(ev('PrimeFac(360)').text, '2^3×3^2×5', 'prime factorisation 360');
eq(ev('PrimeFac(97)').text, '97', 'prime factorisation of a prime');
ok(ev('PrimeFac(360)').list == null, 'pfact result is not a list');
throws(function () { ev('PrimeFac(3.5)'); }, 'PrimeFac rejects non-integers');
throws(function () { ev('7 mod 0'); }, 'mod by zero raises Math ERROR');

/* ================================================================== */
group('trig and angle units');
/* ================================================================== */
close(num('sin(30)'), 0.5, 'sin30 deg');
close(num('cos(60)'), 0.5, 'cos60 deg');
close(num('tan(45)'), 1, 'tan45 deg');
close(num('sin(30)', { angle: 'rad' }), -0.988031624, 'sin30 rad', 1e-8);
close(num('sin(100)', { angle: 'grad' }), 1, 'sin100 grad');
close(num('sin⁻¹(0.5)'), 30, 'sin⁻¹ in degrees');
close(num('cos⁻¹(-1)'), 180, 'cos⁻¹(-1)');
close(num('tan⁻¹(1)'), 45, 'tan⁻¹(1)');
close(num('sinh(0)'), 0, 'sinh0');
close(num('cosh(0)'), 1, 'cosh0');

/* ================================================================== */
group('logarithms and powers');
/* ================================================================== */
close(num('log(1000)'), 3, 'log10');
close(num('ln(e)'), 1, 'ln e');
close(num('log₂(8)'), 3, 'log base 2');
close(num('10^(2)'), 100, '10^x');
close(num('e^(1)'), Math.E, 'e^x');
eq(num('√(144)'), 12, 'square root');
eq(num('∛(27)'), 3, 'cube root');
close(num('2⁻¹'), 0.5, 'reciprocal power');

/* ================================================================== */
group('numeric functions');
/* ================================================================== */
eq(num('Abs(-7)'), 7, 'Abs');
eq(num('floor(2.9)'), 2, 'floor');
eq(num('ceil(2.1)'), 3, 'ceil');
eq(num('round(2.5)'), 3, 'round');
eq(num('nCr(5,2)'), 10, 'nCr');
eq(num('nPr(5,2)'), 20, 'nPr');
eq(num('min(3,1,2)'), 1, 'min');
eq(num('max(3,1,2)'), 3, 'max');
eq(num('sign(-4)'), -1, 'sign');

/* ================================================================== */
group('complex numbers');
/* ================================================================== */
var c1 = ev('(3+4i)*(1-2i)', { complex: true });
close(c1.re, 11, 'complex real part');
close(c1.im, -2, 'complex imaginary part');
close(ev('Abs(3+4i)', { complex: true }).re, 5, '|3+4i|');
close(ev('Arg(1+i)', { complex: true }).re, 45, 'Arg(1+i) degrees');
close(ev('Conjg(3+4i)', { complex: true }).im, -4, 'conjugate');
close(ev('Re(3+4i)', { complex: true }).re, 3, 'Re');
close(ev('Im(3+4i)', { complex: true }).re, 4, 'Im');
throws(function () { ev('√(-1)', { complex: false }); }, 'real mode refuses √(-1)');
close(ev('√(-1)', { complex: true }).im, 1, 'complex mode allows √(-1)');

/* ================================================================== */
group('calculus and series');
/* ================================================================== */
close(num('d/dx(x^2,2)'), 4, 'derivative of x² at 2', 1e-6);
close(num('∫(x^2,0,3)'), 9, 'definite integral x² 0..3', 1e-6);
close(num('∑(x,1,100)'), 5050, 'sum 1..100');
close(num('Π(x,1,5)'), 120, 'product 1..5');

/* ================================================================== */
group('solver');
/* ================================================================== */
var roots = E.polyRoots([1, -3, 2]);
ok(roots && roots.length === 2, 'x²-3x+2 has two roots');
if (roots && roots.length === 2) {
  var rs = roots.map(function (r) { return r.re; }).sort(function (a, b) { return a - b; });
  close(rs[0], 1, 'root 1', 1e-6);
  close(rs[1], 2, 'root 2', 1e-6);
}
close(E.solve('x^2=9', 3, {}, 'x'), 3, 'solve x²=9 from guess 3', 1e-6);
close(E.solve('2x+1=5', 1, {}, 'x'), 2, 'solve 2x+1=5', 1e-6);
var ineq = E.solveInequality([2, -4], '>');
ok(ineq != null, 'inequality solver returns a result');
ok(/x|>|</.test(E.inequalityText(ineq)), 'inequality text is human readable');

/* ================================================================== */
group('matrices');
/* ================================================================== */
var M = E.Matrix;
var A = [[1, 2], [3, 4]];
var B = M.identity(2);
var Cc = M.mul(A, B);
eq(Cc[0][0], 1, 'A·I keeps A[0][0]');
eq(Cc[1][1], 4, 'A·I keeps A[1][1]');
close(M.det(A), -2, 'det of [[1,2],[3,4]]', 1e-9);
var inv = M.inv(A);
var prod = M.mul(A, inv);
close(prod[0][0], 1, 'A·A⁻¹ = I (0,0)', 1e-9);
close(prod[0][1], 0, 'A·A⁻¹ = I (0,1)', 1e-9);
close(prod[1][0], 0, 'A·A⁻¹ = I (1,0)', 1e-9);
throws(function () { M.inv([[1, 2], [2, 4]]); }, 'singular matrix raises an error');
eq(M.trace([[1, 2], [3, 4]]), 5, 'trace');
eq(M.transpose([[1, 2], [3, 4]])[0][1], 3, 'transpose');

/* ================================================================== */
group('statistics');
/* ================================================================== */
var st = E.Stat.summary([2, 4, 4, 4, 5, 5, 7, 9]);
close(st.mean, 5, 'mean');
close(st.sdP, 2, 'population SD');
close(st.sdS, 2.13809, 'sample SD', 1e-4);
eq(st.n, 8, 'n');
close(st.median, 4.5, 'median');
eq(st.min, 2, 'min');
eq(st.max, 9, 'max');

/* ================================================================== */
group('number bases');
/* ================================================================== */
eq(E.BaseN.fromDecimal(255, 16), 'FF', 'DEC 255 → HEX FF');
eq(E.BaseN.fromDecimal(10, 2), '1010', 'DEC 10 → BIN 1010');
eq(E.BaseN.toDecimal('FF', 16), 255, 'HEX FF → DEC 255');
eq(E.BaseN.toDecimal('777', 8), 511, 'OCT 777 → DEC 511');
eq(E.BaseN.fromDecimal(-10, 2), '-1010', 'negative DEC → BIN');
throws(function () { E.BaseN.toDecimal('2', 2); }, 'invalid digit for base');

/* ================================================================== */
group('vectors');
/* ================================================================== */
var v = ev('Vector(3,4)');
ok(Array.isArray(v.list), 'Vector() yields a list');
eq(v.list.join(','), '3,4', 'Vector(3,4) elements');
eq(num('Mag(Vector(3,4))'), 5, 'Magnitude');
eq(num('Dot(Vector(1,2,3),Vector(4,5,6))'), 32, 'Dot product');
eq(ev('Cross(Vector(1,0,0),Vector(0,1,0))').list.join(','), '0,0,1', 'Cross product');
eq(ev('UnitV(Vector(3,4))').list.map(function (n) { return +n.toFixed(6); }).join(','), '0.6,0.8', 'unit vector');
close(num('Angle(Vector(1,0),Vector(0,1))'), 90, 'angle between vectors');
throws(function () { num('Dot(Vector(1,2),Vector(1,2,3))'); }, 'dot product dimension mismatch');

/* ================================================================== */
group('random');
/* ================================================================== */
for (var i = 0; i < 40; i++) {
  var ri = num('RanInt(1,6)');
  ok(ri >= 1 && ri <= 6 && Number.isInteger(ri), 'RanInt(1,6) in range [' + ri + ']');
  if (FAIL) break;
}
var rl = ev('RanList(5)');
eq(rl.list.length, 5, 'RanList(5) length');
ok(rl.list.every(function (n) { return n >= 0 && n < 1; }), 'RanList values in [0,1)');

/* ================================================================== */
group('formatting');
/* ================================================================== */
eq(E.formatValue({ re: 1 / 3, im: 0 }, { format: 'fix3' }), '0.333', 'fix3');
eq(E.formatValue({ re: 1 / 3, im: 0 }, { format: 'norm' }), '0.3333333333', 'norm 10 digits');
eq(E.formatValue({ re: 123456, im: 0 }, { format: 'sci', sciDigits: 4 }), '1.235×10⁵', 'sci mode');
eq(E.formatValue({ re: 30000, im: 0 }, { format: 'eng' }), '30×10³', 'eng mode');
eq(E.formatValue(E.fractionOf(0.5) ? { re: 0.5, im: 0 } : null, { format: 'frac' }), '1/2', 'fraction format');
eq(E.formatValue({ re: 0, im: 1 }, { complex: true }), 'i', 'pure imaginary');
eq(E.fractionText(E.fractionOf(0.75)), '3/4', 'fractionOf 0.75');

/* ================================================================== */
group('errors');
/* ================================================================== */
['', '1+', '1+*2', '1/0', 'ln(0)', 'ln(-1)', '0^(-1)', '√(-4)', '@#$'].forEach(function (bad) {
  throws(function () { ev(bad); }, 'rejects ' + JSON.stringify(bad));
});
var err = null;
try { ev('1/0'); } catch (e) { err = e; }
ok(err === null || err instanceof E.CalcError, 'thrown value is a CalcError');
eq(err && err.message, 'Math ERROR', 'division by zero says Math ERROR');

/* ================================================================== */
group('persistence helpers');
/* ================================================================== */
ok(typeof E.Sheet === 'object' || typeof E.Sheet === 'function', 'spreadsheet engine exposed');
ok(typeof E.Dist === 'object' || typeof E.Dist === 'function', 'distribution engine exposed');
ok(typeof E.PHYS === 'object' && Object.keys(E.PHYS).length > 10, 'physical constants table');
ok(typeof E.CONST === 'object' && Object.keys(E.CONST).length >= 2, 'mathematical constants table');
ok(Object.keys(E.CONST).indexOf('π') >= 0, 'π is a constant');
eq(num('(1+2'), 3, 'auto-closes a missing parenthesis');
ok(E.C.abs({ re: 3, im: 4 }) === 5, 'C.abs');
ok(E.C.to(5).re === 5, 'C.to normalises reals');

/* ------------------------------------------------------------------ */
console.log('\n' + PASS + ' passed, ' + FAIL + ' failed');
if (FAIL) {
  console.log('\nFailures:');
  failures.forEach(function (f) { console.log('  - ' + f); });
  process.exitCode = 1;
}
