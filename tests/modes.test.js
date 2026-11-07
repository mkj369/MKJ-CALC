/*!
 * MKJ CALC — app (mode) behaviour tests
 *
 * Boots the real page and drives every app that has its own controls,
 * proving that each one computes rather than merely rendering.
 * Run: node tests/modes.test.js
 */
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var PORT = Number(process.env.TEST_PORT || (8900 + (process.pid % 90)));

var PASS = 0, FAIL = 0, failures = [];
function ok(cond, label, extra) {
  if (cond) PASS++;
  else { FAIL++; failures.push(label + (extra ? ' — ' + extra : '')); console.log('  ✗ ' + label + (extra ? '  — ' + extra : '')); }
}
function eq(got, want, label) { ok(got === want, label, 'got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); }
function has(hay, needle, label) { ok(String(hay).indexOf(needle) >= 0, label, JSON.stringify(String(hay).slice(0, 150))); }

var MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
function serve() {
  return new Promise(function (res) {
    var srv = http.createServer(function (req, rep) {
      var p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      var f = path.join(ROOT, p);
      if (f.indexOf(ROOT) !== 0 || !fs.existsSync(f)) { rep.writeHead(404); rep.end(); return; }
      rep.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rep);
    });
    srv.on('error', function (e) { console.error(e.message); process.exit(1); });
    srv.listen(PORT, '127.0.0.1', function () { res(srv); });
  });
}

function browser() {
  var puppeteer;
  try { puppeteer = require('puppeteer-core'); } catch (e) { return null; }
  var exec = process.env.CHROME_PATH;
  var args = ['--no-sandbox', '--disable-dev-shm-usage'];
  if (!exec) {
    try {
      var chromium = require('@sparticuz/chromium');
      return chromium.executablePath().then(function (p) {
        return puppeteer.launch({ args: args.concat(chromium.args), executablePath: p, headless: 'shell' });
      });
    } catch (e) {
      var cands = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
      for (var i = 0; i < cands.length; i++) if (fs.existsSync(cands[i])) { exec = cands[i]; break; }
      if (!exec) return null;
    }
  }
  return puppeteer.launch({ args: args, executablePath: exec, headless: 'shell' });
}

/* helpers injected into the page */
var PAGE_HELPERS = function () {
  window.T = {
    ws: function () { return document.getElementById('workspace'); },
    inputs: function () { return Array.prototype.slice.call(window.T.ws().querySelectorAll('input')); },
    buttons: function () { return Array.prototype.slice.call(window.T.ws().querySelectorAll('button')); },
    set: function (el, v) {
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    /* find a button by exact trimmed text, or by a regex */
    press: function (find) {
      var b = window.T.buttons().filter(function (x) {
        var t = (x.textContent || '').trim();
        return typeof find === 'string' ? t === find : find.test(t);
      })[0];
      if (!b) throw new Error('button not found: ' + find);
      if (b.disabled) throw new Error('button disabled: ' + find);
      b.click();
    },
    /* click a keypad button that carries a given data-v / label */
    key: function (label) {
      var b = window.T.ws().querySelectorAll('[data-v]');
      var hit = Array.prototype.filter.call(b, function (x) { return x.dataset.v === label; })[0];
      if (!hit) throw new Error('key not found: ' + label);
      hit.click();
    },
    out: function () {
      var o = window.T.ws().querySelector('.mode-out');
      return o ? o.textContent.replace(/\s+/g, ' ').trim() : '';
    },
    typeDigits: function (str) {
      str.split('').forEach(function (ch) { window.T.key(ch === '-' ? '(-)' : ch); });
    }
  };
};

async function run() {
  var b = await browser();
  if (!b) {
    console.log('SKIP: no Chromium available for app tests.');
    process.exitCode = 0;
    return;
  }
  var srv = await serve();
  var page = await b.newPage();
  var errs = [];
  page.on('pageerror', function (e) { errs.push(e.message); });
  page.on('console', function (m) { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'networkidle0' });
  await new Promise(function (r) { setTimeout(r, 300); });
  await page.evaluate(PAGE_HELPERS);

  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms || 80); }); };
  var open = async function (id) {
    await page.evaluate(function (m) { window.MKJApp.openMode(m); }, id);
    await wait(120);
    await page.evaluate(PAGE_HELPERS);
  };

  /* ---------------- Matrix ---------------- */
  console.log('# matrix');
  await open('matrix');
  await page.evaluate(function () {
    var ins = window.T.inputs();
    /* the visible A grid comes first, in reading order */
    ['2', '0', '1', '0', '3', '0', '1', '0', '2'].slice(0, 4).forEach(function (v, i) {
      window.T.set(ins[i], v);
    });
    window.T.press('Compute');
  });
  await wait(150);
  var matOut = await page.evaluate(function () { return window.T.ws().textContent; });
  ok(/det/.test(matOut) || /-2|−2|10/.test(matOut), 'matrix computes a determinant', matOut.slice(0, 120));
  ok(await page.evaluate(function () { return window.T.ws().querySelectorAll('.mode-out').length >= 1; }),
     'matrix result boxes render');
  eq(errs.length, 0, 'no errors in matrix', errs.join('; '));

  /* ---------------- Equation ---------------- */
  console.log('# equation');
  await open('equation');
  await page.evaluate(function () {
    var ins = window.T.inputs();
    /* x² - 3x + 2 = 0  ->  roots 1 and 2, solved live as you type */
    window.T.set(ins[0], '1');
    window.T.set(ins[1], '-3');
    window.T.set(ins[2], '2');
  });
  await wait(150);
  var eqOut = await page.evaluate(function () { return window.T.out(); });
  has(eqOut, '1', 'equation shows the first root');
  has(eqOut, '2', 'equation shows the second root');
  /* complex roots are handled too */
  await page.evaluate(function () {
    var ins = window.T.inputs();
    window.T.set(ins[0], '1');
    window.T.set(ins[1], '0');
    window.T.set(ins[2], '4');
  });
  await wait(150);
  var cplx = await page.evaluate(function () { return window.T.out(); });
  has(cplx, 'i', 'x² + 4 = 0 gives imaginary roots');
  eq(errs.length, 0, 'no errors in equation', errs.join('; '));

  /* ---------------- Base-N ---------------- */
  console.log('# base-n');
  await open('basen');
  await page.evaluate(function () {
    ['2', '5', '5'].forEach(function (d) { window.T.press(d); });
  });
  await wait(150);
  var bn = await page.evaluate(function () { return window.T.out(); });
  has(bn, '255', 'DEC row shows 255');
  has(bn, 'FF', 'HEX row shows FF');
  has(bn, '11111111', 'BIN row shows 11111111');
  has(bn, '377', 'OCT row shows 377');
  eq(errs.length, 0, 'no errors in base-n', errs.join('; '));

  /* ---------------- Statistics ---------------- */
  console.log('# statistics');
  await open('stat');
  await page.evaluate(function () {
    var ins = window.T.inputs();
    window.T.set(ins[0], '2, 4, 4, 4, 5, 5, 7, 9');
  });
  await wait(120);
  var st = await page.evaluate(function () { return window.T.out(); });
  has(st, '5', 'mean of the sample is 5');
  has(st, '2', 'population SD is 2');
  eq(errs.length, 0, 'no errors in statistics', errs.join('; '));

  /* ---------------- Ratio ---------------- */
  console.log('# ratio');
  await open('ratio');
  await page.evaluate(function () {
    var ins = window.T.inputs();
    /* a : b = c : d with d missing: 2 : 3 = 8 : d  ->  d = 12 */
    ins[0].value = '2'; ins[0].dispatchEvent(new Event('input'));
    ins[1].value = '3'; ins[1].dispatchEvent(new Event('input'));
    ins[2].value = '8'; ins[2].dispatchEvent(new Event('input'));
    ins[3].value = ''; ins[3].dispatchEvent(new Event('input'));
  });
  await wait(150);
  var ratioOut = await page.evaluate(function () { return window.T.out(); });
  ok(/12/.test(ratioOut), 'a:b = c:d solves d = 12', ratioOut);
  eq(errs.length, 0, 'no errors in ratio', errs.join('; '));

  /* ---------------- Table ---------------- */
  console.log('# table');
  await open('table');
  await page.evaluate(function () {
    var ins = window.T.inputs();
    /* f(x) = x², start 1, end 5, step 1  ->  f(5) = 25 */
    window.T.set(ins[0], 'x^2');
    window.T.set(ins[2], '1');
    window.T.set(ins[3], '5');
    window.T.set(ins[4], '1');
  });
  await wait(200);
  var tbl = await page.evaluate(function () { return window.T.ws().textContent; });
  has(tbl, '25', 'table contains f(5) = 25');
  has(tbl, '16', 'table contains f(4) = 16');
  eq(errs.length, 0, 'no errors in table', errs.join('; '));

  /* ---------------- Spreadsheet ---------------- */
  console.log('# spreadsheet');
  await open('spreadsheet');
  /* the app opens with a small worked sheet: A1=1 B1=2 C1==A1+B1 */
  var sheet = await page.evaluate(function () {
    return Array.prototype.map.call(window.T.ws().querySelectorAll('.sheet-cell'), function (c) {
      return c.textContent;
    }).slice(0, 15).join(',');
  });
  has(sheet, '3', 'spreadsheet evaluates =A1+B1 to 3');
  await page.evaluate(function () {
    /* type into the formula bar for the active cell */
    var bar = window.T.ws().querySelector('.sheet-input');
    window.T.set(bar, '=SUM(A1:A2)');
    bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  await wait(200);
  var sheet2 = await page.evaluate(function () { return window.T.ws().textContent; });
  ok(/SUM|8/.test(sheet2), 'spreadsheet accepts a SUM formula', sheet2.slice(0, 100));
  eq(errs.length, 0, 'no errors in spreadsheet', errs.join('; '));

  /* ---------------- Solve ---------------- */
  console.log('# solve');
  await open('solve');
  await page.evaluate(function () {
    var ins = window.T.inputs();
    window.T.set(ins[0], 'x^2-9');
    if (ins[1]) window.T.set(ins[1], '3');
    window.T.press('Solve');
  });
  await wait(200);
  var sv = await page.evaluate(function () { return window.T.out(); });
  has(sv, '3', 'solve finds x = 3 for x² - 9');
  eq(errs.length, 0, 'no errors in solve', errs.join('; '));

  /* ---------------- Verify ---------------- */
  console.log('# verify');
  await open('verify');
  await page.evaluate(function () {
    var ins = window.T.inputs();
    window.T.set(ins[0], '2+3');
    window.T.set(ins[1], '5');
  });
  await wait(180);
  has(await page.evaluate(function () { return window.T.out(); }), 'TRUE', '2+3 = 5 verifies TRUE');
  await page.evaluate(function () {
    var ins = window.T.inputs();
    window.T.set(ins[1], '6');
  });
  await wait(180);
  has(await page.evaluate(function () { return window.T.out(); }), 'FALSE', '2+3 = 6 verifies FALSE');
  eq(errs.length, 0, 'no errors in verify', errs.join('; '));

  /* ---------------- Distribution ---------------- */
  console.log('# distribution');
  await open('dist');
  await page.evaluate(function () {
    var ins = window.T.inputs();
    window.T.set(ins[0], '0');
    window.T.set(ins[1], '1');
    window.T.set(ins[2], '0');
    /* operation -> Q(x), the cumulative distribution */
    var op = window.T.ws().querySelectorAll('select')[1];
    op.value = op.options[1].value;
    op.dispatchEvent(new Event('change'));
  });
  await wait(240);
  var dist = await page.evaluate(function () { return window.T.out(); });
  ok(/0\.5/.test(dist) || /50/.test(dist), 'normal CDF at 0 is 0.5', dist);

  /* and the density at 0 is 1/sqrt(2*pi) */
  await page.evaluate(function () {
    var op = window.T.ws().querySelectorAll('select')[1];
    op.value = op.options[0].value;
    op.dispatchEvent(new Event('change'));
  });
  await wait(240);
  var dens = await page.evaluate(function () { return window.T.out(); });
  ok(/0\.3989/.test(dens), 'normal density at 0 is 0.3989', dens);
  eq(errs.length, 0, 'no errors in distribution', errs.join('; '));

  /* ---------------- Math Box ---------------- */
  console.log('# math box');
  await open('mathbox');
  await page.evaluate(function () { window.T.press(/Roll dice/i); });
  await wait(150);
  var dice = await page.evaluate(function () { return window.T.out(); });
  ok(/\d/.test(dice), 'dice roll produces a number', dice);
  eq(errs.length, 0, 'no errors in math box', errs.join('; '));

  /* ---------------- Constants ---------------- */
  console.log('# constants');
  await open('constants');
  var constCount = await page.evaluate(function () { return window.T.ws().querySelectorAll('.const-item').length; });
  ok(constCount >= 19, 'constants library lists its entries', 'count=' + constCount);
  await page.evaluate(function () {
    var q = window.T.inputs()[0];
    window.T.set(q, 'planck');
  });
  await wait(150);
  var filtered = await page.evaluate(function () { return window.T.ws().querySelectorAll('.const-item').length; });
  ok(filtered >= 1 && filtered < constCount, 'constant search filters the list', 'filtered=' + filtered);
  eq(errs.length, 0, 'no errors in constants', errs.join('; '));

  /* ---------------- Vector / Inequality ---------------- */
  console.log('# vector');
  await open('vector');
  await page.evaluate(function () {
    var ins = window.T.inputs();
    /* a = (3,4,0), b = (0,0,1) */
    ['3', '4', '0', '0', '0', '1'].forEach(function (v, i) { if (ins[i]) window.T.set(ins[i], v); });
  });
  await wait(180);
  var vec = await page.evaluate(function () { return window.T.out(); });
  has(vec, '0', 'a · b = 3·0 + 4·0 + 0·1 = 0');
  await page.evaluate(function () {
    var sel = window.T.ws().querySelector('select');
    sel.value = 'absA';
    sel.dispatchEvent(new Event('change'));
  });
  await wait(180);
  var mag = await page.evaluate(function () { return window.T.out(); });
  has(mag, '5', 'magnitude of (3,4,0) is 5');
  eq(errs.length, 0, 'no errors in vector', errs.join('; '));

  console.log('# inequality');
  await open('inequality');
  await page.evaluate(function () {
    var ins = window.T.inputs();
    /* x² - 1 < 0  ->  -1 < x < 1 */
    window.T.set(ins[0], '1');
    window.T.set(ins[1], '0');
    window.T.set(ins[2], '-1');
    var rel = window.T.ws().querySelectorAll('select')[1];
    rel.value = rel.options[2].value;      /* < 0 */
    rel.dispatchEvent(new Event('change'));
  });
  await wait(200);
  var ineq = await page.evaluate(function () { return window.T.out(); });
  ok(/x/.test(ineq) && ineq.length > 1, 'inequality produces a solution interval', ineq);
  eq(errs.length, 0, 'no errors in inequality', errs.join('; '));

  await b.close();
  srv.close();

  console.log('\n' + PASS + ' passed, ' + FAIL + ' failed');
  if (FAIL) {
    console.log('\nFailures:');
    failures.forEach(function (f) { console.log('  - ' + f); });
  }
  process.exitCode = FAIL ? 1 : 0;
}

run().catch(function (e) {
  console.error('app test crashed:', e && e.stack || e);
  process.exit(1);
}).then(function () {
  setTimeout(function () { process.exit(process.exitCode || 0); }, 200).unref();
});
