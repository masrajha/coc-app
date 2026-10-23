const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('public/theme.js', 'utf8');
function setup(saved, systemDark = false, storageBlocked = false) {
  const events = {}, documentEvents = {}, mediaEvents = {};
  const storage = new Map(saved ? [['coc-theme',saved]] : []);
  const root = {dataset:{},style:{}};
  const media = {matches:systemDark,addEventListener:(event,callback)=>{mediaEvents[event]=callback;}};
  const context = {
    document:{documentElement:root,querySelectorAll:()=>[],addEventListener:(event,callback)=>{documentEvents[event]=callback;}},
    window:{matchMedia:()=>media,dispatchEvent(){},addEventListener:(event,callback)=>{events[event]=callback;}},
    localStorage:{getItem:key=>{if(storageBlocked)throw Error('blocked');return storage.get(key);},setItem:(key,value)=>{if(storageBlocked)throw Error('blocked');storage.set(key,value);}},
    CustomEvent:class CustomEvent{constructor(type,options){this.type=type;this.detail=options.detail;}}
  };
  vm.runInNewContext(source,context);
  return {context,root,media,events,mediaEvents,storage};
}
const initial = setup();
assert.equal(initial.root.dataset.theme,'dark');
assert.equal(initial.root.style.colorScheme,'dark');
const light = setup('light',true);
assert.equal(light.root.dataset.theme,'light','Stored mode must apply before DOMContentLoaded.');
light.context.window.CocTheme.setMode('system');
assert.equal(light.root.dataset.theme,'dark');
assert.equal(light.storage.get('coc-theme'),'system');
light.media.matches=false;light.mediaEvents.change();
assert.equal(light.root.dataset.theme,'light','System mode must react to OS changes.');
light.context.window.CocTheme.setMode('dark');
light.media.matches=true;light.mediaEvents.change();
light.media.matches=false;light.mediaEvents.change();
assert.equal(light.root.dataset.theme,'dark','Explicit selection must ignore OS changes.');
light.events.storage({key:'coc-theme',newValue:'light'});
assert.equal(light.root.dataset.theme,'light','Theme must sync between tabs.');
light.events.storage({key:'coc-theme',newValue:null});
assert.equal(light.root.dataset.theme,'dark');
const blocked=setup(null,false,true);
blocked.context.window.CocTheme.setMode('light');
assert.equal(blocked.root.dataset.theme,'light','Blocked storage must not prevent switching.');
blocked.context.window.CocTheme.setMode('invalid');
assert.equal(blocked.root.dataset.theme,'light');
assert.equal(setup('invalid').root.dataset.theme,'dark');
for(const page of ['index','player','compare','compare-clan']) {
  const html=fs.readFileSync(`public/${page}.html`,'utf8');
  assert.ok(html.indexOf('/theme.js')<html.indexOf('rel="stylesheet"'),`${page}: theme must be applied before styles.`);
  assert.ok(html.includes('/theme.css'),`${page}: missing shared theme styles.`);
}
console.log('Theme tests passed: startup, persistence, system changes, storage failures, cross-tab sync and page wiring.');
