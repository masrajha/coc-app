(() => {
  const tr=(...args)=>window.CocI18n.t(...args);
  const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
  const paths={
    trophy:'M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v5m-4 2h8m-7 0v-2h6v2',
    swords:'m3 3 5 1 11 11-4 4L4 8 3 3Zm11 11 6 6m-6 0 6-6M21 3l-5 1-4 4M3 21l6-6m-5-1 6 6',
    shield:'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm0 4v10',
    gem:'M3 8 7 3h10l4 5-9 13L3 8Zm0 0h18M7 3l5 18 5-18',
    users:'M15 21v-3a5 5 0 0 0-10 0v3m14 0v-3a5 5 0 0 0-3-4M10 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm6 0a4 4 0 0 1 0 8',
    star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9L12 3Z',
    burst:'m12 2 2 6 6-4-3 7 5 2-6 2 3 6-7-3-5 4 1-7-6-2 6-3-1-6 5 4Z',
    chart:'M5 20V12h3v8H5Zm6 0V5h3v15h-3Zm6 0V9h3v11h-3Z'
  };
  const metrics={
    'player.totalTrophies':['trophy','total'], 'player.attackPoints':['swords','attack'],
    'player.defensePoints':['shield','defense'], 'player.defenseBonus':['gem','bonus'],
    'compare.groupRank':['users','rank'], 'compare.rankedAttacksUsed':['swords','attacksUsed'],
    'compare.rankedDefensesUsed':['shield','defensesUsed'], 'compare.rankedAttackAverage':['trophy','attackAverage'],
    'compare.rankedDefenseAverage':['trophy','defenseAverage'], 'compare.rankedAttackTriples':['star','attackTriples'],
    'compare.rankedDefenseTriples':['star','defenseTriples'], 'compare.starsPerAttack':['star','attackStars'],
    'compare.attackDestruction':['burst','attackDestruction'], 'compare.opponentStarsPerDefense':['shield','defenseStars'],
    'compare.defenseDestruction':['burst','defenseDestruction']
  };
  function icon(kind){
    const box=node('span',null,'ranked-metric-icon is-'+kind);box.setAttribute('aria-hidden','true');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    for(const [key,value] of Object.entries({viewBox:'0 0 24 24',width:24,height:24,fill:'none',stroke:'currentColor','stroke-width':1.8,'stroke-linecap':'round','stroke-linejoin':'round'}))svg.setAttribute(key,value);
    const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[kind]||paths.chart);svg.append(path);box.append(svg);return box;
  }
  const portraitAssets=[
    ...['archer-queen','barbarian-king','dragon-duke','grand-warden','minion-prince','royal-champion']
      .map(asset=>'/assets/images/hero/characters/'+asset+'.webp'),
    '/assets/images/optimized/golem.webp'
  ];
  const portraits=new Map();
  function portrait(profile){
    const tag=profile?.player?.tag;
    if(!tag)return '/assets/brand/clanintel-mark.svg';
    const key=String(tag).replace(/^#/,'').toUpperCase();
    if(!portraits.has(key)){
      // Keep each player's random portrait stable during session/filter/language updates.
      const candidates=portraitAssets.filter(asset=>!Array.from(portraits.values()).includes(asset));
      const pool=candidates.length?candidates:portraitAssets;
      portraits.set(key,pool[Math.floor(Math.random()*pool.length)]);
    }
    return portraits.get(key);
  }
  function playerHeading(side,profile,data,name){
    const box=node('div',null,'ranked-player-heading is-'+side);
    const avatar=node('img',null,'ranked-player-avatar');avatar.src=portrait(profile);avatar.alt='';avatar.width=58;avatar.height=58;avatar.decoding='async';
    avatar.onerror=()=>{avatar.onerror=null;avatar.src='/assets/brand/clanintel-mark.svg';};
    const copy=node('div',null,'ranked-player-copy');copy.append(node('strong',name));
    const rank=data?.playerRank!=null?'#'+window.CocI18n.number(data.playerRank)+(data.totalMembers!=null?' / '+window.CocI18n.number(data.totalMembers):''):'—';
    copy.append(node('span',rank,'ranked-player-position'),node('small',data?.leagueTier||tr('compare.tierUnavailable')));
    box.append(avatar,copy);return box;
  }
  function render(root,table,context){
    table.classList.add('ranked-metrics-design');table.caption.classList.add('ranked-table-caption');
    const intro=node('div',null,'ranked-metrics-heading'),copy=node('div');copy.append(node('h3',tr('compare.rankedTableCaption')),node('p',tr('compare.metricLayoutIntro')));intro.append(icon('trophy'),copy);
    const help=node('p',tr('compare.metricLayoutScroll'),'ranked-metrics-scroll-hint');
    const headings=table.tHead.rows[0].cells;
    const metricHead=node('div',null,'ranked-metric-heading'),metricCopy=node('div');metricCopy.append(node('strong',tr('compare.rankedMetric')),node('small',tr('compare.metricLayoutLabel')));metricHead.append(icon('chart'),metricCopy);headings[0].replaceChildren(metricHead);
    ['left','right'].forEach((side,index)=>headings[index+1].replaceChildren(playerHeading(side,context.profiles[side],context.data[side],context.names[side])));
    for(const row of table.tBodies[0].rows){
      const label=row.cells[0],definition=metrics[label.dataset.metric];if(!definition)continue;
      const text=label.textContent,copy=node('div',null,'ranked-metric-copy');copy.append(node('strong',text),node('small',tr(`compare.metricHint.${definition[1]}`)));
      const wrapper=node('div',null,'ranked-metric-label');wrapper.append(icon(definition[0]),copy);label.replaceChildren(wrapper);
    }
    const scroll=node('div',null,'ranked-metrics-scroll');scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label',tr('compare.rankedTableCaption'));scroll.append(table);
    root.append(intro,help,scroll);
  }
  window.RankedMetricsLayout={render};
})();
