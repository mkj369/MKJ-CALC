/* ============================================================
   MKJ CALC — engine v2  (full scientific engine)

   Contents
     1.  small complex-number library
     2.  constants & physical constants
     3.  tokenizer
     4.  parser (real + complex paths)
     5.  math function library
     6.  calculus: d/dx, ∫dx, Σ, Π
     7.  solve / calc
     8.  matrices & vectors
     9.  statistics, regression, distributions
     10. base-N conversion
     11. rational (fraction) helpers
     12. number formatting  (Norm / Fix / Sci / Eng / Rect / Polar)
   ============================================================ */
(function (global) {
  'use strict';

  /* ============================================================
     1. complex numbers  (plain objects: {re, im})
     ============================================================ */
  var C = {
    make: function (re, im) { return { re: re, im: im || 0 }; },
    isC: function (z) { return z !== null && typeof z === 'object' && 're' in z && 'im' in z; },
    isPair: function (z) { return z !== null && typeof z === 'object' && 'pair' in z; },
    add: function (a, b) { a = C.to(a); b = C.to(b); return { re: a.re + b.re, im: a.im + b.im }; },
    sub: function (a, b) { a = C.to(a); b = C.to(b); return { re: a.re - b.re, im: a.im - b.im }; },
    mul: function (a, b) {
      a = C.to(a); b = C.to(b);
      return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
    },
    div: function (a, b) {
      a = C.to(a); b = C.to(b);
      var d = b.re * b.re + b.im * b.im;
      if (d === 0) throw mathError();
      return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
    },
    abs: function (z) { z = C.to(z); return Math.hypot(z.re, z.im); },
    arg: function (z) { z = C.to(z); return Math.atan2(z.im, z.re); },
    to: function (z) {
      if (C.isC(z)) return z;
      if (C.isPair(z)) return { re: z.pair[0], im: 0 };
      return { re: Number(z) || 0, im: 0 };
    },
    pow: function (a, b) {
      a = C.to(a); b = C.to(b);
      if (a.im === 0 && b.im === 0 && a.re >= 0) return { re: Math.pow(a.re, b.re), im: 0 };
      var r = C.abs(a), th = C.arg(a);
      var nr = Math.pow(r, b.re) * Math.exp(-b.im * th);
      var nth = b.re * th + b.im * Math.log(r || 1);
      return { re: nr * Math.cos(nth), im: nr * Math.sin(nth) };
    },
    neg: function (a) { a = C.to(a); return { re: -a.re, im: -a.im }; },
    sqrt: function (a) {
      a = C.to(a);
      if (a.im === 0 && a.re >= 0) return { re: Math.sqrt(a.re), im: 0 };
      var r = Math.sqrt(C.abs(a));
      var th = C.arg(a) / 2;
      return { re: r * Math.cos(th), im: r * Math.sin(th) };
    },
    isReal: function (z) { return !C.isC(z) || Math.abs(z.im) < 1e-12; },
    clean: function (z) {
      if (!C.isC(z)) {
        var v = Math.round(z * 1e12) / 1e12;
        return Math.abs(v) < 1e-13 ? 0 : v;
      }
      var re = Math.abs(z.re) < 1e-13 ? 0 : Math.round(z.re * 1e12) / 1e12;
      var im = Math.abs(z.im) < 1e-13 ? 0 : Math.round(z.im * 1e12) / 1e12;
      return { re: re, im: im };
    }
  };

  function mathError() { var e = new CalcError('Math ERROR'); return e; }
  function syntaxError() { var e = new CalcError('Syntax ERROR'); return e; }

  function CalcError(msg) {
    this.name = 'CalcError';
    this.message = msg || 'Math ERROR';
  }
  CalcError.prototype = Object.create(Error.prototype);

  /* ============================================================
     2. constants
     ============================================================ */
  var CONST = {
    'π': Math.PI, 'e': Math.E, 'τ': Math.PI * 2
  };

  var PHYS = {
    'c': 299792458,            // speed of light   m/s
    'g': 9.80665,              // gravity          m/s²
    'G': 6.67430e-11,          // gravitation
    'h': 6.62607015e-34,       // Planck
    'ℏ': 1.054571817e-34,
    'k': 1.380649e-23,         // Boltzmann
    'NA': 6.02214076e23,       // Avogadro
    'R': 8.314462618,          // gas constant
    'F': 96485.33212,          // Faraday
    'me': 9.1093837015e-31,    // electron mass
    'mp': 1.67262192369e-27,   // proton mass
    'mn': 1.67492749804e-27,
    'qe': 1.602176634e-19,     // elementary charge
    'u': 1.66053906660e-27,    // atomic mass unit
    'σ': 5.670374419e-8,       // Stefan-Boltzmann
    'ε0': 8.8541878128e-12,
    'μ0': 1.25663706212e-6,
    'atm': 101325,
    'gn': 9.80665
  };

  /* ============================================================
     3. tokenizer
     ============================================================ */
  var FUNCS = [
    'sin⁻¹', 'cos⁻¹', 'tan⁻¹', 'sinh⁻¹', 'cosh⁻¹', 'tanh⁻¹',
    'asin', 'acos', 'atan', 'asinh', 'acosh', 'atanh',
    'sin', 'cos', 'tan', 'sinh', 'cosh', 'tanh',
    'sin⁻¹h', 'cos⁻¹h', 'tan⁻¹h',
    'log', 'ln', 'lg', 'log₂', 'exp',
    'sqrt', 'cbrt', 'abs', 'Abs', 'sign', 'floor', 'ceil', 'round', 'int', 'frac',
    'nCr', 'nPr', 'gcd', 'lcm', 'min', 'max', 'rand', 'randInt', 'RanInt',
    'Arg', 'Conjg', 'Re', 'Im', 'abs2',
    'Pol', 'Rec', 'd', 'Sum'
  ];

  function isDigit(c) { return c >= '0' && c <= '9'; }
  function isAlpha(c) { return /[A-Za-z]/.test(c); }

  function tokenize(input) {
    var s = String(input)
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/▸/g, '')
      .replace(/[∠]/g, '∠');
    var tokens = [];
    var i = 0;

    while (i < s.length) {
      var c = s[i];

      if (c === ' ' || c === '\n' || c === '\t') { i++; continue; }

      /* numbers, with E notation */
      if (isDigit(c) || (c === '.' && isDigit(s[i + 1]))) {
        var numStr = '';
        while (i < s.length && (isDigit(s[i]) || s[i] === '.')) numStr += s[i++];
        if ((s[i] === 'E' || s[i] === 'e') && (isDigit(s[i + 1]) || ((s[i + 1] === '+' || s[i + 1] === '-') && isDigit(s[i + 2])))) {
          numStr += 'e'; i++;
          if (s[i] === '+' || s[i] === '-') numStr += s[i++];
          while (i < s.length && isDigit(s[i])) numStr += s[i++];
        }
        tokens.push({ t: 'num', v: parseFloat(numStr) });
        continue;
      }

      /* constants */
      if (c === 'π' || c === 'τ') { tokens.push({ t: 'const', v: c }); i++; continue; }

      /* postfix */
      if (c === '²') { tokens.push({ t: 'post', v: 'sq' }); i++; continue; }
      if (c === '³') { tokens.push({ t: 'post', v: 'cube' }); i++; continue; }
      if (c === '!') { tokens.push({ t: 'post', v: 'fact' }); i++; continue; }
      if (c === '%') { tokens.push({ t: 'post', v: 'pct' }); i++; continue; }
      if (c === '°') { tokens.push({ t: 'post', v: 'deg' }); i++; continue; }
      if (c === 'ʳ') { tokens.push({ t: 'post', v: 'rad' }); i++; continue; }
      if (c === 'ᵍ') { tokens.push({ t: 'post', v: 'grad' }); i++; continue; }

      /* angle / complex operator */
      if (c === '∠') { tokens.push({ t: 'op', v: '∠' }); i++; continue; }

      /* words */
      if (isAlpha(c)) {
        var word = '';
        while (i < s.length && (isAlpha(s[i]) || isDigit(s[i]) || s[i] === '₂')) word += s[i++];
        if (s.substr(i, 2) === '⁻¹') { word += '⁻¹'; i += 2; }

        var low = word.toLowerCase();

        if (low === 'pi') { tokens.push({ t: 'const', v: 'π' }); continue; }
        if (low === 'ans') { tokens.push({ t: 'ans' }); continue; }
        if (low === 'i') { tokens.push({ t: 'imag' }); continue; }
        if (low === 'e') { tokens.push({ t: 'const', v: 'e' }); continue; }

        var fn = null;
        for (var f = 0; f < FUNCS.length; f++) {
          if (FUNCS[f].toLowerCase() === low) { fn = FUNCS[f]; break; }
        }
        if (fn) { tokens.push({ t: 'func', v: fn }); continue; }

        if (word.length === 1 && /[A-FMXY]/.test(word)) { tokens.push({ t: 'var', v: word }); continue; }
        if (word.length === 1 && /[a-z]/.test(word)) { tokens.push({ t: 'var', v: word }); continue; }
        if (PHYS[word] !== undefined) { tokens.push({ t: 'num', v: PHYS[word] }); continue; }

        tokens.push({ t: 'unknown', v: word });
        continue;
      }

      switch (c) {
        case '+': case '-': case '*': case '/': case '^':
          tokens.push({ t: 'op', v: c }); i++; continue;
        case '(': tokens.push({ t: 'lparen' }); i++; continue;
        case ')': tokens.push({ t: 'rparen' }); i++; continue;
        case ',': tokens.push({ t: 'comma' }); i++; continue;
        case '√': tokens.push({ t: 'func', v: 'sqrt' }); i++; continue;
        case '∛': tokens.push({ t: 'func', v: 'cbrt' }); i++; continue;
        case '∑': tokens.push({ t: 'func', v: 'Sum' }); i++; continue;
        case '∫': tokens.push({ t: 'func', v: 'Integral' }); i++; continue;
        case '=': tokens.push({ t: 'eq' }); i++; continue;
        case ':': tokens.push({ t: 'colon' }); i++; continue;
        case '→': tokens.push({ t: 'arrow' }); i++; continue;
        case '_': tokens.push({ t: 'under' }); i++; continue;
        default:
          throw syntaxError();
      }
    }
    return tokens;
  }

  /* ============================================================
     4. parser
     ------------------------------------------------------------
     Every operator works on either a number or a complex object.
     ============================================================ */
  function Parser(tokens, ctx) {
    this.tk = tokens;
    this.p = 0;
    this.ctx = ctx;
  }

  Parser.prototype.peek = function (n) { return this.tk[this.p + (n || 0)]; };
  Parser.prototype.next = function () { return this.tk[this.p++]; };
  Parser.prototype.isOp = function (v) {
    var t = this.peek();
    return t && t.t === 'op' && t.v === v;
  };
  Parser.prototype.accept = function (type, value) {
    var t = this.peek();
    if (!t || t.t !== type) return false;
    if (value !== undefined && t.v !== value) return false;
    this.p++;
    return true;
  };
  Parser.prototype.expect = function (type, value) {
    if (!this.accept(type, value)) throw syntaxError();
  };

  /* expr := term (('+'|'-') term)* */
  Parser.prototype.parseExpr = function () {
    var left = this.parseTerm();
    for (;;) {
      var t = this.peek();
      if (t && t.t === 'op' && (t.v === '+' || t.v === '-')) {
        this.p++;
        var right = this.parseTerm();
        left = t.v === '+' ? C.add(left, right) : C.sub(left, right);
      } else break;
    }
    return left;
  };

  /* term := unary (('*'|'/') unary | implicit)* */
  Parser.prototype.parseTerm = function () {
    var left = this.parseUnary();
    for (;;) {
      var t = this.peek();
      if (!t) break;

      if (t.t === 'op' && (t.v === '*' || t.v === '/')) {
        this.p++;
        var r = this.parseUnary();
        left = t.v === '*' ? C.mul(left, r) : C.div(left, r);
        continue;
      }

      var startsValue =
        t.t === 'num' || t.t === 'const' || t.t === 'var' || t.t === 'imag' ||
        t.t === 'func' || t.t === 'lparen' || t.t === 'ans';

      if (startsValue) {
        left = C.mul(left, this.parseUnary());
        continue;
      }
      break;
    }
    return left;
  };

  Parser.prototype.parseUnary = function () {
    var t = this.peek();
    if (t && t.t === 'op' && (t.v === '-' || t.v === '+')) {
      this.p++;
      var v = this.parseUnary();
      return t.v === '-' ? C.neg(v) : v;
    }
    return this.parsePower();
  };

  Parser.prototype.parsePower = function () {
    var base = this.parsePostfix();
    var t = this.peek();
    if (t && t.t === 'op' && t.v === '^') {
      this.p++;
      var e = this.parseUnary();
      return C.pow(base, e);
    }
    // ∠ complex polar operator: r∠θ
    if (t && t.t === 'op' && t.v === '∠') {
      this.p++;
      var ang = this.parseUnary();
      var r = num(base), a = num(ang);
      var rad = toRadRaw(a, this.ctx.angle);
      return { re: r * Math.cos(rad), im: r * Math.sin(rad) };
    }
    return base;
  };

  Parser.prototype.parsePostfix = function () {
    var v = this.parsePrimary();
    for (;;) {
      var t = this.peek();
      if (!t || t.t !== 'post') break;
      this.p++;
      switch (t.v) {
        case 'sq': v = C.mul(v, v); break;
        case 'cube': v = C.mul(C.mul(v, v), v); break;
        case 'fact': v = { re: factorial(num(v)), im: 0 }; break;
        case 'pct': v = C.div(v, 100); break;
        case 'deg': { // °  → radians when in rad/grad mode
          var rv = num(v);
          v = { re: toRadRaw(rv, 'deg'), im: 0 };
          break;
        }
        case 'rad': v = { re: num(v), im: 0 }; break;
        case 'grad': v = { re: toRadRaw(num(v), 'grad'), im: 0 }; break;
      }
    }
    return v;
  };

  Parser.prototype.parsePrimary = function () {
    var t = this.next();
    if (!t) throw syntaxError();

    if (t.t === 'num') return { re: t.v, im: 0 };
    if (t.t === 'const') return { re: CONST[t.v], im: 0 };
    if (t.t === 'imag') return { re: 0, im: 1 };
    if (t.t === 'ans') return C.to(this.ctx.ans);
    if (t.t === 'var') {
      var name = t.v;
      var val = this.ctx.vars[name];
      if (val === undefined) val = 0;
      return C.to(val);
    }

    if (t.t === 'lparen') {
      var inner = this.parseExpr();
      this.expect('rparen');
      return inner;
    }

    if (t.t === 'func') return this.callFunc(t.v);

    if (t.t === 'op' && t.v === '-') return C.neg(this.parseUnary());

    throw syntaxError();
  };

  Parser.prototype.parseArgs = function () {
    var args = [this.parseExpr()];
    while (this.accept('comma')) args.push(this.parseExpr());
    return args;
  };

  Parser.prototype.callFunc = function (name) {
    var self = this;
    var argFn = function (single) {
      if (self.accept('lparen')) {
        var list = self.parseArgs();
        self.expect('rparen');
        return list;
      }
      return [self.parseUnary()];
    };

    /* special forms with commas / ranges */
    if (name === 'Sum' || name === 'Integral' || name === 'd') {
      throw syntaxError(); // handled by structural helpers below
    }
    if (name === 'Pol' || name === 'Rec') {
      var p = argFn();
      var x = num(p[0]), y = num(p[1]);
      if (name === 'Pol') {
        var rr = Math.hypot(x, y), th = fromRadRaw(Math.atan2(y, x), this.ctx.angle);
        return { pair: [rr, th], labels: ['r', 'θ'] };
      }
      var rad = toRadRaw(y, this.ctx.angle);
      return { pair: [x * Math.cos(rad), x * Math.sin(rad)], labels: ['X', 'Y'] };
    }
    if (name === 'randInt' || name === 'RanInt') {
      var a2 = argFn();
      var lo = Math.ceil(num(a2[0])), hi = Math.floor(num(a2[1]));
      return { re: lo + Math.floor(Math.random() * (hi - lo + 1)), im: 0 };
    }

    var a = argFn();

    /* functions that must see the complex value itself */
    var cArg = a[0];
    switch (name) {
      case 'Arg': return { re: fromRadRaw(C.arg(cArg), this.ctx.angle), im: 0 };
      case 'Conjg': return { re: C.to(cArg).re, im: -C.to(cArg).im };
      case 'Re': return { re: C.to(cArg).re, im: 0 };
      case 'Im': return { re: C.to(cArg).im, im: 0 };
      case 'Abs': case 'abs': return { re: C.abs(cArg), im: 0 };
      default: break;
    }

    return MathLib.apply(name, a.map(num), this.ctx);
  };

  /* ============================================================
     5. math library
     ============================================================ */
  function num(v) { return C.isC(v) ? v.re : v; }

  function toRadRaw(v, unit) {
    if (unit === 'rad') return v;
    if (unit === 'grad') return v * Math.PI / 200;
    return v * Math.PI / 180;
  }
  function fromRadRaw(v, unit) {
    if (unit === 'rad') return v;
    if (unit === 'grad') return v * 200 / Math.PI;
    return v * 180 / Math.PI;
  }

  function factorial(n) {
    if (n < 0 || Math.abs(n - Math.round(n)) > 1e-9) throw mathError();
    n = Math.round(n);
    if (n > 170) throw mathError();
    var r = 1;
    for (var k = 2; k <= n; k++) r *= k;
    return r;
  }

  function nCr(n, r) {
    n = Math.round(n); r = Math.round(r);
    if (n < 0 || r < 0 || r > n) throw mathError();
    r = Math.min(r, n - r);
    var res = 1;
    for (var k = 1; k <= r; k++) { res = res * (n - r + k) / k; }
    return Math.round(res * 1e9) / 1e9;
  }

  function nPr(n, r) {
    n = Math.round(n); r = Math.round(r);
    if (n < 0 || r < 0 || r > n) throw mathError();
    var res = 1;
    for (var k = 0; k < r; k++) res *= (n - k);
    return res;
  }

  function gcd2(a, b) {
    a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b));
    while (b) { var t = b; b = a % b; a = t; }
    return a;
  }

  var MathLib = {
    apply: function (name, args, ctx) {
      var x = args[0], y = args[1], z = args[2];
      switch (name) {
        case 'sin': return { re: trig(Math.sin, x, ctx.angle), im: 0 };
        case 'cos': return { re: trig(Math.cos, x, ctx.angle), im: 0 };
        case 'tan': {
          var c = Math.cos(toRadRaw(x, ctx.angle));
          if (Math.abs(c) < 1e-14) throw mathError();
          return { re: trig(Math.tan, x, ctx.angle), im: 0 };
        }
        case 'sin⁻¹': case 'asin': return { re: invTrig(Math.asin, x, ctx.angle), im: 0 };
        case 'cos⁻¹': case 'acos': return { re: invTrig(Math.acos, x, ctx.angle), im: 0 };
        case 'tan⁻¹': case 'atan': return { re: invTrig(Math.atan, x, ctx.angle), im: 0 };
        case 'sinh': return { re: Math.sinh(x), im: 0 };
        case 'cosh': return { re: Math.cosh(x), im: 0 };
        case 'tanh': return { re: Math.tanh(x), im: 0 };
        case 'sinh⁻¹': case 'asinh': return { re: Math.asinh(x), im: 0 };
        case 'cosh⁻¹': case 'acosh': return { re: Math.acosh(x), im: 0 };
        case 'tanh⁻¹': case 'atanh': return { re: Math.atanh(x), im: 0 };

        case 'log': case 'lg':
          if (args.length === 2) {
            if (x <= 0 || y <= 0) throw mathError();
            return { re: Math.log(y) / Math.log(x), im: 0 };
          }
          if (x <= 0) throw mathError();
          return { re: Math.log10(x), im: 0 };
        case 'ln':
          if (x <= 0) throw mathError();
          return { re: Math.log(x), im: 0 };
        case 'log₂':
          if (x <= 0) throw mathError();
          return { re: Math.log2(x), im: 0 };
        case 'exp': return { re: Math.exp(x), im: 0 };

        case 'sqrt': return C.clean(C.sqrt(x));
        case 'cbrt': return { re: Math.cbrt(x), im: 0 };
        case 'abs': case 'Abs': return { re: Math.abs(x), im: 0 };
        case 'abs2': return { re: x * x, im: 0 };
        case 'sign': return { re: Math.sign(x), im: 0 };
        case 'floor': case 'int': return { re: Math.floor(x), im: 0 };
        case 'ceil': return { re: Math.ceil(x), im: 0 };
        case 'round': return { re: Math.round(x), im: 0 };
        case 'frac': return { re: x - Math.trunc(x), im: 0 };
        case 'rand': return { re: Math.random(), im: 0 };

        case 'nCr': return { re: nCr(x, y), im: 0 };
        case 'nPr': return { re: nPr(x, y), im: 0 };
        case 'gcd': return { re: gcd2(x, y), im: 0 };
        case 'lcm': return { re: Math.abs(Math.round(x) * Math.round(y)) / (gcd2(x, y) || 1), im: 0 };
        case 'min': return { re: Math.min.apply(null, args), im: 0 };
        case 'max': return { re: Math.max.apply(null, args), im: 0 };

        default: throw syntaxError();
      }
    },
    nCr: nCr, nPr: nPr, gcd: gcd2, factorial: factorial
  };

  function trig(fn, v, unit) {
    var r = fn(toRadRaw(v, unit));
    if (Math.abs(r) < 1e-13) r = 0;
    if (Math.abs(Math.abs(r) - 1) < 1e-13) r = Math.sign(r);
    return r;
  }
  function invTrig(fn, v, unit) {
    var r = fn(v);
    if (isNaN(r)) throw mathError();
    return fromRadRaw(r, unit);
  }

  /* ============================================================
     5b. structural expression splitters for ∑ ∫ d/dx
     ============================================================ */
  function splitTopLevel(src, sep) {
    var depth = 0, out = [], cur = '';
    for (var i = 0; i < src.length; i++) {
      var c = src[i];
      if (c === '(' || c === '[') depth++;
      else if (c === ')' || c === ']') depth > 0 && depth--;
      if (c === sep && depth === 0) { out.push(cur); cur = ''; continue; }
      cur += c;
    }
    out.push(cur);
    return out;
  }

  function extractCallBody(src, startIdx) {
    // src[startIdx] === '(' ; returns {body, end}
    var depth = 0;
    for (var i = startIdx; i < src.length; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') {
        depth--;
        if (depth === 0) return { body: src.slice(startIdx + 1, i), end: i };
      }
    }
    return null;
  }

  /* ============================================================
     6. calculus
     ============================================================ */
  function evaluateAst(expr, ctx, overrides) {
    var localVars = Object.assign({}, ctx.vars, overrides || {});
    var tokens = tokenize(expr);
    var parser = new Parser(tokens, {
      angle: ctx.angle,
      ans: ctx.ans,
      vars: localVars,
      complex: ctx.complex,
      tol: ctx.tol
    });
    var val = parser.parseExpr();
    if (parser.p < parser.tk.length) throw syntaxError();
    return val;
  }

  function isComplex(v) { return C.isC(v) && Math.abs(v.im) > 1e-14; }

  /* derivative (central difference with Richardson extrapolation) */
  function derivative(expr, x, ctx) {
    var h = 1e-5 * Math.max(1, Math.abs(x));
    function f(t) {
      var v = evaluateAst(expr, ctx, { x: t });
      if (isComplex(v)) throw mathError();
      return num(v);
    }
    var a = (f(x + h) - f(x - h)) / (2 * h);
    var b = (f(x + h / 2) - f(x - h / 2)) / h;
    return (4 * b - a) / 3;
  }

  /* Simpson's rule composite integral */
  function integrate(expr, a, b, ctx, n) {
    n = n || 1000;
    if (n % 2) n++;
    var h = (b - a) / n;
    function f(t) {
      var v = evaluateAst(expr, ctx, { x: t });
      if (isComplex(v)) throw mathError();
      return num(v);
    }
    var sum = f(a) + f(b);
    for (var i = 1; i < n; i++) {
      sum += (i % 2 ? 4 : 2) * f(a + i * h);
    }
    var r = sum * h / 3;
    if (isNaN(r) || !isFinite(r)) throw mathError();
    return r;
  }

  /* Σ  and  Π (product) */
  function summation(expr, start, end, ctx) {
    start = Math.round(start); end = Math.round(end);
    if (end < start) throw mathError();
    if (end - start > 100000) throw mathError();
    var total = 0;
    var cmp = ctx.complex;
    for (var k = start; k <= end; k++) {
      var v = evaluateAst(expr, ctx, { x: k });
      total = cmp ? C.add(total, v) : total + num(v);
    }
    return total;
  }

  function productOf(expr, start, end, ctx) {
    start = Math.round(start); end = Math.round(end);
    if (end < start) throw mathError();
    var p = 1;
    for (var k = start; k <= end; k++) p *= num(evaluateAst(expr, ctx, { x: k }));
    return p;
  }

  /* pre-process ∑(...) ∫(...) d/dx(...) forms into numbers */
  function expandStructural(src, ctx) {
    var changed = true, guard = 0;
    while (changed && guard++ < 40) {
      changed = false;

      /* ∑(expr, from, to) */
      var m = /∑\(/.exec(src);
      if (m) {
        var body = extractCallBody(src, m.index + 1);
        if (!body) throw syntaxError();
        var parts = splitTopLevel(body.body, ',');
        if (parts.length < 3) throw syntaxError();
        var to = num(evaluateAst(parts[2], ctx));
        var from = num(evaluateAst(parts[1], ctx));
        var val = summation(parts[0], from, to, ctx);
        src = src.slice(0, m.index) + '(' + formatValueInline(val) + ')' + src.slice(body.end + 1);
        changed = true;
        continue;
      }

      /* Π(expr, from, to) */
      m = /Π\(/.exec(src);
      if (m) {
        var b2 = extractCallBody(src, m.index + 1);
        if (!b2) throw syntaxError();
        var p2 = splitTopLevel(b2.body, ',');
        if (p2.length < 3) throw syntaxError();
        var v2 = productOf(p2[0], num(evaluateAst(p2[1], ctx)), num(evaluateAst(p2[2], ctx)), ctx);
        src = src.slice(0, m.index) + '(' + formatValueInline(v2) + ')' + src.slice(b2.end + 1);
        changed = true;
        continue;
      }

      /* ∫(expr, a, b) or ∫(expr, a, b, tol) */
      m = /∫\(/.exec(src);
      if (m) {
        var b3 = extractCallBody(src, m.index + 1);
        if (!b3) throw syntaxError();
        var p3 = splitTopLevel(b3.body, ',');
        if (p3.length < 3) throw syntaxError();
        var lo = num(evaluateAst(p3[1], ctx));
        var hi = num(evaluateAst(p3[2], ctx));
        var iv = integrate(p3[0], lo, hi, ctx, 1000);
        src = src.slice(0, m.index) + '(' + formatValueInline(iv) + ')' + src.slice(b3.end + 1);
        changed = true;
        continue;
      }

      /* d/dx(expr, a) */
      m = /d\/dx\(/.exec(src);
      if (m) {
        var b4 = extractCallBody(src, m.index + 4);
        if (!b4) throw syntaxError();
        var p4 = splitTopLevel(b4.body, ',');
        if (p4.length < 2) throw syntaxError();
        var dv = derivative(p4[0], num(evaluateAst(p4[1], ctx)), ctx);
        src = src.slice(0, m.index) + '(' + formatValueInline(dv) + ')' + src.slice(b4.end + 1);
        changed = true;
        continue;
      }
    }
    return src;
  }

  function formatValueInline(v) {
    var n = C.isC(v) ? v.re : v;
    return '(' + Number(n).toPrecision(15) + ')';
  }

  /* ============================================================
     7. evaluate + solve
     ============================================================ */
  function autoClose(src) {
    var open = 0;
    for (var i = 0; i < src.length; i++) {
      if (src[i] === '(') open++;
      else if (src[i] === ')') open--;
    }
    while (open-- > 0) src += ')';
    return src;
  }

  function makeCtx(options) {
    var o = options || {};
    return {
      angle: o.angle || 'deg',
      ans: o.ans || 0,
      vars: o.vars || {},
      complex: !!o.complex,
      tol: o.tol || 1e-9
    };
  }

  function evaluate(expression, options) {
    var ctx = makeCtx(options);
    var src = String(expression == null ? '' : expression).trim();
    if (!src) throw syntaxError();
    src = autoClose(src);
    src = expandStructural(src, ctx);

    var tokens = tokenize(src);
    if (!tokens.length) throw syntaxError();

    var parser = new Parser(tokens, ctx);
    var value = parser.parseExpr();
    if (parser.p < parser.tk.length) throw syntaxError();

    if (C.isPair(value)) return value;
    if (!C.isC(value)) value = { re: value, im: 0 };
    if (!isFinite(value.re) || isNaN(value.re)) throw mathError();
    if (!isFinite(value.im) || isNaN(value.im)) throw mathError();

    value = C.clean(value);
    if (!ctx.complex && Math.abs(value.im) > 1e-12) throw mathError();
    return value;
  }

  /* solve f(x)=0 starting at guess (Newton + bisection fallback) */
  function solve(expression, guess, ctx, variable) {
    var v = variable || 'x';
    var eq = String(expression);
    var target = eq;
    var eqIdx = eq.indexOf('=');
    function f(t) {
      var val;
      if (eqIdx >= 0) {
        var lhs = eq.slice(0, eqIdx), rhs = eq.slice(eqIdx + 1);
        val = num(evaluateAst(lhs, ctx, obj(v, t))) - num(evaluateAst(rhs, ctx, obj(v, t)));
      } else {
        val = num(evaluateAst(target, ctx, obj(v, t)));
      }
      return val;
    }
    var x = guess === undefined ? 1 : guess;
    for (var i = 0; i < 200; i++) {
      var fx = f(x);
      if (Math.abs(fx) < 1e-12) return x;
      var h = 1e-6 * Math.max(1, Math.abs(x));
      var dfx = (f(x + h) - f(x - h)) / (2 * h);
      if (!isFinite(dfx) || Math.abs(dfx) < 1e-14) break;
      var step = fx / dfx;
      if (!isFinite(step)) break;
      x -= step;
      if (Math.abs(step) < 1e-12) return x;
    }
    /* bisection scan fallback */
    var ranges = [[-1e6, 1e6], [-1e4, 1e4], [-100, 100], [-10, 10], [-1, 1]];
    for (var r = 0; r < ranges.length; r++) {
      var a = ranges[r][0], b = ranges[r][1], N = 800;
      var pa = f(a), pb = f(b);
      for (var k = 1; k <= N; k++) {
        var xx = a + (b - a) * k / N;
        var px = f(xx);
        if (!isFinite(pa) || !isFinite(px)) { pa = px; continue; }
        if (pa === 0) return xx - (b - a) / N;
        if (pa * px < 0) {
          var lo = a + (b - a) * (k - 1) / N, hi = xx;
          for (var it = 0; it < 120; it++) {
            var mid = (lo + hi) / 2;
            var pm = f(mid);
            if (Math.abs(pm) < 1e-14) return mid;
            if (pa * pm < 0) hi = mid; else { lo = mid; pa = pm; }
          }
          return (lo + hi) / 2;
        }
        pa = px;
      }
    }
    throw new CalcError('Cannot Solve');
  }

  function obj(k, v) { var o = {}; o[k] = v; return o; }

  /* ============================================================
     8. matrices & vectors
     ============================================================ */
  var Matrix = {
    add: function (A, B) {
      return A.map(function (row, i) { return row.map(function (v, j) { return v + B[i][j]; }); });
    },
    sub: function (A, B) {
      return A.map(function (row, i) { return row.map(function (v, j) { return v - B[i][j]; }); });
    },
    mul: function (A, B) {
      var n = A.length, m = B[0].length, p = B.length;
      var out = [];
      for (var i = 0; i < n; i++) {
        out[i] = [];
        for (var j = 0; j < m; j++) {
          var s = 0;
          for (var k = 0; k < p; k++) s += A[i][k] * B[k][j];
          out[i][j] = s;
        }
      }
      return out;
    },
    scalar: function (A, s) {
      return A.map(function (row) { return row.map(function (v) { return v * s; }); });
    },
    det: function (A) {
      var n = A.length;
      if (n === 1) return A[0][0];
      if (n === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0];
      var d = 0;
      for (var j = 0; j < n; j++) {
        var minor = [];
        for (var i = 1; i < n; i++) {
          var row = [];
          for (var k = 0; k < n; k++) if (k !== j) row.push(A[i][k]);
          minor.push(row);
        }
        d += ((j % 2) ? -1 : 1) * A[0][j] * Matrix.det(minor);
      }
      return d;
    },
    inv: function (A) {
      var n = A.length;
      if (A.some(function (row) { return row.length !== n; })) {
        throw new CalcError('Math ERROR');
      }
      var det = Matrix.det(A);
      if (Math.abs(det) < 1e-14) throw new CalcError('Math ERROR');

      /* cofactor matrix */
      var cof = [];
      for (var i = 0; i < n; i++) {
        cof[i] = [];
        for (var j = 0; j < n; j++) {
          var minor = [];
          for (var r = 0; r < n; r++) {
            if (r === i) continue;
            var row = [];
            for (var c = 0; c < n; c++) if (c !== j) row.push(A[r][c]);
            minor.push(row);
          }
          var m = (n === 1) ? 1 : Matrix.det(minor);
          cof[i][j] = ((i + j) % 2 ? -1 : 1) * m;
        }
      }

      /* inverse = adjugate / det  (adjugate = transpose of cofactors) */
      var out = [];
      for (var r2 = 0; r2 < n; r2++) {
        out[r2] = [];
        for (var c2 = 0; c2 < n; c2++) {
          out[r2][c2] = cof[c2][r2] / det;
        }
      }
      return out;
    },
    transpose: function (A) {
      var out = [];
      for (var j = 0; j < A[0].length; j++) {
        out[j] = [];
        for (var i = 0; i < A.length; i++) out[j][i] = A[i][j];
      }
      return out;
    },
    identity: function (n) {
      var out = [];
      for (var i = 0; i < n; i++) {
        out[i] = [];
        for (var j = 0; j < n; j++) out[i][j] = i === j ? 1 : 0;
      }
      return out;
    },
    trace: function (A) {
      var s = 0;
      for (var i = 0; i < A.length; i++) s += A[i][i];
      return s;
    },
    clone: function (A) { return A.map(function (r) { return r.slice(); }); },
    /** Gauss-Jordan solve for n unknowns */
    solveLinear: function (A, b) {
      var n = A.length;
      var M = A.map(function (row, i) { return row.concat([b[i]]); });
      for (var col = 0; col < n; col++) {
        var piv = col;
        for (var r = col + 1; r < n; r++) {
          if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
        }
        if (Math.abs(M[piv][col]) < 1e-14) return null;
        var t = M[col]; M[col] = M[piv]; M[piv] = t;
        var pv = M[col][col];
        for (var c2 = col; c2 <= n; c2++) M[col][c2] /= pv;
        for (var r2 = 0; r2 < n; r2++) {
          if (r2 === col) continue;
          var f = M[r2][col];
          if (!f) continue;
          for (var c3 = col; c3 <= n; c3++) M[r2][c3] -= f * M[col][c3];
        }
      }
      return M.map(function (row) { return row[n]; });
    }
  };

  /* ============================================================
     9. statistics / regression / distributions
     ============================================================ */
  var Stat = {
    summary: function (values) {
      var n = values.length;
      if (!n) throw mathError();
      var sum = 0, sq = 0;
      for (var i = 0; i < n; i++) { sum += values[i]; sq += values[i] * values[i]; }
      var mean = sum / n;
      var ss = sq - n * mean * mean;
      var varP = ss / n;
      var varS = n > 1 ? ss / (n - 1) : 0;
      return {
        n: n, sum: sum, sumSq: sq, mean: mean,
        varP: varP, varS: varS,
        sdP: Math.sqrt(varP), sdS: Math.sqrt(varS),
        min: Math.min.apply(null, values),
        max: Math.max.apply(null, values),
        median: Stat.median(values)
      };
    },
    median: function (values) {
      var a = values.slice().sort(function (x, y) { return x - y; });
      var n = a.length;
      if (!n) throw mathError();
      return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
    },
    mode: function (values) {
      var counts = {}, best = null, bestCount = 0;
      values.forEach(function (v) {
        counts[v] = (counts[v] || 0) + 1;
        if (counts[v] > bestCount) { bestCount = counts[v]; best = v; }
      });
      return best;
    },
    q1: function (values) {
      var a = values.slice().sort(function (x, y) { return x - y; });
      var n = a.length;
      var half = a.slice(0, Math.floor(n / 2));
      return Stat.median(half);
    },
    q3: function (values) {
      var a = values.slice().sort(function (x, y) { return x - y; });
      var n = a.length;
      var half = a.slice(Math.ceil(n / 2));
      return Stat.median(half);
    },
    linearRegression: function (xs, ys) {
      var n = xs.length;
      if (n !== ys.length || n < 2) throw mathError();
      var sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0;
      for (var i = 0; i < n; i++) {
        sx += xs[i]; sy += ys[i];
        sxy += xs[i] * ys[i]; sxx += xs[i] * xs[i]; syy += ys[i] * ys[i];
      }
      var denom = n * sxx - sx * sx;
      var a = (n * sxy - sx * sy) / denom;
      var b = (sy - a * sx) / n;
      var r = (n * sxy - sx * sy) / Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
      return { a: a, b: b, r: r, r2: r * r };
    },
    quadraticRegression: function (xs, ys) {
      // solve normal equations for y = a x² + b x + c
      var n = xs.length;
      var s = [0, 0, 0, 0, 0], t = [0, 0, 0];
      for (var i = 0; i < n; i++) {
        var x = xs[i], y = ys[i];
        s[0] += Math.pow(x, 4); s[1] += Math.pow(x, 3); s[2] += x * x;
        s[3] += x; s[4] += 1;
        t[0] += y * x * x; t[1] += y * x; t[2] += y;
      }
      var A = [[s[0], s[1], s[2]], [s[1], s[2], s[3]], [s[2], s[3], s[4]]];
      var sol = Matrix.solveLinear(A, t);
      if (!sol) throw mathError();
      return { a: sol[0], b: sol[1], c: sol[2] };
    },
    erf: function (x) {
      // Abramowitz & Stegun 7.1.26
      var s = Math.sign(x); x = Math.abs(x);
      var t = 1 / (1 + 0.3275911 * x);
      var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
      return s * y;
    },
    normalPdf: function (x, mu, sd) {
      return Math.exp(-0.5 * Math.pow((x - mu) / sd, 2)) / (sd * Math.sqrt(2 * Math.PI));
    },
    normalCdf: function (x, mu, sd) {
      return 0.5 * (1 + Stat.erf((x - mu) / (sd * Math.SQRT2)));
    },
    normalInv: function (p) {
      // Acklam's inverse normal CDF
      var a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.3577518672690, -30.66479806614716, 2.506628277459239];
      var b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
      var c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
      var d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
      var pl = 0.02425, q, r;
      if (p <= 0 || p >= 1) throw mathError();
      if (p < pl) {
        q = Math.sqrt(-2 * Math.log(p));
        return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
               ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
      }
      if (p > 1 - pl) {
        q = Math.sqrt(-2 * Math.log(1 - p));
        return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
                ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
      }
      q = p - 0.5; r = q * q;
      return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
             (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    },
    tCdf: function (t, df) {
      // via incomplete beta (continued fraction, Lentz)
      var x = df / (df + t * t);
      var p = 0.5 * Stat.betaInc(x, df / 2, 0.5);
      return t > 0 ? 1 - p : p;
    },
    betaInc: function (x, a, b) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var lbeta = Stat.logGamma(a) + Stat.logGamma(b) - Stat.logGamma(a + b);
      var front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
      var f = 1, c = 1, d = 0;
      for (var i = 0; i <= 200; i++) {
        var m = Math.floor(i / 2);
        var num;
        if (i === 0) num = 1;
        else if (i % 2 === 0) num = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
        else num = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
        d = 1 + num * d; if (Math.abs(d) < 1e-30) d = 1e-30;
        d = 1 / d;
        c = 1 + num / c; if (Math.abs(c) < 1e-30) c = 1e-30;
        var cd = c * d;
        f *= cd;
        if (Math.abs(cd - 1) < 1e-12) break;
      }
      var res = front * (f - 1);
      return x < (a + 1) / (a + b + 2) ? res : 1 - Stat.betaInc(1 - x, b, a);
    },
    logGamma: function (z) {
      var g = [76.18009172947146, -86.50532032941677, 24.01409824083091,
               -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
      var x = z, y = z, tmp = x + 5.5;
      tmp -= (x + 0.5) * Math.log(tmp);
      var ser = 1.000000000190015;
      for (var j = 0; j < 6; j++) ser += g[j] / ++y;
      return -tmp + Math.log(2.5066282746310005 * ser / x);
    }
  };

  /* ============================================================
     10. base-N
     ============================================================ */
  var BaseN = {
    toDecimal: function (str, base) {
      var s = String(str).replace(/\s/g, '').toUpperCase();
      var neg = s[0] === '-';
      if (neg) s = s.slice(1);
      if (!s) throw syntaxError();
      var v = 0;
      for (var i = 0; i < s.length; i++) {
        var d = parseInt(s[i], 16);
        if (isNaN(d) || d >= base) throw new CalcError('Base ERROR');
        v = v * base + d;
      }
      return neg ? -v : v;
    },
    fromDecimal: function (n, base) {
      n = Math.trunc(n);
      var neg = n < 0;
      n = Math.abs(n);
      if (n === 0) return '0';
      var digits = '0123456789ABCDEF';
      var out = '';
      while (n > 0) {
        out = digits[n % base] + out;
        n = Math.floor(n / base);
      }
      return (neg ? '-' : '') + out;
    }
  };

  /* ============================================================
     11. fractions
     ============================================================ */
  function fractionOf(x, maxDen) {
    maxDen = maxDen || 1e5;
    if (!isFinite(x)) return null;
    var sign = x < 0 ? -1 : 1;
    var v = Math.abs(x);
    // best rational approximation via continued fractions
    var h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = v;
    for (var i = 0; i < 64; i++) {
      var a = Math.floor(b);
      var h2 = a * h1 + h0, k2 = a * k1 + k0;
      if (k2 > maxDen) break;
      h0 = h1; h1 = h2; k0 = k1; k1 = k2;
      if (Math.abs(v - h1 / k1) < 1e-12) break;
      var frac = b - a;
      if (frac < 1e-12) break;
      b = 1 / frac;
    }
    if (k1 === 0) return null;
    if (Math.abs(v - h1 / k1) > 1e-10) return null;
    var g = gcd2(h1, k1);
    var n = sign * h1 / g, d = k1 / g;
    if (d === 1) return null;
    return { n: n, d: d };
  }

  function fractionText(fr) {
    if (!fr) return null;
    if (fr.d === 1) return String(fr.n);
    if (Math.abs(fr.n) > fr.d) {
      var whole = Math.trunc(fr.n / fr.d);
      var rem = Math.abs(fr.n % fr.d);
      return whole + '⌐' + rem + '/' + fr.d;
    }
    return fr.n + '/' + fr.d;
  }

  /* convert decimal to a π-multiple string when close to k·π/m */
  function piFraction(x, tol) {
    tol = tol || 1e-10;
    var best = null;
    for (var d = 1; d <= 12; d++) {
      var k = x * d / Math.PI;
      var rk = Math.round(k);
      if (rk === 0) continue;
      if (Math.abs(k - rk) < tol * 100) {
        best = { k: rk, d: d };
        break;
      }
    }
    if (!best) return null;
    var num = best.k, den = best.d;
    var g = gcd2(num, den);
    num /= g; den /= g;
    if (den === 1) return (num === 1 ? 'π' : num + 'π');
    var s = (num === 1 ? 'π' : num + 'π');
    return s + '/' + den;
  }

  /* ============================================================
     12. formatting
     ============================================================ */
  var SUPS = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵',
               '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '.': '·' };

  function superscript(str) {
    return String(str).split('').map(function (c) { return SUPS[c] !== undefined ? SUPS[c] : c; }).join('');
  }

  function roundSig(v, sig) {
    if (v === 0) return 0;
    var d = Math.ceil(Math.log10(Math.abs(v)));
    var p = sig - d;
    var m = Math.pow(10, p);
    return Math.round(v * m) / m;
  }

  function trimZeros(s) {
    if (s.indexOf('.') === -1) return s;
    s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }

  function formatValue(value, opts) {
    var o = opts || {};
    var mode = o.format || 'norm';
    var complex = o.complex || false;

    if (C.isPair(value)) {
      var l = value.labels || ['x', 'y'];
      return l[0] + '=' + formatReal(value.pair[0], mode, o) +
             '  ' + l[1] + '=' + formatReal(value.pair[1], mode, o);
    }

    var v = C.isC(value) ? value : { re: value, im: 0 };

    if (complex || Math.abs(v.im) > 1e-12) {
      return formatComplex(v, o);
    }
    var x = v.re;
    return formatReal(x, mode, o);
  }

  function formatReal(x, mode, o) {
    if (x === 0) x = 0;
    var digits = o.digits || 10;

    if (mode === 'fix2') return Number(x).toFixed(2);
    if (mode === 'fix3') return Number(x).toFixed(3);
    if (mode === 'fix4') return Number(x).toFixed(4);

    var abs = Math.abs(x);

    if (mode === 'sci') {
      var e = x.toExponential(9);
      var parts = e.split('e');
      return trimZeros(parts[0]) + '×10' + superscript(parseInt(parts[1], 10));
    }

    if (mode === 'eng') {
      if (x === 0) return '0';
      var exp3 = Math.floor(Math.log10(abs) / 3) * 3;
      var mant = x / Math.pow(10, exp3);
      return trimZeros(mant.toPrecision(10)) + '×10' + superscript(exp3);
    }

    if (mode === 'frac') {
      var fr0 = fractionOf(x);
      if (fr0) return fractionText(fr0);
    }

    if (mode === 'pi') {
      var pf = piFraction(x);
      if (pf) return pf;
      var fr1 = fractionOf(x);
      if (fr1) return fractionText(fr1);
    }

    if (abs >= 1e10 || (abs > 0 && abs < 1e-9)) {
      var ex = x.toExponential(9).split('e');
      return trimZeros(ex[0]) + '×10' + superscript(parseInt(ex[1], 10));
    }

    var rounded = roundSig(x, digits);
    if (Number.isInteger(rounded) && Math.abs(rounded) < 1e15) return String(rounded);
    var decimals = Math.max(0, digits - 1 - Math.floor(Math.log10(abs + 1e-300)));
    return trimZeros(rounded.toFixed(Math.min(decimals, 12)));
  }

  function formatComplex(z, o) {
    var mode = o.format || 'norm';
    var polar = o.complexFormat === 'polar';
    var re = Math.abs(z.re) < 1e-12 ? 0 : z.re;
    var im = Math.abs(z.im) < 1e-12 ? 0 : z.im;

    if (polar) {
      var r = Math.hypot(re, im);
      var th = fromRadRaw(Math.atan2(im, re), o.angle || 'deg');
      return formatReal(r, mode, o) + '∠' + formatReal(th, mode, o);
    }

    if (im === 0) return formatReal(re, mode, o);
    if (re === 0) {
      if (im === 1) return 'i';
      if (im === -1) return '-i';
      return formatReal(im, mode, o) + 'i';
    }
    var imTxt = (im === 1 ? '' : im === -1 ? '-' : formatReal(im, mode, o));
    return formatReal(re, mode, o) + (im > 0 ? '+' : '') + imTxt + 'i';
  }

  /* ============================================================
     EXTERNALS
     ============================================================ */
  function inv(x) { return 1 / x; }

  var API = {
    /* core */
    evaluate: evaluate,
    evaluateAst: evaluateAst,
    tokenize: tokenize,
    C: C, num: num, isComplex: isComplex,
    CalcError: CalcError,
    CONST: CONST, PHYS: PHYS,
    toRad: toRadRaw, fromRad: fromRadRaw,

    /* calculus */
    derivative: derivative,
    integrate: integrate,
    summation: summation,
    productOf: productOf,
    solve: solve,

    /* collections */
    Matrix: Matrix,
    Stat: Stat,
    BaseN: BaseN,

    /* formatting */
    formatValue: formatValue,
    formatNumber: function (v, o) { return formatValue(v, o || {}); },
    formatComplex: formatComplex,
    fractionOf: fractionOf,
    fractionText: fractionText,
    piFraction: piFraction,
    superscript: superscript,

    /* misc */
    factorial: factorial,
    nCr: nCr,
    nPr: nPr,
    gcd: gcd2,
    inv: inv
  };

  global.MKJEngine = API;

})(typeof window !== 'undefined' ? window : this);

/* ============================================================
   13. polynomial roots (any degree, complex) — Durand–Kerner
   ============================================================ */
(function (global) {
  'use strict';
  var API = global.MKJEngine || (typeof window !== 'undefined' ? window.MKJEngine : null);
  if (!API) return;
  var C = API.C;

  /** coeffs high→low: [a_n, ..., a_0] */
  function polyRoots(coeffs) {
    var a = coeffs.slice();
    while (a.length > 1 && Math.abs(a[0]) < 1e-14) a.shift();
    var n = a.length - 1;
    if (n < 1) throw new API.CalcError('Math ERROR');
    var lead = a[0];
    var c = a.map(function (v) { return v / lead; });

    if (n === 1) return [{ re: -c[1], im: 0 }];

    function polyEval(z) {
      var r = { re: c[0], im: 0 };
      for (var i = 1; i <= n; i++) {
        r = C.add(C.mul(r, z), { re: c[i], im: 0 });
      }
      return r;
    }

    var radius = 1 + Math.max.apply(null, c.slice(1).map(Math.abs));
    var roots = [];
    for (var k = 0; k < n; k++) {
      var ang = 2 * Math.PI * k / n + 0.35;
      roots.push({
        re: 0.4 * radius * Math.cos(ang) + 0.05,
        im: 0.4 * radius * Math.sin(ang) + 0.05
      });
    }

    for (var iter = 0; iter < 800; iter++) {
      var maxDelta = 0;
      for (var i = 0; i < n; i++) {
        var zi = roots[i];
        var num = polyEval(zi);
        var den = { re: 1, im: 0 };
        for (var j = 0; j < n; j++) {
          if (i === j) continue;
          den = C.mul(den, C.sub(zi, roots[j]));
        }
        if (C.abs(den) < 1e-15) continue;
        var delta = C.div(num, den);
        var mag = C.abs(delta);
        if (mag > maxDelta) maxDelta = mag;
        roots[i] = C.clean(C.sub(zi, delta));
      }
      if (maxDelta < 1e-14) break;
    }

    // sort: real roots ascending first, then complex by real part
    roots = roots.map(function (z) { return C.clean(z); });
    roots.sort(function (p, q) {
      var pr = Math.abs(p.im) < 1e-9 ? 0 : 1;
      var qr = Math.abs(q.im) < 1e-9 ? 0 : 1;
      if (pr !== qr) return pr - qr;
      if (pr === 0) return p.re - q.re;
      return p.re - q.re || p.im - q.im;
    });
    return roots;
  }

  /* ============================================================
     14. inequalities:  ax^n + ... (> | >= | < | <=) 0
     returns interval list [{a,b,inclusive}]  plus a text form
     ============================================================ */
  function solveInequality(coeffs, rel) {
    var roots = polyRoots(coeffs).filter(function (z) { return Math.abs(z.im) < 1e-9; })
      .map(function (z) { return z.re; });
    roots.sort(function (a, b) { return a - b; });
    // de-duplicate
    roots = roots.filter(function (v, i) { return i === 0 || Math.abs(v - roots[i - 1]) > 1e-9; });

    var strict = rel === '>' || rel === '<';
    var wantPositive = rel === '>' || rel === '≥';

    function ev(x) {
      var r = 0;
      for (var i = 0; i < coeffs.length; i++) r = r * x + coeffs[i];
      return r;
    }

    /* candidate open intervals between roots (and outside them) */
    var spans = [];
    if (!roots.length) {
      spans.push({ a: -Infinity, b: Infinity });
    } else {
      spans.push({ a: -Infinity, b: roots[0] });
      for (var i = 0; i < roots.length - 1; i++) spans.push({ a: roots[i], b: roots[i + 1] });
      spans.push({ a: roots[roots.length - 1], b: Infinity });
    }

    function probe(sp) {
      if (!isFinite(sp.a) && !isFinite(sp.b)) return 1e6;
      if (!isFinite(sp.a)) return sp.b - (Math.abs(sp.b) + 1);
      if (!isFinite(sp.b)) return sp.a + (Math.abs(sp.a) + 1);
      return (sp.a + sp.b) / 2;
    }

    var out = [];
    spans.forEach(function (sp) {
      var val = ev(probe(sp));
      var ok = wantPositive ? val > 0 : val < 0;
      if (!ok) return;
      out.push({
        a: sp.a, b: sp.b,
        openA: strict && isFinite(sp.a),
        openB: strict && isFinite(sp.b)
      });
    });

    /* when non-strict, isolated roots can be solutions too */
    if (!strict && out.length) {
      var glued = [];
      out.forEach(function (iv) {
        var last = glued[glued.length - 1];
        if (last && isFinite(last.b) && isFinite(iv.a) && Math.abs(last.b - iv.a) < 1e-12) {
          last.b = iv.b; last.openB = iv.openB;
        } else glued.push({ a: iv.a, b: iv.b, openA: iv.openA, openB: iv.openB });
      });
      out = glued;
    }
    return out;
  }

  function inequalityText(intervals) {
    if (!intervals.length) return 'no solution';
    return intervals.map(function (iv) {
      var leftInf = !isFinite(iv.a) || iv.a <= -1e5;
      var rightInf = !isFinite(iv.b) || iv.b >= 1e5;
      var a = fmtNum(iv.a), b = fmtNum(iv.b);
      if (leftInf && rightInf) return 'all real numbers';
      if (leftInf) return 'x ' + (iv.openB ? '<' : '≤') + ' ' + b;
      if (rightInf) return 'x ' + (iv.openA ? '>' : '≥') + ' ' + a;
      return a + ' ' + (iv.openA ? '<' : '≤') + ' x ' + (iv.openB ? '<' : '≤') + ' ' + b;
    }).join('  or  ');
  }
  function fmtNum(v) {
    var r = Math.round(v * 1e10) / 1e10;
    return String(r);
  }

  /* ============================================================
     15. discrete distributions
     ============================================================ */
  function logFact(n) {
    var r = 0;
    for (var i = 2; i <= n; i++) r += Math.log(i);
    return r;
  }
  var Dist = {
    binomialPdf: function (k, n, p) {
      if (k < 0 || k > n) return 0;
      var lc = logFact(n) - logFact(k) - logFact(n - k);
      return Math.exp(lc + k * Math.log(p || 1e-300) + (n - k) * Math.log(1 - p || 1e-300));
    },
    binomialCdf: function (k, n, p) {
      var s = 0;
      for (var i = 0; i <= Math.floor(k); i++) s += Dist.binomialPdf(i, n, p);
      return s;
    },
    poissonPdf: function (k, lambda) {
      if (k < 0) return 0;
      return Math.exp(-lambda + k * Math.log(lambda || 1e-300) - logFact(k));
    },
    poissonCdf: function (k, lambda) {
      var s = 0;
      for (var i = 0; i <= Math.floor(k); i++) s += Dist.poissonPdf(i, lambda);
      return s;
    },
    invNormal: function (p) { return API.Stat.normalInv(p); }
  };

  /* ============================================================
     16. spreadsheet helpers
     ============================================================ */
  var Sheet = {
    colIndex: function (letter) { return letter.toUpperCase().charCodeAt(0) - 65; },
    refName: function (col, row) { return String.fromCharCode(65 + col) + (row + 1); },
    /** build value grid from raw strings  */
    evaluate: function (raw, rows, cols, ctx) {
      var values = [];
      var computing = {};
      for (var r = 0; r < rows; r++) { values[r] = []; }

      function cellValue(r, c) {
        if (values[r] && values[r][c] !== undefined) return values[r][c];
        var key = r + ':' + c;
        if (computing[key]) return 0;
        computing[key] = true;
        var text = (raw[r] && raw[r][c] !== undefined) ? String(raw[r][c]).trim() : '';
        var out = 0;
        if (text === '') out = 0;
        else if (text[0] === '=') {
          var expr = text.slice(1);

          /* range functions: SUM(A1:A3), AVERAGE, MAX, MIN, COUNT */
          expr = expr.replace(/(SUM|AVERAGE|AVG|MAX|MIN|COUNT)\(([A-Z])(\d+):([A-Z])(\d+)\)/gi, function (m, fn, c1, r1, c2, r2) {
            var colA = c1.charCodeAt(0) - 65, colB = c2.charCodeAt(0) - 65;
            var rowA = parseInt(r1, 10) - 1, rowB = parseInt(r2, 10) - 1;
            var list = [];
            for (var rr = Math.min(rowA, rowB); rr <= Math.max(rowA, rowB); rr++) {
              for (var cc = Math.min(colA, colB); cc <= Math.max(colA, colB); cc++) {
                if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
                  var v2 = cellValue(rr, cc);
                  if (typeof v2 === 'number') list.push(v2);
                }
              }
            }
            var name = fn.toUpperCase();
            var res = 0;
            if (name === 'SUM') res = list.reduce(function (a, b) { return a + b; }, 0);
            else if (name === 'COUNT') res = list.length;
            else if (name === 'MAX') res = list.length ? Math.max.apply(null, list) : 0;
            else if (name === 'MIN') res = list.length ? Math.min.apply(null, list) : 0;
            else res = list.length ? list.reduce(function (a, b) { return a + b; }, 0) / list.length : 0;
            return '(' + res + ')';
          });

          expr = expr.replace(/([A-Z])(\d+)/g, function (m, L, N) {
            var cc = L.charCodeAt(0) - 65, rr = parseInt(N, 10) - 1;
            if (cc < 0 || cc >= cols || rr < 0 || rr >= rows) return '0';
            return '(' + cellValue(rr, cc) + ')';
          });
          try {
            var v = API.evaluate(expr, ctx || { angle: 'deg', vars: {} });
            out = API.C.isC(v) ? v.re : v;
          } catch (e) { out = 'ERROR'; }
        } else {
          var num = Number(text);
          if (!isNaN(num)) out = num;
          else {
            try {
              var vv = API.evaluate(text, ctx || { angle: 'deg', vars: {} });
              out = API.C.isC(vv) ? vv.re : vv;
            } catch (e2) { out = 'ERROR'; }
          }
        }
        computing[key] = false;
        values[r][c] = out;
        return out;
      }

      for (var r2 = 0; r2 < rows; r2++) {
        for (var c2 = 0; c2 < cols; c2++) cellValue(r2, c2);
      }
      return values;
    }
  };

  API.polyRoots = polyRoots;
  API.solveInequality = solveInequality;
  API.inequalityText = inequalityText;
  API.Dist = Dist;
  API.Sheet = Sheet;

})(typeof window !== 'undefined' ? window : this);
