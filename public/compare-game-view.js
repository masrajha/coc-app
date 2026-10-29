(() => {
  const root=document.getElementById('comparisonImage'),stage=document.getElementById('comparisonStage');
  let payload=null,revision=0;
  const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
  const tr=key=>payload.labels[key]||key;
  const num=value=>value==null?'—':new Intl.NumberFormat(payload.locale,{maximumFractionDigits:2}).format(value);
  const points=value=>value==null?'—':(value>0?'+':'')+num(value);
  const trophy=()=>{const img=node('img',null,'demo-trophy');img.src='/assets/trophy.png';img.alt='';img.width=24;img.height=29;return img;};
  function star(active){
    const e=node('span',null,'coc-ref-star');
    e.innerHTML=`<svg viewBox="0 0 35 35" aria-hidden="true"><path d="M17.5 2.2 22.5 12l10.8 1.5-7.9 7.6 1.9 10.8-9.8-5.1-9.8 5.1 1.9-10.8-7.9-7.6L12.5 12Z" fill="${active?'#bedce7':'#9c9693'}" stroke="#373435" stroke-width="2.1" stroke-linejoin="round"/></svg>`;
    return e;
  }
  function card(log){
    const e=node('div',null,'coc-ref-card'+(log.bonus?' blue':log.stars===3?log.side==='attack'?' gold':' red':''));
    const score=node('div',points(log.points),'coc-ref-score');score.append(trophy());e.append(score);
    if(log.bonus){e.append(node('small',tr('player.defenseBonus'),'comparison-bonus'));return e;}
    const stars=node('div',null,'coc-ref-stars');
    if(log.stars==null)stars.textContent='—';else for(let i=0;i<3;i++)stars.append(star(i<log.stars));
    e.append(stars,node('small',log.destruction==null?'—':num(log.destruction)+'%','comparison-destruction'));return e;
  }
  function session(data){
    if(!data?.session)return tr('compare.sessionUnavailable');
    const date=window.RankedGameModel.time(Number(data.session.seasonId));
    return tr(data.session.id==='previous'?'player.sessionPrevious':'player.sessionCurrent')+
      (date?' · '+new Intl.DateTimeFormat(payload.locale,{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(date):'');
  }
  function leagueBadge(tier){
    const families=[['legend','legend'],['electro','electro-dragon'],['titan','electro-titan'],['dragon','dragon'],['pekka','pekka'],['p.e.k.k.a','pekka'],['golem','golem'],['witch','witch'],['valkyrie','valkyrie'],['wizard','wizard'],['archer','archer'],['barbarian','barbarian'],['skeleton','skeleton']];
    const family=families.find(([key])=>String(tier).toLowerCase().includes(key));
    if(!family)return null;
    const image=node('img',null,'comparison-league');image.src='/league-'+family[1]+'.png';image.alt='';image.width=64;image.height=64;return image;
  }
  function board(side){
    const source=payload.players[side],data=source.data,view=data?window.RankedGameModel.prepare(data,payload.order):null;
    const board=node('section',null,'comparison-player'),head=node('header',null,'comparison-player-head');
    const badge=leagueBadge(data?.leagueTier);if(badge)head.append(badge);
    const identity=node('div',null,'comparison-identity');identity.append(node('h2',source.name),node('p',data?.leagueTier||tr('compare.tierUnavailable')),node('small',session(data)));head.append(identity);
    board.append(head);
    const stats=node('div',null,'comparison-summary');
    const add=(label,value)=>{const box=node('div');box.append(node('small',tr(label)),node('strong',value));stats.append(box);};
    add('compare.groupRank',data?.playerRank?'#'+num(data.playerRank)+' / '+num(data.totalMembers):'—');
    add('player.totalTrophies',view?num(view.total):'—');
    add('player.attackPoints',view?points(view.attack.points):'—');add('player.defensePoints',view?points(view.defense.points):'—');
    add('compare.starsPerAttack',data?.attack?.starsAverage==null?'—':num(data.attack.starsAverage));
    add('compare.attackDestruction',data?.attack?.destructionAverage==null?'—':num(data.attack.destructionAverage)+'%');
    board.append(stats);
    if(!data){board.append(node('p',tr(source.loading?'compare.loadingRanked':'player.battleLogUnavailable'),'comparison-empty'));return board;}
    board.append(node('p',tr(data.stale?'compare.rankedCached':view.partial?'compare.rankedPartial':'compare.gameComplete'),'comparison-quality'));
    for(const type of payload.mode==='all'?['attack','defense']:[payload.mode]){
      const section=node('section',null,'comparison-log-section'),heading=node('h3');
      heading.append(node('span',tr(type==='attack'?'player.attacks':'player.defenses')),node('span',points(view[type].points)));heading.append(trophy());section.append(heading);
      const grid=node('div',null,'coc-ref-grid');grid.append(...view[type].logs.map(card));
      if(!view[type].logs.length){
        const knownZero=Number(data.player?.[type+'Count'])===0&&data.player?.[type+'Count']!=null;
        section.append(node('p',tr(knownZero?(type==='attack'?'player.noAttackHistory':'player.noDefenseHistory'):'player.battleLogUnavailable'),'comparison-empty'));
      }else section.append(grid);
      board.append(section);
    }
    return board;
  }
  function resize(){const scale=Math.min(1,(document.documentElement.clientWidth-24)/1440);root.style.transform=`scale(${scale})`;stage.style.width=1440*scale+'px';stage.style.height=root.offsetHeight*scale+'px';}
  function render(){
    if(!payload)return;revision++;document.documentElement.lang=payload.lang;
    root.replaceChildren();
    const header=node('header',null,'comparison-heading');header.append(node('p','RANKED LEAGUE'),node('h1',tr('compare.gameTitle')));
    const left=payload.players.left.data,right=payload.players.right.data;
    const same=window.CompareModel.sameLeagueSeason(left,right);
    header.append(node('p',tr(same?'compare.gameSameSession':'compare.gameDifferentSession'),'comparison-context'));
    if(left?.leagueTier&&right?.leagueTier&&left.leagueTier!==right.leagueTier)header.append(node('p',tr('compare.gameDifferentTier'),'comparison-context'));
    root.append(header);
    const columns=node('div',null,'comparison-columns');columns.append(board('left'),board('right'));root.append(columns);
    const footer=node('footer',null,'comparison-footer');
    footer.append(node('strong','ClanIntel'),node('span',tr('compare.gameSequence')));
    const dates=['left','right'].map(side=>window.RankedGameModel.time(payload.players[side].data?.lastUpdated)).filter(value=>value!=null);
    footer.append(node('span',tr(payload.order==='latest'?'player.latest':'player.oldest')+(dates.length?' · '+tr('profile.updatedLabel')+' '+new Intl.DateTimeFormat(payload.locale,{dateStyle:'medium',timeStyle:'short'}).format(Math.max(...dates)):'')));
    root.append(footer);resize();document.fonts.ready.then(resize);
    parent.postMessage({type:'compare-game-rendered',version:payload.version},location.origin);
  }
  window.CompareGameExport=async()=>{
    const selected=revision;
    if(!payload||Object.values(payload.players).some(p=>p.loading))throw new Error('Data loading');
    if(!window.htmlToImage?.toBlob){const e=new Error('Image library unavailable');e.code='IMAGE_LIBRARY_MISSING';throw e;}
    await document.fonts.ready;await Promise.all([...root.querySelectorAll('img')].map(img=>img.decode()));
    const blob=await window.htmlToImage.toBlob(root,{width:1440,height:root.offsetHeight,pixelRatio:1,backgroundColor:'#d4cec2',style:{transform:'none',margin:'0'}});
    if(selected!==revision||!blob?.size)throw new Error('Image changed');return blob;
  };
  window.addEventListener('message',event=>{if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='compare-game-render')return;payload=event.data;render();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')parent.postMessage({type:'compare-game-close'},location.origin);});
  new ResizeObserver(resize).observe(root);window.addEventListener('resize',resize);
  parent.postMessage({type:'compare-game-ready'},location.origin);
})();
