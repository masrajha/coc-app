const assert=require('node:assert/strict');
const {test}=require('node:test');
const model=require('../public/ranked-game-model.js');
const sample=()=>({session:{id:'previous'},leagueRule:{battles:24},player:{trophies:108,attackCount:2,defenseCount:1},
  attack:{logs:[{trophies:28,stars:2,destructionPercentage:85,timestamp:'20261021T020000.000Z',opponentName:'B'},
    {trophies:40,stars:3,destructionPercentage:100,timestamp:'2026-10-21T01:00:00Z',opponentName:'A'}]},
  defense:{logs:[{trophies:20,stars:2,destructionPercentage:80}],bonusLogs:[{trophies:20}]}});
test('game view keeps real points, sorts copies of logs, and distinguishes bonuses',()=>{
  const data=sample(),before=JSON.stringify(data),view=model.prepare(data);
  assert.equal(view.total,108);assert.equal(view.attack.points,68);assert.equal(view.defense.points,40);
  assert.equal(view.defense.bonusCount,1);assert.equal(view.defense.logs.at(-1).bonus,true);
  assert.equal(view.attack.logs[0].opponentName,'A');assert.equal(view.attack.logs[0].destruction,100);
  assert.equal(view.partial,false);assert.equal(view.quota,24);assert.equal(JSON.stringify(data),before);
  assert.equal(model.prepare(data,'latest').attack.logs[0].opponentName,'B');
});
test('ongoing sessions never display defense bonuses',()=>{
  const data=sample();data.session.id='current';data.player.trophies=88;
  const view=model.prepare(data);assert.equal(view.defense.bonusCount,0);assert.equal(view.defense.points,20);assert.equal(view.total,88);
});
test('missing and partial data never becomes fake zero stars or point totals',()=>{
  const view=model.prepare(null);assert.equal(view.total,null);assert.equal(view.attack.points,null);assert.equal(view.quota,null);
  const data=sample();data.attack.logs[0].stars=null;data.player.attackCount=5;
  const partial=model.prepare(data);assert.equal(partial.attack.points,null);assert.equal(partial.partial,true);assert.equal(partial.attack.logs[1].stars,null);
  data.player.attackCount=2;data.attack.logs[0].trophies=null;assert.equal(model.prepare(data).attack.points,null);
  assert.equal(model.prepare({player:{attackCount:0},attack:{logs:[]}}).attack.points,0);
});
test('official totals and unknown rules are preserved',()=>{
  const data=sample();data.player.trophies=999;data.leagueRule=null;
  const view=model.prepare(data);assert.equal(view.total,999);assert.equal(view.partial,true);assert.equal(view.quota,null);
  assert.equal(model.time('20261021T020000.000Z'),Date.parse('2026-10-21T02:00:00Z'));
  assert.equal(model.time(1792548000),1792548000000);assert.equal(model.time('bad-date'),null);
});
