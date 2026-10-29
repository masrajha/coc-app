const test=require('node:test');
const assert=require('node:assert/strict');
const model=require('../public/compare-overview-model.js');
const profile=(tag,th=18)=>({player:{tag,townHallLevel:th},progress:{complete:true,tableVersion:'same',baselineSource:'api',score:{overall:90,categories:{heroes:{percent:80}}}}});
const history=(stars,date='2026-10-20T00:00:00Z')=>({wars:[{id:'war',type:'CWL',startTime:date,state:'warEnded',quota:1,attacks:[{stars,destructionPercentage:90}]}],trend:[]});
const context={profiles:{left:profile('#2GPP802UU'),right:profile('#28P08PG0G')},warPeriod:'30d',now:new Date('2026-10-29T00:00:00Z')};

test('overview treats missing data as unknown, while preserving comparable progress and known zero',()=>{
  let result=model.build({});
  assert.equal(result.progress.comparable,false);assert.equal(result.progress.values.left.score,null);
  assert.equal(result.war.values.left,null);assert.equal(result.ranked.values.left,null);assert.equal(result.activity.values.left.delta,null);
  result=model.build({...context,profiles:{...context.profiles,left:{...profile('#2GPP802UU'),progress:{...profile('#2GPP802UU').progress,score:{overall:0}}}}});
  assert.equal(result.progress.values.left.score,0);assert.equal(result.progress.comparable,true);
  result=model.build({...context,profiles:{...context.profiles,right:profile('#28P08PG0G',17)}});
  assert.equal(result.progress.comparable,false);
});

test('war overview follows the selected period and distinguishes zero attacks from missing archive',()=>{
  const performances={left:history(3),right:history(2,'2026-06-01T00:00:00Z')};
  const recent=model.build({...context,performances});
  assert.equal(recent.war.values.left.starsPerAttack,3);assert.equal(recent.war.values.right.attacks,0);assert.equal(recent.war.values.right.starsPerAttack,null);
  assert.equal(model.build({...context,performances,warPeriod:'all'}).war.values.right.starsPerAttack,2);
});

test('ranked overview preserves official totals and same-season context across tiers',()=>{
  const session={session:{id:'current',seasonId:10},player:{trophies:0,attackCount:0,defenseCount:0},attack:{logs:[]},defense:{logs:[]}};
  let result=model.build({...context,league:{left:{...session,leagueTier:'Legend II'},right:{...session,leagueTier:'Legend III'}}});
  assert.equal(result.ranked.sameSeason,true);assert.equal(result.ranked.values.left.totalTrophies,0);
  result=model.build({...context,league:{left:session,right:{...session,session:{id:'previous',seasonId:9}}}});
  assert.equal(result.ranked.sameSeason,false);
});

test('activity uses shared observations and never infers a donation total across resets',()=>{
  const trend=(values,extra=[])=>({trend:values.map((v,i)=>({date:`2026-10-${20+i}`,donations:v,trophies:100-i*10})).concat(extra)});
  const performances={left:trend([100,150,10],[{date:'2026-10-24',donations:99,trophies:200}]),right:trend([100,110,120])};
  let result=model.build({...context,performances,activityMetric:'donations'}).activity;
  assert.equal(result.count,3);assert.equal(result.values.left.delta,null);assert.equal(result.values.left.reset,true);assert.equal(result.values.right.delta,20);
  result=model.build({...context,performances,activityMetric:'trophies'}).activity;
  assert.equal(result.values.left.delta,-20);assert.equal(result.values.right.delta,-20);assert.equal(result.partial,false);
  assert.equal(model.build({...context,performances:{left:trend([0]),right:trend([0])}}).activity.values.left.delta,null);
});
