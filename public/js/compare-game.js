(() => {
  const el=id=>document.getElementById(id),dialog=el('compareGameDialog'),frame=el('compareGameFrame'),imageDialog=el('compareGameImageDialog');
  if(!dialog||!frame||!imageDialog)return;
  const tr=(...args)=>window.CocI18n.t(...args);
  const keys=['compare.gameTitle','compare.gameComplete','compare.gameSameSession','compare.gameDifferentSession','compare.gameDifferentTier','compare.gameSequence','compare.sessionUnavailable','player.sessionPrevious','player.sessionCurrent','compare.tierUnavailable','compare.groupRank','player.totalTrophies','player.attackPoints','player.defensePoints','compare.starsPerAttack','compare.attackDestruction','compare.loadingRanked','player.battleLogUnavailable','compare.rankedCached','compare.rankedPartial','player.attacks','player.defenses','player.defenseBonus','player.noAttackHistory','player.noDefenseHistory','profile.updatedLabel','player.oldest','player.latest'];
  let source=null,version=0,rendered=-1,busy=false,imageFile=null,imageUrl=null;
  const hasData=()=>source&&['left','right'].some(side=>source.data(side));
  const loading=()=>['left','right'].some(side=>source?.loading(side));
  function clearImage(){if(imageUrl)URL.revokeObjectURL(imageUrl);imageUrl=null;imageFile=null;el('compareGameImagePreview').removeAttribute('src');}
  function refresh(){
    el('openCompareGame').disabled=!hasData();
    if(!dialog.open||!source)return;
    version++;rendered=-1;el('compareGameExport').disabled=true;
    el('compareGameStatus').textContent=tr(loading()?'compare.loadingRanked':'compare.gameExportNote');
    if(imageDialog.open)imageDialog.close();clearImage();
    frame.contentWindow?.postMessage({type:'compare-game-render',version,lang:window.CocI18n.locale,locale:window.CocI18n.formatLocale,
      labels:Object.fromEntries(keys.map(key=>[key,tr(key)])),mode:el('compareGameMode').value,order:el('compareGameOrder').value,
      players:Object.fromEntries(['left','right'].map(side=>[side,{name:source.name(side),data:source.data(side),loading:source.loading(side)}]))},location.origin);
  }
  el('openCompareGame').addEventListener('click',()=>{
    if(!source||el('openCompareGame').disabled)return;
    dialog.showModal();document.body.classList.add('compare-game-open');
    if(!frame.getAttribute('src'))frame.src='/battle-log-style/compare-view.html';refresh();
  });
  el('closeCompareGame').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{document.body.classList.remove('compare-game-open');el('openCompareGame').focus({preventScroll:true});});
  frame.addEventListener('load',refresh);
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
    if(event.data?.type==='compare-game-ready')refresh();
    if(event.data?.type==='compare-game-rendered'&&event.data.version===version){rendered=version;el('compareGameExport').disabled=busy||loading()||!hasData();}
    if(event.data?.type==='compare-game-close'&&dialog.open)dialog.close();
  });
  for(const id of ['compareGameMode','compareGameOrder'])el(id).addEventListener('change',refresh);
  el('compareGameExport').addEventListener('click',async()=>{
    if(busy||loading()||!hasData()||rendered!==version)return;
    const selected=version;busy=true;el('compareGameExport').disabled=true;dialog.setAttribute('aria-busy','true');
    for(const id of ['compareGameMode','compareGameOrder'])el(id).disabled=true;
    el('compareGameStatus').textContent=tr('game.preparing');
    try{
      const blob=await frame.contentWindow.CompareGameExport();
      if(!dialog.open||selected!==version)return;
      clearImage();
      imageFile=new File([blob],`clanintel-ranked-compare-${el('compareGameMode').value}-${Date.now()}.png`,{type:'image/png'});
      imageUrl=URL.createObjectURL(imageFile);el('compareGameImagePreview').src=imageUrl;
      el('compareGameImageStatus').textContent=navigator.canShare?.({files:[imageFile]})?'':tr('game.shareFallback');
      imageDialog.showModal();el('compareGameStatus').textContent=tr('compare.gameExportNote');
    }catch(error){el('compareGameStatus').textContent=tr(error.code==='IMAGE_LIBRARY_MISSING'?'game.libraryMissing':'game.exportError');}
    finally{busy=false;dialog.removeAttribute('aria-busy');for(const id of ['compareGameMode','compareGameOrder'])el(id).disabled=false;el('compareGameExport').disabled=rendered!==version||loading()||!hasData();}
  });
  el('closeCompareGameImage').addEventListener('click',()=>imageDialog.close());imageDialog.addEventListener('close',clearImage);
  el('downloadCompareGame').addEventListener('click',()=>{if(!imageFile||!imageUrl)return;const link=document.createElement('a');link.href=imageUrl;link.download=imageFile.name;link.click();});
  el('shareCompareGame').addEventListener('click',async()=>{
    if(!imageFile)return;
    if(!navigator.canShare?.({files:[imageFile]})||!navigator.share){el('compareGameImageStatus').textContent=tr('game.shareFallback');return;}
    el('shareCompareGame').disabled=true;
    try{await navigator.share({files:[imageFile]});el('compareGameImageStatus').textContent='';}
    catch(error){if(error.name!=='AbortError')el('compareGameImageStatus').textContent=tr('game.shareError');}
    finally{el('shareCompareGame').disabled=false;}
  });
  window.CompareGame={configure(options){source=options;refresh();},refresh};
})();
