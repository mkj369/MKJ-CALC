/* ============================================================
   MKJ CALC — expression engine
   Tokenizer + recursive-descent parser + evaluator.
   No external dependencies.
   ============================================================ */
(function (global) {
  'use strict';

  /* ----------------------------------------------------------
     Constants
     ---------------------------------------------------------- */
  var CONSTANTS = {
    'π': Math.PI,
    'pi': Math.PI,
    'e': Math.E,
    'τ': Math.PI * 2
  };

  var ANGLE = { deg: 'deg', rad: 'rad', grad: 'grad' };

  /* ----------------------------------------------------------
     Tokenizer
     ---------------------------------------------------------- */
  var FUNCTIONS = [
    'sin⁻¹', 'cos⁻¹', 'tan⁻¹', 'sinh⁻¹', 'cosh⁻¹', 'tanh⁻¹',
    'asin', 'acos', 'atan', 'asinh', 'acosh', 'atanh',
    'sin', 'cos', 'tan', 'sinh', 'cosh', 'tanh',
    'log', 'ln', 'lg', 'log₂', 'log2', 'exp',
    'sqrt', 'cbrt', 'abs', 'nCr', 'nPr', 'gcd', 'lcm',
    'min', 'max', 'floor', 'ceil', 'round', 'rand'
  ];

  function isDigit(c) { return c >= '0' && c <= '9'; }
  function isLetter(c) { return /[A-Za-z]/.test(c); }

  /**
   * Token types: num, var, func, op, lparen, rparen, comma, const, post
   */
  function tokenize(src) {
    var tokens = [];
    var i = 0;
    var s = String(src)
      .replace(/×/g, '*').replace(/÷/g, '/')
      .replace(/−/g, '-').replace(/⁻/g, '-')
      .replace(/,/g, ',')
      .replace(/％/g, '%');

    while (i < s.length) {
      var c = s[i];

      // whitespace
      if (c === ' ') { i++; continue; }

      // numbers (incl. scientific 'E' notation produced by display)
      if (isDigit(c) || (c === '.' && isDigit(s[i + 1]))) {
        var num = '';
        while (i < s.length && (isDigit(s[i]) || s[i] === '.')) { num += s[i++]; }
        if ((s[i] === 'E' || s[i] === 'e' || s[i] === '×') && /[Ee×]/.test(s[i])) {
          // '×10' style is handled as multiplication; only E notation here
          if (/[Ee]/.test(s[i]) && (isDigit(s[i + 1]) || ((s[i + 1] === '+' || s[i + 1] === '-') && isDigit(s[i + 2])))) {
            num += s[i++];
            if (s[i] === '+' || s[i] === '-') num += s[i++];
            while (i < s.length && isDigit(s[i])) num += s[i++];
          }
        }
        tokens.push({ t: 'num', v: parseFloat(num) });
        continue;
      }

      // π, τ
      if (c === 'π' || c === 'τ') { tokens.push({ t: 'const', v: c }); i++; continue; }

      // superscript postfix operators
      if (c === '²') { tokens.push({ t: 'post', v: 'sq' }); i++; continue; }
      if (c === '³') { tokens.push({ t: 'post', v: 'cube' }); i++; continue; }
      if (c === '!' ) { tokens.push({ t: 'post', v: 'fact' }); i++; continue; }
      if (c === '%' ) { tokens.push({ t: 'post', v: 'pct' }); i++; continue; }

      // letters: function names, constants, variables
      if (isLetter(c)) {
        var start = i;
        var word = '';
        while (i < s.length && (isLetter(s[i]) || isDigit(s[i]) || s[i] === '₂')) { word += s[i++]; }
        // accept the inverse-function suffix: sin⁻¹, cos⁻¹, tan⁻¹, sinh⁻¹ ...
        if (s.substr(i, 3) === '⁻¹(' || s.substr(i, 2) === '⁻¹') {
          word += '⁻¹';
          i += 2;
        }
        // accept superscript exponent suffix e.g. eˣ is handled as exp(
        if (s[i] === 'ˣ') { i++; word += '^'; }

        // 'pi' constant
        if (word.toLowerCase() === 'pi') { tokens.push({ t: 'const', v: 'π' }); continue; }
        if (word.toLowerCase() === 'ans') { tokens.push({ t: 'ans' }); continue; }
        if (word.toLowerCase() === 'e' && s[start - 1] !== ' ') { /* fallthrough as const */ }

        var lower = word.toLowerCase();
        var fn = null;
        for (var f = 0; f < FUNCTIONS.length; f++) {
          if (FUNCTIONS[f] === word || FUNCTIONS[f] === lower) { fn = FUNCTIONS[f]; break; }
        }
        if (fn) { tokens.push({ t: 'func', v: fn }); continue; }
        if (lower === 'e') { tokens.push({ t: 'const', v: 'e' }); continue; }
        if (lower === 'x') { tokens.push({ t: 'var', v: 'x' }); continue; }
        if (lower === 'y') { tokens.push({ t: 'var', v: 'y' }); continue; }

        // single uppercase letter → variable A..F, M
        if (word.length === 1) { tokens.push({ t: 'var', v: word.toUpperCase() }); continue; }
        // unknown multi-letter → treat as implicit var product? reject
        tokens.push({ t: 'unknown', v: word });
        continue;
      }

      switch (c) {
        case '+': case '-': case '*': case '/': case '^': case '÷': case '×':
          tokens.push({ t: 'op', v: c === '÷' ? '/' : c === '×' ? '*' : c });
          i++; continue;
        case '(': tokens.push({ t: 'lparen' }); i++; continue;
        case ')': tokens.push({ t: 'rparen' }); i++; continue;
        case ',': tokens.push({ t: 'comma' }); i++; continue;
        case '√': tokens.push({ t: 'func', v: 'sqrt' }); i++; continue;
        case '∛': tokens.push({ t: 'func', v: 'cbrt' }); i++; continue;
        case '∛': i++; continue;
        default:
          throw new CalcError('Syntax ERROR');
      }
    }
    return tokens;
  }

  /* ----------------------------------------------------------
     Error type
     ---------------------------------------------------------- */
  function CalcError(msg) {
    this.name = 'CalcError';
    this.message = msg || 'Math ERROR';
  }
  CalcError.prototype = Object.create(Error.prototype);

  /* ----------------------------------------------------------
     Helpers
     ---------------------------------------------------------- */
  function toRad(value, unit) {
    if (unit === 'rad') return value;
    if (unit === 'grad') return value * Math.PI / 200;
    return value * Math.PI / 180;
  }
  function fromRad(value, unit) {
    if (unit === 'rad') return value;
    if (unit === 'grad') return value * 200 / Math.PI;
    return value * 180 / Math.PI;
  }

  function factorial(n) {
    if (n < 0 || Math.abs(n % 1) > 1e-9) throw new CalcError('Math ERROR');
    if (n > 170) return Infinity;
    var r = 1;
    for (var k = 2; k <= n; k++) r *= k;
    return r;
  }

  function nCr(n, r) {
    if (r < 0 || n < 0 || r > n) throw new CalcError('Math ERROR');
    r = Math.min(r, n - r);
    var res = 1;
    for (var k = 1; k <= r; k++) res = res * (n - r + k) / k;
    return Math.round(res * 1e10) / 1e10;
  }

  function gcd2(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = b; b = a % b; a = t; }
    return a;
  }

  /* ----------------------------------------------------------
     Parser
     ---------------------------------------------------------- */
  function Parser(tokens, ctx) {
    this.tokens = tokens;
    this.pos = 0;
    this.ctx = ctx;
  }

  Parser.prototype.peek = function (offset) {
    return this.tokens[this.pos + (offset || 0)];
  };
  Parser.prototype.next = function () {
    return this.tokens[this.pos++];
  };
  Parser.prototype.match = function (type, value) {
    var tk = this.peek();
    if (!tk) return false;
    if (tk.t !== type) return false;
    if (value !== undefined && tk.v !== value) return false;
    this.pos++;
    return true;
  };
  Parser.prototype.expect = function (type, value) {
    if (!this.match(type, value)) throw new CalcError('Syntax ERROR');
  };

  // expr := term (('+'|'-') term)*
  Parser.prototype.parseExpr = function () {
    var left = this.parseTerm();
    for (;;) {
      var tk = this.peek();
      if (tk && tk.t === 'op' && (tk.v === '+' || tk.v === '-')) {
        this.next();
        var right = this.parseTerm();
        left = tk.v === '+' ? left + right : left - right;
      } else break;
    }
    return left;
  };

  // term := unary (('*'|'/') unary | implicit-mul)*
  Parser.prototype.parseTerm = function () {
    var left = this.parseUnary();

    for (;;) {
      var tk = this.peek();
      if (!tk) break;

      if (tk.t === 'op' && (tk.v === '*' || tk.v === '/')) {
        this.next();
        var right = this.parseUnary();
        if (tk.v === '*') left = left * right;
        else {
          if (right === 0) throw new CalcError('Math ERROR');
          left = left / right;
        }
        continue;
      }

      // implicit multiplication: 2(3+4), 2π, 3sin(30), 2A, )( 
      var startsValue =
        tk.t === 'num' || tk.t === 'const' || tk.t === 'var' ||
        tk.t === 'func' || tk.t === 'lparen' || tk.t === 'ans';
      if (startsValue) {
        var val = this.parseUnary();
        left = left * val;
        continue;
      }
      break;
    }
    return left;
  };

  Parser.prototype.parseUnary = function () {
    var tk = this.peek();
    if (tk && tk.t === 'op' && (tk.v === '-' || tk.v === '+')) {
      this.next();
      var v = this.parseUnary();
      return tk.v === '-' ? -v : v;
    }
    return this.parsePower();
  };

  // power := postfix ('^' unary)?   (right-assoc)
  Parser.prototype.parsePower = function () {
    var base = this.parsePostfix();
    var tk = this.peek();
    if (tk && tk.t === 'op' && tk.v === '^') {
      this.next();
      var exp = this.parseUnary();
      var out = Math.pow(base, exp);
      if (isNaN(out)) throw new CalcError('Math ERROR');
      return out;
    }
    return base;
  };

  Parser.prototype.parsePostfix = function () {
    var val = this.parsePrimary();
    for (;;) {
      var tk = this.peek();
      if (!tk || tk.t !== 'post') break;
      this.next();
      if (tk.v === 'sq') val = val * val;
      else if (tk.v === 'cube') val = val * val * val;
      else if (tk.v === 'fact') val = factorial(val);
      else if (tk.v === 'pct') val = val / 100;
    }
    return val;
  };

  Parser.prototype.parsePrimary = function () {
    var tk = this.next();
    if (!tk) throw new CalcError('Syntax ERROR');

    if (tk.t === 'num') return tk.v;
    if (tk.t === 'const') return CONSTANTS[tk.v];
    if (tk.t === 'ans') return this.ctx.ans;
    if (tk.t === 'var') {
      var name = tk.v;
      if (name === 'x' || name === 'y') {
        return this.ctx.vars[name] !== undefined ? this.ctx.vars[name] : 0;
      }
      return this.ctx.vars[name] !== undefined ? this.ctx.vars[name] : 0;
    }

    if (tk.t === 'lparen') {
      var inner = this.parseExpr();
      this.expect('rparen');
      return inner;
    }

    if (tk.t === 'func') {
      return this.callFunction(tk.v);
    }

    if (tk.t === 'op' && tk.v === '-') {
      return -this.parseUnary();
    }

    throw new CalcError('Syntax ERROR');
  };

  Parser.prototype.argList = function () {
    var args = [this.parseExpr()];
    while (this.match('comma')) args.push(this.parseExpr());
    return args;
  };

  Parser.prototype.callFunction = function (name) {
    var args;
    var wrapOnly = /^(sin|cos|tan|sin⁻¹|cos⁻¹|tan⁻¹|asin|acos|atan|sinh|cosh|tanh|asinh|acosh|atanh|log|ln|lg|log₂|log2|exp|sqrt|cbrt|abs|floor|ceil|round|rand)/;

    if (name === 'rand') {
      return Math.random();
    }

    if (!this.match('lparen')) {
      // allow sin30 style (single value follows without parens)
      if (wrapOnly.test(name)) {
        args = [this.parseUnary()];
        return this.applyFunction(name, args);
      }
      throw new CalcError('Syntax ERROR');
    }

    args = this.argList();
    this.expect('rparen');
    return this.applyFunction(name, args);
  };

  Parser.prototype.applyFunction = function (name, a) {
    var x = a[0], y = a[1];
    var u = this.ctx.angle;

    switch (name) {
      case 'sin': return clean(Math.sin(toRad(x, u)));
      case 'cos': return clean(Math.cos(toRad(x, u)));
      case 'tan': {
        var tr = toRad(x, u);
        var c = Math.cos(tr);
        if (Math.abs(c) < 1e-12) throw new CalcError('Math ERROR');
        return clean(Math.sin(tr) / c);
      }
      case 'sin⁻¹': case 'asin': return fromRad(Math.asin(x), u);
      case 'cos⁻¹': case 'acos': return fromRad(Math.acos(x), u);
      case 'tan⁻¹': case 'atan': return fromRad(Math.atan(x), u);
      case 'sinh': return Math.sinh(x);
      case 'cosh': return Math.cosh(x);
      case 'tanh': return Math.tanh(x);
      case 'sinh⁻¹': case 'asinh': return Math.asinh(x);
      case 'cosh⁻¹': case 'acosh': return Math.acosh(x);
      case 'tanh⁻¹': case 'atanh': return Math.atanh(x);
      case 'log': case 'lg':
        if (a.length === 2) return Math.log(y) / Math.log(x);
        if (x <= 0) throw new CalcError('Math ERROR');
        return Math.log10(x);
      case 'ln':
        if (x <= 0) throw new CalcError('Math ERROR');
        return Math.log(x);
      case 'log₂': case 'log2':
        if (x <= 0) throw new CalcError('Math ERROR');
        return Math.log2(x);
      case 'exp': return Math.exp(x);
      case 'sqrt':
        if (x < 0) throw new CalcError('Math ERROR');
        return Math.sqrt(x);
      case 'cbrt': return Math.cbrt(x);
      case 'abs': return Math.abs(x);
      case 'floor': return Math.floor(x);
      case 'ceil': return Math.ceil(x);
      case 'round': return Math.round(x);
      case 'nCr': return nCr(Math.round(x), Math.round(y));
      case 'nPr': return factorial(Math.round(x)) / factorial(Math.round(x) - Math.round(y));
      case 'gcd': return gcd2(Math.round(x), Math.round(y));
      case 'lcm': return Math.abs(Math.round(x) * Math.round(y)) / gcd2(Math.round(x), Math.round(y));
      case 'min': return Math.min.apply(null, a);
      case 'max': return Math.max.apply(null, a);
      default: throw new CalcError('Syntax ERROR');
    }
  };

  function clean(v) {
    // kill floating-point dust so sin(30) is exactly .5 and not 0.49999999999999994
    if (!isFinite(v)) return v;
    var r = Math.round(v * 1e12) / 1e12;
    return Math.abs(r) < 1e-13 ? 0 : r;
  }

  /* ----------------------------------------------------------
     Public evaluate
     ---------------------------------------------------------- */
  function evaluate(expression, options) {
    var ctx = {
      angle: (options && options.angle) || 'deg',
      ans: (options && options.ans) || 0,
      vars: (options && options.vars) || {}
    };
    var src = String(expression || '').trim();
    if (!src) throw new CalcError('Syntax ERROR');

    // auto close parentheses
    var open = 0;
    for (var k = 0; k < src.length; k++) {
      if (src[k] === '(') open++;
      else if (src[k] === ')') open--;
    }
    while (open-- > 0) src += ')';

    var tokens = tokenize(src);
    if (!tokens.length) throw new CalcError('Syntax ERROR');

    var parser = new Parser(tokens, ctx);
    var value = parser.parseExpr();
    if (parser.pos < parser.tokens.length) throw new CalcError('Syntax ERROR');

    if (typeof value !== 'number' || isNaN(value)) throw new CalcError('Math ERROR');
    if (!isFinite(value)) throw new CalcError('Math ERROR');
    return value;
  }

  /* ----------------------------------------------------------
     Number formatting
     ---------------------------------------------------------- */
  function superscriptDigits(str) {
    var map = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵',
                '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '', '.': '·' };
    return String(str).split('').map(function (ch) { return map[ch] || ch; }).join('');
  }

  function fractionOf(x) {
    // convert decimal to a friendly fraction if reasonable
    if (!isFinite(x) || Math.abs(x) > 1e7) return null;
    var sign = x < 0 ? -1 : 1;
    var v = Math.abs(x);
    var den = 1;
    while (Math.abs(v - Math.round(v)) > 1e-10 && den < 1e6) {
      v *= 10; den *= 10;
      v = Math.round(v * 1e10) / 1e10;
    }
    var num = Math.round(v);
    var g = gcd2(num, den);
    num /= g; den /= g;
    if (den === 1) return null;
    if (den > 10000) return null;
    return { n: sign * num, d: den };
  }

  function formatNumber(value, opts) {
    var mode = (opts && opts.format) || 'norm';
    var digits = (opts && opts.digits) || 10;

    if (value === 0) value = 0; // normalise -0

    if (mode === 'fix2' || mode === 'fix4' || mode === 'fix6') {
      var d = mode === 'fix2' ? 2 : mode === 'fix4' ? 4 : 6;
      return value.toFixed(d);
    }

    var abs = Math.abs(value);
    if (mode === 'sci' || abs >= 1e10 || (abs > 0 && abs < 1e-9)) {
      var exp = value.toExponential(9);
      var parts = exp.split('e');
      var mant = trimZeros(parts[0]);
      var e = parseInt(parts[1], 10);
      return mant + '×10' + superscriptDigits(e);
    }

    // norm
    var rounded = roundSignificant(value, digits);
    if (Number.isInteger(rounded) && Math.abs(rounded) < 1e15) {
      return String(rounded);
    }
    var out = trimZeros(rounded.toFixed(Math.max(0, digits - 1 - Math.floor(Math.log10(abs + 1e-300)))));
    return out;
  }

  function roundSignificant(v, sig) {
    if (v === 0) return 0;
    var d = Math.ceil(Math.log10(Math.abs(v)));
    var power = sig - d;
    var mag = Math.pow(10, power);
    return Math.round(v * mag) / mag;
  }

  function trimZeros(s) {
    if (s.indexOf('.') === -1) return s;
    return s.replace(/0+$/, '').replace(/\.$/, '');
  }

  function formatFraction(fr) {
    if (!fr) return null;
    if (fr.d === 1) return String(fr.n);
    if (Math.abs(fr.n) > fr.d) {
      var whole = Math.trunc(fr.n / fr.d);
      var rem = Math.abs(fr.n % fr.d);
      return whole + '⌐' + rem + '/' + fr.d;
    }
    return fr.n + '/' + fr.d;
  }

  /* exposed API */
  global.MKJEngine = {
    evaluate: evaluate,
    formatNumber: formatNumber,
    fractionOf: fractionOf,
    formatFraction: formatFraction,
    superscriptDigits: superscriptDigits,
    CalcError: CalcError,
    tokenize: tokenize,
    toRad: toRad,
    clean: clean,
    gcd: gcd2,
    factorial: factorial
  };

})(window);
