const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

function fixture() {
  const nodes = new Map();
  const makeNode = () => ({
    dataset:{}, hidden:false, children:[], value:0, max:100,
    get textContent(){return this.children.map(child => typeof child === 'string' ? child : child.textContent).join('');},
    set textContent(value){this.children=[String(value)];},
    append(...children){this.children.push(...children);},
    replaceChildren(...children){this.children=children;},
    removeAttribute(key){delete this[key];}
  });
  const el = id => {if(!nodes.has(id))nodes.set(id,makeNode());return nodes.get(id);};
  const window={CocI18n:{t:(key,values)=>key+(values?' '+JSON.stringify(values):''),number:(value,options)=>new Intl.NumberFormat('en-US',options).format(value)}};
  vm.runInNewContext(fs.readFileSync('public/war-summary.js','utf8'),{window,Date,document:{getElementById:el,createElement:makeNode,createTextNode:value=>String(value)}});
  return {view:window.ClanWarSummary,el};
}
const end='20261029T010237.000Z';
const now=Date.parse('2026-10-29T01:02:37Z');
const data=()=>({state:'inWar',endTime:end,attacksUsed:40,members:[{name:'Player',attacksRemaining:1}],clan:{stars:90,destructionPercentage:100,attacks:40},opponent:{stars:90,destructionPercentage:100,attacks:46}});
const context=(overrides={})=>({pending:[{name:'Player',attacksRemaining:1}],remaining:20,totalQuota:60,ourTheoreticalLimit:90,opponentTheoreticalLimit:90,ourPerfect:true,opponentPerfect:true,result:0,destructionKnown:true,status:'Future-sounding active-war message',...overrides});

test('cached inWar expires at endTime, including ISO timestamps, without mutating API data',()=>{
  const {view}=fixture();const raw=Object.freeze(data());
  assert.equal(view.normalize(raw,now-1),raw);
  const ended=view.normalize(raw,now);
  assert.equal(ended.state,'warEnded');assert.equal(ended.endedByTime,true);assert.equal(raw.state,'inWar');
  assert.equal(view.normalize({...raw,endTime:'2026-10-29T01:02:37.000Z'},now).state,'warEnded');
  assert.equal(view.parseTime('20261029T010237.5Z').getTime(),now+500);
  for(const endTime of [null,'','invalid','0'])assert.equal(view.normalize({...raw,endTime},now).state,'inWar');
  assert.equal(view.normalize({...raw,state:'preparation'},now).state,'preparation');
  assert.equal(view.normalize({...raw,state:'warEnded',endTime:'20990101T000000.000Z'},now).state,'warEnded');
});
test('expired perfect draw uses completed-result wording rather than future instructions',()=>{
  const {view,el}=fixture();view.render(view.normalize(data(),now),context());
  assert.ok(el('warCommandDetail').textContent.startsWith('clan.layout.endedPerfectDraw'));
  assert.equal(el('warResultSummary').textContent,'clan.layout.draw');
  assert.equal(el('warPhase').dataset.state,'warEnded');
  assert.equal(el('warPendingAction').textContent,'clan.layout.viewUnused');
  assert.ok(!el('warCommandDetail').textContent.includes('Future-sounding'));
});
test('elapsed time alone never certifies a non-perfect cached win or loss',()=>{
  const {view,el}=fixture();const raw=data();raw.clan.stars=83;raw.clan.destructionPercentage=95;
  view.render(view.normalize(raw,now),context({ourPerfect:false,result:-1}));
  assert.equal(el('warResultSummary').textContent,'clan.layout.resultPending');
  assert.equal(el('warCommandDetail').textContent,'clan.layout.endedAwaitingUpdate');
  assert.equal(el('warScoreDeltaLabel').textContent,'clan.layout.lastRecordedMargin');
  assert.equal(el('warResultCard').dataset.tone,'neutral');
  view.render({...raw,state:'warEnded'},context({ourPerfect:false,result:-1}));
  assert.equal(el('warResultSummary').textContent,'clan.layout.lost');
  assert.ok(el('warCommandDetail').textContent.startsWith('clan.layout.endedLoss'));
});
test('active perfect-war guidance remains active until the deadline',()=>{
  const {view,el}=fixture();view.render(view.normalize(data(),now-1000),context());
  assert.equal(el('warPhase').dataset.state,'inWar');
  assert.equal(el('warCommandDetail').textContent,'Future-sounding active-war message');
});
