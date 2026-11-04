const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/assets/data/zapquake/manifest.json'),'utf8'));
const data=JSON.parse(fs.readFileSync(path.join(root,'public/assets/data/zapquake',manifest.dataset),'utf8'));
function worker(){
  let message;
  const context=vm.createContext({URL,self:{location:{href:'https://example.test/js/zapquake-worker.js?v=2.2.1&catalog=1'},postMessage:value=>{message=value;}}});
  context.self=context;
  context.location={href:'https://example.test/js/zapquake-worker.js?v=2.2.1&catalog=1'};
  context.postMessage=value=>{message=value;};
  context.importScripts=(...urls)=>{for(const url of urls)vm.runInContext(fs.readFileSync(path.join(root,'public',new URL(url,'https://example.test').pathname),'utf8'),context);};
  vm.runInContext(fs.readFileSync(path.join(root,'public/js/zapquake-worker.js'),'utf8'),context);
  return input=>{context.onmessage({data:input});return message;};
}
const config={kind:'buildings',target:'air-defense',level:1,lightningLevel:13,earthquakeLevel:8,townHall:0,capacity:11,maxZaps:15,maxQuakes:4,order:'earthquake-first',environment:'normal',equipment:[]};
test('catalog worker agrees with single search and isolates target errors',()=>{
  const invoke=worker(),full=invoke({data,config}).result;
  assert.ok(full.best);
  const batch=invoke({data,batch:[config,{...config,kind:'heroes',target:'grand-warden',level:1,defendingMode:''},{...config,target:'clan-castle',level:1}]}).result;
  assert.equal(batch.length,3);
  assert.equal(batch[0].best.slots,full.best.slots);
  assert.equal(batch[0].best.zaps,full.best.zaps);
  assert.equal(batch[0].hitpoints,full.hitpoints);
  assert.ok(batch[1].error);
  assert.ok(!batch[2].error);
  assert.equal(batch[0].best.breakdown,undefined,'catalog transfers compact results, not full timelines');
});

test('every selectable target level has local artwork',()=>{
  for(const kind of ['buildings','heroes'])for(const target of data[kind])for(const row of target.levels){
    const relative=kind==='heroes'?'hero/characters/'+target.id+'.webp':target.id==='town-hall'?'town-hall/th-'+row.level+'.webp':'zapquake/'+target.id+'-'+row.level+'.webp';
    assert.ok(fs.existsSync(path.join(root,'public/assets/images',relative)),relative);
  }
  assert.ok(fs.existsSync(path.join(root,'public/assets/images/zapquake/fireball.webp')));
});

test('defender presets intersect source counts, merges, TH levels and Hero Hall limits',()=>{
  const model=require('../public/js/zapquake-model.js').create(data);
  const levels=(kind,id,th)=>model.targetLevels(kind,id,th).map(row=>row.level);
  assert.equal(levels('buildings','air-defense',12).at(-1),10);
  assert.deepEqual(levels('buildings','scattershot',12),[]);
  assert.equal(levels('buildings','scattershot',13).at(-1),2);
  assert.deepEqual(levels('buildings','eagle-artillery',17),[]);
  assert.equal(levels('buildings','eagle-artillery',16).at(-1),7);
  assert.deepEqual(levels('buildings','cannon',17),[]);
  assert.equal(levels('buildings','cannon',16).at(-1),21);
  assert.deepEqual(levels('buildings','monolith',14),[],'source count does not override level requirement');
  assert.equal(levels('buildings','monolith',15).at(-1),2);
  assert.deepEqual(levels('buildings','town-hall',12),[12]);
  assert.deepEqual(levels('heroes','dragon-duke',14),[]);
  assert.ok(levels('heroes','dragon-duke',15).length);
  assert.equal(levels('buildings','cannon',0).length,21,'manual mode includes legacy targets');
  const invoke=worker();
  assert.equal(invoke({data,config:{...config,target:'eagle-artillery',defenderTownHall:17}}).error,'defenderTH');
  assert.equal(invoke({data,config:{...config,level:11,defenderTownHall:12}}).error,'defenderTH');
  assert.ok(invoke({data,config:{...config,level:10,defenderTownHall:12}}).result.best);
  const invalid=JSON.parse(JSON.stringify(data));invalid.buildings[0].availablePerTownHall[0].countAfterMerges=-1;
  assert.throws(()=>require('../public/js/zapquake-model.js').create(invalid),error=>error.code==='data');
});
