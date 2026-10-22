const assert = require('node:assert/strict');
const { test } = require('node:test');
const model = require('../public/compare-model.js');

const session = (overrides = {}) => ({
  session: { id: 'previous', seasonId: 1791176400, groupTag: '#AAA' },
  leagueTier: 'Legend III', leagueRule: { battles: 4 },
  player: { trophies: 136, attackCount: 3, defenseCount: 2 },
  attack: { logs: [{ trophies: 40, stars: 3 }, { trophies: 28, stars: 2 }, { trophies: 40, stars: 3 }] },
  defense: { bonusPoints: 18, logs: [{ trophies: 0, stars: 3 }, { trophies: 10, stars: 2 }] },
  ...overrides
});

test('completed session includes the backend defense bonus but excludes it from per-battle metrics', () => {
  const result = model.leagueSummary(session());
  assert.equal(result.totalTrophies, 136);
  assert.equal(result.attack.points, 108);
  assert.equal(result.defense.points, 10);
  assert.equal(result.defense.totalPoints, 28);
  assert.equal(result.defense.bonusPoints, 18);
  assert.equal(result.defense.totalComplete, true);
  assert.equal(result.defense.pointsAverage, 5);
  assert.equal(result.defense.starCount, 2);
  assert.equal(result.defense.tripleRate, 50);
  assert.equal(result.attack.triples, 2);
  assert.equal(result.attack.quota, 4);
});

test('ongoing session never uses a defense bonus', () => {
  const result = model.leagueSummary(session({ session: { id: 'current', seasonId: 1791176400 } }));
  assert.equal(result.ended, false);
  assert.equal(result.defense.bonusPoints, 0);
  assert.equal(result.defense.totalPoints, 10);
});

test('missing logs and missing points remain partial and never turn into zero points or a bonus', () => {
  const result = model.leagueSummary(session({
    player: { trophies: 136, attackCount: 4, defenseCount: 2 },
    attack: { logs: [{ trophies: 40, stars: 3 }, { trophies: null, stars: null }] }
  }));
  assert.equal(result.attack.pointDataComplete, false);
  assert.equal(result.attack.points, 40);
  assert.equal(result.attack.pointsAverage, 40);
  assert.equal(result.attack.pointCount, 1);
  assert.equal(result.attack.starCount, 1);
  assert.equal(result.defense.bonusPoints, 0);
  assert.equal(result.defense.totalComplete, false);
  assert.equal(result.totalTrophies, 136);
  const missing = model.leagueSummary(null);
  assert.equal(missing.attack.points, null);
  assert.equal(missing.totalTrophies, null);
});

test('zero battles is distinct from missing history; no average is invented', () => {
  const empty = model.leagueSummary({ player: { attackCount: 0, defenseCount: 0 }, attack: { logs: [] }, defense: { logs: [] } });
  assert.equal(empty.attack.points, 0);
  assert.equal(empty.attack.pointDataComplete, true);
  assert.equal(empty.attack.pointsAverage, null);
  assert.equal(empty.attack.tripleRate, null);
  const unknown = model.leagueSummary({ attack: { logs: [] } });
  assert.equal(unknown.attack.points, null);
  assert.equal(unknown.attack.pointDataComplete, false);
});

test('same season is comparable across groups and league tiers', () => {
  const left = session();
  const right = session({ leagueTier: 'Legend II', session: { id: 'current', seasonId: '1791176400', groupTag: '#BBB' } });
  assert.equal(model.sameLeagueSeason(left, right), true);
  assert.equal(model.sameLeagueSeason(left, session({ session: { seasonId: 1790571600 } })), false);
  assert.equal(model.sameLeagueSeason(null, left), false);
  assert.equal(model.sameLeagueSeason({ session: { seasonId: 0 } }, { session: { seasonId: 0 } }), false);
});
