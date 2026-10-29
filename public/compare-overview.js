(() => {
  const el=id=>document.getElementById(id),tr=(...args)=>window.CocI18n.t(...args);
  const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
  const number=value=>value==null?'—':window.CocI18n.number(value,{maximumFractionDigits:2});
  const percent=value=>value==null?'—':number(value)+'%';
  const signed=value=>value==null?'—':(value>0?'+':'')+number(value);
  const date=value=>{const d=window.CompareModel.parseWarDate(value);return d?window.CocI18n.dateTime(d,{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'';};
  function session(data){
    if(!data?.session)return tr('compare.overviewUnavailable');
    return [tr(data.session.id==='previous'?'player.sessionPrevious':'player.sessionCurrent'),data.session.seasonId>0?date(Number(data.session.seasonId)*1000):'',data.leagueTier].filter(Boolean).join(' · ');
  }
  function paint(card,context){
    const root=el('overviewScore');let article=root.querySelector(`[data-overview-card="${card.id}"]`);
    if(!article){
      article=node('article',null,'comparison-aspect-card');article.dataset.overviewCard=card.id;
      const head=node('div',null,'comparison-aspect-head'),image=node('img');image.src='/assets/profile/'+card.icon+'.svg';image.alt='';image.width=36;image.height=36;
      head.append(image,node('h3',card.title),node('span','','comparison-aspect-badge'));
      const metric=node('p',card.metric,'comparison-aspect-metric'),pair=node('div',null,'comparison-aspect-pair');
      for(const side of ['left','right']){
        const box=node('div',null,'comparison-aspect-player '+side);box.dataset.overviewSide=side;
        box.append(node('span','','comparison-aspect-name'),node('strong','','comparison-aspect-value'));
        if(card.id==='ranked')box.append(node('small','','comparison-aspect-rank'));
        box.append(node('small','','comparison-aspect-detail'));pair.append(box);
      }
      const footer=node('nav',null,'comparison-aspect-links');footer.setAttribute('aria-label',card.title);
      for(const [target,label] of card.links){
        const link=node('a',label);link.href='#'+target;
        link.addEventListener('click',event=>{
          if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;
          event.preventDefault();context.activate('#'+target);
          history.replaceState(null,'','#'+target);
          const tab=document.querySelector(`.compare-tabs [data-tab="${target}"]`);tab?.focus({preventScroll:true});document.querySelector('.compare-tab-toolbar')?.scrollIntoView({block:'start'});
        });footer.append(link);
      }
      article.append(head,metric,pair,node('p','','comparison-aspect-context'),footer);root.append(article);
    }
    const badge=article.querySelector('.comparison-aspect-badge');badge.textContent=card.badge;badge.dataset.state=card.state;
    article.querySelector('.comparison-aspect-metric').textContent=card.metric;
    for(const side of ['left','right']){
      const box=article.querySelector(`[data-overview-side="${side}"]`);
      box.querySelector('.comparison-aspect-name').textContent=context.names[side];
      box.querySelector('.comparison-aspect-value').textContent=card.values[side];
      if(card.ranks)box.querySelector('.comparison-aspect-rank').textContent=tr('compare.groupRank')+': '+card.ranks[side];
      box.querySelector('.comparison-aspect-detail').textContent=card.details[side];
    }
    article.querySelector('.comparison-aspect-context').textContent=card.context;
  }
  function render(context){
    const view=window.CompareOverviewModel.build(context),p=view.progress,w=view.war,r=view.ranked,a=view.activity;
    const details=tr('compare.overviewDetails'),unavailable=tr('compare.overviewUnavailable');
    const names=context.names,sides=['left','right'];
    const map=fn=>Object.fromEntries(sides.map(side=>[side,fn(side)]));
    const progress={id:'progress',icon:'progress',title:tr('compare.overviewProgress'),metric:tr('player.progressScore'),
      values:map(side=>percent(p.values[side].score)),details:map(side=>'TH '+number(p.values[side].th)),
      badge:tr(p.comparable?'compare.overviewComparable':'compare.overviewPartial'),state:p.comparable?'ready':'partial',
      context:p.comparable?tr('compare.overviewCategoryCounts',{left:p.categories.left,right:p.categories.right,equal:p.categories.equal,total:p.categories.compared}):tr('compare.overviewProgressScope'),
      links:[['progress',tr('compare.overviewProgressLink')],['army',tr('compare.overviewArmyLink')]]};
    const war={id:'war',icon:'status',title:'War & CWL',metric:tr('player.starsPerAttack'),
      values:map(side=>number(w.values[side]?.starsPerAttack)),details:map(side=>w.values[side]?tr('compare.overviewWarSample',{destruction:percent(w.values[side].destructionAverage),attacks:number(w.values[side].attacks),wars:number(w.values[side].wars)}):unavailable),
      badge:tr(w.partial?'compare.overviewLimitedSample':'compare.overviewSelectedPeriod'),state:w.partial?'partial':'ready',
      context:tr('compare.overviewWarPeriod',{period:context.warPeriodLabel}),links:[['war-cwl',details]]};
    const legendPrevious=sides.some(side=>context.profiles[side]?.player?.leagueTier?.name==='Legend I'&&context.league[side]?.session?.id==='previous');
    const legendMissing=sides.some(side=>context.profiles[side]?.player?.leagueTier?.name==='Legend I'&&!context.league[side]);
    const ranked={id:'ranked',icon:'trophy-purple',title:'Ranked League',metric:tr('player.totalTrophies'),
      ranks:map(side=>{
        const data=context.league[side],rank=Number(data?.playerRank),total=Number(data?.totalMembers);
        return Number.isInteger(rank)&&rank>0?'#'+number(rank)+(Number.isInteger(total)&&total>0?' / '+number(total):''):'—';
      }),
      values:map(side=>number(r.values[side]?.totalTrophies)),details:map(side=>r.values[side]?tr('compare.overviewRankedPoints',{attack:number(r.values[side].attack.points),defense:number(r.values[side].defense.totalPoints)}):unavailable),
      badge:tr(r.sameSeason?'compare.overviewSameSeason':context.league.left&&context.league.right?'compare.overviewDifferentSeason':'compare.overviewUnavailable'),state:r.sameSeason&&!r.partial?'ready':'partial',
      context:sides.map(side=>names[side]+': '+session(context.league[side])).join(' · ')+(r.partial?' · '+tr('compare.overviewPartial'):'')+(legendPrevious?' · '+tr('compare.overviewLegendPrevious'):'')+(legendMissing?' · '+tr('compare.overviewLegendMissing'):''),links:[['ranked-league',details]]};
    const activity={id:'activity',icon:'xp',title:tr('compare.activity'),metric:tr(a.metric==='donations'?'compare.overviewDonationDelta':'compare.overviewTrophyDelta'),
      values:map(side=>signed(a.values[side].delta)),details:map(side=>a.values[side].reset?tr('compare.overviewReset'):tr('compare.overviewObservationCount',{count:number(a.count)})),
      badge:tr(a.partial?'compare.overviewInsufficient':'compare.overviewSharedDates'),state:a.partial?'partial':'ready',
      context:a.count>=2?tr('compare.overviewDateRange',{from:date(a.from+'T00:00:00Z'),to:date(a.to+'T00:00:00Z')}):tr('compare.overviewActivityScope'),links:[['activity',details]]};
    for(const card of [progress,war,ranked,activity])paint(card,context);
    el('overviewConclusion').textContent=!context.profiles.left||!context.profiles.right?tr('compare.completeForOverview'):tr('compare.overviewScope');
  }
  window.CompareOverview={render};
})();
