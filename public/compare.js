const model = window.CompareModel;
const params = new URLSearchParams(location.search);
const clanTag = normalizeTag(params.get('clan'));
const profiles = { left: null, right: null };
const performances = { left: null, right: null };
let performanceErrors = [];
let sharedTrend = [];
let displayedWars = [];
let rosterTag = null;

function normalizeTag(value) {
  const tag = String(value || '').trim().replace(/^#/, '').toUpperCase();
  return /^[0289PYLQGRJCUV]{3,15}$/.test(tag) ? tag : null;
}

function formatNumber(value) { return value == null ? '—' : Number(value).toLocaleString('id-ID'); }
function formatPercent(value) { return value == null ? '—' : `${Number(value).toLocaleString('id-ID')}%`; }
function textNode(tag, value, className) {
  const element = document.createElement(tag);
  element.textContent = value;
  if (className) element.className = className;
  return element;
}

function showStatus(side, message, error = false) {
  const status = document.getElementById(side === 'left' ? 'status1' : 'status2');
  status.textContent = message;
  status.classList.toggle('error', error);
  status.hidden = false;
  document.getElementById(side === 'left' ? 'card1' : 'card2').replaceChildren();
}

function profileHref(profile) {
  const query = new URLSearchParams({ tag: normalizeTag(profile.player.tag) });
  const context = clanTag || normalizeTag(profile.player.clan?.tag);
  if (context) query.set('clan', context);
  return `/player.html?${query}`;
}

function renderCard(side, data) {
  const root = document.getElementById(side === 'left' ? 'card1' : 'card2');
  const status = document.getElementById(side === 'left' ? 'status1' : 'status2');
  status.hidden = true;
  root.replaceChildren();
  const card = textNode('div', '', 'compare-card');
  const top = textNode('div', '', 'compare-card-top');
  const badgeUrl = data.player.clan?.badgeUrls?.small || data.player.clan?.badgeUrls?.medium;
  if (badgeUrl) { const badge = document.createElement('img'); badge.src = badgeUrl; badge.alt = ''; top.appendChild(badge); }
  const identity = document.createElement('div');
  identity.appendChild(textNode('h2', data.player.name));
  const link = textNode('a', data.player.tag, 'player-tag-link');
  link.href = profileHref(data);
  identity.appendChild(link);
  identity.appendChild(textNode('div', `${data.player.clan?.name || 'Tanpa klan'} · TH ${data.player.townHallLevel ?? '—'} · BH ${data.player.builderHallLevel ?? '—'}`, 'compare-card-meta'));
  top.appendChild(identity);
  card.appendChild(top);
  const stats = textNode('div', '', 'compare-card-stats');
  for (const [label, value] of [
    ['Trofi', formatNumber(data.player.trophies)], ['War Stars', formatNumber(data.player.warStars)],
    ['XP', formatNumber(data.player.expLevel)], ['Cakupan', coverage(data.progress)]
  ]) {
    const box = document.createElement('div');
    box.append(textNode('span', label), textNode('strong', value));
    stats.appendChild(box);
  }
  card.appendChild(stats);
  card.appendChild(textNode('div', `Diperbarui ${new Date(data.lastUpdated).toLocaleString('id-ID')}`, 'card-source'));
  root.appendChild(card);
}

function coverage(progress) {
  if (!progress) return '—';
  const values = Object.values(progress.score?.categories || {});
  const known = values.reduce((sum, value) => sum + (value.knownItems || 0), 0);
  const expected = values.reduce((sum, value) => sum + (value.expectedItems || 0), 0);
  return `${known}/${expected}`;
}

function renderScore() {
  const root = document.getElementById('scoreComparison');
  root.replaceChildren();
  for (const [label, profile] of [['Pemain A', profiles.left], ['Pemain B', profiles.right]]) {
    const tile = textNode('div', '', 'score-tile');
    tile.appendChild(textNode('span', `${label} · ${profile?.player.name || 'Belum tersedia'}`));
    tile.appendChild(textNode('strong', formatPercent(profile?.progress?.score?.overall)));
    const tag = profile?.progress?.complete ? 'Cakupan memadai' : 'Data parsial';
    tile.appendChild(textNode('small', `${tag} · ${coverage(profile?.progress)}`));
    tile.appendChild(textNode('div', `Status rushed: ${profile?.progress?.rushed?.label || 'Belum dapat dinilai'}`, 'card-source'));
    tile.appendChild(textNode('div', profile?.progress?.baselineSource || 'Baseline belum tersedia', 'card-source'));
    root.appendChild(tile);
  }
  const note = document.getElementById('compareNotice');
  const left = profiles.left;
  const right = profiles.right;
  if (!left || !right) note.textContent = 'Satu profil belum tersedia. Data pemain yang berhasil dimuat tetap dapat dilihat.';
  else if (left.player.tag === right.player.tag) note.textContent = 'Pilih dua tag pemain yang berbeda untuk membandingkan.';
  else if (left.player.townHallLevel !== right.player.townHallLevel) note.textContent = `TH berbeda (${left.player.townHallLevel} dan ${right.player.townHallLevel}). Skor ditampilkan terhadap batas TH masing-masing tanpa peringkat atau selisih keseluruhan.`;
  else if (!model.comparableProgress(left, right)) note.textContent = 'Cakupan atau sumber batas level belum setara. Angka ditampilkan per pemain; selisih skor dan pemenang kategori tidak dihitung.';
  else {
    const a = left.progress.score.overall;
    const b = right.progress.score.overall;
    const difference = a == null || b == null ? null : Math.abs(a - b);
    note.textContent = `Kedua pemain memiliki TH dan baseline yang sebanding.${difference === null ? '' : ` Selisih skor pasukan dan hero: ${difference.toLocaleString('id-ID')} poin persentase.`} Skor tidak mencakup bangunan atau tembok.`;
  }
}

function categoryCell(value, side) {
  const cell = textNode('div', '', `category-cell ${side}`);
  cell.appendChild(textNode('b', formatPercent(value?.percent)));
  const track = textNode('div', '', 'compare-track');
  const fill = document.createElement('i');
  fill.style.width = `${Math.max(0, Math.min(100, value?.percent || 0))}%`;
  track.appendChild(fill);
  cell.appendChild(track);
  cell.appendChild(textNode('small', value ? `${value.knownItems}/${value.expectedItems} item terpetakan${value.unmappedItems?.length ? ` · ${value.unmappedItems.length} tanpa batas` : ''}` : 'Tidak tersedia'));
  return cell;
}

function renderCategories() {
  const root = document.getElementById('categoryComparison');
  root.replaceChildren();
  for (const category of model.categoryRows(profiles.left, profiles.right)) {
    const row = textNode('div', '', 'category-row');
    row.append(textNode('div', category.label, 'category-label'), categoryCell(category.left, 'left'), categoryCell(category.right, 'right'));
    root.appendChild(row);
  }
}

function renderDifferences() {
  const root = document.getElementById('levelDifferences');
  root.replaceChildren();
  const rows = model.levelDifferences(profiles.left, profiles.right);
  if (!rows.length) {
    root.appendChild(textNode('p', 'Belum ada selisih item yang dapat dibandingkan.', 'empty-section'));
    return;
  }
  for (const row of rows) {
    const item = textNode('div', '', 'difference-row');
    item.append(textNode('b', row.name), textNode('span', `${row.category}${row.equipmentHero ? ` · ${row.equipmentHero}` : ''}`),
      textNode('strong', `A ${row.leftLevel} · B ${row.rightLevel} · selisih ${row.difference} level`));
    root.appendChild(item);
  }
}

function armyIcon(item, section) {
  const wrapper = textNode('span', '', 'army-item-name');
  const fallback = textNode('span', item.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase(), 'army-icon-fallback');
  const image = document.createElement('img');
  image.alt = '';
  image.loading = 'lazy';
  image.referrerPolicy = 'no-referrer';
  const candidates = [...new Set([...(item.iconUrls || []),
    `/api/player-icon?${new URLSearchParams({ name: item.name, section })}`])];
  let index = 0;
  image.addEventListener('load', () => fallback.remove());
  image.addEventListener('error', () => {
    index += 1;
    if (index < candidates.length) image.src = candidates[index];
    else image.remove();
  });
  image.src = candidates[0];
  wrapper.append(fallback, image);
  const name = document.createElement('span');
  name.appendChild(document.createTextNode(item.name));
  if (item.equipmentHero) name.appendChild(textNode('small', item.equipmentHero));
  wrapper.appendChild(name);
  return wrapper;
}

function itemLevel(item, mark) {
  if (!item) return textNode('span', 'Tidak tersedia', 'missing-level');
  const wrapper = textNode('span', '', `item-level ${mark}`);
  wrapper.appendChild(textNode('span', `Level ${item.level ?? '—'}${item.maxLevel != null ? ` / max API ${item.maxLevel}` : ''}`));
  if (mark === 'higher') wrapper.appendChild(textNode('span', '★', 'level-mark higher-mark'));
  else if (mark === 'equal') wrapper.appendChild(textNode('span', '=', 'level-mark equal-mark'));
  return wrapper;
}

function renderArmy() {
  const root = document.getElementById('armyComparison');
  root.replaceChildren();
  const filter = document.getElementById('armyCategory').value;
  let count = 0;
  for (const section of model.armyRows(profiles.left, profiles.right)) {
    if (filter !== 'all' && filter !== section.key) continue;
    const group = textNode('section', '', 'army-section');
    group.appendChild(textNode('h3', `${section.label} · ${section.rows.length}`));
    count += section.rows.length;
    if (!section.rows.length) { group.appendChild(textNode('p', 'Belum ada item untuk kategori ini.', 'empty-section')); root.appendChild(group); continue; }
    const table = textNode('table', '', 'army-table');
    const head = document.createElement('thead');
    const header = document.createElement('tr');
    for (const title of ['Item', profiles.left?.player.name || 'Pemain A', profiles.right?.player.name || 'Pemain B']) header.appendChild(textNode('th', title));
    head.appendChild(header); table.appendChild(head);
    const body = document.createElement('tbody');
    for (const row of section.rows) {
      const tr = document.createElement('tr');
      const marks = model.itemLevelMark(row.left, row.right);
      const name = document.createElement('td'); name.appendChild(armyIcon(row.left || row.right, section.key));
      const left = document.createElement('td'); left.appendChild(itemLevel(row.left, marks.left));
      const right = document.createElement('td'); right.appendChild(itemLevel(row.right, marks.right));
      tr.append(name, left, right); body.appendChild(tr);
    }
    table.appendChild(body); group.appendChild(table); root.appendChild(group);
  }
  document.getElementById('armyCount').textContent = `${count} item unik`;
}

function renderComparison() {
  document.getElementById('comparisonContent').hidden = !profiles.left && !profiles.right;
  if (!profiles.left && !profiles.right) return;
  renderScore(); renderCategories(); renderDifferences(); renderArmy();
  renderWar(); renderActivity(); renderResume();
}

function warDate(value) {
  const date = model.parseWarDate(value);
  return date ? date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Tanggal tidak tersedia';
}

function sideName(side) { return profiles[side]?.player?.name || (side === 'left' ? 'Pemain A' : 'Pemain B'); }

function warStatusLabel(war) {
  const status = model.warStatus(war);
  if (status === 'notRoster') return 'Tidak masuk roster';
  if (status === 'missed') return 'Kuota terlewat';
  if (status === 'partialMissed') return 'Sebagian kuota terlewat';
  if (status === 'pending') return war.state === 'preparation' ? 'Persiapan' : 'Belum menyerang';
  return `${war.attacks?.length || 0} serangan`;
}

function warSide(row, side) {
  const war = row[side];
  const wrapper = textNode('div', '', `war-chart-side ${side}`);
  wrapper.appendChild(textNode('span', sideName(side), 'who'));
  const track = textNode('div', '', 'war-track');
  const fill = document.createElement('i');
  fill.style.width = `${war ? Math.max(0, Math.min(100, war.stars / Math.max(1, (war.quota || 1) * 3) * 100)) : 0}%`;
  track.appendChild(fill);
  wrapper.appendChild(track);
  const metric = !performances[side] ? 'Arsip belum tersedia' : war ? `${war.stars}★ · ${war.attacks?.length || 0}/${war.quota || '—'} · ${war.attacks?.length ? `${formatPercent(war.destructionAverage)} destruksi${model.warStatus(war) === 'partialMissed' ? ' · kuota terlewat' : ''}` : warStatusLabel(war)}` : warStatusLabel(null);
  wrapper.appendChild(textNode('span', metric, 'metric'));
  return wrapper;
}

function renderWar() {
  const period = document.getElementById('warPeriod').value;
  displayedWars = model.combineWars(performances.left, performances.right, period);
  const note = document.getElementById('warNote');
  const archiveCount = (performances.left?.wars?.length || 0) + (performances.right?.wars?.length || 0);
  note.textContent = `${displayedWars.length} perang pada periode ini. Angka berasal dari perang yang pernah diambil aplikasi; perang lama di luar arsip tidak dihitung.${performanceErrors.length ? ` ${performanceErrors.join(' ')}` : ''}`;
  const summaries = document.getElementById('warSummary');
  summaries.replaceChildren();
  for (const type of ['CWL', 'War']) {
    const card = textNode('div', '', 'war-type-card');
    card.appendChild(textNode('h3', type === 'CWL' ? 'Clan War League' : 'War klasik'));
    const pair = textNode('div', '', 'war-type-players');
    for (const side of ['left', 'right']) {
      const player = textNode('div', '', 'war-type-player');
      player.appendChild(textNode('b', sideName(side)));
      if (!performances[side]) {
        player.appendChild(textNode('span', 'Arsip belum tersedia.'));
        pair.appendChild(player); continue;
      }
      const sum = model.warSummary(displayedWars, side, type);
      player.appendChild(textNode('span', `${sum.wars} roster · ${sum.attacks} serangan · ${sum.stars} bintang`));
      player.appendChild(textNode('span', `${formatNumber(sum.starsPerAttack)} bintang/serangan · ${formatPercent(sum.destructionAverage)} destruksi`));
      player.appendChild(textNode('span', `${sum.missedQuota} kuota terlewat pada perang selesai`));
      if (sum.wars && sum.limitedSample) player.appendChild(textNode('small', 'Sampel terbatas (<5 serangan)', 'sample-badge'));
      pair.appendChild(player);
    }
    card.appendChild(pair); summaries.appendChild(card);
  }
  const charts = document.getElementById('warCharts');
  charts.replaceChildren();
  if (!displayedWars.length) {
    charts.appendChild(textNode('p', archiveCount ? 'Tidak ada perang pada periode ini.' : 'Belum ada arsip perang untuk kedua pemain.', 'empty-section'));
    return;
  }
  const key = textNode('div', '', 'war-key');
  key.append(textNode('span', sideName('left')), textNode('span', sideName('right')));
  charts.appendChild(key);
  for (const row of displayedWars) {
    const card = textNode('div', '', 'war-chart-card');
    const head = textNode('div', '', 'war-chart-head');
    const round = row.type === 'CWL' ? `Putaran ${row.round || '—'}` : 'War klasik';
    head.append(textNode('b', `${round} · ${row.opponent?.name || 'Musuh'}`), textNode('small', `${warDate(row.startTime || row.endTime)} · ${row.state || '—'}`));
    card.append(head, warSide(row, 'left'), warSide(row, 'right'));
    charts.appendChild(card);
  }
}

function svgNode(tag, attributes = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

function renderActivity() {
  sharedTrend = model.sharedSnapshots(performances.left, performances.right);
  document.getElementById('activityCount').textContent = `${sharedTrend.length} tanggal bersama`;
  const note = document.getElementById('activityNote');
  const chart = document.getElementById('activityChart');
  const tableRoot = document.getElementById('donationTable');
  chart.replaceChildren(); tableRoot.replaceChildren();
  const enough = sharedTrend.length >= 2;
  document.getElementById('exportCsv').disabled = !profiles.left || !profiles.right || (!displayedWars.length && !enough);
  document.getElementById('exportPng').disabled = !profiles.left || !profiles.right || !enough;
  if (!enough) {
    note.textContent = !performances.left || !performances.right
      ? 'Arsip salah satu pemain belum tersedia. Tren memerlukan dua snapshot pada tanggal yang sama untuk kedua pemain.'
      : 'Tren memerlukan sedikitnya dua snapshot pada tanggal yang sama untuk kedua pemain. Snapshot sebelum aplikasi merekam data tidak tersedia.';
    chart.appendChild(textNode('p', 'Grafik akan tampil setelah ada riwayat bersama yang cukup.', 'empty-section'));
    return;
  }
  const leftChanges = model.donationChanges(sharedTrend, 'left');
  const rightChanges = model.donationChanges(sharedTrend, 'right');
  const resets = leftChanges.some(point => point.reset) || rightChanges.some(point => point.reset);
  note.textContent = `Trofi ditampilkan pada ${sharedTrend.length} tanggal yang sama. Donasi adalah counter profil; penurunan counter ditandai sebagai reset/perubahan dan tidak dihitung sebagai delta negatif.${resets ? ' Reset/perubahan counter terdeteksi pada periode ini.' : ''}`;
  const legend = textNode('div', '', 'activity-legend');
  legend.append(textNode('b', sideName('left')), textNode('b', sideName('right')));
  chart.appendChild(legend);
  const svg = svgNode('svg', { viewBox: '0 0 900 240', role: 'img', 'aria-label': 'Grafik trofi kedua pemain pada tanggal snapshot yang sama' });
  const all = sharedTrend.flatMap(point => [point.left.trophies, point.right.trophies]);
  const min = Math.min(...all); const max = Math.max(...all);
  const y = value => 195 - (max === min ? .5 : (value - min) / (max - min)) * 150;
  const x = index => 55 + index / (sharedTrend.length - 1) * 790;
  for (let index = 0; index <= 3; index++) {
    const yy = 45 + index * 50;
    svg.appendChild(svgNode('line', { x1: 55, y1: yy, x2: 845, y2: yy, stroke: '#33475d', 'stroke-width': 1 }));
  }
  for (const [side, color] of [['left', '#79adff'], ['right', '#40d3bd']]) {
    const points = sharedTrend.map((point, index) => `${x(index)},${y(point[side].trophies)}`).join(' ');
    svg.appendChild(svgNode('polyline', { points, fill: 'none', stroke: color, 'stroke-width': 3, 'stroke-linejoin': 'round' }));
    sharedTrend.forEach((point, index) => {
      const circle = svgNode('circle', { cx: x(index), cy: y(point[side].trophies), r: 4, fill: color });
      const title = svgNode('title'); title.textContent = `${sideName(side)} · ${point.date} · ${point[side].trophies} trofi`;
      circle.appendChild(title); svg.appendChild(circle);
    });
  }
  for (const [position, label] of [[0, sharedTrend[0].date], [sharedTrend.length - 1, sharedTrend.at(-1).date]]) {
    const text = svgNode('text', { x: x(position), y: 220, fill: '#9eb2c8', 'font-size': 11, 'text-anchor': position ? 'end' : 'start' });
    text.textContent = label; svg.appendChild(text);
  }
  chart.appendChild(svg);
  const table = document.createElement('table');
  const head = document.createElement('thead'); const headRow = document.createElement('tr');
  for (const label of ['Tanggal', `${sideName('left')} · donasi`, 'Delta A', `${sideName('right')} · donasi`, 'Delta B']) headRow.appendChild(textNode('th', label));
  head.appendChild(headRow); table.appendChild(head);
  const body = document.createElement('tbody');
  sharedTrend.forEach((point, index) => {
    const row = document.createElement('tr');
    row.appendChild(textNode('td', point.date));
    for (const [side, change] of [['left', leftChanges[index]], ['right', rightChanges[index]]]) {
      row.appendChild(textNode('td', formatNumber(point[side].donations)));
      row.appendChild(textNode('td', change.reset ? 'Reset/perubahan' : change.delta === null ? '—' : `+${change.delta}`, change.reset ? 'reset-badge' : ''));
    }
    body.appendChild(row);
  });
  table.appendChild(body); tableRoot.appendChild(table);
}

function renderResume() {
  const root = document.getElementById('resumeText');
  root.replaceChildren();
  for (const line of model.resume(profiles.left, profiles.right, displayedWars, sharedTrend,
    { left: Boolean(performances.left), right: Boolean(performances.right) })) root.appendChild(textNode('p', line));
}

async function fetchPerformance(tag, context) {
  const response = await fetch(`/api/player/${encodeURIComponent(tag)}/performance?clan=${encodeURIComponent(context)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Arsip pemain tidak dapat dimuat.');
  return data;
}

async function loadPerformances() {
  const context = clanTag || rosterTag;
  if (!context) {
    performanceErrors = ['Tag klan belum tersedia untuk membaca arsip.'];
    renderComparison(); return;
  }
  async function readBoth() {
    const results = await Promise.allSettled(['left', 'right'].map(async side => {
      if (!profiles[side]) return null;
      return fetchPerformance(normalizeTag(profiles[side].player.tag), context);
    }));
    performanceErrors = [];
    ['left', 'right'].forEach((side, index) => {
      if (results[index].status === 'fulfilled') performances[side] = results[index].value;
      else performanceErrors.push(`${sideName(side)}: ${results[index].reason.message}`);
    });
    renderComparison();
  }
  await readBoth();
  if (!profiles.left || !profiles.right) return;
  try {
    const response = await fetch(`/api/clan/${encodeURIComponent(context)}/war`);
    if (!response.ok) return;
    const war = await response.json();
    if (war.type === 'CWL') await fetch(`/api/clan/${encodeURIComponent(context)}/cwl/performance`);
    await readBoth();
  } catch { /* Arsip lama tetap ditampilkan saat pembaruan API gagal. */ }
}

function csvCell(value) {
  if (value === null || value === undefined) return '""';
  let output = String(value);
  if (typeof value !== 'number' && /^[=+@-]/.test(output)) output = `'${output}`;
  return `"${output.replaceAll('"', '""')}"`;
}

function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportCsv() {
  if (!profiles.left || !profiles.right || (!displayedWars.length && sharedTrend.length < 2)) return;
  const rows = [
    ['Bagian', 'Periode/tanggal', 'Pemain', 'Tipe', 'Lawan', 'Putaran', 'Serangan', 'Bintang', 'Destruksi rata-rata', 'Trofi', 'Donasi', 'Perubahan donasi', 'Status'],
    ['Info', document.getElementById('warPeriod').selectedOptions[0].textContent, sideName('left'), '', '', '', '', '', '', '', '', '', ''],
    ['Info', '', sideName('right'), '', '', '', '', '', '', '', '', '', '']
  ];
  for (const row of displayedWars) for (const side of ['left', 'right']) {
    const war = row[side];
    rows.push(['War', warDate(row.startTime || row.endTime), sideName(side), row.type, row.opponent?.name || '', row.round || '',
      war?.attacks?.length || 0, war?.stars ?? '', war?.attacks?.length ? war.destructionAverage : '', '', '', '', warStatusLabel(war)]);
  }
  const leftChanges = model.donationChanges(sharedTrend, 'left');
  const rightChanges = model.donationChanges(sharedTrend, 'right');
  sharedTrend.forEach((point, index) => {
    for (const [side, change] of [['left', leftChanges[index]], ['right', rightChanges[index]]]) {
      rows.push(['Snapshot', point.date, sideName(side), '', '', '', '', '', '', point[side].trophies,
        point[side].donations, change.reset ? 'Reset/perubahan' : change.delta ?? '', '']);
    }
  });
  const csv = `\ufeff${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
  downloadFile(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `player-comparison-${normalizeTag(profiles.left.player.tag)}-${normalizeTag(profiles.right.player.tag)}.csv`);
}

function exportPng() {
  if (!profiles.left || !profiles.right || sharedTrend.length < 2) return;
  const canvas = document.createElement('canvas');
  canvas.width = 1200; canvas.height = 770;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#101820'; ctx.fillRect(0, 0, 1200, 770);
  ctx.fillStyle = '#eef5ff'; ctx.font = 'bold 30px sans-serif'; ctx.fillText('Player Comparison', 56, 68);
  ctx.font = '16px sans-serif'; ctx.fillStyle = '#a9bdd4';
  ctx.fillText(`${sideName('left')}  vs  ${sideName('right')}`, 56, 100);
  ctx.fillText(`Periode: ${document.getElementById('warPeriod').selectedOptions[0].textContent}  ·  Snapshot bersama: ${sharedTrend.length} tanggal`, 56, 127);
  for (const [side, x, color] of [['left', 56, '#79adff'], ['right', 615, '#40d3bd']]) {
    const profile = profiles[side];
    ctx.fillStyle = '#192b3d'; ctx.fillRect(x, 158, 529, 130);
    ctx.fillStyle = color; ctx.font = 'bold 22px sans-serif'; ctx.fillText(profile.player.name.slice(0, 34), x + 18, 194);
    ctx.fillStyle = '#dbe8f8'; ctx.font = '16px sans-serif';
    ctx.fillText(`TH ${profile.player.townHallLevel} · Skor ${formatPercent(profile.progress?.score?.overall)}`, x + 18, 226);
    const cwl = model.warSummary(displayedWars, side, 'CWL');
    const classic = model.warSummary(displayedWars, side, 'War');
    ctx.fillText(`CWL ${cwl.stars}★/${cwl.attacks} serangan · War ${classic.stars}★/${classic.attacks} serangan`, x + 18, 257);
  }
  ctx.fillStyle = '#eef5ff'; ctx.font = 'bold 19px sans-serif'; ctx.fillText('Tren trofi pada tanggal yang sama', 56, 335);
  const values = sharedTrend.flatMap(point => [point.left.trophies, point.right.trophies]);
  const min = Math.min(...values); const max = Math.max(...values);
  const x = index => 70 + index / (sharedTrend.length - 1) * 1050;
  const y = value => 565 - (max === min ? .5 : (value - min) / (max - min)) * 190;
  ctx.strokeStyle = '#34495e'; ctx.lineWidth = 1;
  for (let index = 0; index < 4; index++) { const yy = 375 + index * 63; ctx.beginPath(); ctx.moveTo(70, yy); ctx.lineTo(1120, yy); ctx.stroke(); }
  for (const [side, color] of [['left', '#79adff'], ['right', '#40d3bd']]) {
    ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.beginPath();
    sharedTrend.forEach((point, index) => { if (index) ctx.lineTo(x(index), y(point[side].trophies)); else ctx.moveTo(x(index), y(point[side].trophies)); });
    ctx.stroke();
  }
  ctx.fillStyle = '#a9bdd4'; ctx.font = '14px sans-serif';
  ctx.fillText(sharedTrend[0].date, 70, 600); ctx.textAlign = 'right'; ctx.fillText(sharedTrend.at(-1).date, 1120, 600); ctx.textAlign = 'left';
  ctx.fillText('Data profil dan perang berasal dari arsip aplikasi. Level bangunan dan tembok tidak tercakup.', 56, 655);
  ctx.fillText(`Dibuat ${new Date().toLocaleString('id-ID')}`, 56, 680);
  canvas.toBlob(blob => { if (blob) downloadFile(blob, `player-comparison-${normalizeTag(profiles.left.player.tag)}-${normalizeTag(profiles.right.player.tag)}.png`); }, 'image/png');
}

async function fetchProfile(tag) {
  const response = await fetch(`/api/player/${encodeURIComponent(tag)}/profile`);
  let data;
  try { data = await response.json(); } catch { throw new Error('Respons profil tidak dapat dibaca.'); }
  if (!response.ok) throw new Error(data.error || 'Profil tidak dapat dimuat.');
  return data;
}

async function loadProfiles() {
  const entries = [['left', 'player1', 'Pemain A'], ['right', 'player2', 'Pemain B']];
  const tasks = entries.map(async ([side, inputId, label]) => {
    const raw = document.getElementById(inputId).value.trim();
    const tag = normalizeTag(raw);
    if (!raw) { showStatus(side, `Masukkan tag ${label}.`); return; }
    if (!tag) { showStatus(side, `Tag ${label} tidak valid.`, true); return; }
    showStatus(side, `Memuat ${label}...`);
    try {
      const data = await fetchProfile(tag);
      profiles[side] = data;
      renderCard(side, data);
    } catch (error) { showStatus(side, error.message, true); }
  });
  await Promise.allSettled(tasks);
  if (!rosterTag) loadRoster(normalizeTag(profiles.left?.player.clan?.tag || profiles.right?.player.clan?.tag));
  renderComparison();
  await loadPerformances();
}

async function loadRoster(tag) {
  if (!tag || rosterTag === tag) return;
  rosterTag = tag;
  const note = document.getElementById('clanPickerNote');
  note.textContent = 'Memuat anggota klan...';
  try {
    const response = await fetch(`/api/clan/${encodeURIComponent(tag)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Daftar anggota tidak tersedia.');
    const members = [...(data.memberList || [])].sort((a, b) => a.name.localeCompare(b.name));
    for (const id of ['member1', 'member2']) {
      const select = document.getElementById(id);
      select.replaceChildren(new Option('Pilih dari anggota klan', ''));
      for (const member of members) select.add(new Option(`${member.name} · TH ${member.townHallLevel ?? '—'}`, normalizeTag(member.tag)));
      select.value = normalizeTag(document.getElementById(id === 'member1' ? 'player1' : 'player2').value) || '';
    }
    note.textContent = `${members.length} anggota ${data.name} tersedia untuk dipilih.`;
  } catch (error) { note.textContent = `Daftar anggota tidak tersedia: ${error.message} Tag tetap dapat diketik.`; }
}

function navigateToComparison() {
  const rawFirst = document.getElementById('player1').value.trim();
  const rawSecond = document.getElementById('player2').value.trim();
  const first = normalizeTag(rawFirst);
  const second = normalizeTag(rawSecond);
  if (rawFirst && !first) { showStatus('left', 'Tag pemain A tidak valid.', true); return; }
  if (rawSecond && !second) { showStatus('right', 'Tag pemain B tidak valid.', true); return; }
  const query = new URLSearchParams();
  if (first) query.set('player1', first);
  if (second) query.set('player2', second);
  const context = clanTag || rosterTag;
  if (context) query.set('clan', context);
  location.href = `/compare.html${query.size ? `?${query}` : ''}`;
}

document.getElementById('compareForm').addEventListener('submit', event => { event.preventDefault(); navigateToComparison(); });
document.getElementById('swapPlayers').addEventListener('click', () => {
  const first = document.getElementById('player1');
  const second = document.getElementById('player2');
  [first.value, second.value] = [second.value, first.value];
  document.getElementById('member1').value = normalizeTag(first.value) || '';
  document.getElementById('member2').value = normalizeTag(second.value) || '';
  navigateToComparison();
});
for (const [selectId, inputId] of [['member1', 'player1'], ['member2', 'player2']]) {
  document.getElementById(selectId).addEventListener('change', event => { if (event.target.value) document.getElementById(inputId).value = event.target.value; });
}
document.getElementById('armyCategory').addEventListener('change', renderArmy);
document.getElementById('warPeriod').addEventListener('change', () => { renderWar(); renderActivity(); renderResume(); });
document.getElementById('exportCsv').addEventListener('click', exportCsv);
document.getElementById('exportPng').addEventListener('click', exportPng);
for (const button of document.querySelectorAll('.compare-tabs button')) button.addEventListener('click', () => {
  for (const tab of document.querySelectorAll('.compare-tabs button')) tab.setAttribute('aria-selected', String(tab === button));
  for (const section of ['progress', 'army', 'war', 'activity']) document.getElementById(section).hidden = section !== button.dataset.tab;
});
for (const [key, label] of model.sections) document.getElementById('armyCategory').add(new Option(label, key));
if (clanTag) { document.getElementById('backLink').href = `/?clan=${encodeURIComponent(clanTag)}`; loadRoster(clanTag); }
document.getElementById('player1').value = params.get('player1') || '';
document.getElementById('player2').value = params.get('player2') || '';
if (params.has('player1') || params.has('player2')) loadProfiles();
