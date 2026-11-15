const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {parse} = require('@babel/parser');

const htmlPath = path.join(__dirname, '..', 'make_10_master.html');
const html = readFileSync(htmlPath, 'utf8');
const babelScripts = [...html.matchAll(/<script\b[^>]*type=["']text\/babel["'][^>]*>([\s\S]*?)<\/script>/gi)];

test('10マスターのBabel/JSXスクリプトを解析できる', () => {
  assert.ok(babelScripts.length > 0, 'text/babel スクリプトが見つかりません');

  for (const [index, match] of babelScripts.entries()) {
    assert.doesNotThrow(
      () => parse(match[1], {sourceType: 'script', plugins: ['jsx']}),
      `text/babel スクリプト ${index + 1} に構文エラーがあります`
    );
  }
});
