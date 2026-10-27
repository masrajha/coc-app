const assert = require('node:assert/strict');
const { test } = require('node:test');
const model = require('../public/compare-model.js');

const legendProfile = (tier = 'Legend I', week = 1792990800, updated = '2026-10-27T00:00:00Z') => ({
  lastUpdated: updated, player: {leagueTier:{name:tier},leagueTransition:{seasonId:week}}
});

test('Legend I comparison requires two Legend I profiles and a confirmed common period', () => {
  assert.equal(model.legendContext(legendProfile(),legendProfile()).samePeriod,true);
  const mixed=model.legendContext(legendProfile(),legendProfile('Legend II'));
  assert.equal(mixed.visible,true);assert.equal(mixed.both,false);assert.equal(mixed.samePeriod,false);
  assert.equal(model.legendContext(legendProfile(),legendProfile('Legend I',1792386000)).samePeriod,false);
  assert.equal(model.legendContext(legendProfile(),legendProfile('Legend I',1792990800,'2026-10-27T01:00:00Z')).samePeriod,false);
  assert.equal(model.legendContext(legendProfile('Legend III'),legendProfile('Legend II')).visible,false);
  assert.equal(model.legendContext(legendProfile(),null).samePeriod,false);
});

test('explicit Legend I season identifiers take priority over matching weekly observations', () => {
  const a=legendProfile(),b=legendProfile();
  a.player.legendStatistics={currentSeason:{id:'2026-10'}};
  b.player.legendStatistics={currentSeason:{id:'2026-09'}};
  assert.equal(model.legendContext(a,b).samePeriod,false);
  b.player.legendStatistics.currentSeason.id='2026-10';
  assert.equal(model.legendContext(a,b).samePeriod,true);
  delete b.player.legendStatistics.currentSeason.id;
  assert.equal(model.legendContext(a,b).samePeriod,false);
});

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

test('battle drawer sorts and filters copied logs without mutating the loaded comparison data', () => {
  const data=session({player:{attackCount:3},attack:{logs:[
    {stars:0,trophies:5,timestamp:'20261027T030000.000Z'},
    {stars:3,trophies:40,timestamp:'2026-10-27T01:00:00Z'},
    {stars:null,trophies:null,timestamp:'2026-10-27T02:00:00Z'}
  ]}});
  const before=JSON.stringify(data);
  const oldest=model.battleLogRows(data,'attack');
  assert.deepEqual(oldest.logs.map(log=>log.stars),[3,null,0]);
  assert.equal(oldest.points,45);assert.equal(oldest.partial,true);
  assert.deepEqual(model.battleLogRows(data,'attack','low').logs.map(log=>log.stars),[0]);
  assert.deepEqual(model.battleLogRows(data,'attack','triple').logs.map(log=>log.battleNumber),[1]);
  assert.equal(model.battleLogRows(data,'attack','all','latest').logs[0].stars,0);
  assert.equal(JSON.stringify(data),before);
});

test('drawer defense bonuses appear only after a session finishes and remain separate from filtered battles', () => {
  const data=session({defense:{logs:[{stars:3,trophies:0}],bonusLogs:[{trophies:9},{trophies:9}]},player:{defenseCount:1}});
  const view=model.battleLogRows(data,'defense');
  assert.equal(view.bonusCount,2);assert.equal(view.points,18);assert.equal(view.logs.length,3);
  assert.equal(view.logs[1].kind,'defenseBonus');
  const triples=model.battleLogRows(data,'defense','triple');
  assert.equal(triples.logs.length,1);assert.equal(triples.points,18);
  data.session.id='current';
  assert.equal(model.battleLogRows(data,'defense').bonusCount,0);
  assert.equal(model.battleLogRows(null).points,null);
  assert.equal(model.battleLogRows({player:{attackCount:0},attack:{logs:[]}}).points,0);
});
