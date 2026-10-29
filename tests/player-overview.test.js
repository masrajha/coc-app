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
