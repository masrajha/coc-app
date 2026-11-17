const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const Model=require('../public/js/zapquake-model.js');
const manifest=JSON.parse(fs.readFileSync('public/assets/data/zapquake/manifest.json'));
const data=JSON.parse(fs.readFileSync('public/assets/data/zapquake/'+manifest.dataset));
const engine=Model.create(data);
const config={kind:'buildings',target:'spiky-tower',level:2,defenderTownHall:19,townHall:19,lightningLevel:13,earthquakeLevel:8,
  capacity:15,zaps:9,quakes:0,maxZaps:15,maxQuakes:4,order:'earthquake-first',rulesDate:'2026-11-17',environment:'normal'};
test('TH19 verified targets calculate while missing levels and presets fail closed',()=>{
  assert.equal(engine.calculate(config).hitpoints,6363);
  assert.equal(engine.calculate(config).status,'destroyed');
  assert.equal(engine.calculate({...config,zaps:8}).remaining,603);
  assert.equal(engine.calculate({...config,target:'firecracker-tower',zaps:9}).remaining,220);
  assert.deepEqual(engine.targetLevels('heroes','archer-queen',19),[]);
  assert.deepEqual(engine.targetLevels('buildings','town-hall',19),[]);
  assert.deepEqual(engine.targetLevels('buildings','air-defense',19),[]);
  assert.throws(()=>engine.calculate({...config,lightningLevel:14}),e=>e.code==='level');
  assert.throws(()=>engine.calculate({...config,rulesDate:'2026-11-04'}),e=>e.code==='targetDate');
  assert.throws(()=>engine.calculate({...config,equipment:[{id:'giant-arrow',level:18,confirmed:true}]}),e=>e.code==='loadoutUnknown');
  for(const target of ['spiky-tower','firecracker-tower']) {
    const shield=engine.calculate({...config,target,townHall:18,zaps:0,quakes:0,lightningLevel:0,earthquakeLevel:0,equipment:[{id:'seeking-shield',level:18,confirmed:true}]});
    assert.equal(shield.damage,2500,'Both new defense targets support a confirmed landed Seeking Shield.');
  }
});
test('dated target balance and hero modifiers preserve old results',()=>{
  const old={...config,target:'air-defense',defenderTownHall:18,level:16,rulesDate:'2026-11-04'};
  assert.equal(engine.calculate(old).hitpoints,2000);
  assert.equal(engine.calculate({...old,rulesDate:'2026-11-17'}).hitpoints,2050);
  assert.throws(()=>engine.calculate({...old,rulesDate:'2026-11-17',supercharge:true,superchargeHitpoints:2200}),e=>e.code==='supercharge');
  const hero={...config,kind:'heroes',target:'archer-queen',level:1,defendingMode:'ground',defenderTownHall:0,environment:'ranked',league:'legend-1'};
  assert.equal(engine.calculate({...hero,rulesDate:'2026-11-04'}).hitpoints,696);
  assert.equal(engine.calculate(hero).hitpoints,725);
  assert.equal(engine.calculate({...hero,environment:'cwl',league:'titan-1'}).hitpoints,696);
  assert.equal(engine.calculate({...hero,environment:'esports'}).hitpoints,754);
  assert.throws(()=>engine.calculate({...hero,rulesDate:'2026-11-10'}),e=>e.code==='rulesDate');
  assert.throws(()=>engine.calculate({...hero,rulesDate:'2026-11-18'}),e=>e.code==='rulesDate');
});
