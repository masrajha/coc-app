(() => {
  const el = id => document.getElementById(id);
  const tr = (key, values) => window.CocI18n.t(key, values);
  const numeric = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
  const number = value => value === null ? '—' : window.CocI18n.number(value, {maximumFractionDigits:2});
  const heroAssets = {
    'Archer Queen':'archer-queen', 'Barbarian King':'barbarian-king',
    'Dragon Duke':'dragon-duke', 'Grand Warden':'grand-warden',
    'Minion Prince':'minion-prince', 'Royal Champion':'royal-champion'
  };
  function topHeroes(player, progress) {
    const scored = progress?.score?.categories?.heroes?.items || [];
    const candidates = Object.entries(heroAssets).flatMap(([name, asset]) => {
      const item = scored.find(hero => hero.name === name) || player?.heroes?.find(hero => hero.name === name && hero.village !== 'builderBase');
      const level = numeric(item?.level), maximum = numeric(item?.maxLevel);
      return level !== null && level > 0 && maximum !== null && maximum > 0
        ? [{name, asset, ratio:Math.min(1,level/maximum)}] : [];
    });
    const best = Math.max(...candidates.map(hero => hero.ratio));
    return candidates.filter(hero => Math.abs(hero.ratio-best) < 1e-10);
  }
  function chooseHero(player, progress, random = Math.random) {
    const candidates = topHeroes(player, progress);
    return candidates.length ? candidates[Math.min(candidates.length-1,Math.max(0,Math.floor(random()*candidates.length)))] : null;
  }
  let previousHero = null;
  function renderHero(player, progress) {
    const picture = document.getElementById('profileHeroCharacter');
    if (!picture) return;
    const candidates = topHeroes(player, progress);
    const key = JSON.stringify([player.tag, candidates]);
    if (previousHero?.key !== key) previousHero = {key, hero:chooseHero(player, progress)};
    const hero = previousHero.hero;
    const artwork = picture.closest('.profile-hero-art');
    artwork.hidden = !hero;
    if (!hero) {picture.removeAttribute('src');return;}
    picture.src = '/assets/images/hero/characters/' + hero.asset + '.webp';
    picture.dataset.hero = hero.name;
    picture.onerror = () => {artwork.hidden = true;};
  }
  const node = (tag, text, className) => {
    const item = document.createElement(tag); if (text !== undefined) item.textContent = text; if (className) item.className = className; return item;
  };
  function model(progress) {
    const known = Object.values(progress?.score?.categories || {}).reduce((sum, category) => sum + Math.max(0, numeric(category?.knownItems) ?? 0), 0);
    const counts = Object.fromEntries(['heroes','troops','spells','pets'].map(category => [category, Math.max(0, numeric(progress?.score?.categories?.[category]?.knownItems) ?? 0)]));
    // expectedItems in the existing categories describes only the scoring input.
    // API maxLevel does not establish the total number of unlockable item types.
    const suppliedTotal = numeric(progress?.coverage?.expectedItems);
    const total = progress?.coverage?.totalKnown === true && suppliedTotal !== null && Number.isInteger(suppliedTotal) && suppliedTotal > 0 && suppliedTotal >= known ? suppliedTotal : null;
    const suppliedScore = numeric(progress?.score?.overall);
    return {known, total, counts, score:suppliedScore === null ? null : Math.max(0, Math.min(100, suppliedScore)),
      status:!progress?.complete ? 'unknown' : progress.rushed?.rushed ? 'warning' : 'safe'};
  }
  function timestamp(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? (value < 1e12 ? value * 1000 : value) : null;
    const text = String(value).replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\.\d+)?Z$/, '$1-$2-$3T$4:$5:$6$7Z');
    const result = Date.parse(text); return Number.isFinite(result) ? result : null;
  }
  function summaryModel(progress, extra = {}) {
    const categories = progress?.score?.categories || {};
    const capped = ['heroes','troops','spells','pets'].flatMap(key => categories[key]?.items || []).filter(item => numeric(item?.level) !== null && numeric(item?.level) >= 0 && numeric(item?.maxLevel) > 0);
    const weakest = Object.entries(categories).filter(([,item]) => numeric(item?.percent) !== null).sort((a,b) => Number(a[1].percent)-Number(b[1].percent))[0];
    const achievements = Array.isArray(extra.achievements) ? extra.achievements : null;
    const next = (achievements || []).filter(item => numeric(item?.stars) !== null && Number(item.stars) < 3 && numeric(item.value) !== null && numeric(item.target) > 0)
      .map(item => ({name:item.name,percent:Math.max(0,Math.min(100,Number(item.value)/Number(item.target)*100))})).sort((a,b) => b.percent-a.percent)[0] || null;
    const raidRows = (extra.raids?.items || []).filter(item => timestamp(item?.startTime) !== null);
    const latest = raidRows.length ? Math.max(...raidRows.map(item => timestamp(item.startTime))) : null;
    const weekend = raidRows.filter(item => timestamp(item.startTime) === latest);
    const sum = key => weekend.length && weekend.every(item => numeric(item[key]) !== null) ? weekend.reduce((total,item) => total + Number(item[key]),0) : null;
    return {capped:capped.length,maxed:capped.filter(item => Number(item.level) >= Number(item.maxLevel)).length,
      weakest:weakest && Number(weakest[1].percent)<100 ? {category:weakest[0],percent:Number(weakest[1].percent)} : null,
      achievements:achievements ? {total:achievements.length,complete:achievements.filter(item => Number(item?.stars) === 3).length,next} : null,
      raid:latest === null ? null : {start:latest,loot:sum('loot'),attacks:sum('attacks'),ongoing:weekend.some(item => item.state === 'ongoing'),partial:Boolean(extra.raids?.stale)||weekend.some(item => numeric(item.loot) === null || numeric(item.attacks) === null)}};
  }
  let snapshot = null;
  const tag = value => String(value || '').replace(/^#/,'').toUpperCase();
  const date = value => timestamp(value) === null ? '' : window.CocI18n.dateTime(new Date(timestamp(value)),{day:'numeric',month:'short',year:'numeric'});
  function sessionContext(data) {
    const label = tr(data?.session?.id === 'previous' ? 'player.sessionPrevious' : 'player.sessionCurrent');
    return [label,Number(data?.session?.seasonId)>0 ? date(Number(data.session.seasonId)) : '',data?.leagueTier].filter(Boolean).join(' \u00b7 ');
  }
  function cards() {
    const {player,progress,extra,feeds} = snapshot, values = model(progress);
    const details = summaryModel(progress,{...extra,raids:feeds.raids?.data});
    const empty = tr('snapshot.noData'), loading = tr('snapshot.loading');
    const categoryKeys = {heroes:'snapshot.heroes',troops:'snapshot.troops',spells:'snapshot.spells',pets:'snapshot.pets'};
    const list = [
      {metric:'army',image:'coverage',label:'Army',tab:'army',value:details.capped ? tr('snapshot.maxed',{count:number(details.maxed)}) : '\u2014',
        note:tr('profile.coverageBreakdown',Object.fromEntries(Object.entries(values.counts).map(([key,count]) => [key,number(count)]))),
        context:(details.capped ? tr('snapshot.capScope',{count:number(details.capped)}) : tr('snapshot.noCaps'))+(Array.isArray(extra.army?.heroEquipment)?' · '+tr('snapshot.equipmentCount',{count:number(extra.army.heroEquipment.length)}):'')},
      {metric:'score',image:'progress',label:tr('player.progress'),tab:'progress',value:values.score === null ? '\u2014' : number(values.score)+'%',status:values.status,
        note:tr(values.status === 'unknown' ? 'player.rushed.unknown' : values.status === 'warning' ? 'player.rushed.yes' : 'player.rushed.no'),
        context:tr(progress?.complete?'profile.scoreScope':'profile.scoreScopePartial')+(details.weakest && categoryKeys[details.weakest.category] ? ' · '+tr('snapshot.weakest',{category:tr(categoryKeys[details.weakest.category]),percent:number(details.weakest.percent)}) : ''),progress:values.score},
      {metric:'ranked',image:'trophy-purple',label:'Ranked League',tab:'ranked-battles',value:'\u2014',note:empty,context:''},
      {metric:'performance',image:'status',label:tr('player.warPerformance'),tab:'performance',value:'\u2014',note:feeds.performance?.status === 'loading' ? loading : empty,context:tr('snapshot.archive')},
      {metric:'raids',image:'donation',label:'Raid Weekend',tab:'capital-raids',value:'\u2014',note:feeds.raids?.status === 'loading' ? loading : feeds.raids?.status === 'unloaded' ? tr('snapshot.openToLoad') : empty,context:''},
      {metric:'achievements',image:'war-star',label:tr('feature.achievements'),tab:'achievements',value:details.achievements?.total ? tr('snapshot.completed',{complete:number(details.achievements.complete),total:number(details.achievements.total)}) : '\u2014',
        note:details.achievements?.next ? tr('snapshot.nextAchievement',{name:details.achievements.next.name,percent:number(details.achievements.next.percent)}) : details.achievements?.total ? tr(details.achievements.complete===details.achievements.total?'snapshot.allAchievements':'snapshot.noAchievementTarget') : empty,context:tr('snapshot.achievementScope')}
    ];
    const ranked=list[2], feed=feeds.ranked;
    if(feed?.status === 'global') {
      const stats=player.legendStatistics?.currentSeason, rank=numeric(feeds.globalRank?.rank ?? stats?.rank);
      ranked.value=rank>0 ? '#'+number(rank) : tr('snapshot.rankUnknown');
      ranked.note=tr('snapshot.globalTrophies',{count:number(numeric(stats?.trophies ?? player.trophies))});
      ranked.context=tr('snapshot.legendGlobal');
    } else if(feed?.data) {
      const data=feed.data, prepared=window.RankedGameModel?.prepare(data);
      ranked.value=numeric(data.playerRank)>0 ? '#'+number(Number(data.playerRank))+(numeric(data.totalMembers)>0 ? ' / '+number(Number(data.totalMembers)) : '') : tr('snapshot.rankUnknown');
      ranked.note=tr('snapshot.rankedPoints',{total:number(numeric(data.player?.trophies) ?? prepared?.total ?? null),attack:number(prepared?.attack.points ?? null),defense:number(prepared?.defense.points ?? null)});
      ranked.context=sessionContext(data)+(data.stale?' \u00b7 '+tr('snapshot.partial'):'');
    } else ranked.note=feed?.status === 'loading' ? loading : empty;
    const war=feeds.performance?.data;
    if(war?.summary) {
      const summary=war.summary, item=list[3];
      item.value=numeric(summary.starsPerAttack)!==null && Number(summary.attacks)>0 ? tr('snapshot.starsPerAttack',{count:number(Number(summary.starsPerAttack))}) : '\u2014';
      item.note=tr('snapshot.warSample',{destruction:numeric(summary.destructionAverage)===null?'\u2014':number(Number(summary.destructionAverage))+'%',attacks:number(numeric(summary.attacks)),wars:number(numeric(summary.wars))});
      const times=(war.wars||[]).map(item=>timestamp(item.endTime||item.startTime)).filter(time=>time!==null);
      item.context=times.length ? tr('snapshot.archiveRange',{from:date(Math.min(...times)),to:date(Math.max(...times))}) : tr('snapshot.archive');
    }
    if(details.raid) {
      const raid=details.raid,item=list[4];item.value=raid.loot===null?'\u2014':number(raid.loot);
      item.note=tr('snapshot.raidSample',{attacks:number(raid.attacks)});
      item.context=tr('snapshot.weekend',{date:date(raid.start)})+' \u00b7 '+tr(raid.ongoing?'raid.ongoing':'raid.ended')+(raid.partial?' \u00b7 '+tr('snapshot.partial'):'');
    }
    return list;
  }
  function paintCards() {
    if(!snapshot)return;
    const root=el('playerOverviewCards');
    for(const item of cards()) {
      let card=root.querySelector(`[data-metric="${item.metric}"]`);
      if(!card) {
        card=node('article',undefined,'overview-card');card.dataset.metric=item.metric;
        const picture=node('span',undefined,'overview-card-icon');picture.setAttribute('aria-hidden','true');picture.append(icon(item.image));
        const copy=node('div',undefined,'overview-card-copy');
        copy.append(node('p',item.label,'overview-card-label'),node('strong','','overview-card-value'),node('div',undefined,'overview-card-body'));
        const link=node('a',tr('snapshot.details'),'overview-card-link');link.href='#'+item.tab;link.dataset.snapshotTab=item.tab;link.setAttribute('aria-label',tr('snapshot.detailsFor',{section:item.label}));
        link.addEventListener('click',event=>{
          if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;
          const tab=document.querySelector(`.player-tabs button[data-tab="${item.tab}"]`);if(!tab)return;
          event.preventDefault();tab.click();tab.focus({preventScroll:true});document.querySelector('.player-tab-toolbar').scrollIntoView({block:'start'});
        });
        copy.append(link);card.append(picture,copy);root.append(card);
      }
      if(item.status)card.dataset.status=item.status;
      card.querySelector('.overview-card-value').textContent=item.value;
      const body=card.querySelector('.overview-card-body');body.replaceChildren();
      if(item.metric==='score'&&item.progress!==null)body.append(progressBar('score',item.progress,100,tr('profile.scoreBarLabel',{percent:number(item.progress)})));
      body.append(node('p',item.note,'overview-card-note'));
      if(item.context)body.append(node('p',item.context,'overview-card-context'));
    }
  }
  function update(kind,payload,playerTag) {
    if(!snapshot || tag(playerTag)!==tag(snapshot.player.tag))return;
    snapshot.feeds[kind]=payload;paintCards();
  }
  function icon(name, className = '') {
    const image = node('img'); image.src = '/assets/profile/' + name + '.svg'; image.alt = ''; image.width = 56; image.height = 56; image.className = className; return image;
  }
  const actionPaths = {
    compare:'<circle cx="8" cy="7" r="3"/><path d="M2 20v-3a6 6 0 0 1 12 0v3H2Zm14-16a3 3 0 0 1 0 6m1 3a5 5 0 0 1 5 5v2h-5"/>',
    external:'<path d="M14 3h7v7m0-7L10 14M10 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6"/>'
  };
  function actionIcon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    for (const [key,value] of Object.entries({viewBox:'0 0 24 24',width:'20',height:'20',fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'})) svg.setAttribute(key,value);
    svg.innerHTML = actionPaths[name]; return svg;
  }
  function progressBar(metric, value, maximum, label) {
    const bar = node('progress', undefined, 'overview-progress'); bar.dataset.metric = metric; bar.max = maximum; bar.value = value; bar.setAttribute('aria-label', label); return bar;
  }
  function renderTimestamp(id, updated, includeLabel = false) {
    const target = el(id); if (!target) return;
    target.replaceChildren();
    const date = new Date(updated);
    if (!updated || Number.isNaN(date.getTime())) {target.textContent = tr('player.unavailable');target.removeAttribute('datetime');return;}
    target.dateTime = date.toISOString();
    const dateText = window.CocI18n.dateTime(date,{day:'numeric',month:'short',year:'numeric'});
    target.append(node('span',(includeLabel ? tr('profile.updatedLabel') + ' ' : '') + dateText,'profile-updated-date'),
      node('span',window.CocI18n.dateTime(date,{hour:'2-digit',minute:'2-digit',timeZoneName:'short'}),'profile-updated-time'));
  }
  function renderName(name) {
    const target = el('playerName'); const text = String(name || '—');
    const match = /^(.*\s)(\S+)$/.exec(text); target.replaceChildren();
    if (!match) {target.textContent = text;return;}
    target.append(document.createTextNode(match[1]),node('span',match[2],'profile-name-accent'));
  }
  function render(player, progress, updated, extra = {}) {
    renderHero(player, progress);
    snapshot={player,progress,extra,feeds:{ranked:{status:'loading'},performance:{status:'loading'},raids:{status:'unloaded'}}};
    el('playerOverviewCards').replaceChildren();paintCards();
    const actions = el('playerOverviewActions'); actions.replaceChildren();
    const compare = node('a',undefined,'profile-action profile-action-primary'); compare.href = el('compareLink').href; compare.append(actionIcon('compare'),node('span',tr('player.comparePlayers'))); actions.append(compare);
    if (player.clan?.tag) {
      const clan = node('a',undefined,'profile-action profile-action-secondary'); clan.href = '/clan.html?'+new URLSearchParams({tag:player.clan.tag.replace(/^#/,''),lang:window.CocI18n.locale});
      clan.append(actionIcon('external'),node('span',tr('player.openClan'))); actions.append(clan);
    }
    renderTimestamp('overviewUpdated',updated,true);
  }
  window.PlayerOverview = {model,summaryModel,render,renderName,chooseHero,update};
})();
