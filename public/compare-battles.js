(() => {
  const dialog = document.getElementById('compareBattleDrawer');
  if (!dialog) return;
  const el = id => document.getElementById(id);
  const tr = (...args) => window.CocI18n.t(...args);
  const number = value => value == null ? '—' : window.CocI18n.number(value);
  const node = (tag, text, className) => {
    const result = document.createElement(tag);
    if (text != null) result.textContent = text;
    if (className) result.className = className;
    return result;
  };
  const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  let source, player = 'left', side = 'attack', opener = null, openerSide = 'left', lastData = null;

  function card(log) {
    const bonus = log.kind === 'defenseBonus';
    const result = node('article', null, `ranked-battle-card ranked-${side}${Number(log.stars) === 3 && !bonus ? ' ranked-triple' : ''}${bonus ? ' ranked-defense-bonus' : ''}`);
    const top = node('div', null, 'ranked-battle-card-top');
    const points = finite(log.trophies) ? tr('player.trophyValue', {value:(Number(log.trophies) >= 0 ? '+' : '') + number(Number(log.trophies))}) : tr('player.unavailable');
    top.append(node('span', bonus ? tr('compare.bonusShort') : `#${number(log.battleNumber)}`), node('strong', points));
    result.append(top);
    if (bonus) {
      const body = node('div', null, 'ranked-defense-bonus-body');
      const image = node('img'); image.src = '/assets/trophy.png'; image.alt = ''; image.width = 22; image.height = 22;
      body.append(image, node('strong', tr('player.defenseBonus')));
      result.append(body, node('small', tr('player.defenseBonusNote')));
      return result;
    }
    const stars = node('div', null, 'ranked-battle-stars');
    if (finite(log.stars)) {
      stars.setAttribute('aria-label', tr('player.starsOfThree',{count:log.stars}));
      for (let index=1;index<=3;index++) stars.append(node('span','★',index<=Number(log.stars)?'earned':''));
    } else stars.textContent = '—';
    const destruction = node('div', null, 'ranked-battle-destruction');
    destruction.append(node('span', tr('player.destruction')), node('strong', finite(log.destructionPercentage) ? number(Number(log.destructionPercentage))+'%' : '—'));
    result.append(stars, destruction);
    if (finite(log.destructionPercentage)) {
      const track = node('div',null,'ranked-destruction-track'), fill = node('i');
      fill.style.width = Math.max(0,Math.min(100,Number(log.destructionPercentage)))+'%'; track.append(fill); result.append(track);
    }
    const date = window.CompareModel.parseWarDate(log.timestamp);
    const metadata = [log.opponentName, date ? window.CocI18n.dateTime(date) : null].filter(Boolean).join(' · ');
    if (metadata) { const note=node('small',metadata); note.title=metadata; result.append(note); }
    return result;
  }

  function render() {
    if (!dialog.open || !source) return;
    const data=source.data(player), list=el('compareBattleLogs'); list.replaceChildren();
    if (lastData !== data) { el('compareBattleFilter').value='all'; lastData=data; el('compareBattleSort').value='oldest'; el('compareBattleDrawer').scrollTop=0; }
    const date=window.CompareModel.parseWarDate(data?.session?.seasonId ? data.session.seasonId*1000 : null);
    el('compareBattleContext').textContent=[source.name(player),data?.leagueTier || tr('compare.tierUnavailable'),
      data?.session ? tr(data.session.id==='previous'?'player.sessionPrevious':'player.sessionCurrent') : '',
      date ? window.CocI18n.dateTime(date,{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}) : ''].filter(Boolean).join(' · ');
    for (const button of dialog.querySelectorAll('[data-battle-side]')) {
      const active=button.dataset.battleSide===side;
      button.setAttribute('aria-selected',String(active)); button.tabIndex=active?0:-1;
      const view=window.CompareModel.battleLogRows(data,button.dataset.battleSide);
      button.textContent=tr(button.dataset.battleSide==='attack'?'player.attacks':'player.defenses')+' · '+number(view.count)+(view.bonusCount?' + '+number(view.bonusCount)+' '+tr('compare.bonusShort'):'');
    }
    el('compareBattlePanel').setAttribute('aria-labelledby',side==='attack'?'compareAttackTab':'compareDefenseTab');
    el('compareBattlePoints').replaceChildren();
    if (!data) {
      for (const id of ['compareBattleFilter','compareBattleSort']) el(id).disabled=true;
      const notice=el('compareBattleNotice'); notice.replaceChildren();
      if(source.loading(player)) { const spinner=node('span',null,'loading-spinner'); spinner.setAttribute('aria-hidden','true'); notice.append(spinner,document.createTextNode(tr('compare.loadingRanked'))); }
      else notice.textContent=tr('player.battleLogUnavailable');
      return;
    }
    for (const id of ['compareBattleFilter','compareBattleSort']) el(id).disabled=false;
    const view=window.CompareModel.battleLogRows(data,side,el('compareBattleFilter').value,el('compareBattleSort').value);
    const image=node('img');image.src='/assets/trophy.png';image.alt='';image.width=18;image.height=18;
    el('compareBattlePoints').append(node('span',tr('compare.battlePoints')),image,node('strong',view.points===null?'—':(view.points>=0?'+':'')+number(view.points)));
    el('compareBattleNotice').textContent=tr('compare.drawerCoverage',{shown:number(view.logs.length),total:view.count===null?'—':number(view.count+view.bonusCount)})+(view.partial?' · '+tr('compare.rankedPartial'):'');
    if(!view.logs.length)list.append(node('p',tr(el('compareBattleFilter').value==='all'?'player.battleLogUnavailable':'compare.battleNoMatches'),'empty-section'));
    else for(const log of view.logs)list.append(card(log));
  }

  function reset() { side='attack';lastData=null;el('compareBattleFilter').value='all';el('compareBattleSort').value='oldest';dialog.scrollTop=0; }
  function open(which, trigger) {
    if(!source)return;
    player=which;openerSide=which;opener=trigger;reset();
    el('compareBattlePlayer').replaceChildren();
    for(const value of ['left','right'])el('compareBattlePlayer').add(new Option(source.name(value),value));
    el('compareBattlePlayer').value=player;
    if(!dialog.open)dialog.showModal();
    document.body.classList.add('compare-battle-open');render();
  }
  el('closeCompareBattle').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{
    document.body.classList.remove('compare-battle-open');
    const target=opener?.isConnected?opener:document.querySelector(`[data-open-battle="${openerSide}"]`);
    target?.focus({preventScroll:true});
  });
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const bounds=dialog.getBoundingClientRect();
    if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();
  });
  el('compareBattlePlayer').addEventListener('change',event=>{player=event.target.value;reset();render();});
  for(const id of ['compareBattleFilter','compareBattleSort'])el(id).addEventListener('change',render);
  const tabs=[...dialog.querySelectorAll('[data-battle-side]')];
  tabs.forEach(button=>{
    button.addEventListener('click',()=>{side=button.dataset.battleSide;el('compareBattleFilter').value='all';render();});
    button.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();const index=event.key==='Home'?0:event.key==='End'?1:1-tabs.indexOf(button);tabs[index].click();tabs[index].focus();
    });
  });
  window.CompareBattleLog={configure:options=>{source=options;},open,refresh:render};
})();
