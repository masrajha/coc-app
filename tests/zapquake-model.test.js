const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Model = require('../public/js/zapquake-model.js');
const manifest = JSON.parse(fs.readFileSync('public/assets/data/zapquake/manifest.json'));
const data = JSON.parse(fs.readFileSync('public/assets/data/zapquake/' + manifest.dataset));
const engine = Model.create(data);
const config = {kind:'buildings', target:'air-defense', level:1, lightningLevel:1, earthquakeLevel:8, townHall:0,
  capacity:15, maxZaps:15, maxQuakes:4, zaps:4, quakes:1, order:'earthquake-first'};
const input = patch => ({...config, ...patch});
const rejects = (patch, code) => assert.throws(() => engine.calculate(input(patch)), error => error.code === code);

test('real snapshot: 800 HP Air Defense, 29% EQ and four 150-damage zaps', () => {
  const result = engine.calculate(config);
  assert.equal(result.hitpoints,800); assert.equal(result.status,'destroyed'); assert.equal(result.damage,832);
  assert.equal(result.overkill,32); assert.equal(result.slots,5);
  assert.equal(result.breakdown[0].damage,232);
  const remaining = engine.calculate(input({zaps:3})); assert.equal(remaining.status,'survives'); assert.equal(remaining.remaining,118);
});
test('minimum-capacity search respects every limit and never uses ineffective sources', () => {
  const result = engine.search(config); assert.equal(result.status,'found'); assert.equal(result.best.slots,5);
  assert.equal(engine.search(input({capacity:4})).status,'noSolution');
  const restricted=engine.search(input({maxQuakes:0}));assert.equal(restricted.best.quakes,0);assert.equal(restricted.best.zaps,6);
  for(const item of [result.best,...result.alternatives]) {assert.ok(item.slots<=15);assert.ok(item.quakes<=4);assert.equal(item.status,'destroyed');}
  assert.equal(engine.search(input({maxZaps:0,maxQuakes:0})).status,'noSolution');
});
test('Town Hall and Clan Castle ignore Lightning while EQ uses building HP', () => {
  for(const target of ['town-hall','clan-castle']) {
    const zap=engine.calculate(input({target,zaps:15,quakes:0}));assert.equal(zap.damage,0);assert.equal(zap.remaining,zap.hitpoints);
    const quake=engine.calculate(input({target,zaps:0,quakes:1}));assert.ok(Math.abs(quake.damage-quake.hitpoints*.29)<1e-9);
    assert.equal(engine.search(input({target})).status,'noSolution');
    assert.ok(quake.notes.includes('lightningImmune'));
  }
});
test('hero types are fixed except Grand Warden; earthquake follows actual defending type', () => {
  const hero={kind:'heroes',target:'archer-queen',defendingMode:'ground',zaps:0,quakes:1};
  const ground=engine.calculate(input(hero));assert.equal(ground.hitpoints,580);assert.equal(ground.damage,84.1);
  const air=engine.calculate(input({...hero,target:'grand-warden',defendingMode:'air'}));assert.equal(air.damage,0);
  const low=engine.calculate(input({...hero,earthquakeLevel:5}));assert.equal(low.damage,0);assert.ok(low.notes.includes('quakeLevel'));
  assert.equal(engine.calculate(input({...hero,defendingMode:''})).defendingMode,'ground');
  rejects({...hero,target:'grand-warden',defendingMode:''},'heroMode');
  for(const target of ['archer-queen','barbarian-king','royal-champion']){
    assert.equal(engine.calculate(input({...hero,target,defendingMode:''})).defendingMode,'ground');
    rejects({...hero,target,defendingMode:'air'},'heroMode');
  }
  for(const target of ['minion-prince','dragon-duke']){
    const result=engine.calculate(input({...hero,target,defendingMode:''}));assert.equal(result.defendingMode,'air');assert.equal(result.damage,0);
    rejects({...hero,target,defendingMode:'ground'},'heroMode');
  }
  for(const target of ['minion-prince','dragon-duke']) assert.equal(engine.calculate(input({...hero,target,defendingMode:'air'})).damage,0);
});
test('exact rational threshold and no premature rounding; EQ repeated hits use odd divisors', () => {
  const fixture=structuredClone(data);fixture.buildings.find(x=>x.id==='air-defense').levels[0].hitpoints=1000;
  fixture.spells.find(x=>x.id==='lightning-spell').levels[0].damage=200;
  fixture.spells.find(x=>x.id==='earthquake-spell').levels[0].buildingDamagePercent=30;
  const calc=Model.create(fixture), query=input({earthquakeLevel:1,zaps:3,quakes:2});
  const exact=calc.calculate(query);assert.equal(exact.status,'destroyed');assert.equal(exact.damage,1000);assert.equal(exact.overkill,0);
  assert.deepEqual(exact.breakdown.map(x=>x.damage),[300,100,200,200,200]);assert.equal(exact.thinMargin,true);
  fixture.buildings.find(x=>x.id==='air-defense').levels[0].hitpoints=1001;
  const under=Model.create(fixture).calculate(query);assert.equal(under.status,'survives');assert.ok(Math.abs(under.remaining-.6)<1e-9);
});
test('spell order is tracked, remaining HP never negative, redundant spells add no damage', () => {
  const first=engine.calculate(input({lightningLevel:13,zaps:3,quakes:2,order:'lightning-first'}));
  assert.equal(first.breakdown[0].type,'lightning');assert.ok(first.breakdown.some(x=>x.unused));
  assert.ok(first.breakdown.filter(x=>x.unused).every(x=>x.damage===0));assert.ok(first.breakdown.every(x=>x.remaining>=0));
});
test('invalid input, capacity, TH restrictions and unsupported conditions are explicit', () => {
  rejects({level:999},'level'); rejects({target:'unknown'},'target');rejects({zaps:1.5},'invalid');rejects({capacity:NaN},'capacity');
  rejects({capacity:4,zaps:4,quakes:1},'capacity');rejects({lightningLevel:13,townHall:5},'spellTH');
  rejects({lightningLevel:0,zaps:1},'disabledSource');rejects({order:'unknown'},'order');
  rejects({supercharge:true},'supercharge');rejects({equipment:['fireball']},'equipment');rejects({environment:'cwl'},'rulesDate');
  for(const patch of [{modifiers:['ranked']},{hpMultiplier:1.2}]) rejects(patch,'unsupported');
  const result=engine.search(input({lightningLevel:0,earthquakeLevel:0}));assert.equal(result.status,'noSolution');
});
test('bounded complete search agrees with hand-derived minimum and deterministic tie-breaking', () => {
  const fixture=structuredClone(data);fixture.buildings.find(x=>x.id==='air-defense').levels[0].hitpoints=1000;
  fixture.spells.find(x=>x.id==='lightning-spell').levels[0].damage=200;fixture.spells.find(x=>x.id==='earthquake-spell').levels[0].buildingDamagePercent=30;
  const query=input({earthquakeLevel:1,maxZaps:5,maxQuakes:2}), result=Model.create(fixture).search(query);
  assert.equal(result.best.slots,5);assert.equal(result.best.zaps,4);assert.equal(result.best.quakes,1);assert.equal(result.best.overkill,100);
  assert.ok(result.examined<=256);
});
test('inputs and dataset are immutable; unsupported dataset versions fail closed', () => {
  const original=JSON.stringify(data), cfg=JSON.stringify(config);engine.search(config);
  assert.equal(JSON.stringify(data),original);assert.equal(JSON.stringify(config),cfg);
  const invalid=structuredClone(data);invalid.normalizerVersion='99';assert.throws(()=>Model.create(invalid));
  const modified=structuredClone(data);modified.modifiers=[{id:'unknown'}];assert.throws(()=>Model.create(modified));
});

const choose = (id,level,extra={}) => ({id,level,confirmed:true,...extra});
const noSpells = {zaps:0,quakes:0,maxZaps:0,maxQuakes:0,lightningLevel:0,earthquakeLevel:0};
const profile = {rulesDate:'2026-11-04',kind:'heroes',target:'archer-queen',defendingMode:'ground',...noSpells};
test('eight equipment sources: zero-spell kills, target-specific damage and effective Esports levels',()=>{
  assert.equal(data.equipment.length,8);
  const fire=engine.search(input({...noSpells,capacity:0,equipment:[choose('fireball',27)]}));assert.equal(fire.best.slots,0);assert.equal(fire.best.status,'destroyed');
  const arrow=engine.calculate(input({...noSpells,target:'clan-castle',level:14,equipment:[choose('giant-arrow',18)]}));assert.equal(arrow.damage,2000);
  const defense=engine.calculate(input({...noSpells,equipment:[choose('giant-arrow',18)]}));assert.equal(defense.damage,4000);
  const esport=engine.calculate(input({...profile,environment:'esports',equipment:[choose('fireball',27),choose('giant-arrow',18)]}));
  assert.equal(esport.equipment[0].effectiveLevel,21);assert.equal(esport.equipment[1].effectiveLevel,15);assert.equal(esport.hitpoints,725);
  assert.equal(esport.breakdown.find(x=>x.type==='fireball').damage,data.equipment.find(x=>x.id==='fireball').levels[20].damage);
});
test('loadout legality, explicit landed-hit confirmation, target eligibility, and experiment mode',()=>{
  const five=['fireball','giant-arrow','spiky-ball','seeking-shield','rocket-backpack'].map(id=>choose(id,1));
  rejects({...noSpells,equipment:five},'loadout');
  assert.equal(engine.calculate(input({...noSpells,equipment:five,loadoutMode:'experiment'})).equipmentCount,5);
  rejects({...noSpells,equipment:[choose('fireball',27)],townHall:8},'loadout');
  rejects({...noSpells,equipment:[{id:'fireball',level:1}]},'equipmentHit');
  rejects({...noSpells,equipment:[choose('fireball',1),choose('fireball',1)]},'equipment');
  rejects({...profile,equipment:[choose('spiky-ball',1)]},'equipmentTarget');
  rejects({...noSpells,target:'clan-castle',equipment:[choose('seeking-shield',18)]},'equipmentTarget');
  rejects({...noSpells,target:'town-hall',level:12,equipment:[choose('seeking-shield',18)]},'equipmentTarget');
  assert.equal(engine.calculate(input({...noSpells,target:'town-hall',level:12,targetWeaponActive:true,equipment:[choose('seeking-shield',18)]})).damage,2500);
  rejects({...noSpells,target:'town-hall',level:18,targetWeaponActive:true,equipment:[choose('seeking-shield',18)]},'equipmentTarget');
  rejects({...noSpells,target:'builders-hut',level:1,equipment:[choose('seeking-shield',18)]},'equipmentTarget');
});
test('Earthquake Boots standalone percentages work and combinations are allowed',()=>{
  const result=engine.calculate(input({...noSpells,equipment:[choose('earthquake-boots',18)]}));assert.equal(result.damage,320);
  assert.equal(engine.calculate(input({equipment:[choose('earthquake-boots',18)]})).status,'destroyed');
  assert.equal(engine.search(input({equipment:[choose('earthquake-boots',18)]})).status,'found');
  const hero=engine.calculate(input({...profile,equipment:[choose('earthquake-boots',18)]}));assert.equal(hero.damage,116);
  assert.equal(engine.calculate(input({...profile,target:'grand-warden',defendingMode:'air',equipment:[choose('earthquake-boots',18)]})).damage,0);
});
test('Boots and spells share one diminishing-return counter, in actual event order',()=>{
  const fixture=structuredClone(data);fixture.buildings.find(item=>item.id==='air-defense').levels[0].hitpoints=1000;
  const model=Model.create(fixture),query=input({zaps:0,quakes:2,equipment:[choose('earthquake-boots',18)]});
  const bootsFirst=model.calculate(query), spellsFirst=model.calculate({...query,equipmentPosition:'after'});
  assert.deepEqual(bootsFirst.breakdown.map(event=>event.type),['earthquake-boots','earthquake','earthquake']);
  assert.ok(Math.abs(bootsFirst.damage-(400+290/3+290/5))<1e-9);
  assert.ok(Math.abs(spellsFirst.damage-(290+290/3+400/5))<1e-9);
  const interleaved=model.calculate({...query,spellInterval:1,equipment:[choose('earthquake-boots',18,{time:.5})]});
  assert.deepEqual(interleaved.breakdown.map(event=>event.type),['earthquake','earthquake-boots','earthquake']);
  assert.ok(Math.abs(interleaved.damage-(290+400/3+290/5))<1e-9);
  const withHealing=model.calculate({...query,spellInterval:1,healingPerSecond:50,equipment:[choose('earthquake-boots',18,{time:.5})]});
  assert.equal(withHealing.healed,50);assert.ok(Math.abs(withHealing.damage-interleaved.damage)<1e-9);
  const searched=model.search({...query,zaps:0,maxZaps:3,maxQuakes:2,capacity:5});
  assert.equal(searched.best.zaps,3);assert.equal(searched.best.quakes,2);assert.equal(searched.best.slots,5);
  assert.equal(model.search({...query,equipmentPosition:'after',maxZaps:3,maxQuakes:2,capacity:5}).status,'noSolution');
});
test('shared gempa counter uses hero percentages; ineffective spells do not consume a target hit',()=>{
  const fixture=structuredClone(data);fixture.heroes.find(item=>item.id==='archer-queen').levels[0].hitpoints=1000;
  const model=Model.create(fixture),query=input({...profile,earthquakeLevel:8,quakes:1,equipment:[choose('earthquake-boots',18)]});
  assert.ok(Math.abs(model.calculate(query).damage-(200+145/3))<1e-9);
  assert.ok(Math.abs(model.calculate({...query,equipmentPosition:'after'}).damage-(145+200/3))<1e-9);
  assert.equal(model.calculate({...query,earthquakeLevel:5,equipmentPosition:'after'}).damage,200);
  assert.equal(model.calculate({...query,target:'grand-warden',defendingMode:'air'}).damage,0);
});
test('ranked HP bonuses only affect hero HP; CWL mappings and date validity follow official changes',()=>{
  for(const [league,hp] of [['legend-3',638],['legend-2',667],['legend-1',696]])assert.equal(engine.calculate(input({...profile,environment:'ranked',league})).hitpoints,hp);
  assert.equal(engine.calculate(input({...noSpells,environment:'ranked',league:'legend-1',rulesDate:'2026-11-04'})).hitpoints,800);
  const cwl=patch=>engine.calculate(input({...profile,environment:'cwl',league:'titan-3',...patch})).hitpoints;
  assert.equal(cwl({rulesDate:'2026-07-01'}),667);assert.equal(cwl({rulesDate:'2026-09-01'}),638);
  assert.equal(cwl({rulesDate:'2026-09-01',league:'titan-1'}),667);assert.equal(cwl({rulesDate:'2026-07-01',league:'titan-1'}),696);
  rejects({...profile,environment:'ranked',league:'legend-1',rulesDate:'2026-11-05'},'rulesDate');
  rejects({...profile,environment:'cwl',league:'titan-1',rulesDate:'2026-05-01'},'rulesDate');
  rejects({...profile,environment:'ranked',league:'legend-1',rulesDate:'2026-02-31'},'rulesDate');
});
test('custom modifiers replace presets, obey scopes, and preserve explicit HP transformations',()=>{
  const result=engine.calculate(input({...noSpells,environment:'custom',customHPPercent:20,customFlatHP:100,customDamagePercent:50,equipment:[choose('fireball',1)]}));
  assert.equal(result.baseHitpoints,800);assert.equal(result.hitpoints,1080);assert.equal(result.damage,2250);
  assert.equal(engine.calculate(input({...noSpells,environment:'custom',customHPPercent:300})).hitpoints,3200);
  assert.equal(engine.calculate(input({...noSpells,environment:'custom',customHPPercent:142.2})).hitpoints,1938);
  rejects({...profile,environment:'ranked',league:'legend-1',customHPPercent:20},'modifierConflict');
  const spell=engine.calculate(input({environment:'custom',customDamagePercent:50,zaps:1,quakes:0}));assert.equal(spell.damage,150);
});
test('periodic aura uses explicit ticks and manual activation time; healing is capped and cannot resurrect',()=>{
  const aura=choose('electro-boots',27,{duration:2});
  const result=engine.calculate(input({...noSpells,equipment:[aura]}));assert.equal(result.damage,400);assert.equal(result.remaining,400);assert.equal(result.breakdown.length,5);
  assert.deepEqual(result.breakdown.map(x=>x.time),[.4,.8,1.2,1.6,2]);
  const healed=engine.calculate(input({...noSpells,equipment:[aura],healingPerSecond:50}));assert.equal(healed.healed,80);assert.equal(healed.remaining,480);
  const stopped=engine.calculate(input({...noSpells,equipment:[choose('fireball',27),aura],healingPerSecond:50}));assert.equal(stopped.healed,0);assert.ok(stopped.breakdown.slice(1).every(x=>x.unused));
  const spaced=engine.calculate(input({quakes:0,spellInterval:1,healingPerSecond:10}));assert.equal(spaced.healed,30);assert.equal(spaced.remaining,230);
  rejects({...noSpells,equipment:[choose('electro-boots',27,{duration:.3})]},'duration');
  rejects({healingPerSecond:10},'healingTiming');
});
test('supercharged HP is manual and explicit; unsupported categories fail rather than ignoring it',()=>{
  const result=engine.calculate(input({...noSpells,supercharge:true,superchargeHitpoints:900}));assert.equal(result.hitpoints,900);assert.equal(result.baseHitpoints,800);
  assert.ok(result.notes.includes('manualSupercharge'));rejects({...profile,supercharge:true,superchargeHitpoints:900},'supercharge');
});
