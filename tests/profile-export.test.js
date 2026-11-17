const test=require('node:test'),assert=require('node:assert/strict');
const exporter=require('../public/js/profile-export.js');
const tr=key=>({'export.unavailable':'Unavailable','export.partial':'Partial','export.complete':'Complete'}[key]||key);
const profile={player:{name:'=HYPERLINK("x")',tag:'#FIXTURE',townHallLevel:19,trophies:0,warStars:0},progress:{complete:false,capStatus:'partial',tableVersion:'2026-11-17.2',score:{overall:100,categories:{heroes:{knownItems:6,observedItems:7},troops:{knownItems:30,observedItems:41}}}}};
test('exports preserve partial TH19 scope, version and legitimate zero values',()=>{
  assert.deepEqual(exporter.columns(profile,tr),[19,'2026-11-17.2','Partial','36 / 48','100%']);
  const rows=exporter.playerRows(profile,tr);
  assert.equal(rows.at(-1)[1],0);assert.equal(rows.at(-2)[1],0);
  const csv=exporter.csv(rows);assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=HYPERLINK(""x"")"'));
  assert.ok(csv.includes('2026-11-17.2'));
});
test('unknown scores never become zero or complete, while verified zero scores survive',()=>{
  assert.equal(exporter.columns(null,tr)[4],'Unavailable');
  const unknown={...profile,progress:{...profile.progress,capStatus:'unavailable',score:{overall:null}}};
  assert.equal(exporter.columns(unknown,tr)[2],'Unavailable');
  assert.equal(exporter.columns(unknown,tr)[4],'Unavailable');
  const zero={...profile,progress:{...profile.progress,score:{overall:0}}};
  assert.equal(exporter.columns(zero,tr)[4],'0%');
  assert.equal(exporter.cell('\t=1+1'),'"\'\t=1+1"');
  assert.equal(exporter.cell('a,"b"\nc'),'"a,""b""\nc"');
});
