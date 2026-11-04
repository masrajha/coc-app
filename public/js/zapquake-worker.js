'use strict';
const version = new URL(self.location.href).searchParams.get('v');
if (!/^\d+\.\d+\.\d+$/.test(version || '')) throw new Error('Invalid worker version');
importScripts('/js/zapquake-modifiers.js?v=' + version, '/js/zapquake-model.js?v=' + version);
self.onmessage = event => {
  try {
    const engine = self.ZapquakeModel.create(event.data.data);
    if (event.data.batch) self.postMessage({result:event.data.batch.map(config => {
      try { const result=engine.search(config); return {best:result.best && {zaps:result.best.zaps,quakes:result.best.quakes,slots:result.best.slots},hitpoints:result.hitpoints,baseHitpoints:result.baseHitpoints}; }
      catch(error) { return {error:error.code||'invalid'}; }
    })});
    else self.postMessage({result:engine.search(event.data.config)});
  }
  catch (error) { self.postMessage({error:error.code || 'invalid'}); }
};
