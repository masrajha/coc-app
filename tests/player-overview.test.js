const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const window = {};
vm.runInNewContext(fs.readFileSync('public/player-overview.js','utf8'), {window});
const model = window.PlayerOverview.model;
const progress = {complete:true,tableExactMatch:true,score:{overall:93.29,categories:{heroes:{knownItems:6,expectedItems:6},troops:{knownItems:40,expectedItems:40},spells:{knownItems:20,expectedItems:20},pets:{knownItems:11,expectedItems:11}}},rushed:{rushed:false}};

test('highest-TH API item counts do not become an invented maximum', () => {
  const result = model(progress);
  assert.equal(result.known,77);assert.equal(result.total,null);assert.equal(result.score,93.29);assert.equal(result.status,'safe');
});
test('coverage bars require an explicitly confirmed total catalog', () => {
  assert.equal(model({...progress,coverage:{expectedItems:90}}).total,null);
  assert.equal(model({...progress,coverage:{expectedItems:90,totalKnown:true}}).total,90);
  for (const expectedItems of [null,0,-1,70,'unknown']) assert.equal(model({...progress,coverage:{expectedItems,totalKnown:true}}).total,null);
});
test('missing scores and partial data stay unknown, while zero remains valid', () => {
  assert.equal(model().score,null);assert.equal(model().total,null);assert.equal(model().status,'unknown');
  assert.equal(model({...progress,complete:false}).status,'unknown');
  assert.equal(model({...progress,rushed:{rushed:true}}).status,'warning');
  assert.equal(model({score:{overall:0}}).score,0);
  assert.equal(model({score:{overall:null}}).score,null);
});

test('profile hero uses relative progress instead of the largest level', () => {
  const player = {heroes:[
    {name:'Barbarian King',level:95,maxLevel:110},
    {name:'Archer Queen',level:90,maxLevel:100},
    {name:'Dragon Duke',level:24,maxLevel:25},
    {name:'Battle Machine',level:35,maxLevel:35,village:'builderBase'}
  ]};
  assert.equal(window.PlayerOverview.chooseHero(player).name,'Dragon Duke');
  const progress = {score:{categories:{heroes:{items:[
    {name:'Barbarian King',level:95,maxLevel:95},
    {name:'Archer Queen',level:90,maxLevel:95},
    {name:'Dragon Duke',level:24,maxLevel:25}
  ]}}}};
  assert.equal(window.PlayerOverview.chooseHero(player,progress).name,'Barbarian King');
});

test('random selection stays within tied best heroes and excludes invalid limits', () => {
  const player = {heroes:[
    {name:'Archer Queen',level:100,maxLevel:100},
    {name:'Minion Prince',level:80,maxLevel:80},
    {name:'Royal Champion',level:40,maxLevel:50},
    {name:'Grand Warden',level:75,maxLevel:0},
    {name:'Dragon Duke',level:0,maxLevel:25}
  ]};
  assert.equal(window.PlayerOverview.chooseHero(player,null,()=>0).name,'Archer Queen');
  assert.equal(window.PlayerOverview.chooseHero(player,null,()=>0.99).name,'Minion Prince');
  assert.equal(window.PlayerOverview.chooseHero({heroes:[{name:'Grand Warden',level:70}]}),null);
  assert.equal(window.PlayerOverview.chooseHero(),null);
});

test('snapshot maxed counts use known Home Village caps, not raw army or equipment caps', () => {
  const result=window.PlayerOverview.summaryModel({score:{categories:{
    heroes:{percent:80,items:[{level:80,maxLevel:80},{level:70,maxLevel:100},{level:null,maxLevel:25}]},
    troops:{percent:95,items:[{level:10,maxLevel:10}]},spells:{percent:null},builderBase:{items:[{level:35,maxLevel:35}]}
  }}},{army:{heroEquipment:[{level:27,maxLevel:27}]}});
  assert.equal(result.capped,3);assert.equal(result.maxed,2);
  assert.equal(result.weakest.category,'heroes');
  assert.equal(window.PlayerOverview.summaryModel().capped,0);
});

test('snapshot achievements distinguish unavailable data and choose the closest unfinished goal', () => {
  assert.equal(window.PlayerOverview.summaryModel().achievements,null);
  const result=window.PlayerOverview.summaryModel(null,{achievements:[
    {name:'Done',stars:3,value:100,target:100},
    {name:'Next',stars:2,value:90,target:100},
    {name:'Later',stars:1,value:0,target:100},
    {name:'Unknown',stars:0,value:null,target:100}
  ]}).achievements;
  assert.equal(result.total,4);assert.equal(result.complete,1);assert.equal(result.next.name,'Next');assert.equal(result.next.percent,90);
});

test('snapshot raid totals aggregate only the latest observed weekend and preserve missing values', () => {
  const items=[
    {startTime:'20261016T070000.000Z',loot:9000,attacks:6,state:'ended'},
    {startTime:'20261023T070000.000Z',loot:1000,attacks:2,state:'ended'},
    {startTime:'20261023T070000.000Z',loot:500,attacks:1,state:'ended'}
  ];
  let result=window.PlayerOverview.summaryModel(null,{raids:{items}}).raid;
  assert.equal(result.loot,1500);assert.equal(result.attacks,3);assert.equal(result.partial,false);
  result=window.PlayerOverview.summaryModel(null,{raids:{items:[...items,{startTime:'20261023T070000.000Z',loot:null,attacks:0}]}}).raid;
  assert.equal(result.loot,null);assert.equal(result.partial,true);
  assert.equal(window.PlayerOverview.summaryModel(null,{raids:{items:[]}}).raid,null);
});
