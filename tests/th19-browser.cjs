// Optional end-to-end gate: run against an already launched headless Chrome CDP endpoint.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve('public'),fixture=JSON.parse(execFileSync('php',['tests/th19-browser-fixture.php'],{maxBuffer:8*1024*1024,encoding:'utf8'}));
const art=JSON.parse(fs.readFileSync('public/assets/images/th19/sources.json','utf8'));
let baseline=false;
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost'),key=u.pathname+'?lang='+(u.searchParams.get('lang')||'id');
  if(u.pathname==='/__test/baseline'){baseline=true;res.end('ok');return;}
  if(fixture.pages[key]){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture.pages[key]);return;}
  if(baseline&&u.pathname==='/assets/data/zapquake/manifest.json'){
    const version='2026-11-04.5',body=fs.readFileSync('public/assets/data/zapquake/'+version+'/dataset.json');
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({schemaVersion:1,dataVersion:version,dataset:version+'/dataset.json',license:version+'/LICENSE.txt',sha256:crypto.createHash('sha256').update(body).digest('hex'),bytes:body.length,calculationReady:false}));return;
  }
  if(u.pathname.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Fixture: API unavailable'}));return;}
  const file=path.resolve(root,'.'+u.pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.ttf':'font/ttf'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
  const cdp=process.argv.find(arg=>arg.startsWith('--cdp='))?.slice(6)||'http://127.0.0.1:9338';
  const pages=await(await fetch(cdp+'/json/list')).json(),page=pages.find(row=>row.type==='page');assert.ok(page,'Open a Chrome page with remote debugging enabled.');
  const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
  let id=0,cases=0;const pending=new Map(),errors=[];
  const call=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));});
  ws.addEventListener('message',({data})=>{const message=JSON.parse(data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);
    if(message.method==='Fetch.requestPaused')call('Fetch.failRequest',{requestId:message.params.requestId,errorReason:'BlockedByClient'}).catch(()=>{});
    if(message.id){const p=pending.get(message.id);pending.delete(message.id);message.error?p.reject(message.error):p.resolve(message.result);}});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const wait=async expression=>{for(let i=0;i<180;i++){try{if(await evaluate(expression))return;}catch{}await new Promise(r=>setTimeout(r,50));}throw Error('Timeout: '+expression);};
  const visit=async(route,lang)=>{await call('Page.navigate',{url:origin+route+'?lang='+lang});await wait(`document.readyState==='complete' && document.documentElement.lang==='${lang}'`);};
  const layouts=async(selector)=>{for(const width of [1440,390,320])for(const theme of ['dark','light','dark-simple','light-simple']){await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});await evaluate(`CocTheme.setMode('${theme}')`);assert.equal(await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});return el.scrollWidth>el.clientWidth+1;})()`),false,selector+' '+width+' '+theme);cases++;}};
  const capture=`window.__blobs=[];window.__texts=[];const originalURL=URL.createObjectURL;URL.createObjectURL=blob=>{window.__blobs.push(blob);return originalURL(blob);};HTMLAnchorElement.prototype.click=function(){};const originalText=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.__texts.push(String(text));return originalText.call(this,text,...args);};`;
  try{
    await call('Page.enable');await call('Runtime.enable');await call('Fetch.enable',{patterns:[{urlPattern:'https://*',requestStage:'Request'}]});
    for(const lang of ['id','en']){
      await visit('/player.html',lang);await wait("typeof renderProfile==='function' && window.ProfileExport");
      await evaluate(`renderProfile(${JSON.stringify(fixture.profiles[19])});document.getElementById('playerNewEntities').open=true;`);
      assert.equal(await evaluate("document.querySelector('#townHall img').getAttribute('src')"),'/assets/images/town-hall/th-19.webp');
      assert.equal(await evaluate("document.getElementById('playerNewEntities').textContent.includes('entities.')"),false);
      await evaluate(capture);await evaluate("document.getElementById('exportPlayerCsv').click()");
      const csv=await evaluate('window.__blobs[0].text()');assert.ok(csv.includes('2026-11-17.2'));assert.ok(csv.includes(lang==='en'?'Partial':'Parsial'));
      const imageResults=await evaluate(`Promise.all(${JSON.stringify(art.assets.map(item=>'/assets/images/'+item.output))}.map(src=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img.naturalWidth>0);img.onerror=()=>resolve(false);img.src=src;})))`);assert.ok(imageResults.every(Boolean));
      for(const width of [1440,390,320])for(const theme of ['dark','light','dark-simple','light-simple']){
        await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});await evaluate(`CocTheme.setMode('${theme}')`);
        assert.equal(await evaluate("document.getElementById('playerNewEntities').scrollWidth>document.getElementById('playerNewEntities').clientWidth+1"),false);cases++;
      }
      await visit('/compare.html',lang);await wait("typeof exportPng==='function' && window.ProfileExport");
      await evaluate(`profiles.left=${JSON.stringify(fixture.profiles[19])};profiles.right=${JSON.stringify(fixture.profiles[18])};renderCard('left',profiles.left);renderCard('right',profiles.right);sharedTrend=[{date:'2026-11-15',left:{trophies:0,donations:0},right:{trophies:1,donations:0}},{date:'2026-11-16',left:{trophies:1,donations:1},right:{trophies:2,donations:1}}];`);
      await evaluate(capture);await evaluate('exportCsv();exportPng()');await wait('window.__blobs.length===2');
      const comparisonCsv=await evaluate('window.__blobs[0].text()');assert.ok(comparisonCsv.includes('2026-11-17.2'));assert.ok(comparisonCsv.split('\r\n').filter(Boolean).every(line=>(line.match(/"(?:[^"]|"")*"/g)||[]).length===18));
      assert.ok((await evaluate('window.__texts.join("\\n")')).includes('2026-11-17.2'));
      assert.ok((await evaluate('window.__texts.join("\\n")')).includes(lang==='en'?'Partial':'Parsial'));
      assert.deepEqual(await evaluate('(async()=>{const b=await __blobs[1].arrayBuffer(),v=new DataView(b);return [__blobs[1].type,v.getUint32(16),v.getUint32(20)];})()'),['image/png',1200,770]);
      await layouts('.compare-card');
      await visit('/clan.html',lang);await wait("typeof addTownHallCell==='function' && window.ClanWarMap");
      await evaluate(`const row=document.createElement('tr');document.getElementById('healthTable').replaceChildren(row);addTownHallCell(row,19);ClanWarMap.render(${JSON.stringify(fixture.war)});`);
      assert.equal(await evaluate("document.querySelector('#healthTable .town-hall-cell img').getAttribute('src')"),'/assets/images/town-hall/th-19.webp');
      assert.ok(await evaluate("document.querySelector('#warMapBoards img[src$=\"th-19.webp\"]')!==null"));
      await evaluate("for(let el=document.getElementById('warMapBoards');el&&el!==document.body;el=el.parentElement){el.hidden=false;el.classList.remove('hidden');}");
      await layouts('#warMapBoards');
      await visit('/tools/zapquake',lang);await wait("!document.getElementById('zapInputs').disabled && document.querySelectorAll('#zapCatalog .zap-target-card').length>1");
      await evaluate("for(const id of ['zapTownHall','zapDefenderTH']){document.getElementById(id).value='19';document.getElementById(id).dispatchEvent(new Event('change',{bubbles:true}));}");
      await wait("document.querySelectorAll('#zapCatalog .zap-target-card').length===2 && document.getElementById('zapCatalog').getAttribute('aria-busy')==='false'");
      assert.equal(await evaluate("document.querySelector('[data-target=spiky-tower] img').getAttribute('src')"),'/assets/images/zapquake/spiky-tower-2.webp');
      assert.equal(await evaluate("document.getElementById('zapTH19Coverage').hidden"),false);
      await layouts('#zapCatalog');
    }
    await evaluate("fetch('/__test/baseline').then(()=>document.getElementById('zapRetry').click())");await wait("document.getElementById('zapDataVersion').textContent.includes('2026-11-04.5') && !document.getElementById('zapInputs').disabled");
    assert.equal(await evaluate("[...document.getElementById('zapDefenderTH').options].some(item=>item.value==='19')"),false);
    assert.equal(errors.length,0,JSON.stringify(errors));console.log(`TH19 browser gate passed: ${cases} cross-page layout cases, eight decoded assets, ID/EN exports, clan/war map, calculator and simulated rollback.`);
  }finally{ws.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
