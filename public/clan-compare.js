(() => {
  const i18n = window.CocI18n, model = window.ClanCompareModel;
  const tr = (...args) => i18n.t(...args), el = id => document.getElementById(id);
  const clean = value => value.trim().replace(/^#/, '').toUpperCase();
  const number = value => typeof value === 'number' && Number.isFinite(value) ? i18n.number(value, {maximumFractionDigits:2}) : '—';
  let state = [{},{}], request = 0, loading = false;
  const params = new URLSearchParams(location.search);
  el('clanOne').value = params.get('clan1') || ''; el('clanTwo').value = params.get('clan2') || '';
  i18n.setPageTitle('compareClan', [el('clanOne').value, el('clanTwo').value]);
  el('clanWarPeriod').value = params.get('days') === '90' ? '90' : '30';
  function syncUrl() {
    const query = new URLSearchParams({clan1:clean(el('clanOne').value),clan2:clean(el('clanTwo').value),days:el('clanWarPeriod').value});
    if(el('clanRaidWeekend').value) query.set('weekend',el('clanRaidWeekend').value);
    history.replaceState(null,'',location.pathname+'?'+query);
  }
  function cell(value) { const td=document.createElement('td'); td.textContent=value ?? '—'; return td; }
  function table(target, rows, resource) {
    const node=el(target); node.replaceChildren();
    const table=document.createElement('table'); table.className='cc-table';
    const header=document.createElement('tr'); header.append(document.createElement('th'));
    state.forEach((s,index)=>{ const th=document.createElement('th'); th.scope='col'; const badge=s.profile?.badgeUrls?.small; if(badge && /^https:\/\//.test(badge)){const img=document.createElement('img');img.src=badge;img.alt='';img.onerror=()=>img.remove();th.append(img);} th.append(document.createTextNode(s.profile?.name || tr(index?'cc.second':'cc.first'))); header.append(th); });
    const head=document.createElement('thead'); head.append(header); table.append(head);
    const body=document.createElement('tbody');
    rows.forEach(([label,values])=>{ const row=document.createElement('tr'), th=document.createElement('th'); th.scope='row';th.textContent=label;row.append(th);values.forEach(v=>row.append(cell(v)));body.append(row); });
    table.append(body);node.append(table);
    state.forEach((s,index)=>{
      if(s[resource+'Error']) {const p=document.createElement('p');p.className='cc-error';p.textContent=(s.profile?.name||tr(index?'cc.second':'cc.first'))+': '+s[resource+'Error'];node.append(p);}
      if(s[resource]?.stale) {const p=document.createElement('p');p.textContent=tr('raid.stale');node.append(p);}
    });
  }
  function updateTitle() {
    i18n.setPageTitle('compareClan', state.map((side, index) => side.profile?.name || side.profile?.tag || clean(el(index ? 'clanTwo' : 'clanOne').value)));
  }
  function render() {
    updateTitle();
    const profiles=state.map(s=>s.profile), summaries=profiles.map(p=>p?model.profile(p):null);
    table('clanProfileCompare',[
      [tr('cc.clan'),profiles.map(p=>p?`${p.name} · ${p.tag}`:'—')],
      [tr('cc.level'),profiles.map(p=>number(p?.clanLevel))],
      [tr('cc.members'),profiles.map(p=>number(p?.members))],
      [tr('cc.points'),profiles.map(p=>number(p?.clanPoints))],
      [tr('cc.league'),profiles.map(p=>p?.warLeague?.name || '—')],
      [tr('cc.averageTh'),summaries.map(s=>number(s?.average))],
      [tr('cc.coverage'),summaries.map(s=>s?`${number(s.known)} / ${number(s.total)}`:'—')],
      [tr('cc.distribution'),summaries.map(s=>s?Object.entries(s.distribution).sort((a,b)=>b[0]-a[0]).map(([th,count])=>`TH ${th}: ${number(count)}`).join(' · ')||'—':'—')]
    ],'profile');
    table('clanActivityCompare',[
      [tr('cc.donations'),summaries.map(s=>number(s?.donations))],
      [tr('cc.donors'),summaries.map(s=>number(s?.donors))],
      [tr('cc.donationCoverage'),summaries.map(s=>s?`${number(s.donationKnown)} / ${number(s.total)}`:'—')]
    ],'profile');
    const linkRow=document.createElement('p');profiles.forEach(p=>{if(!p)return;const link=document.createElement('a');link.href='/clan.html?clan='+encodeURIComponent(clean(p.tag));link.textContent=p.name+' ↗';link.style.marginRight='20px';linkRow.append(link);});el('clanProfileCompare').append(linkRow);
    const now=Date.now(), wars=state.map(s=>s.war?model.wars(s.war.items,Number(el('clanWarPeriod').value),now):null);
    table('clanWarCompare',[
      [tr('cc.sample'),wars.map(w=>w?number(w.count):'—')],
      [tr('cc.results'),wars.map(w=>w?`${number(w.wins)} / ${number(w.losses)} / ${number(w.ties)}`:'—')],
      [tr('cc.winRate'),wars.map(w=>w?.winRate!=null?number(w.winRate)+'%':'—')],
      [tr('cc.starRate'),wars.map(w=>w?.starRate!=null?number(w.starRate)+'%':'—')],
      [tr('cc.destruction'),wars.map(w=>w?.destruction!=null?number(w.destruction)+'%':'—')]
    ],'war');
    const weekend=el('clanRaidWeekend').value;
    const raids=state.map(s=>model.raid(s.raids?.items?.find(r=>r.startTime===weekend)));
    if(!weekend){el('clanRaidCompare').replaceChildren();const p=document.createElement('p');p.textContent=tr('cc.noSharedRaid');el('clanRaidCompare').append(p);state.forEach(s=>{if(s.raidsError){const p=document.createElement('p');p.className='cc-error';p.textContent=s.raidsError;el('clanRaidCompare').append(p);}});return;}
    table('clanRaidCompare',[
      [tr('raid.status'),raids.map(r=>r?tr(r.state==='ended'?'raid.ended':'raid.ongoing'):'—')],
      [tr('raid.loot'),raids.map(r=>number(r?.loot))],
      [tr('raid.attacks'),raids.map(r=>number(r?.totalAttacks))],
      [tr('cc.participants'),raids.map(r=>number(r?.participants))],
      [tr('raid.average'),raids.map(r=>number(r?.lootPerAttack))],
      [tr('cc.completed'),raids.map(r=>number(r?.raidsCompleted))],
      [tr('cc.districts'),raids.map(r=>number(r?.districtsDestroyed))]
    ],'raids');
  }
  async function load(event) {
    event?.preventDefault();
    const tags=[clean(el('clanOne').value),clean(el('clanTwo').value)];
    if(tags.some(tag=>! /^[0289PYLQGRJCUV]{3,15}$/.test(tag))||tags[0]===tags[1]){el('clanCompareStatus').textContent=tr('cc.invalid');return;}
    i18n.setPageTitle('compareClan', tags);
    const version=++request;state=[{},{}];loading=true;el('clanCompareContent').hidden=true;
    const status=el('clanCompareStatus');status.replaceChildren();const spin=document.createElement('span');spin.className='cc-spinner';spin.setAttribute('aria-hidden','true');status.append(spin,document.createTextNode(tr('cc.loading')));syncUrl();
    await Promise.allSettled(tags.flatMap((tag,index)=>[['profile',''],['war','/war-log?limit=50'],['raids','/raids?limit=10']].map(async([resource,suffix])=>{
      try{const response=await i18n.apiFetch('/api/clan/'+tag+suffix),data=await response.json();if(!response.ok)throw new Error(data.error||tr('cc.failed'));if(version===request){state[index][resource]=data;if(resource==='profile')updateTitle();}}
      catch(error){if(version===request)state[index][resource+'Error']=error.message;}
    })));
    if(version!==request)return;
    loading=false;status.textContent=tr('cc.context');
    const select=el('clanRaidWeekend');select.replaceChildren();
    model.sharedRaids(state[0].raids?.items,state[1].raids?.items).forEach(start=>{const option=document.createElement('option');option.value=start;const date=model.date(start);option.textContent=Number.isFinite(+date)?i18n.dateTime(date,{day:'numeric',month:'short',year:'numeric'}):start;select.append(option);});
    if([...select.options].some(o=>o.value===params.get('weekend')))select.value=params.get('weekend');
    select.disabled=!select.options.length;el('clanCompareContent').hidden=false;render();syncUrl();
  }
  el('clanCompareForm').addEventListener('submit',load);
  el('clanSwap').onclick=()=>{[el('clanOne').value,el('clanTwo').value]=[el('clanTwo').value,el('clanOne').value];if(el('clanOne').value&&el('clanTwo').value)load();};
  el('clanWarPeriod').onchange=el('clanRaidWeekend').onchange=()=>{if(!loading){render();syncUrl();}};
  el('clanShare').onclick=async()=>{try{syncUrl();await navigator.clipboard.writeText(location.href);el('clanCompareStatus').textContent=tr('cc.copied');}catch{el('clanCompareStatus').textContent=tr('cc.copyFallback');}};
  if(el('clanOne').value&&el('clanTwo').value)load();
})();
