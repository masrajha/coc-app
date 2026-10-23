(() => {
  const tr = (...args) => window.CocI18n.t(...args);
  const number = value => typeof value === 'number' && Number.isFinite(value) ? window.CocI18n.number(value) : '—';
  function node(tag, value, className) {
    const result = document.createElement(tag); if (value != null) result.textContent = value;
    if (className) result.className = className; return result;
  }
  function renderWarPreference(element, value) {
    element.className = 'war-preference ' + (value === 'in' ? 'war-in' : value === 'out' ? 'war-out' : 'war-unknown');
    element.textContent = tr(value === 'in' ? 'feature.warIn' : value === 'out' ? 'feature.warOut' : 'feature.warUnknown');
    element.title = tr('feature.warNote');
  }
  const preferences = new Map();
  let observer = null, queue = [], running = 0;
  function pump() {
    while (running < 4 && queue.length) {
      const element = queue.shift(); if (!element.isConnected) continue;
      const tag = element.dataset.warTag;
      running++;
      if (!preferences.has(tag)) preferences.set(tag, window.CocI18n.apiFetch('/api/player/' + encodeURIComponent(tag) + '/war-preference').then(async response => {
        const data = await response.json(); if (!response.ok) throw new Error(data.error || tr('cc.failed')); return data.warPreference;
      }).catch(error => { preferences.delete(tag); throw error; }));
      preferences.get(tag).then(value => { if(element.isConnected) renderWarPreference(element,value); })
        .catch(error => { if(element.isConnected) {renderWarPreference(element,null);element.title=error.message;} })
        .finally(() => {running--;pump();});
    }
  }
  function observeWarPreferences(root) {
    observer?.disconnect(); queue = [];
    const elements = root.querySelectorAll('[data-war-tag]');
    const enqueue = element => {element.textContent=tr('feature.warLoading');queue.push(element);pump();};
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => entries.forEach(entry => {if(entry.isIntersecting){observer.unobserve(entry.target);enqueue(entry.target);}}));
      elements.forEach(element => observer.observe(element));
    } else elements.forEach(enqueue);
  }
  function renderCapital(data) {
    const root = document.getElementById('capitalDistricts'); if(!root)return;root.replaceChildren();
    const report=data.capitalProgress;
    const note=document.getElementById('capitalDistrictNote');
    note.textContent=tr('feature.capitalNote');
    if(!report?.districts?.length){root.append(node('p',tr('feature.noDistricts'),'feature-empty'));return;}
    const baseline=report.baselineDate ? window.CocI18n.dateTime(new Date(report.baselineDate+'T00:00:00Z'),{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}) : null;
    root.append(node('p',baseline?tr('feature.capitalBaseline',{date:baseline}):tr('feature.noCapitalBaseline'),'feature-caption'));
    const cards=node('div',null,'capital-district-grid');
    for(const district of report.districts){
      const card=node('article',null,'capital-district-card');
      card.append(node('h3',district.name || tr('feature.district',{id:district.id})),node('strong',tr('feature.districtLevel',{level:number(district.level)})));
      card.append(node('span',district.delta == null?tr('feature.noDistrictBaseline'):district.delta>0?tr('feature.levelGain',{count:number(district.delta)}):district.delta<0?tr('feature.levelChanged',{count:number(district.delta)}):tr('feature.levelUnchanged'),'feature-caption'));
      cards.append(card);
    }
    root.append(cards);
  }
  let achievements=[];
  function paintAchievements() {
    const root=document.getElementById('achievementList');root.replaceChildren();
    const village=document.getElementById('achievementVillage').value, filter=document.getElementById('achievementFilter').value;
    const query=document.getElementById('achievementSearch').value.trim().toLocaleLowerCase(window.CocI18n.locale);
    const rows=(achievements || []).filter(item=>(village==='all'||item.village===village) && (filter==='all'||(filter==='complete'?item.stars===3:item.stars!==3)) && (!query||String(item.name||'').toLocaleLowerCase(window.CocI18n.locale).includes(query)));
    document.getElementById('achievementSummary').textContent=achievements===null?tr('feature.achievementsUnavailable'):tr('feature.achievementCount',{complete:number(achievements.filter(a=>a.stars===3).length),total:number(achievements.length)});
    if(!rows.length){root.append(node('p',tr('feature.noAchievements'),'feature-empty'));return;}
    for(const item of rows){
      const card=node('article',null,'achievement-card');const heading=node('div',null,'achievement-heading');
      const stars=Number.isInteger(item.stars)?Math.max(0,Math.min(3,item.stars)):null;
      heading.append(node('h3',item.name||'—'),node('span',stars===null?'—':'★'.repeat(stars)+'☆'.repeat(3-stars),'achievement-stars'));card.append(heading);
      if(item.info)card.append(node('p',item.info));
      card.append(node('span',tr(item.village==='builderBase'?'feature.builderVillage':item.village==='home'?'feature.homeVillage':'feature.otherVillage'),'feature-caption'));
      const valid=typeof item.value==='number'&&typeof item.target==='number'&&item.target>0;
      if(valid){const progress=document.createElement('progress');progress.max=item.target;progress.value=Math.max(0,Math.min(item.target,item.value));progress.setAttribute('aria-label',item.name||tr('feature.achievements'));card.append(progress);}
      card.append(node('strong',`${number(item.value)} / ${number(item.target)}`));
      if(item.completionInfo)card.append(node('small',item.completionInfo));root.append(card);
    }
  }
  function renderAchievements(items) {
    if(!document.getElementById('achievementList'))return;
    achievements=Array.isArray(items)?items:null;paintAchievements();
  }
  for(const id of ['achievementVillage','achievementFilter','achievementSearch'])document.getElementById(id)?.addEventListener(id==='achievementSearch'?'input':'change',paintAchievements);
  window.AccountFeatures={renderWarPreference,observeWarPreferences,renderCapital,renderAchievements};
})();
