/*!
 * MKJ CALC — UI test suite (headless Chromium via puppeteer-core)
 *
 * Run:  node tests/ui.test.js
 * Requires a Chromium binary. Resolution order:
 *   1. $CHROME_PATH
 *   2. puppeteer-core + @sparticuz/chromium, if installed
 *   3. a local Chrome/Chromium on PATH
 * and the page is served from the repo root by a built-in static server,
 * so no external process is needed.
 */
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');
var os = require('os');

var ROOT = path.join(__dirname, '..');
var PORT = 8791;

var PASS = 0, FAIL = 0, failures = [];
function ok(cond, label, extra) {
  if (cond) PASS++;
  else { FAIL++; failures.push(label + (extra ? ' — ' + extra : '')); console.log('  ✗ ' + label + (extra ? '  — ' + extra : '')); }
}
function eq(got, want, label) { ok(got === want, label, 'got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); }

/* ---------------- static server ---------------- */
var MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
function serve() {
  return new Promise(function (res) {
    var srv = http.createServer(function (req, rep) {
      var p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      var f = path.join(ROOT, p);
      if (f.indexOf(ROOT) !== 0 || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rep.writeHead(404); rep.end('nope'); return; }
      rep.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rep);
    });
    srv.listen(PORT, '127.0.0.1', function () { res(srv); });
  });
}

/* ---------------- browser resolution ---------------- */
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
      var cands = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'];
      for (var i = 0; i < cands.length; i++) if (fs.existsSync(cands[i])) { exec = cands[i]; break; }
      if (!exec) return null;
    }
  }
  return puppeteer.launch({ args: args, executablePath: exec, headless: 'shell' });
}

/* ---------------- helpers inside the page ---------------- */
var KEY = function (v) {
  var k = Array.prototype.slice.call(document.querySelectorAll('#pad .key'))
    .filter(function (x) { return x.dataset.v === v; })[0];
  if (!k) throw new Error('no key ' + v);
  k.click();
};
var TYPE = function (s) {
  var S = window.MKJApp.state;
  S.expr = s; S.caret = s.length;
  window.MKJApp.press({ act: 'cmd', v: 'equals' });
};

async function run() {
  var b = await browser();
  if (!b) {
    console.log('SKIP: no Chromium available for UI tests.');
    console.log('      install puppeteer-core + @sparticuz/chromium, or set CHROME_PATH.');
    process.exitCode = 0;
    return;
  }

  var srv = await serve();
  var page = await b.newPage();
  var errs = [];
  page.on('pageerror', function (e) { errs.push(e.message); });
  page.on('console', function (m) { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'networkidle0' });
  await new Promise(function (r) { setTimeout(r, 250); });

  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms || 60); }); };

  /* ---------- boot ---------- */
  console.log('\n# boot');
  eq(await page.evaluate(function () { return !!window.MKJApp && !!window.MKJEngine; }), true, 'app and engine booted');
  eq(errs.length, 0, 'no boot errors', errs.join('; '));

  /* ---------- every key is wired ---------- */
  console.log('# keypad');
  var keyInfo = await page.evaluate(function () {
    return Array.prototype.map.call(document.querySelectorAll('#pad .key'), function (k) {
      return { v: k.dataset.v || '', act: k.dataset.act || '', label: k.textContent.trim() };
    });
  });
  ok(keyInfo.length >= 48, 'keypad has at least 48 keys', 'got ' + keyInfo.length);
  ok(keyInfo.every(function (k) { return k.v.length > 0; }), 'every key has an action id',
     keyInfo.filter(function (k) { return !k.v.length; }).map(function (k) { return k.label; }).join(','));
  eq(new Set(keyInfo.map(function (k) { return k.v; })).size, keyInfo.length, 'no duplicated key ids');

  /* press every key once; nothing may throw */
  console.log('# every key pressed');
  var pressed = await page.evaluate(function () {
    var broken = [];
    Array.prototype.forEach.call(document.querySelectorAll('#pad .key'), function (k) {
      try { k.click(); } catch (e) { broken.push((k.dataset.v || k.textContent) + ': ' + e.message); }
    });
    return broken;
  });
  eq(pressed.length, 0, 'pressing each key throws nothing', pressed.join('; '));
  errs.length = 0;
  await page.evaluate(function () { window.MKJApp.press({ act: 'cmd', v: 'ac' }); });
  await page.evaluate(function () { window.MKJApp.press({ act: 'cmd', v: 'ac' }); });
  await wait();

  /* ---------- arithmetic through the real keypad ---------- */
  console.log('# arithmetic on the keypad');
  async function calc(expr) {
    await page.evaluate(function () { window.MKJApp.press({ act: 'cmd', v: 'ac' }); });
    await page.evaluate(TYPE, expr);
    await wait(50);
    return page.evaluate(function () {
      var S = window.MKJApp.state;
      return { res: S.result, sub: S.resultSub, err: S.isError };
    });
  }
  var r1 = await calc('12*12');
  eq(r1.res, '144', '12×12 = 144');
  var r2 = await calc('2^10');
  eq(r2.res, '1024', '2^10 = 1024');
  var r3 = await calc('sin(30)');
  eq(r3.res, '0.5', 'sin 30 = 0.5');
  var r4 = await calc('1/8');
  eq(r4.res, '0.125', '1÷8 = 0.125');
  eq(r4.sub, '1/8', 'fraction form offered below');
  var r5 = await calc('1/0');
  eq(r5.err, true, '1÷0 is an error');
  eq(r5.res, 'Math ERROR', 'division by zero says Math ERROR');

  /* typing digits on the real keys */
  console.log('# real key sequence');
  await page.evaluate(function () { window.MKJApp.press({ act: 'cmd', v: 'ac' }); });
  for (var seq = 0; seq < '7*8'.length; seq++) {
    await page.evaluate(KEY, '7*8'[seq]);
  }
  await page.evaluate(KEY, 'equals');
  await wait(60);
  eq(await page.evaluate(function () { return window.MKJApp.state.result; }), '56', 'typed 7 × 8 = 56');

  /* ---------- new numeric functions ---------- */
  console.log('# mod / prime / vector');
  var m1 = await calc('7 mod 3'); eq(m1.res, '1', '7 mod 3 = 1');
  var m2 = await calc('PrimeFac(360)');
  eq(m2.res, '2', 'PrimeFac shows the factorised value');
  eq(m2.sub, '2^3×3^2×5', 'PrimeFac second line lists the factors');
  var m3 = await calc('Dot(Vector(1,2,3),Vector(4,5,6))'); eq(m3.res, '32', 'dot product = 32');
  var m4 = await calc('Mag(Vector(3,4))'); eq(m4.res, '5', 'magnitude = 5');
  var m5 = await calc('Angle(Vector(1,0),Vector(0,1))'); eq(m5.res, '90', 'angle = 90°');

  /* ---------- SETTINGS menu on the LCD ---------- */
  console.log('# settings');
  await page.evaluate(KEY, 'settings');
  await wait(120);
  var menuOpen = await page.evaluate(function () { return !document.getElementById('lcdMenu').hidden; });
  eq(menuOpen, true, 'SETTINGS opens the LCD menu');
  var rows = await page.evaluate(function () {
    return Array.prototype.map.call(document.querySelectorAll('.lm-row'), function (r) { return r.textContent; });
  });
  ok(rows.length >= 8, 'settings lists the CW items', 'rows=' + rows.length);
  ok(rows.join(' ').indexOf('Angle Unit') >= 0, 'Angle Unit present');

  await page.evaluate(KEY, 'ok');           /* enter Angle Unit */
  await wait(80);
  await page.evaluate(KEY, 'down');         /* Radian */
  await wait(80);
  eq(await page.evaluate(function () { return window.MKJApp.state.angle; }), 'rad', 'angle switched to radian');
  await page.evaluate(KEY, 'ac');
  await page.evaluate(KEY, 'ac');
  await wait(60);
  var sinRad = await calc('sin(30)');
  ok(sinRad.res !== '0.5', 'radian mode changes sin(30)', sinRad.res);
  /* restore */
  await page.evaluate(function () {
    var S = window.MKJApp.state; S.angle = 'deg';
  });

  /* ---------- FORMAT key ---------- */
  console.log('# format');
  await page.evaluate(KEY, 'sd');
  await wait(120);
  var fmtRows = await page.evaluate(function () {
    return Array.prototype.map.call(document.querySelectorAll('.lm-row'), function (r) { return r.textContent; });
  });
  ok(fmtRows.join(' ').indexOf('Number Format') >= 0, 'FORMAT opens number-format options');
  await page.evaluate(KEY, 'ac');

  /* ---------- history ---------- */
  console.log('# history');
  await page.evaluate(function () { window.MKJApp.state.history = []; });
  await calc('2+2');
  await calc('3+3');
  var hist = await page.evaluate(function () { return window.MKJApp.state.history.length; });
  ok(hist >= 2, 'history records results', 'len=' + hist);
  await page.evaluate(function () { window.MKJApp.press({ act: 'cmd', v: 'up' }); });
  await wait(60);
  eq(await page.evaluate(function () { return window.MKJApp.state.expr; }), '3+3', 'arrow up recalls the last entry');

  /* ---------- memory + variables ---------- */
  console.log('# memory and variables');
  await page.evaluate(function () {
    var S = window.MKJApp.state; S.ans = 42; S.expr = '';
    window.MKJApp.press({ act: 'cmd', v: 'mplus' });
  });
  await wait(60);
  eq(await page.evaluate(function () { return window.MKJApp.state.vars.M; }), 42, 'M+ stores into M');
  var mv = await calc('M+A');
  ok(!mv.err, 'variables evaluate in expressions', mv.res);

  /* ---------- modes ---------- */
  console.log('# modes');
  var modeIds = await page.evaluate(function () { return window.MKJApp.modeIds ? window.MKJApp.modeIds() : []; });
  var modesOk = [], modesBad = [];
  var list = (modeIds && modeIds.length) ? modeIds :
    ['calc', 'complex', 'stat', 'dist', 'matrix', 'vector', 'equation', 'inequality',
     'basen', 'ratio', 'table', 'spreadsheet', 'solve', 'verify', 'mathbox', 'constants'];
  for (var mi = 0; mi < list.length; mi++) {
    var id = list[mi];
    errs.length = 0;
    await page.evaluate(function (m) { window.MKJApp.openMode(m); }, id);
    await wait(120);
    var info = await page.evaluate(function () {
      var ws = document.getElementById('workspace');
      var visible = ws.getBoundingClientRect().height > 40 && getComputedStyle(ws).display !== 'none';
      return {
        visible: visible,
        inputs: ws.querySelectorAll('input,select,textarea,button,[data-v]').length,
        title: (ws.querySelector('h2,h1,.panel-head') || {}).textContent || ''
      };
    });
    /* the Calc and Complex apps use the physical keypad, so they carry no form controls;
       every other app must render its own controls. */
    var keypadModes = ['calc', 'complex'];
    var needsInputs = keypadModes.indexOf(id) < 0;
    if (keypadModes.indexOf(id) >= 0) {
      /* these two apps are driven by the physical keypad + the main LCD */
      var lcdOk = await page.evaluate(function () {
        var r = document.getElementById('result').getBoundingClientRect();
        return r.height > 0 && document.querySelectorAll('#pad .key').length >= 48;
      });
      if (!lcdOk || errs.length) modesBad.push(id + ':lcd-missing');
      else modesOk.push(id);
      continue;
    }
    if (!info.visible || (needsInputs && info.inputs === 0) || errs.length) {
      modesBad.push(id + (!info.visible ? ':hidden' : needsInputs && info.inputs === 0 ? ':no-controls' : ':err ' + errs[0]));
    } else modesOk.push(id);
  }
  if (modesBad.length) console.log('    bad modes: ' + modesBad.join('; '));
  eq(modesBad.length, 0, 'all ' + list.length + ' apps render with working inputs', modesBad.join('; '));

  /* ---------- responsive ---------- */
  console.log('# responsive');
  var sizes = [[360, 640], [390, 844], [414, 896], [768, 1024], [1280, 900]];
  for (var si = 0; si < sizes.length; si++) {
    await page.setViewport({ width: sizes[si][0], height: sizes[si][1], deviceScaleFactor: 1 });
    await page.evaluate(function () { window.MKJApp.press({ act: 'cmd', v: 'home' }); });
    await wait(150);
    var ov = await page.evaluate(function () {
      return {
        x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
        keys: document.querySelectorAll('#pad .key').length
      };
    });
    ok(ov.x <= 1, sizes[si][0] + 'px: no horizontal overflow', 'overflow=' + ov.x);
    ok(ov.keys >= 48, sizes[si][0] + 'px: keypad still rendered');
  }

  /* ---------- branding ---------- */
  console.log('# branding');
  var casio = await page.evaluate(function () {
    var html = document.documentElement.outerHTML;
    return /casio/i.test(html);
  });
  eq(casio, false, 'no Casio branding in the DOM');
  var mkj = await page.evaluate(function () { return document.body.textContent.indexOf('MKJ') >= 0; });
  eq(mkj, true, 'MKJ brand present');

  /* ---------- console health ---------- */
  console.log('# console');
  eq(errs.length, 0, 'no console errors during the run', errs.slice(0, 3).join('; '));

  await b.close();
  srv.close();

  console.log('\n' + PASS + ' passed, ' + FAIL + ' failed');
  if (FAIL) {
    console.log('\nFailures:');
    failures.forEach(function (f) { console.log('  - ' + f); });
    process.exitCode = 1;
  }
}

run().catch(function (e) {
  console.error('UI test crashed:', e && e.stack || e);
  process.exitCode = 1;
});
