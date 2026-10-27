(() => {
  const el=id=>document.getElementById(id),root=el('reference');
  let payload=null,locale='id-ID',labels={};
  const tr=key=>labels[key]||key;
  const number=value=>value===null||value===undefined?'—':new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(value);
  const points=value=>value===null?'—':(value>0?'+':'')+number(value);
  const node=(tag,text,className)=>{const result=document.createElement(tag);if(text!=null)result.textContent=text;if(className)result.className=className;return result;};
  function resize(){
    if(el('demoViewport').hidden)return;
    const available=el('demoViewport').clientWidth-(innerWidth<=700?16:24);
    const zoom=payload?.zoom==='fit'?Math.min(1,available/1440):Number(payload?.zoom)||1;
    root.style.transform=`scale(${zoom})`;el('demoStage').style.width=1440*zoom+'px';el('demoStage').style.height=root.offsetHeight*zoom+'px';
  }
  function star(active){
    const span=node('span',null,'coc-ref-star');span.innerHTML=`<svg viewBox="0 0 35 35" aria-hidden="true"><path d="M17.5 2.2 22.5 12l10.8 1.5-7.9 7.6 1.9 10.8-9.8-5.1-9.8 5.1 1.9-10.8-7.9-7.6L12.5 12Z" fill="${active?'#a3c7d8':'#8f8b8c'}" stroke="#373435" stroke-width="2.1" stroke-linejoin="round"/><path d="M17.5 5.8 21 14l8.5 1-6.2 6 1.3 7.1-7.1-3.9-7.1 3.9 1.3-7.1-6.2-6 8.5-1Z" fill="${active?'#bedce7':'#a29c9d'}" opacity=".7"/></svg>`;return span;
  }
  function details(log){
    el('demoDetailsTitle').textContent=tr('game.details');el('demoDetails').querySelector('button').setAttribute('aria-label',tr('player.close'));
    const date=log.time===null||log.time===undefined?'—':new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(log.time);
    const pairs=[['game.opponent',log.bonus?tr('player.defenseBonus'):log.opponentName||log.opponentTag||'—'],['player.trophies',points(log.points)],
      ['player.stars',log.stars===null?'—':number(log.stars)+' / 3'],['player.destruction',log.destruction===null?'—':number(log.destruction)+'%'],['game.time',date]];
    el('demoDetailsValues').replaceChildren();for(const [key,value] of pairs)el('demoDetailsValues').append(node('dt',tr(key)),node('dd',value));
    el('demoDetails').showModal();
  }
  function card(log){
    const button=node('button');button.type='button';button.className='coc-ref-card'+(log.bonus?' blue no-stars':log.stars===3?log.side==='attack'?' gold':' red':'');
    const name=log.bonus?tr('player.defenseBonus'):log.opponentName||log.opponentTag||tr('player.unavailable');
    const percentage=log.bonus?'':log.destruction===null?'—':number(log.destruction)+'%';
    button.title=[name,percentage,log.stars===null?'':number(log.stars)+' / 3',points(log.points)+' '+tr('player.trophies')].filter(Boolean).join(' · ');button.setAttribute('aria-label',button.title);
    button.append(node('span',name,'demo-row-name'),node('span',percentage,'demo-row-percent'));
    const score=node('div',points(log.points),'coc-ref-score'),image=node('img',null,'demo-trophy');image.src='/assets/trophy.png';image.alt='';image.width=23;image.height=29;score.append(image);button.append(score);
    if(!log.bonus){const stars=node('div',null,'coc-ref-stars');stars.setAttribute('aria-hidden','true');if(log.stars===null)stars.append(node('span','—','game-unknown'));else for(let i=0;i<3;i++)stars.append(star(i<log.stars));button.append(stars);}
    button.addEventListener('click',()=>details(log));return button;
  }
  function render(){
    if(!payload)return;
    labels=payload.labels||{};locale=payload.locale||'id-ID';document.documentElement.lang=payload.lang==='en'?'en':'id';
    if(el('demoDetails').open)el('demoDetails').close();
    el('gameMessage').classList.toggle('is-loading',Boolean(payload.loading));
    if(!payload.data){el('demoViewport').hidden=true;el('gameMessage').textContent=payload.loading?tr('player.loadingBattleLog'):payload.message||tr('player.unavailable');return;}
    el('gameMessage').textContent='';el('demoViewport').hidden=false;
    const data=payload.data,view=window.RankedGameModel.prepare(data,payload.order);
    root.setAttribute('aria-label',tr('game.battleLog'));root.querySelector('.coc-ref-tabs').setAttribute('aria-label',tr('game.tabs'));
    root.querySelector('.coc-ref-window').setAttribute('aria-label',tr('game.battleLog'));
    root.querySelectorAll('.coc-ref-head .demo-trophy').forEach(image=>image.alt=tr('player.trophies'));
    root.querySelectorAll('.coc-ref-tab').forEach((button,index)=>button.textContent=tr(['game.leaderboard','game.battleLog','game.leagueHistory','game.townHalls'][index]));
    el('demoClose').setAttribute('aria-label',tr('player.close'));el('demoList').setAttribute('aria-label',tr('game.list'));el('demoGrid').setAttribute('aria-label',tr('game.grid'));
    el('demoPlayer').textContent=(data.playerRank?'#'+number(data.playerRank):'—')+' '+(payload.player?.name||payload.player?.tag||'—');
    const total=root.querySelector('.coc-ref-total');total.firstChild.textContent=tr('game.total')+': ';el('demoTotal').textContent=number(view.total);
    root.querySelectorAll('.coc-ref-stat>span:first-child').forEach((span,index)=>span.textContent=tr(index===0?'player.attacks':'player.defenses'));
    el('demoAttackTotal').textContent=points(view.attack.points);el('demoDefenseTotal').textContent=points(view.defense.points);
    for(const side of ['attack','defense']){
      const grid=el(side==='attack'?'demoAttackGrid':'demoDefenseGrid');grid.replaceChildren(...view[side].logs.map(card));
      if(!view[side].logs.length)grid.append(node('p',tr(side==='attack'?'player.noAttackHistory':'player.noDefenseHistory'),'game-list-empty-note'));
      if(!view[side].logs.length&&!view.quota)grid.append(node('p',tr('player.unavailable'),'game-unknown'));
      for(let index=view[side].logs.length;index<(view.quota||0);index++){
        const empty=node('button',null,'coc-ref-card game-empty');empty.type='button';empty.disabled=true;empty.setAttribute('aria-label',tr('game.emptySlot'));empty.title=tr('game.emptySlot');empty.append(node('span',tr('game.emptySlot'),'demo-row-name'));grid.append(empty);
      }
    }
    resize();document.fonts.ready.then(resize);
  }
  window.RankedGameExport=async()=>{
    if(!payload?.data||payload.loading||el('demoViewport').hidden)throw new Error('No battle data');
    if(!window.htmlToImage?.toBlob){const error=new Error('Image export library unavailable');error.code='IMAGE_LIBRARY_MISSING';throw error;}
    await document.fonts.ready;
    await Promise.all([...root.querySelectorAll('img')].map(image=>image.decode()));
    const blob=await window.htmlToImage.toBlob(root,{
      width:1440,height:root.offsetHeight,pixelRatio:1,backgroundColor:'#655448',
      style:{transform:'none',transformOrigin:'top left',margin:'0'},
      filter:element=>element.id!=='demoDetails'
    });
    if(!blob||!blob.size)throw new Error('Empty image');
    return blob;
  };
  const close=()=>parent.postMessage({type:'ranked-game-close'},location.origin);
  el('demoClose').addEventListener('click',close);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!el('demoDetails').open){event.preventDefault();close();}});
  for(const [id,list] of [['demoList',true],['demoGrid',false]])el(id).addEventListener('click',()=>{
    root.classList.toggle('coc-ref-list',list);el('demoList').setAttribute('aria-pressed',String(list));el('demoGrid').setAttribute('aria-pressed',String(!list));resize();
  });
  root.querySelectorAll('.coc-ref-tab').forEach(button=>button.addEventListener('click',()=>root.querySelectorAll('.coc-ref-tab').forEach(tab=>tab.setAttribute('aria-pressed',String(tab===button)))));
  window.addEventListener('message',event=>{if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='ranked-game-render')return;payload=event.data;render();});
  window.addEventListener('resize',resize);new ResizeObserver(resize).observe(root);
  parent.postMessage({type:'ranked-game-ready'},location.origin);
})();
