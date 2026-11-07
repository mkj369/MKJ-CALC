#!/usr/bin/env node
/*!
 * MKJ CALC — run every test suite.
 *
 *   node tests/run.js
 *
 * The engine suite needs nothing but Node. The two browser suites need
 * puppeteer-core plus a Chromium binary; if that is missing they print SKIP
 * and do not fail the run.
 */
'use strict';

var path = require('path');
var cp = require('child_process');

var suites = [
  { file: 'engine.test.js', name: 'engine' },
  { file: 'ui.test.js', name: 'ui' },
  { file: 'modes.test.js', name: 'apps' }
];

var results = [];

suites.forEach(function (suite) {
  var file = path.join(__dirname, suite.file);
  console.log('\n=== ' + suite.name + ' (' + suite.file + ') ===');
  var r = cp.spawnSync(process.execPath, [file], {
    stdio: 'inherit',
    env: process.env
  });
  results.push({ name: suite.name, code: r.status === null ? 1 : r.status });
});

console.log('');
var failed = results.filter(function (r) { return r.code !== 0; });
results.forEach(function (r) {
  console.log((r.code === 0 ? 'PASS  ' : 'FAIL  ') + r.name);
});
process.exitCode = failed.length ? 1 : 0;
