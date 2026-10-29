const HERO_ORDER = ['Barbarian King', 'Archer Queen', 'Grand Warden', 'Royal Champion', 'Minion Prince', 'Dragon Duke', 'Battle Machine', 'Battle Copter'];
const SECTION_ORDER = [
  ['heroes', 'Heroes'], ['heroEquipment', 'Hero Equipment'], ['pets', 'Pets'],
  ['troops', 'Troops'], ['superTroops', 'Super Troops'], ['builderBase', 'Builder Base'], ['spells', 'Spells']
];
const SECTION_KEY_BY_TITLE = Object.fromEntries(SECTION_ORDER.map(([key, title]) => [title, key]));
const params = new URLSearchParams(location.search);
let clanTag = normalizeTag(params.get('clan'));
let currentProgress = null;
let currentArmy = null;
let currentProfileData = null;
let currentPerformanceData = null;
const tr = (key, variables) => window.CocI18n.t(key, variables);
const localizedNumber = (value, options) => window.CocI18n.number(value, options);
const localizedDate = value => window.CocI18n.dateTime(new Date(value));
window.CocI18n.setPageTitle('player');
const backLink = document.getElementById('backLink');
if (clanTag) backLink.href = `/?clan=${encodeURIComponent(clanTag)}`;

function normalizeTag(value) {
  const tag = String(value || '').trim().replace(/^#/, '').toUpperCase();
  return /^[0289PYLQGRJCUV]{3,15}$/.test(tag) ? tag : null;
}

function setText(id, value) {
  document.getElementById(id).textContent = value ?? '—';
}
function setLoading(id, message) {
  const el = document.getElementById(id);
  const spin = document.createElement('span');
  spin.className = 'loading-spinner';
  spin.setAttribute('aria-hidden', 'true');
  const text = document.createElement('span');
  text.textContent = message;
  el.replaceChildren(spin, text);
  el.classList.add('loading-state');
  el.setAttribute('aria-busy', 'true');
}

function rushedLabel(progress) {
  return tr(!progress.complete ? 'player.rushed.unknown' : progress.rushed.rushed ? 'player.rushed.yes' : 'player.rushed.no');
}

function localizedProgressReason(reason) {
  if (reason === 'Cakupan batas level belum lengkap; status rushed ditahan agar tidak menyesatkan.') return tr('player.reasonPartial');
  if (reason === 'Skor keseluruhan di bawah 60%.') return tr('player.reasonLowOverall');
  if (reason === 'Kategori utama yang tersedia masih berada di ambang aman.') return tr('player.reasonSafe');
  const below50 = /^Kategori (.+) di bawah 50%\.$/.exec(reason);
  if (below50) return tr('player.reasonBelow50', { category: below50[1] });
  const below60 = /^Kategori (.+) perlu perhatian karena di bawah 60%\.$/.exec(reason);
  return below60 ? tr('player.reasonBelow60', { category: below60[1] }) : reason;
}

function wikiArticle(name) {
  return `https://clashofclans.fandom.com/wiki/${encodeURIComponent(name.replaceAll(' ', '_'))}`;
}

function renderBaseLevel(id, level, type) {
  const element = document.getElementById(id);
  const numericLevel = Number(level);
  element.replaceChildren();
  element.classList.add('base-level');
  if (!Number.isInteger(numericLevel) || numericLevel < 1) {
    element.textContent = '—';
    return;
  }
  const label = type === 'th' ? 'Town Hall' : 'Builder Hall';
  const icon = document.createElement('img');
  icon.src = `/${type}-${numericLevel}.webp`;
  icon.alt = `${label} level ${numericLevel}`;
  icon.loading = 'eager';
  icon.addEventListener('error', () => icon.remove());
  const number = document.createElement('span');
  number.className = 'base-level-number';
  number.textContent = numericLevel;
  element.append(icon, number);
}

const VERIFIED_WIKI_ICONS = {
  'Heroes:Royal Champion': 'https://static.wikia.nocookie.net/clashofclans/images/8/8e/Avatar_Hero_Royal_Champion.png/revision/latest/scale-to-width-down/100?cb=20200913051659'
};

function wikiIconCandidates(item, section) {
  const name = item.name;
  const base = name.replaceAll(' ', '_');
  const files = section === 'Heroes' || (section === 'Builder Base' && /^Battle (Machine|Copter)$/.test(name))
    ? [`Avatar_Hero_${base}.png`, `${base}_Icon.png`]
    : section === 'Spells'
      ? [`${base}_info.png`, `Avatar_${base}.png`, `${base}_Icon.png`]
      : section === 'Hero Equipment'
        ? [`${base}.png`, `${base}_info.png`, `Icon_${base}.png`, `${base}_Icon.png`, `Avatar_${base}.png`]
        : [`Avatar_${base}.png`, `${base}_Icon.png`];
  const candidates = files.map(file => `https://clashofclans.fandom.com/wiki/Special:FilePath/${encodeURIComponent(file)}?width=96`);
  const verified = VERIFIED_WIKI_ICONS[`${section}:${name}`];
  const local = `/api/player-icon?${new URLSearchParams({ name, section: SECTION_KEY_BY_TITLE[section] || section })}`;
  return [...new Set([...(item.iconUrls || []), verified, ...candidates, local].filter(Boolean))];
}

function makeIcon(item, section) {
  const box = document.createElement('div');
  box.className = 'icon-box';
  const fallback = document.createElement('span');
  fallback.className = 'icon-fallback';
  fallback.textContent = item.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
  box.appendChild(fallback);
  const candidates = wikiIconCandidates(item, section);
  const img = document.createElement('img');
  img.alt = '';
  img.loading = 'lazy';
  img.referrerPolicy = 'no-referrer';
  img.style.opacity = '0';
  let index = 0;
  img.addEventListener('load', () => { img.style.opacity = '1'; fallback.hidden = true; });
  img.addEventListener('error', () => {
    index += 1;
    if (index < candidates.length) img.src = candidates[index];
    else img.remove();
  });
  img.src = candidates[0];
  box.appendChild(img);
  const level = document.createElement('span');
  level.className = 'level';
  const isMaxLevel = Number.isFinite(Number(item.level)) &&
    Number.isFinite(Number(item.maxLevel)) && Number(item.maxLevel) > 0 &&
    Number(item.level) >= Number(item.maxLevel);
  if (isMaxLevel) level.classList.add('max-level');
  level.textContent = item.level ?? '—';
  box.appendChild(level);
  return box;
}

function addDetail(label, value) {
  const list = document.getElementById('itemDetails');
  const dt = document.createElement('dt');
  dt.textContent = label;
  const dd = document.createElement('dd');
  dd.textContent = value ?? tr('player.unavailable');
  list.append(dt, dd);
}

function showItem(item, section) {
  setText('itemTitle', item.name);
  const icon = document.getElementById('detailIcon');
  icon.replaceChildren(makeIcon(item, section));
  document.getElementById('itemDetails').replaceChildren();
  addDetail(tr('player.detailCategory'), section);
  addDetail(tr('player.detailPlayerLevel'), item.level);
  addDetail(tr('player.detailApiMax'), item.maxLevel);
  addDetail(tr('player.detailVillage'), item.village === 'builderBase' ? 'Builder Base' : 'Home Village');
  if (item.equipmentHero) addDetail('Hero', item.equipmentHero);
  const link = document.getElementById('wikiLink');
  link.href = wikiArticle(item.name);
  document.getElementById('itemDialog').showModal();
}

function makeItem(item, section) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'item';
  button.title = tr('player.itemTooltip', { name: item.name, level: item.level ?? tr('player.unavailable') });
  button.setAttribute('aria-label', button.title);
  button.appendChild(makeIcon(item, section));
  const name = document.createElement('span');
  name.className = 'item-name';
  name.textContent = item.name;
  button.appendChild(name);
  button.addEventListener('click', () => showItem(item, section));
  return button;
}

function renderEquipment(container, items) {
  const grid = document.createElement('div');
  grid.className = 'equipment-grid';
  const groups = new Map();
  for (const item of items) {
    const hero = item.equipmentHero || 'Equipment lainnya';
    if (!groups.has(hero)) groups.set(hero, []);
    groups.get(hero).push(item);
  }
  const order = [...HERO_ORDER, ...[...groups.keys()].filter(name => !HERO_ORDER.includes(name))];
  for (const hero of order) {
    if (!groups.has(hero)) continue;
    const card = document.createElement('div');
    card.className = 'equipment-card';
    const heading = document.createElement('h4');
    heading.textContent = hero;
    const row = document.createElement('div');
    row.className = 'item-grid';
    groups.get(hero).forEach(item => row.appendChild(makeItem(item, 'Hero Equipment')));
    card.append(heading, row);
    grid.appendChild(card);
  }
  container.appendChild(grid);
}

function renderArmy(army) {
  const root = document.getElementById('armySections');
  root.replaceChildren();
  let total = 0;
  for (const [key, title] of SECTION_ORDER) {
    const items = army[key] || [];
    total += items.length;
    const section = document.createElement('section');
    section.className = 'army-group';
    const heading = document.createElement('h3');
    heading.textContent = `${title} · ${items.length}`;
    section.appendChild(heading);
    if (key === 'heroEquipment' && items.length) renderEquipment(section, items);
    else if (items.length) {
      const row = document.createElement('div');
      row.className = 'item-grid';
      items.forEach(item => row.appendChild(makeItem(item, title)));
      section.appendChild(row);
    } else {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = tr('player.emptyItems');
      section.appendChild(empty);
    }
    root.appendChild(section);
  }
  setText('armyCount', tr('player.itemCount', { count: localizedNumber(total) }));
}

function renderProgress(progress) {
  currentProgress = progress;
  const exact = progress.tableExactMatch;
  setText('score', progress.score.overall !== null ? `${localizedNumber(progress.score.overall)}%${progress.complete ? '' : tr('player.partial')}` : tr('player.unavailable'));
  setText('rushed', rushedLabel(progress));
  const categories = Object.entries(progress.score.categories);
  const known = categories.reduce((sum, [, value]) => sum + value.knownItems, 0);
  const expected = categories.reduce((sum, [, value]) => sum + value.expectedItems, 0);
  setText('coverage', `${known}/${expected}`);
  const source = progress.tableExactMatch ? tr('player.apiMaxSource') : tr('player.localTableSource', { th: progress.tableTownHallLevel });
  const limits = [tr('player.limitBuildings'), tr(progress.tableExactMatch ? 'player.limitApi' : 'player.limitLocal', { th: progress.tableTownHallLevel }), tr('player.limitScope')];
  setText('progressNotice', `${source}. ${limits.join(' ')}`);
  const grid = document.getElementById('categoryProgress');
  grid.replaceChildren();
  const names = { heroes: 'Hero', troops: 'Troops', spells: 'Spells', pets: 'Pets' };
  for (const [key, value] of categories) {
    const box = document.createElement('div');
    const label = document.createElement('span');
    label.textContent = `${names[key] || key} · ${value.knownItems}/${value.expectedItems}`;
    const number = document.createElement('b');
    number.textContent = value.percent !== null ? `${localizedNumber(value.percent)}%` : '—';
    box.append(label, number);
    grid.appendChild(box);
  }
  const reasons = document.getElementById('reasons');
  reasons.replaceChildren();
  for (const reason of progress.rushed.reasons) {
    const li = document.createElement('li');
    li.textContent = localizedProgressReason(reason);
    reasons.appendChild(li);
  }
  const priorities = document.getElementById('upgradePriorities');
  priorities.replaceChildren();
  for (const item of progress.priorities || []) {
    const row = document.createElement('div');
    row.className = 'priority-row';
    row.textContent = tr('player.priorityLevels', { name: item.name, level: item.level, max: item.maxLevel, remaining: item.levelsRemaining });
    priorities.appendChild(row);
  }
  if (!progress.priorities?.length) priorities.textContent = tr('player.missingPriorities');
  const builder = progress.score.builderBase;
  setText('builderProgress', tr('player.builderProgress', { percent: builder.percent === null ? tr('player.cannotCalculate') : `${localizedNumber(builder.percent)}%`, count: localizedNumber(builder.knownItems) }));
  renderProgressTools(progress);
}

function progressItems(progress) {
  const items = [];
  for (const [category, value] of Object.entries(progress.score.categories || {})) {
    for (const item of value.items || []) items.push({ ...item, category });
  }
  for (const item of progress.score.builderBase?.items || []) items.push({ ...item, category: 'builderBase' });
  return items;
}

function renderProgressTools(progress) {
  const items = progressItems(progress);
  const search = (document.getElementById('progressSearch')?.value || '').trim().toLocaleLowerCase(window.CocI18n.formatLocale);
  const filter = document.getElementById('progressFilter')?.value || 'all';
  const sort = document.getElementById('progressSort')?.value || 'gap';
  const visible = items.filter(item => {
    const gap = Math.max(0, Number(item.maxLevel || 0) - Number(item.level || 0));
    const match = !search || String(item.name || '').toLocaleLowerCase(window.CocI18n.formatLocale).includes(search);
    return match && (filter === 'all' || (filter === 'behind' && gap > 0) || (filter === 'maxed' && gap === 0) || (filter === 'priority' && gap >= 3));
  }).sort((a, b) => {
    if (sort === 'name') return String(a.name).localeCompare(String(b.name));
    if (sort === 'level') return Number(b.level || 0) - Number(a.level || 0);
    if (sort === 'progress') return (Number(a.level || 0) / Math.max(1, Number(a.maxLevel || 1))) - (Number(b.level || 0) / Math.max(1, Number(b.maxLevel || 1)));
    return (Number(b.maxLevel || 0) - Number(b.level || 0)) - (Number(a.maxLevel || 0) - Number(a.level || 0));
  });
  const planner = document.getElementById('upgradePlanner'); planner.replaceChildren();
  const heading = document.createElement('h3'); heading.textContent = tr('player.plannerCount', { count: localizedNumber(visible.length) }); planner.appendChild(heading);
  visible.slice(0, 8).forEach(item => {
    const gap = Math.max(0, Number(item.maxLevel || 0) - Number(item.level || 0));
    const row = document.createElement('div'); row.className = 'planner-row';
    row.textContent = `${item.name} · ${item.level}/${item.maxLevel} · gap ${gap} · ${tr(gap >= 3 ? 'player.highPriority' : 'player.normalPriority')}`; planner.appendChild(row);
  });
  const distribution = document.getElementById('progressDistribution'); distribution.replaceChildren();
  const groups = [[tr('player.maxedGroup'), items.filter(i => Number(i.level) >= Number(i.maxLevel) && Number(i.maxLevel) > 0).length], [tr('player.nearGroup'), items.filter(i => Number(i.maxLevel) - Number(i.level) > 0 && Number(i.maxLevel) - Number(i.level) <= 2).length], [tr('player.behindGroup'), items.filter(i => Number(i.maxLevel) - Number(i.level) >= 3).length]];
  groups.forEach(([label, count]) => { const el = document.createElement('span'); el.textContent = `${label}: ${count}`; distribution.appendChild(el); });
  const radar = document.getElementById('progressRadar'); radar.replaceChildren();
  Object.entries(progress.score.categories || {}).forEach(([key, value]) => { const row = document.createElement('div'); row.className = 'progress-radar-row'; row.innerHTML = `<span>${key}</span><i style="width:${Math.min(100, Number(value.percent || 0))}%"></i><b>${value.percent ?? '—'}%</b>`; radar.appendChild(row); });
}

function renderPlayerOverview(player, progress, updated, extra) {
  window.PlayerOverview.render(player, progress, updated, extra);
}

function renderPerformance(data) {
  currentPerformanceData = data;
  window.PlayerOverview.update('performance',{status:'ready',data},currentProfileData?.player?.tag);
  const noteKey = data.note?.startsWith('Riwayat digabungkan') ? 'player.performanceNoteMerged'
    : data.note?.startsWith('Arsip perang dimulai') ? 'player.performanceNoteArchive' : null;
  setText('performanceNote', noteKey ? tr(noteKey) : data.note);
  const summary = document.getElementById('performanceSummary');
  summary.replaceChildren();
  for (const [label, value] of [[tr('player.warCount'), data.summary.wars], [tr('player.attackCount'), data.summary.attacks], [tr('player.starCount'), data.summary.stars], [tr('player.starsPerAttack'), data.summary.starsPerAttack ?? '—'], [tr('player.averageDestruction'), data.summary.destructionAverage === null ? '—' : `${localizedNumber(data.summary.destructionAverage)}%`], [tr('player.missedQuota'), data.summary.missed]]) {
    const box = document.createElement('div');
    const small = document.createElement('span'); small.textContent = label;
    const strong = document.createElement('strong'); strong.textContent = value;
    box.append(small, strong); summary.appendChild(box);
  }
  const quality = document.getElementById('performanceQuality'); quality.replaceChildren();
  const sample = Number(data.summary.attacks || 0); quality.textContent = tr('player.sampleQuality', { quality: tr(sample >= 15 ? 'player.qualityStrong' : sample >= 5 ? 'player.qualityFair' : 'player.qualityLow'), count: localizedNumber(sample) });
  const distribution = document.getElementById('performanceDistribution'); distribution.replaceChildren();
  const attacks = data.wars.flatMap(war => war.attacks || []);
  [['0★', 0], ['1★', 1], ['2★', 2], ['3★', 3]].forEach(([label, stars]) => { const item = document.createElement('span'); item.textContent = `${label}: ${attacks.filter(attack => Number(attack.stars) === stars).length}`; distribution.appendChild(item); });
  const mode = document.createElement('span'); mode.textContent = `CWL ${data.wars.filter(war => war.type === 'CWL').length} · ${tr('player.classic')} ${data.wars.filter(war => war.type !== 'CWL').length}`; distribution.appendChild(mode);
  const chart = document.getElementById('performanceChart');
  chart.replaceChildren();
  const wars = document.getElementById('performanceWars');
  wars.replaceChildren();
  for (const war of data.wars) {
    const warLabel = war.type === 'CWL' ? 'CWL' : tr('compare.classicWar');
    const stateKey = `clan.phase.${war.state}`;
    const stateLabel = window.CocI18n.hasTranslation(stateKey, window.CocI18n.locale) ? tr(stateKey) : war.state;
    const bar = document.createElement('div'); bar.className = 'performance-bar';
    const label = document.createElement('span'); label.textContent = `${warLabel}${war.round ? ` R${war.round}` : ''} · ${war.opponent?.name || tr('player.enemy')}`;
    const track = document.createElement('div'); track.className = 'bar-track';
    const fill = document.createElement('div'); fill.style.width = `${Math.min(100, war.stars / Math.max(1, war.quota * 3) * 100)}%`; track.appendChild(fill);
    const value = document.createElement('b'); value.textContent = `${war.stars}★ / ${war.attacks.length} ${tr('player.attackCount').toLowerCase()}`;
    bar.append(label, track, value); chart.appendChild(bar);
    const row = document.createElement('div'); row.className = 'history-row';
    row.textContent = `${warLabel}${war.round ? ` · ${tr('player.round', { round: war.round })}` : ''} · ${war.opponent?.name || tr('player.enemy')} · ${stateLabel} · ${war.stars}★ · ${war.destructionAverage}% ${tr('player.destruction').toLowerCase()}${war.missed ? ` · ${tr('player.missedQuota').toLowerCase()}` : ''}`;
    wars.appendChild(row);
  }
  if (!data.wars.length) { chart.textContent = tr('player.noWars'); wars.textContent = tr('player.archiveGrowth'); }
  const trend = document.getElementById('snapshotTrend'); trend.replaceChildren();
  if (!data.trendAvailable) { trend.textContent = tr('player.trendPending'); return; }
  const trophies = data.trend.map(point => point.trophies);
  const min = Math.min(...trophies);
  const max = Math.max(...trophies);
  for (const point of data.trend) {
    const row = document.createElement('div'); row.className = 'trend-row';
    const label = document.createElement('span'); label.textContent = point.date;
    const bar = document.createElement('div'); bar.className = 'trend-track';
    const fill = document.createElement('div'); fill.style.width = `${max === min ? 50 : 10 + 90 * (point.trophies - min) / (max - min)}%`; bar.appendChild(fill);
    const value = document.createElement('span'); value.textContent = tr('player.trophyDonation', { trophies: localizedNumber(point.trophies), donations: localizedNumber(point.donations) });
    row.append(label, bar, value);
    trend.appendChild(row);
  }
}

function renderPlayerResume(player, progress) {
  const score = progress.score.overall === null ? tr('player.cannotCalculate') : `${localizedNumber(progress.score.overall)}%`;
  const summary = currentPerformanceData?.summary;
  const warText = summary?.attacks ? tr('player.resumeWar', { attacks: localizedNumber(summary.attacks), average: summary.starsPerAttack ?? '—' }) : tr('player.resumeNoWar');
  setText('playerResumeText', tr('player.resumeCore', { name: player.name, th: player.townHallLevel || '—', score, status: rushedLabel(progress), warText }));
  setText('dataSourceNote', tr('player.dataSource'));
}

async function loadPerformance(player) {
  const tag = normalizeTag(clanTag || player.clan?.tag);
  if (!tag) { setText('performanceNote', tr('player.archiveNoClan')); window.PlayerOverview.update('performance',{status:'empty'},player.tag); return; }
  try {
    const endpoint = `/api/player/${encodeURIComponent(normalizeTag(player.tag))}/performance?clan=${encodeURIComponent(tag)}`;
    let response = await window.CocI18n.apiFetch(endpoint);
    let data = await response.json();
    if (!response.ok) throw new Error(data.error || tr('player.performanceFailed'));
    if (!data.wars.length) {
      const warResponse = await window.CocI18n.apiFetch(`/api/clan/${encodeURIComponent(tag)}/war`);
      if (warResponse.ok) {
        const war = await warResponse.json();
        if (war.type === 'CWL') await window.CocI18n.apiFetch(`/api/clan/${encodeURIComponent(tag)}/cwl/performance`);
        response = await window.CocI18n.apiFetch(endpoint);
        if (response.ok) data = await response.json();
      }
    }
    if (normalizeTag(currentProfileData?.player?.tag)!==normalizeTag(player.tag)) return;
    renderPerformance(data);
    if (currentProfileData) renderPlayerResume(currentProfileData.player, currentProfileData.progress);
  } catch (error) { setText('performanceNote', error.message); window.PlayerOverview.update('performance',{status:'error'},player.tag); }
}

function renderProfile(data) {
  const player = data.player;
  currentProfileData = data;
  window.RecentlyOpened?.player({ tag: player.tag, name: player.name, meta: player.townHallLevel ? `TH ${player.townHallLevel}` : '' });
  const playerClanTag = normalizeTag(player.clan?.tag);
  if (!clanTag && playerClanTag) clanTag = playerClanTag;
  if (clanTag) backLink.href = `/?clan=${encodeURIComponent(clanTag)}`;
  const compareParams = new URLSearchParams({ player1: normalizeTag(player.tag) });
  const compareClan = clanTag || normalizeTag(player.clan?.tag);
  if (compareClan) compareParams.set('clan', compareClan);
  document.getElementById('compareLink').href = `/compare.html?${compareParams}`;
  window.CocI18n.setPageTitle('player', [player.name || player.tag]);
  window.PlayerOverview.renderName(player.name);
  setText('copyTag', player.tag);
  const clanName = document.getElementById('clanName');
  clanName.replaceChildren();
  if (playerClanTag && player.clan?.name) {
    const clanLink = document.createElement('a');
    clanLink.href = `/?clan=${encodeURIComponent(playerClanTag)}`;
    clanLink.textContent = player.clan.name;
    clanLink.title = `${tr('player.openClan')} ${player.clan.name}`;
    clanName.appendChild(clanLink);
  } else {
    clanName.textContent = tr('player.noClan');
  }
  setText('role', player.role || '');
  window.AccountFeatures.renderWarPreference(document.getElementById('playerWarPreference'), player.warPreference);
  window.AccountFeatures.renderAchievements(data.achievements);
  renderBaseLevel('townHall', player.townHallLevel, 'th');
  renderBaseLevel('builderHall', player.builderHallLevel, 'bh');
  setText('exp', player.expLevel);
  setText('trophies', player.trophies == null ? '—' : localizedNumber(player.trophies));
  setText('warStars', player.warStars == null ? '—' : localizedNumber(player.warStars));
  setText('donations', player.donations == null ? '—' : localizedNumber(player.donations));
  const badge = document.getElementById('clanBadge');
  const badgeUrl = player.clan?.badgeUrls?.large || player.clan?.badgeUrls?.medium || player.clan?.badgeUrls?.small;
  document.getElementById('profileClanFallback').hidden = Boolean(badgeUrl);
  badge.hidden = !badgeUrl;
  badge.onerror = () => {badge.hidden = true;document.getElementById('profileClanFallback').hidden = false;};
  if (badgeUrl) badge.src = badgeUrl;
  renderArmy(data.army);
  renderProgress(data.progress);
  currentArmy = data.army;
  renderPlayerOverview(player, data.progress, data.lastUpdated, {army:data.army,achievements:data.achievements});
  renderPlayerResume(player, data.progress);
  PlayerLeague.initialize(player);
  window.PlayerRaids.initialize(player, clanTag);
  window.PlayerRaids.activate();
  loadPerformance(player);
  document.getElementById('profile').hidden = false;
  document.getElementById('status').hidden = true;
  document.getElementById('copyTag').onclick = async () => {
    try { await navigator.clipboard.writeText(player.tag); setText('copyTag', tr('player.copied')); setTimeout(() => setText('copyTag', player.tag), 1500); } catch { setText('copyTag', player.tag); }
  };
}

async function loadProfile(rawTag) {
  const tag = normalizeTag(rawTag);
  const status = document.getElementById('status');
  if (!tag) { status.hidden = false; status.textContent = tr('player.invalidTag'); return; }
  window.CocI18n.setPageTitle('player', ['#' + tag]);
  document.getElementById('playerTag').value = tag;
  document.getElementById('profile').hidden = true;
  status.hidden = false;
  setLoading('status', tr('player.loadingProfile'));
  try {
    const response = await window.CocI18n.apiFetch(`/api/player/${encodeURIComponent(tag)}/profile`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || tr('player.fetchFailed'));
    renderProfile(data);
  } catch (error) { status.textContent = error.message; }
  finally {
    status.removeAttribute('aria-busy');
    status.classList.remove('loading-state');
  }
}

document.getElementById('playerSearch').addEventListener('submit', event => {
  event.preventDefault();
  const tag = normalizeTag(document.getElementById('playerTag').value);
  if (!tag) { setText('status', tr('player.invalidTagShort')); document.getElementById('status').hidden = false; return; }
  const next = new URLSearchParams({ tag });
  if (clanTag) next.set('clan', clanTag);
  location.href = `/player.html?${next}`;
});
document.getElementById('closeDialog').addEventListener('click', () => document.getElementById('itemDialog').close());
document.getElementById('itemDialog').addEventListener('click', event => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});
document.querySelectorAll('.tabs button').forEach(button => button.addEventListener('click', () => {
  for (const tab of document.querySelectorAll('.tabs button')) tab.setAttribute('aria-selected', String(tab === button));
  for (const section of ['army', 'progress', 'performance', 'ranked-battles', 'capital-raids', 'achievements']) document.getElementById(section).hidden = section !== button.dataset.tab;
  if (button.dataset.tab === 'capital-raids') window.PlayerRaids.activate();
  history.replaceState(null, '', `#${button.dataset.tab}`);
  updatePlayerCopyContext();
}));
function updatePlayerCopyContext() {
  const button=document.getElementById('copyPlayerLink');
  window.CocShare.resetCopy(button,document.getElementById('playerLinkStatus'));
  const tab=document.querySelector('.player-tabs [aria-selected=true]')?.textContent.trim() || 'Army';
  button.title=tr('share.copyProfileTabContext',{tab});button.setAttribute('aria-label',button.title);
}
updatePlayerCopyContext();
['progressSearch', 'progressFilter', 'progressSort'].forEach(id => document.getElementById(id)?.addEventListener(id === 'progressSearch' ? 'input' : 'change', () => currentProgress && renderProgressTools(currentProgress)));
document.getElementById('copyPlayerResume').addEventListener('click', async () => { try { await navigator.clipboard.writeText(document.getElementById('playerResumeText').textContent); setText('copyPlayerResume', tr('player.copied')); } catch {} });
document.getElementById('copyPlayerLink').addEventListener('click', event => window.CocShare.copyLink(event.currentTarget,document.getElementById('playerLinkStatus')));
document.getElementById('exportPlayerCsv').addEventListener('click', () => { const p = currentProfileData?.player; if (!p) return; const csv = `\uFEFFfield,value\r\nname,"${String(p.name || '').replaceAll('"', '""')}"\r\ntag,"${p.tag || ''}"\r\ntownHall,${p.townHallLevel || ''}\r\ntrophies,${p.trophies || ''}\r\nwarStars,${p.warStars || ''}`; const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = `player-${normalizeTag(p.tag)}.csv`; link.click(); URL.revokeObjectURL(url); });
const tabFromHash = location.hash.replace('#', '') || params.get('view');
if (['army', 'progress', 'performance', 'ranked-battles', 'capital-raids', 'achievements'].includes(tabFromHash)) document.querySelector(`.tabs button[data-tab="${tabFromHash}"]`)?.click();
if (params.has('tag')) loadProfile(params.get('tag'));
