(() => {
  const el=id=>document.getElementById(id),dialog=el('rankedGameDialog'),frame=el('rankedGameFrame'),mode=el('rankedLogMode');
  if(!dialog||!frame||!mode)return;
  const tr=(...args)=>window.CocI18n.t(...args);
  const keys=['player.attacks','player.defenses','player.defenseBonus','player.unavailable','player.close','player.trophies','player.stars','player.destruction',
    'player.loadingBattleLog','player.noAttackHistory','player.noDefenseHistory','game.tabs','game.total','game.leaderboard','game.battleLog','game.leagueHistory','game.townHalls','game.grid','game.list','game.emptySlot','game.opponent','game.details','game.time'];
  let player=null,data=null,message='',loading=false,exporting=false,imageFile=null,imageUrl=null;
  const imageDialog=el('rankedImageDialog');
  function clearImage(){
    if(imageUrl)URL.revokeObjectURL(imageUrl);
    imageUrl=null;imageFile=null;el('rankedImagePreview').removeAttribute('src');
  }
  imageDialog.addEventListener('close',clearImage);
  el('rankedImageClose').addEventListener('click',()=>imageDialog.close());
  el('rankedImageDownload').addEventListener('click',()=>{
    if(!imageFile||!imageUrl)return;
    const link=document.createElement('a');link.href=imageUrl;link.download=imageFile.name;link.click();
  });
  el('rankedImageShare').addEventListener('click',async()=>{
    if(!imageFile)return;
    if(!navigator.canShare?.({files:[imageFile]})||!navigator.share){el('rankedImageStatus').textContent=tr('game.shareFallback');return;}
    el('rankedImageShare').disabled=true;
    try{await navigator.share({files:[imageFile]});el('rankedImageStatus').textContent='';}
    catch(error){if(error.name!=='AbortError')el('rankedImageStatus').textContent=tr('game.shareError');}
    finally{el('rankedImageShare').disabled=false;}
  });
  el('rankedGameExport').addEventListener('click',async()=>{
    if(!data||loading||exporting)return;
    const selected=data,selectedPlayer=player;
    exporting=true;el('rankedGameExport').disabled=true;frame.style.pointerEvents='none';
    dialog.setAttribute('aria-busy','true');
    for(const id of ['rankedGameSession','rankedGameOrder','rankedGameZoom'])el(id).disabled=true;
    el('rankedGameStatus').textContent=tr('game.preparing');
    try{
      const blob=await frame.contentWindow.RankedGameExport();
      if(data!==selected||player!==selectedPlayer||!dialog.open)return;
      clearImage();
      const session=String(selected.session?.id||'session').replace(/[^a-z0-9-]/gi,'');
      const tag=String(selectedPlayer?.tag||'player').replace(/[^a-z0-9]/gi,'');
      const date=String(selected.session?.startTime||selected.session?.startDate||'').replace(/[^a-z0-9-]/gi,'');
      imageFile=new File([blob],`battle-log-${tag}-${session}${date?'-'+date:''}.png`,{type:'image/png'});
      imageUrl=URL.createObjectURL(imageFile);el('rankedImagePreview').src=imageUrl;
      el('rankedImageStatus').textContent=navigator.canShare?.({files:[imageFile]})?'':tr('game.shareFallback');
      imageDialog.showModal();
    }catch(error){el('rankedGameStatus').textContent=tr('game.exportError');}
    finally{exporting=false;frame.style.pointerEvents='';dialog.removeAttribute('aria-busy');sessions();
      for(const id of ['rankedGameOrder','rankedGameZoom'])el(id).disabled=false;
      el('rankedGameExport').disabled=!data||loading;
      if(imageDialog.open)el('rankedGameStatus').textContent=tr('game.fullLogNote');
    }
  });
  function sessions(){
    const source=el('rankedBattleSession'),target=el('rankedGameSession');
    target.replaceChildren(...[...source.options].filter(option=>['current','previous'].includes(option.value)).map(option=>option.cloneNode(true)));
    target.value=source.value;target.disabled=target.options.length<2;
  }
  function send(){
    if(!dialog.open||!frame.getAttribute('src'))return;
    sessions();
    el('rankedGameExport').disabled=!data||loading||exporting;
    el('rankedGameContext').textContent=[player?.name,el('rankedBattleSession').selectedOptions[0]?.textContent].filter(Boolean).join(' · ');
    const prepared=data?window.RankedGameModel.prepare(data,el('rankedGameOrder').value):null;
    el('rankedGameStatus').textContent=loading?tr('player.loadingBattleLog'):message||(prepared?.partial?tr('compare.rankedPartial'):tr('game.fullLogNote'));
    frame.contentWindow?.postMessage({type:'ranked-game-render',lang:document.documentElement.lang,locale:window.CocI18n.formatLocale,
      labels:Object.fromEntries(keys.map(key=>[key,tr(key)])),player:player?{name:player.name,tag:player.tag}:null,data,
      loading,message,zoom:el('rankedGameZoom').value,order:el('rankedGameOrder').value},location.origin);
  }
  function open(){
    if(!data){mode.value='standard';return;}
    el('rankedGameOrder').value=['oldest','latest'].includes(el('rankedLogSort').value)?el('rankedLogSort').value:'oldest';
    if(!dialog.open)dialog.showModal();
    document.body.classList.add('ranked-game-open');mode.value='game';
    if(!frame.getAttribute('src'))frame.src='/battle-log-style/player-view.html';
    send();
  }
  mode.addEventListener('change',()=>{if(mode.value==='game')open();});
  el('closeRankedGame').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{document.body.classList.remove('ranked-game-open');mode.value='standard';(!mode.disabled?mode:el('rankedBattleSession')).focus({preventScroll:true});});
  frame.addEventListener('load',send);
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
    if(event.data?.type==='ranked-game-ready')send();
    if(event.data?.type==='ranked-game-close'&&dialog.open)dialog.close();
  });
  el('rankedGameSession').addEventListener('change',event=>{
    el('rankedBattleSession').value=event.target.value;
    el('rankedBattleSession').dispatchEvent(new Event('change'));
  });
  for(const id of ['rankedGameZoom','rankedGameOrder'])el(id).addEventListener('change',send);
  window.RankedGame={
    reset(value){if(imageDialog.open)imageDialog.close();clearImage();if(dialog.open)dialog.close();frame.removeAttribute('src');player=value;data=null;message='';loading=false;mode.value='standard';mode.disabled=true;},
    loading(){data=null;loading=true;message='';mode.disabled=true;send();},
    render(value){data=value;loading=false;message='';mode.disabled=false;send();},
    unavailable(value){data=null;loading=false;message=value;mode.disabled=true;send();}
  };
})();
