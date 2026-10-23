(function () {
  const tr = (key, values) => window.CocI18n.t(key, values);
  const el = id => document.getElementById(id);
  const number = value => value == null ? '—' : window.CocI18n.number(value, { maximumFractionDigits: 2 });
  const node = (tag, text = '', className = '') => {
    const result = document.createElement(tag); result.textContent = text;
    if (className) result.className = className;
    return result;
  };
  const cleanTag = tag => String(tag || '').replace(/^#/, '').toUpperCase();
  const clan = { tag: null, items: [], next: null, selected: '', page: 0, attackPage: 0, defensePage: 0, request: 0, loaded: false, loading: false, stale: false };
  const player = { tag: null, clan: null, data: null, page: 0, request: 0, loaded: false, loading: false };

  function date(value) {
    if (!value) return '—';
    const iso = String(value).replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\.\d+)?Z$/, '$1-$2-$3T$4:$5:$6$7Z');
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? '—' : window.CocI18n.dateTime(parsed, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function stateName(state) { return tr(state === 'ongoing' ? 'raid.ongoing' : state === 'ended' ? 'raid.ended' : 'raid.unknown'); }
  function weekend(item) { return `${date(item.startTime)} – ${date(item.endTime)}`; }
  function status(id, text, loading = false, error = false) {
    const root = el(id); root.replaceChildren(); root.hidden = !text;
    root.classList.toggle('is-error', error); root.classList.toggle('loading-state', loading);
    if (loading) { const spinner = node('span', '', 'loading-spinner'); spinner.setAttribute('aria-hidden', 'true'); root.appendChild(spinner); }
    root.appendChild(node('span', text));
  }
  function metric(root, label, value) {
    const card = node('div', '', 'raid-metric'); card.append(node('span', tr(label)), node('strong', number(value))); root.appendChild(card);
  }
  function table(root, labels, caption, compact = false) {
    root.replaceChildren();
    const result = node('table', '', compact ? 'raid-table raid-district-table' : 'raid-table');
    result.appendChild(node('caption', tr(caption), 'sr-only'));
    const head = node('thead'), row = node('tr');
    labels.forEach(label => { const th = node('th', tr(label)); th.scope = 'col'; row.appendChild(th); });
    head.appendChild(row); result.appendChild(head);
    const body = node('tbody'); result.appendChild(body); root.appendChild(result);
    return body;
  }
  function cell(row, label, value) {
    const td = node('td'); td.dataset.label = tr(label);
    td.appendChild(value instanceof Node ? value : node('span', value)); row.appendChild(td);
    return td;
  }
  function link(name, tag, type) {
    const result = node('a', name || tag || '—');
    if (/^[0289PYLQGRJCUV]{3,15}$/.test(cleanTag(tag))) {
      const params = new URLSearchParams(type === 'clan' ? { tag: cleanTag(tag) } : { tag: cleanTag(tag), ...(clan.tag ? { clan: clan.tag } : {}) });
      result.href = `/${type === 'clan' ? 'clan' : 'player'}.html?${params}${type === 'clan' ? '#clan-capital' : '#capital-raids'}`;
    }
    return result;
  }
  function pagination(root, count, page, size, onChange) {
    root.replaceChildren(); root.hidden = count <= size;
    if (root.hidden) return;
    const prev = node('button', tr('raid.previous')), next = node('button', tr('raid.next'));
    prev.type = next.type = 'button'; prev.disabled = page === 0; next.disabled = (page + 1) * size >= count;
    prev.addEventListener('click', () => onChange(page - 1)); next.addEventListener('click', () => onChange(page + 1));
    root.append(prev, node('span', tr('raid.page', { page: number(page + 1), pages: number(Math.ceil(count / size)) })), next);
  }
  function participation(member, state) {
    const label = member.remaining == null ? tr('raid.unknown') : member.remaining === 0 ? tr('raid.quotaUsed')
      : tr(state === 'ended' ? 'raid.unused' : 'raid.remaining', { count: number(member.remaining) });
    return node('span', label, `raid-badge ${member.remaining === 0 ? 'is-complete' : member.remaining == null ? '' : 'is-pending'}`);
  }
  function usage(member) {
    const value = node('span', `${number(member.attacks)} / ${number(member.quota)}`);
    if (member.quota != null) value.title = tr('raid.quotaDetail', { base: number(member.attackLimit), bonus: number(member.bonusAttackLimit) });
    return value;
  }
  function selectedSeason() { return clan.items.find(item => item.id === clan.selected); }
  function clanControls() {
    el('raidClanReload').disabled = clan.loading || !clan.tag;
    el('raidClanMore').disabled = clan.loading;
    el('raidClanMore').hidden = !clan.next;
    el('raidWeekend').disabled = clan.loading || !clan.items.length;
    el('raidClanPanel').setAttribute('aria-busy', String(clan.loading));
  }
  function clanStatus() {
    const item = selectedSeason();
    const text = item ? `${stateName(item.state)} · ${weekend(item)} · ${tr('raid.updated', { date: date(clan.updated) })}` : tr('raid.empty');
    status('raidClanStatus', `${text}${clan.stale ? ` · ${tr('raid.stale')}` : ''}${clan.refreshError ? ` ${clan.refreshError}` : ''}`);
  }
  function renderMembers() {
    const item = selectedSeason();
    if (!item) return;
    const query = el('raidMemberSearch').value.trim().toLocaleLowerCase(window.CocI18n.formatLocale);
    const sort = el('raidMemberSort').value;
    const members = item.members.filter(member => `${member.name} ${member.tag}`.toLocaleLowerCase(window.CocI18n.formatLocale).includes(query));
    members.sort((a, b) => sort === 'name' ? String(a.name || '').localeCompare(String(b.name || ''), window.CocI18n.formatLocale)
      : (sort === 'remaining' ? (b.remaining ?? -1) - (a.remaining ?? -1) : (b.loot ?? -1) - (a.loot ?? -1)) || String(a.name || '').localeCompare(String(b.name || '')));
    const root = el('raidMemberTable');
    if (!members.length) {
      root.replaceChildren(node('p', tr(!item.membersAvailable ? 'raid.membersUnavailable' : query ? 'raid.noMatches' : 'raid.noParticipants'), 'raid-note'));
      el('raidMemberPager').replaceChildren(); return;
    }
    const size = window.matchMedia('(max-width:640px)').matches ? 10 : 25;
    clan.page = Math.min(clan.page, Math.ceil(members.length / size) - 1);
    const labels = ['raid.member', 'raid.attacks', 'raid.loot', 'raid.average', 'raid.status'];
    const body = table(root, labels, 'raid.participation');
    for (const member of members.slice(clan.page * size, (clan.page + 1) * size)) {
      const row = node('tr'); cell(row, labels[0], link(member.name, member.tag, 'player'));
      cell(row, labels[1], usage(member)); cell(row, labels[2], number(member.loot));
      cell(row, labels[3], number(member.lootPerAttack)); cell(row, labels[4], participation(member, item.state)); body.appendChild(row);
    }
    pagination(el('raidMemberPager'), members.length, clan.page, size, page => { clan.page = page; renderMembers(); });
  }
  function renderLog(side) {
    const item = selectedSeason(), key = side === 'attack' ? 'attackLog' : 'defenseLog';
    const root = el(side === 'attack' ? 'raidAttackLog' : 'raidDefenseLog'); root.replaceChildren();
    const logs = item[key], pageKey = `${side}Page`, page = clan[pageKey];
    if (!logs.length) { root.appendChild(node('p', tr(item[`${key}Available`] ? 'raid.noLogs' : 'raid.logsUnavailable'), 'raid-note')); return; }
    for (const entry of logs.slice(page * 5, (page + 1) * 5)) {
      const detail = node('details', '', 'raid-encounter'), heading = node('summary');
      heading.append(node('strong', entry.opponent.name || entry.opponent.tag || '—'), node('small', tr('raid.encounterMeta', { destroyed: number(entry.districtsDestroyed), total: number(entry.districtCount), attacks: number(entry.attacks) })));
      detail.appendChild(heading);
      detail.appendChild(link(tr('raid.openClan'), entry.opponent.tag, 'clan'));
      const wrap = node('div', '', 'raid-table-wrap');
      const labels = ['raid.district', 'raid.destruction', 'raid.attacks', 'raid.loot'];
      const body = table(wrap, labels, 'raid.districts', true);
      for (const district of entry.districts) {
        const row = node('tr');
        cell(row, labels[0], `${district.name || '—'} · ${tr('raid.hall', { level: number(district.hallLevel) })}`);
        cell(row, labels[1], district.destruction == null ? '—' : `${number(district.destruction)}%`);
        cell(row, labels[2], number(district.attacks)); cell(row, labels[3], number(district.loot)); body.appendChild(row);
      }
      if (!entry.districts.length) wrap.replaceChildren(node('p', tr('raid.logsUnavailable'), 'raid-note'));
      detail.appendChild(wrap); root.appendChild(detail);
    }
    const pager = node('div', '', 'raid-pager'); root.appendChild(pager);
    pagination(pager, logs.length, page, 5, next => { clan[pageKey] = next; renderLog(side); });
  }
  function renderClan() {
    const select = el('raidWeekend'); select.replaceChildren();
    for (const item of clan.items) select.add(new Option(`${weekend(item)} · ${stateName(item.state)}`, item.id));
    if (!clan.items.some(item => item.id === clan.selected)) clan.selected = clan.items[0]?.id || '';
    select.value = clan.selected;
    const item = selectedSeason(); el('raidClanContent').hidden = !item;
    if (!item) return;
    const root = el('raidClanMetrics'); root.replaceChildren();
    for (const [label, value] of [['raid.totalLoot', item.loot], ['raid.attacks', item.totalAttacks], ['raid.raidsCompleted', item.raidsCompleted], ['raid.districtsDestroyed', item.districtsDestroyed], ['raid.participants', item.participants], ['raid.offensiveReward', item.offensiveReward], ['raid.defensiveReward', item.defensiveReward]]) metric(root, label, value);
    renderMembers(); renderLog('attack'); renderLog('defense');
  }
  async function loadClan(after = null) {
    if (!clan.tag || clan.loading) return;
    const request = ++clan.request; clan.loading = true;
    status('raidClanStatus', tr('raid.loading'), true); clanControls();
    try {
      const params = new URLSearchParams({ limit: '10' }); if (after) params.set('after', after);
      const response = await window.CocI18n.apiFetch(`/api/clan/${encodeURIComponent(clan.tag)}/raids?${params}`);
      const data = await response.json(); if (request !== clan.request) return;
      if (!response.ok) throw Error(data.error || tr('raid.failed'));
      const items = new Map(clan.items.map(item => [item.id, item]));
      (data.items || []).forEach(item => items.set(item.id, item));
      clan.items = [...items.values()].sort((a, b) => b.startTime.localeCompare(a.startTime));
      clan.next = data.paging?.cursors?.after || null; clan.loaded = true;
      clan.stale = data.stale; clan.refreshError = data.refreshError; clan.updated = data.lastUpdated;
      renderClan(); clanStatus();
    } catch (error) { if (request === clan.request) status('raidClanStatus', error.message || tr('raid.failed'), false, true); }
    finally { if (request === clan.request) { clan.loading = false; clanControls(); } }
  }
  function playerControls() {
    el('raidPlayerReload').disabled = player.loading || !player.tag;
    el('raidPlayerMore').hidden = !player.data?.paging?.cursors?.after;
    el('raidPlayerMore').disabled = player.loading;
    el('capital-raids').setAttribute('aria-busy', String(player.loading));
  }
  function renderPlayerRows() {
    const selected = el('raidPlayerClan').value;
    const items = (player.data?.items || []).filter(item => !selected || item.clanTag === selected);
    const root = el('raidPlayerTable');
    if (!items.length) { root.replaceChildren(node('p', tr('raid.noPlayerHistory'), 'raid-note')); el('raidPlayerPager').replaceChildren(); return; }
    const size = 10; player.page = Math.min(player.page, Math.ceil(items.length / size) - 1);
    const labels = ['raid.weekend', 'raid.clanFilter', 'raid.attacks', 'raid.loot', 'raid.average', 'raid.status'];
    const body = table(root, labels, 'raid.playerHistory');
    for (const item of items.slice(player.page * size, (player.page + 1) * size)) {
      const row = node('tr'), period = node('span', weekend(item)); period.appendChild(node('small', stateName(item.state)));
      cell(row, labels[0], period); cell(row, labels[1], link(item.clanName, item.clanTag, 'clan'));
      cell(row, labels[2], usage(item)); cell(row, labels[3], number(item.loot));
      cell(row, labels[4], number(item.lootPerAttack)); cell(row, labels[5], participation(item, item.state)); body.appendChild(row);
    }
    pagination(el('raidPlayerPager'), items.length, player.page, size, page => { player.page = page; renderPlayerRows(); });
  }
  function renderPlayer() {
    const data = player.data, root = el('raidPlayerMetrics'); root.replaceChildren();
    for (const [label, value] of [['raid.recordedWeekends', data.summary.weekends], ['raid.recordedAttacks', data.summary.attacks], ['raid.recordedLoot', data.summary.loot], ['raid.average', data.summary.lootPerAttack]]) metric(root, label, value);
    const filter = el('raidPlayerClan'), previous = filter.value; filter.replaceChildren(new Option(tr('raid.allClans'), ''));
    const clans = new Map(data.items.map(item => [item.clanTag, item.clanName]));
    for (const [tag, name] of clans) filter.add(new Option(name || tag, tag));
    filter.value = clans.has(previous) ? previous : '';
    renderPlayerRows();
    const text = tr(data.items.length ? 'raid.historyLoaded' : 'raid.noPlayerHistory', { count: number(data.items.length) });
    const partial = data.summary.complete ? '' : ` · ${tr('raid.partial')}`;
    status('raidPlayerStatus', `${text}${partial}${data.stale ? ` · ${tr('raid.stale')}` : ''}${data.refreshError ? ` ${data.refreshError}` : ''}`);
  }
  async function loadPlayer(after = null) {
    if (!player.tag || player.loading) return;
    const request = ++player.request; player.loading = true;
    status('raidPlayerStatus', tr('raid.loading'), true); playerControls();
    try {
      const params = new URLSearchParams({ limit: '10' });
      if (player.clan) params.set('clan', cleanTag(player.clan)); if (after) params.set('after', after);
      const response = await window.CocI18n.apiFetch(`/api/player/${encodeURIComponent(player.tag)}/raids?${params}`);
      const data = await response.json(); if (request !== player.request) return;
      if (!response.ok) throw Error(data.error || tr('raid.failed'));
      player.data = data; player.loaded = true; player.clan = data.contextClanTag; renderPlayer();
    } catch (error) { if (request === player.request) status('raidPlayerStatus', error.message || tr('raid.failed'), false, true); }
    finally { if (request === player.request) { player.loading = false; playerControls(); } }
  }
  window.ClanRaids = {
    initialize(tag) {
      clan.request++; Object.assign(clan, { tag: cleanTag(tag), items: [], next: null, selected: '', page: 0, attackPage: 0, defensePage: 0, loaded: false, loading: false, stale: false, refreshError: null });
      el('raidMemberSearch').value = ''; el('raidMemberSort').value = 'loot';
      el('raidClanContent').hidden = true; el('raidWeekend').replaceChildren(); clanControls();
      if (location.hash === '#clan-capital') el('raidClanPanel').open = true;
      if (el('raidClanPanel').open) loadClan();
    }
  };
  window.PlayerRaids = {
    initialize(profile, contextClan) {
      player.request++; Object.assign(player, { tag: cleanTag(profile.tag), clan: profile.clan?.tag || contextClan || null, data: null, page: 0, loaded: false, loading: false });
      el('raidPlayerMetrics').replaceChildren(); el('raidPlayerTable').replaceChildren(); el('raidPlayerPager').replaceChildren(); playerControls();
      el('raidPlayerClan').replaceChildren(new Option(tr('raid.allClans'), ''));
      if (!el('capital-raids').hidden) loadPlayer();
    },
    activate() { if (!player.loaded) loadPlayer(); }
  };
  if (el('raidClanPanel')) {
    el('raidClanPanel').addEventListener('toggle', () => { if (el('raidClanPanel').open && !clan.loaded) loadClan(); });
    const openFromHash = () => { if (location.hash === '#clan-capital') { el('raidClanPanel').open = true; if (!clan.loaded) loadClan(); } };
    window.addEventListener('hashchange', openFromHash);
    el('raidClanReload').addEventListener('click', () => loadClan());
    el('raidClanMore').addEventListener('click', () => loadClan(clan.next));
    el('raidWeekend').addEventListener('change', event => { clan.selected = event.target.value; clan.page = clan.attackPage = clan.defensePage = 0; renderClan(); clanStatus(); });
    el('raidMemberSearch').addEventListener('input', () => { clan.page = 0; renderMembers(); });
    el('raidMemberSort').addEventListener('change', () => { clan.page = 0; renderMembers(); });
  }
  if (el('capital-raids')) {
    el('raidPlayerReload').addEventListener('click', () => loadPlayer());
    el('raidPlayerMore').addEventListener('click', () => loadPlayer(player.data?.paging?.cursors?.after));
    el('raidPlayerClan').addEventListener('change', () => { player.page = 0; renderPlayerRows(); });
  }
})();
