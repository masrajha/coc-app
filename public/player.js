const HERO_ORDER = ['Barbarian King', 'Archer Queen', 'Grand Warden', 'Royal Champion', 'Minion Prince', 'Dragon Duke', 'Battle Machine', 'Battle Copter'];
const SECTION_ORDER = [
  ['heroes', 'Heroes'], ['heroEquipment', 'Hero Equipment'], ['pets', 'Pets'],
  ['troops', 'Troops'], ['superTroops', 'Super Troops'], ['builderBase', 'Builder Base'], ['spells', 'Spells']
];
const SECTION_KEY_BY_TITLE = Object.fromEntries(SECTION_ORDER.map(([key, title]) => [title, key]));
const params = new URLSearchParams(location.search);
const clanTag = normalizeTag(params.get('clan'));
const backLink = document.getElementById('backLink');
if (clanTag) backLink.href = `/?clan=${encodeURIComponent(clanTag)}`;

function normalizeTag(value) {
  const tag = String(value || '').trim().replace(/^#/, '').toUpperCase();
  return /^[0289PYLQGRJCUV]{3,15}$/.test(tag) ? tag : null;
}

function setText(id, value) {
  document.getElementById(id).textContent = value ?? '—';
}

function wikiArticle(name) {
  return `https://clashofclans.fandom.com/wiki/${encodeURIComponent(name.replaceAll(' ', '_'))}`;
}

const VERIFIED_WIKI_ICONS = {
  'Heroes:Royal Champion': 'https://static.wikia.nocookie.net/clashofclans/images/8/8e/Avatar_Hero_Royal_Champion.png/revision/latest/scale-to-width-down/100?cb=20200913051659',
  'Hero Equipment:Barbarian Puppet': 'https://static.wikia.nocookie.net/clashofclans/images/9/96/Barbarian_Puppet.png/revision/latest/scale-to-width-down/100?cb=20231211153430'
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
  dd.textContent = value ?? 'Tidak tersedia';
  list.append(dt, dd);
}

function showItem(item, section) {
  setText('itemTitle', item.name);
  const icon = document.getElementById('detailIcon');
  icon.replaceChildren(makeIcon(item, section));
  document.getElementById('itemDetails').replaceChildren();
  addDetail('Kategori', section);
  addDetail('Level pemain', item.level);
  addDetail('Max level dari API', item.maxLevel);
  addDetail('Desa', item.village === 'builderBase' ? 'Builder Base' : 'Home Village');
  if (item.equipmentHero) addDetail('Hero', item.equipmentHero);
  const link = document.getElementById('wikiLink');
  link.href = wikiArticle(item.name);
  document.getElementById('itemDialog').showModal();
}

function makeItem(item, section) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'item';
  button.title = `${item.name} · level ${item.level ?? 'tidak tersedia'}`;
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
      empty.textContent = 'Belum ada item dalam respons profil.';
      section.appendChild(empty);
    }
    root.appendChild(section);
  }
  setText('armyCount', `${total} item dari API`);
}

function renderProgress(progress) {
  const exact = progress.tableExactMatch;
  setText('score', progress.score.overall !== null ? `${progress.score.overall.toLocaleString('id-ID')}%${progress.complete ? '' : ' (parsial)'}` : 'Belum tersedia');
  setText('rushed', progress.rushed.label);
  const categories = Object.entries(progress.score.categories);
  const known = categories.reduce((sum, [, value]) => sum + value.knownItems, 0);
  const expected = categories.reduce((sum, [, value]) => sum + value.expectedItems, 0);
  setText('coverage', `${known}/${expected}`);
  setText('progressNotice', `${progress.baselineSource}. ${progress.limitations.join(' ')}`);
  const grid = document.getElementById('categoryProgress');
  grid.replaceChildren();
  const names = { heroes: 'Hero', troops: 'Troops', spells: 'Spells', pets: 'Pets' };
  for (const [key, value] of categories) {
    const box = document.createElement('div');
    const label = document.createElement('span');
    label.textContent = `${names[key] || key} · ${value.knownItems}/${value.expectedItems}`;
    const number = document.createElement('b');
    number.textContent = value.percent !== null ? `${value.percent.toLocaleString('id-ID')}%` : '—';
    box.append(label, number);
    grid.appendChild(box);
  }
  const reasons = document.getElementById('reasons');
  reasons.replaceChildren();
  for (const reason of progress.rushed.reasons) {
    const li = document.createElement('li');
    li.textContent = reason;
    reasons.appendChild(li);
  }
  const priorities = document.getElementById('upgradePriorities');
  priorities.replaceChildren();
  for (const item of progress.priorities || []) {
    const row = document.createElement('div');
    row.className = 'priority-row';
    row.textContent = `${item.name} · ${item.level}/${item.maxLevel} · kurang ${item.levelsRemaining} level`;
    priorities.appendChild(row);
  }
  if (!progress.priorities?.length) priorities.textContent = 'Belum ada prioritas yang dapat dihitung.';
  const builder = progress.score.builderBase;
  setText('builderProgress', `Builder Base: ${builder.percent === null ? 'belum dapat dihitung' : `${builder.percent.toLocaleString('id-ID')}%`} · ${builder.knownItems} item dengan batas level API.`);
}

function renderPerformance(data) {
  setText('performanceNote', data.note);
  const summary = document.getElementById('performanceSummary');
  summary.replaceChildren();
  for (const [label, value] of [['Perang', data.summary.wars], ['Serangan', data.summary.attacks], ['Bintang', data.summary.stars], ['Bintang/serangan', data.summary.starsPerAttack ?? '—'], ['Destruksi rata-rata', data.summary.destructionAverage === null ? '—' : `${data.summary.destructionAverage}%`], ['Kuota terlewat', data.summary.missed]]) {
    const box = document.createElement('div');
    const small = document.createElement('span'); small.textContent = label;
    const strong = document.createElement('strong'); strong.textContent = value;
    box.append(small, strong); summary.appendChild(box);
  }
  const chart = document.getElementById('performanceChart');
  chart.replaceChildren();
  const wars = document.getElementById('performanceWars');
  wars.replaceChildren();
  for (const war of data.wars) {
    const bar = document.createElement('div'); bar.className = 'performance-bar';
    const label = document.createElement('span'); label.textContent = `${war.type}${war.round ? ` R${war.round}` : ''} · ${war.opponent?.name || 'Musuh'}`;
    const track = document.createElement('div'); track.className = 'bar-track';
    const fill = document.createElement('div'); fill.style.width = `${Math.min(100, war.stars / Math.max(1, war.quota * 3) * 100)}%`; track.appendChild(fill);
    const value = document.createElement('b'); value.textContent = `${war.stars}★ / ${war.attacks.length} serangan`;
    bar.append(label, track, value); chart.appendChild(bar);
    const row = document.createElement('div'); row.className = 'history-row';
    row.textContent = `${war.type}${war.round ? ` · Putaran ${war.round}` : ''} · ${war.opponent?.name || 'Musuh'} · ${war.state} · ${war.stars}★ · ${war.destructionAverage}% destruksi${war.missed ? ' · kuota terlewat' : ''}`;
    wars.appendChild(row);
  }
  if (!data.wars.length) { chart.textContent = 'Belum ada perang tersimpan untuk pemain ini.'; wars.textContent = 'Arsip akan bertambah saat aplikasi membuka data perang.'; }
  const trend = document.getElementById('snapshotTrend'); trend.replaceChildren();
  if (!data.trendAvailable) { trend.textContent = 'Tren muncul setelah tersedia minimal dua snapshot pada hari berbeda.'; return; }
  const trophies = data.trend.map(point => point.trophies);
  const min = Math.min(...trophies);
  const max = Math.max(...trophies);
  for (const point of data.trend) {
    const row = document.createElement('div'); row.className = 'trend-row';
    const label = document.createElement('span'); label.textContent = point.date;
    const bar = document.createElement('div'); bar.className = 'trend-track';
    const fill = document.createElement('div'); fill.style.width = `${max === min ? 50 : 10 + 90 * (point.trophies - min) / (max - min)}%`; bar.appendChild(fill);
    const value = document.createElement('span'); value.textContent = `${point.trophies} trofi · ${point.donations} donasi`;
    row.append(label, bar, value);
    trend.appendChild(row);
  }
}

async function loadPerformance(player) {
  const tag = normalizeTag(clanTag || player.clan?.tag);
  if (!tag) { setText('performanceNote', 'Tag klan tidak tersedia untuk membaca arsip perang.'); return; }
  try {
    const endpoint = `/api/player/${encodeURIComponent(normalizeTag(player.tag))}/performance?clan=${encodeURIComponent(tag)}`;
    let response = await fetch(endpoint);
    let data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal memuat performa.');
    if (!data.wars.length) {
      const warResponse = await fetch(`/api/clan/${encodeURIComponent(tag)}/war`);
      if (warResponse.ok) {
        const war = await warResponse.json();
        if (war.type === 'CWL') await fetch(`/api/clan/${encodeURIComponent(tag)}/cwl/performance`);
        response = await fetch(endpoint);
        if (response.ok) data = await response.json();
      }
    }
    renderPerformance(data);
  } catch (error) { setText('performanceNote', error.message); }
}

function renderProfile(data) {
  const player = data.player;
  const compareParams = new URLSearchParams({ player1: normalizeTag(player.tag) });
  const compareClan = clanTag || normalizeTag(player.clan?.tag);
  if (compareClan) compareParams.set('clan', compareClan);
  document.getElementById('compareLink').href = `/compare.html?${compareParams}`;
  document.title = `${player.name} · Profil Pemain`;
  setText('playerName', player.name);
  setText('copyTag', player.tag);
  setText('clanName', player.clan?.name || 'Tanpa klan');
  setText('role', player.role || '');
  setText('townHall', player.townHallLevel);
  setText('builderHall', player.builderHallLevel);
  setText('exp', player.expLevel);
  setText('trophies', player.trophies?.toLocaleString('id-ID'));
  setText('warStars', player.warStars?.toLocaleString('id-ID'));
  setText('donations', player.donations?.toLocaleString('id-ID'));
  setText('updated', `Diperbarui ${new Date(data.lastUpdated).toLocaleString('id-ID')}`);
  const badge = document.getElementById('clanBadge');
  const badgeUrl = player.clan?.badgeUrls?.small || player.clan?.badgeUrls?.medium;
  badge.hidden = !badgeUrl;
  if (badgeUrl) badge.src = badgeUrl;
  renderArmy(data.army);
  renderProgress(data.progress);
  loadPerformance(player);
  document.getElementById('profile').hidden = false;
  document.getElementById('status').hidden = true;
  document.getElementById('copyTag').onclick = async () => {
    try { await navigator.clipboard.writeText(player.tag); setText('copyTag', 'Tersalin!'); setTimeout(() => setText('copyTag', player.tag), 1500); } catch { setText('copyTag', player.tag); }
  };
}

async function loadProfile(rawTag) {
  const tag = normalizeTag(rawTag);
  const status = document.getElementById('status');
  if (!tag) { status.hidden = false; status.textContent = 'Tag pemain tidak valid. Masukkan tag yang benar.'; return; }
  document.getElementById('playerTag').value = tag;
  document.getElementById('profile').hidden = true;
  status.hidden = false;
  status.textContent = 'Memuat profil pemain...';
  try {
    const response = await fetch(`/api/player/${encodeURIComponent(tag)}/profile`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal mengambil profil pemain.');
    renderProfile(data);
  } catch (error) { status.textContent = error.message; }
}

document.getElementById('playerSearch').addEventListener('submit', event => {
  event.preventDefault();
  const tag = normalizeTag(document.getElementById('playerTag').value);
  if (!tag) { setText('status', 'Tag pemain tidak valid.'); document.getElementById('status').hidden = false; return; }
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
  for (const section of ['army', 'progress', 'performance']) document.getElementById(section).hidden = section !== button.dataset.tab;
}));
if (params.has('tag')) loadProfile(params.get('tag'));
