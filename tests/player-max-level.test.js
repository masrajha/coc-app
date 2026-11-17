const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('public/js/player.js', 'utf8');
const helper = source.match(/function isItemAtMaxLevel\(item, section\) \{[\s\S]*?\n\}/);
assert.ok(helper);
const isMax = vm.runInNewContext('(' + helper[0] + ')');

test('equipment at its API maximum glows when the TH cap is unavailable', () => {
  for (const maxLevel of [18, 27]) {
    const item = {level: maxLevel, maxLevel, progressMaxLevel: null, progressCapStatus: 'unavailable'};
    assert.equal(isMax(item, 'Hero Equipment'), true);
    assert.equal(isMax({...item, level: maxLevel - 1}, 'Hero Equipment'), false);
  }
});

test('all regular army sections support the visual API fallback', () => {
  for (const section of ['Heroes', 'Pets', 'Troops', 'Spells', 'Builder Base']) {
    assert.equal(isMax({level: 14, maxLevel: 14, progressCapStatus: 'unavailable'}, section), true);
    assert.equal(isMax({level: 13, maxLevel: 14, progressCapStatus: 'unavailable'}, section), false);
  }
});

test('verified TH maximum takes precedence over the global API maximum', () => {
  assert.equal(isMax({level: 100, progressMaxLevel: 100, maxLevel: 115}, 'Heroes'), true);
  assert.equal(isMax({level: 99, progressMaxLevel: 100, maxLevel: 115}, 'Heroes'), false);
});

test('unknown, invalid, and over-maximum levels do not glow', () => {
  for (const level of [null, undefined, '', 0, -1, 1.5, 'invalid', 28]) {
    assert.equal(isMax({level, maxLevel: 27}, 'Hero Equipment'), false);
  }
  for (const cap of [null, undefined, '', 0, -1, 1.5, 'invalid']) {
    assert.equal(isMax({level: 18, maxLevel: cap}, 'Hero Equipment'), false);
  }
});

test('Super Troops glow only using real levels mapped from their base troops', () => {
  assert.equal(isMax({level: 1, maxLevel: 1}, 'Super Troops'), false);
  assert.equal(isMax({level: 14, maxLevel: 14, levelSource: 'baseTroop', progressCapStatus: 'unavailable'}, 'Super Troops'), true);
  assert.equal(isMax({level: 13, maxLevel: 14, levelSource: 'baseTroop'}, 'Super Troops'), false);
});
