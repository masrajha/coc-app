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
    // expectedItems in the existing categories describes only the scoring input.
    // API maxLevel does not establish the total number of unlockable item types.
    const suppliedTotal = numeric(progress?.coverage?.expectedItems);
    const total = progress?.coverage?.totalKnown === true && suppliedTotal !== null && Number.isInteger(suppliedTotal) && suppliedTotal > 0 && suppliedTotal >= known ? suppliedTotal : null;
    const suppliedScore = numeric(progress?.score?.overall);
    return {known, total, score:suppliedScore === null ? null : Math.max(0, Math.min(100, suppliedScore)),
      status:!progress?.complete ? 'unknown' : progress.rushed?.rushed ? 'warning' : 'safe'};
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
  function render(player, progress, updated) {
    renderHero(player, progress);
    const values = model(progress);
    const cards = [
      {metric:'status',image:'status',label:tr('player.status'),value:tr(values.status === 'unknown' ? 'player.rushed.unknown' : values.status === 'warning' ? 'player.rushed.yes' : 'player.rushed.no'),
        note:tr(values.status === 'unknown' ? 'profile.statusUnknown' : values.status === 'warning' ? 'profile.statusReview' : 'profile.statusScope')},
      {metric:'score',image:'progress',label:tr('player.progressScore'),value:values.score === null ? '—' : number(values.score)+'%',note:tr(progress.complete ? 'profile.scoreScope' : 'profile.scoreScopePartial')},
      {metric:'coverage',image:'coverage',label:tr('player.coverage'),value:tr('player.items',{count:number(values.known)}),note:tr(values.total === null ? 'profile.coverageUnknown' : 'profile.coverageKnown',{known:number(values.known),total:number(values.total)})},
      {metric:'trophies',image:'trophy-purple',label:tr('player.trophies'),value:number(numeric(player.trophies)),note:tr('profile.currentTrophies')}
    ];
    const root = el('playerOverviewCards'); root.replaceChildren();
    for (const item of cards) {
      const card = node('article',undefined,'overview-card'); card.dataset.metric = item.metric; if (item.metric === 'status') card.dataset.status = values.status;
      const picture = node('span',undefined,'overview-card-icon'); picture.setAttribute('aria-hidden','true'); picture.append(icon(item.image));
      const copy = node('div',undefined,'overview-card-copy');
      copy.append(node('p',item.label,'overview-card-label'),node('strong',item.value,'overview-card-value'));
      if (item.metric === 'score' && values.score !== null) copy.append(progressBar('score',values.score,100,tr('profile.scoreBarLabel',{percent:number(values.score)})));
      if (item.metric === 'coverage' && values.total !== null) copy.append(progressBar('coverage',values.known,values.total,tr('profile.coverageKnown',{known:number(values.known),total:number(values.total)})));
      copy.append(node('p',item.note,'overview-card-note')); card.append(picture,copy); root.append(card);
    }
    const actions = el('playerOverviewActions'); actions.replaceChildren();
    const compare = node('a',undefined,'profile-action profile-action-primary'); compare.href = el('compareLink').href; compare.append(actionIcon('compare'),node('span',tr('player.comparePlayers'))); actions.append(compare);
    if (player.clan?.tag) {
      const clan = node('a',undefined,'profile-action profile-action-secondary'); clan.href = '/clan.html?'+new URLSearchParams({tag:player.clan.tag.replace(/^#/,''),lang:window.CocI18n.locale});
      clan.append(actionIcon('external'),node('span',tr('player.openClan'))); actions.append(clan);
    }
    renderTimestamp('updated',updated); renderTimestamp('overviewUpdated',updated,true);
  }
  window.PlayerOverview = {model,render,renderName,chooseHero};
})();
