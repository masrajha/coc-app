const model = window.CompareModel;
const params = new URLSearchParams(location.search);
const clanTag = normalizeTag(params.get('clan'));
const profiles = { left: null, right: null };
const performances = { left: null, right: null };
const leaguePerformance = { left: null, right: null };
let performanceErrors = [];
let sharedTrend = [];
let displayedWars = [];
let rosterTag = null;
const leagueRequestId = { left: 0, right: 0 };

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

function comparisonMark(mark, className = 'level-mark') {
  const symbols = { higher: '★', equal: '=', lower: '▼', none: '—' };
  const labels = { higher: 'Lebih unggul', equal: 'Setara', lower: 'Lebih rendah', none: 'Tidak dapat dibandingkan' };
  const node = textNode('span', symbols[mark] || symbols.none, `${className} ${mark === 'none' ? 'unavailable' : mark}-mark`);
  node.title = labels[mark] || labels.none;
  node.setAttribute('aria-label', node.title);
  return node;
}

function renderStickyCompareHeader() {
  const root = document.getElementById('stickyCompareHeader');
  root.replaceChildren();
  for (const side of ['left', 'right']) {
    const profile = profiles[side];
    const item = textNode('div', '', `sticky-player ${side}`);
    if (!profile) {
      item.appendChild(textNode('span', side === 'left' ? 'Pemain A belum tersedia' : 'Pemain B belum tersedia'));
      root.appendChild(item); continue;
    }
    const badgeUrl = profile.player.clan?.badgeUrls?.small || profile.player.clan?.badgeUrls?.medium;
    if (badgeUrl) {
      const badge = document.createElement('img'); badge.src = badgeUrl; badge.alt = ''; item.appendChild(badge);
    }
    const identity = document.createElement('div');
    const link = textNode('a', profile.player.name); link.href = profileHref(profile);
    identity.append(link, textNode('small', `TH ${profile.player.townHallLevel ?? '—'} · ${formatPercent(profile.progress?.score?.overall)} progres`));
    item.appendChild(identity); root.appendChild(item);
  }
}

function renderComparisonOverview() {
  const root = document.getElementById('overviewScore');
  const conclusion = document.getElementById('overviewConclusion');
  root.replaceChildren();
  if (!profiles.left || !profiles.right) {
    conclusion.textContent = 'Lengkapi kedua pemain untuk menghitung hasil kategori progres.';
    return;
  }
  const score = model.progressCategorySummary(profiles.left, profiles.right);
  for (const [label, value, side] of [
    [sideName('left'), score.left, 'left'], ['Setara', score.equal, 'equal'], [sideName('right'), score.right, 'right']
  ]) {
    const tile = textNode('div', '', `overview-score-item ${side}`);
    tile.append(textNode('strong', value), textNode('span', label)); root.appendChild(tile);
  }
  const quality = profiles.left.progress?.complete && profiles.right.progress?.complete
    ? '' : ' Hasil memakai data yang tersedia dan salah satu atau kedua profil masih memiliki cakupan parsial.';
  if (!score.compared) conclusion.textContent = 'Belum ada kategori progres yang dapat dibandingkan.';
  else if (score.left === score.right) conclusion.textContent = `${score.compared} kategori terukur menghasilkan posisi seimbang.${quality}`;
  else {
    const winner = score.left > score.right ? sideName('left') : sideName('right');
    conclusion.textContent = `${winner} unggul pada ${Math.max(score.left, score.right)} dari ${score.compared} kategori progres terukur.${quality}`;
  }
}

function renderScore() {
  const root = document.getElementById('scoreComparison');
  root.replaceChildren();
  const overallMarks = model.comparableProgress(profiles.left, profiles.right)
    ? model.numberMarks(profiles.left?.progress?.score?.overall, profiles.right?.progress?.score?.overall)
    : { left: 'none', right: 'none' };
  for (const [label, profile, side] of [['Pemain A', profiles.left, 'left'], ['Pemain B', profiles.right, 'right']]) {
    const tile = textNode('div', '', 'score-tile');
    tile.appendChild(textNode('span', `${label} · ${profile?.player.name || 'Belum tersedia'}`));
    const score = textNode('strong', formatPercent(profile?.progress?.score?.overall));
    if (overallMarks[side] !== 'none') score.appendChild(comparisonMark(overallMarks[side]));
    tile.appendChild(score);
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

function categoryCell(value, side, mark) {
  const cell = textNode('div', '', `category-cell ${side}`);
  const score = textNode('b', formatPercent(value?.percent));
  if (mark !== 'none') score.appendChild(comparisonMark(mark));
  cell.appendChild(score);
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
    const marks = model.numberMarks(category.left?.percent, category.right?.percent);
    const row = textNode('div', '', 'category-row');
    row.append(textNode('div', category.label, 'category-label'), categoryCell(category.left, 'left', marks.left), categoryCell(category.right, 'right', marks.right));
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

function itemLevel(item, mark, mode) {
  if (!item) return textNode('span', 'Tidak tersedia', 'missing-level');
  const wrapper = textNode('span', '', `item-level ${mark}`);
  const progress = model.itemProgress(item);
  const progressLimit = item.progressMaxLevel;
  const limitLabel = progressLimit != null
    ? `max ${item.progressMaxSource || 'baseline'} ${progressLimit}`
    : (item.maxLevel != null ? `max API global ${item.maxLevel}` : 'batas tidak tersedia');
  const value = mode === 'progress'
    ? (progress == null ? `Level ${item.level ?? '—'} · batas TH/BH belum tersedia` : `${formatPercent(progress)} · ${item.level}/${progressLimit}`)
    : `Level ${item.level ?? '—'} / ${limitLabel}`;
  wrapper.appendChild(textNode('span', value));
  if (mark !== 'none') wrapper.appendChild(comparisonMark(mark));
  return wrapper;
}

function renderArmy() {
  const root = document.getElementById('armyComparison');
  root.replaceChildren();
  const filter = document.getElementById('armyCategory').value;
  const mode = document.getElementById('armyMode').value;
  const order = document.getElementById('armySort').value;
  const differencesOnly = document.getElementById('armyDifferencesOnly').checked;
  document.getElementById('armyModeNote').textContent = mode === 'progress'
    ? 'Mode progres membandingkan level sebagai persentase dari batas TH/BH masing-masing pemain. Item tanpa baseline khusus TH/BH tidak diberi pemenang.'
    : 'Mode level aktual membandingkan angka level secara langsung. Pada TH berbeda, hasil ini bukan ukuran kematangan akun.';
  let count = 0;
  for (const section of model.armyRows(profiles.left, profiles.right)) {
    if (filter !== 'all' && filter !== section.key) continue;
    let rows = section.rows.map(row => ({ ...row, comparison: model.itemComparison(row.left, row.right, mode) }));
    if (differencesOnly) rows = rows.filter(row => !row.left || !row.right || row.comparison.left === 'higher' || row.comparison.right === 'higher');
    if (order === 'difference') rows.sort((a, b) => (b.comparison.difference ?? -1) - (a.comparison.difference ?? -1)
      || a.name.localeCompare(b.name));
    const group = textNode('section', '', 'army-section');
    group.appendChild(textNode('h3', `${section.label} · ${rows.length}`));
    count += rows.length;
    if (!rows.length) { group.appendChild(textNode('p', differencesOnly ? 'Tidak ada perbedaan yang dapat dibandingkan pada kategori ini.' : 'Belum ada item untuk kategori ini.', 'empty-section')); root.appendChild(group); continue; }
    const table = textNode('table', '', 'army-table');
    const head = document.createElement('thead');
    const header = document.createElement('tr');
    for (const title of ['Item', profiles.left?.player.name || 'Pemain A', profiles.right?.player.name || 'Pemain B']) header.appendChild(textNode('th', title));
    head.appendChild(header); table.appendChild(head);
    const body = document.createElement('tbody');
    for (const row of rows) {
      const tr = document.createElement('tr');
      const name = document.createElement('td'); name.appendChild(armyIcon(row.left || row.right, section.key));
      const left = document.createElement('td'); left.appendChild(itemLevel(row.left, row.comparison.left, mode));
      const right = document.createElement('td'); right.appendChild(itemLevel(row.right, row.comparison.right, mode));
      tr.append(name, left, right); body.appendChild(tr);
    }
    table.appendChild(body); group.appendChild(table); root.appendChild(group);
  }
  document.getElementById('armyCount').textContent = `${count} item unik`;
}

function renderHeadToHead() {
  const root = document.getElementById('headToHeadChart');
  root.replaceChildren();
  if (!profiles.left || !profiles.right) return;
  const period = document.getElementById('warPeriod').value;
  const rows = model.combineWars(performances.left, performances.right, period);
  const leftCwl = model.warSummary(rows, 'left', 'CWL');
  const rightCwl = model.warSummary(rows, 'right', 'CWL');
  const metrics = [
    ['Progres', profiles.left.progress?.score?.overall, profiles.right.progress?.score?.overall],
    ['Hero', profiles.left.progress?.score?.categories?.heroes?.percent, profiles.right.progress?.score?.categories?.heroes?.percent],
    ['Troop', profiles.left.progress?.score?.categories?.troops?.percent, profiles.right.progress?.score?.categories?.troops?.percent],
    ['CWL ★', leftCwl.starsPerAttack == null ? null : leftCwl.starsPerAttack / 3 * 100, rightCwl.starsPerAttack == null ? null : rightCwl.starsPerAttack / 3 * 100],
    ['CWL destruksi', leftCwl.destructionAverage, rightCwl.destructionAverage]
  ].filter(metric => metric[1] !== null && metric[1] !== undefined && metric[2] !== null && metric[2] !== undefined
    && Number.isFinite(Number(metric[1])) && Number.isFinite(Number(metric[2])));
  const heading = textNode('div', '', 'head-to-head-heading');
  heading.append(textNode('h3', 'Head-to-head'), textNode('span', `${metrics.length} metrik pada skala 0–100`));
  root.appendChild(heading);
  if (metrics.length < 3) {
    root.appendChild(textNode('p', 'Sedikitnya tiga metrik bersama diperlukan untuk membuat grafik.', 'empty-section'));
    return;
  }
  const svg = svgNode('svg', { viewBox: '0 0 560 330', role: 'img', 'aria-label': 'Grafik radar perbandingan kedua pemain' });
  const cx = 280; const cy = 155; const radius = 112;
  const point = (index, value) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / metrics.length;
    const distance = radius * Math.max(0, Math.min(100, Number(value))) / 100;
    return [cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance];
  };
  for (const scale of [.25, .5, .75, 1]) {
    const points = metrics.map((_, index) => point(index, scale * 100).join(',')).join(' ');
    svg.appendChild(svgNode('polygon', { points, fill: 'none', stroke: '#33475d', 'stroke-width': 1 }));
  }
  metrics.forEach((metric, index) => {
    const [x, y] = point(index, 100);
    svg.appendChild(svgNode('line', { x1: cx, y1: cy, x2: x, y2: y, stroke: '#33475d', 'stroke-width': 1 }));
    const [lx, ly] = point(index, 125);
    const label = svgNode('text', { x: lx, y: ly, fill: '#aebfd2', 'font-size': 11, 'text-anchor': lx < cx - 8 ? 'end' : lx > cx + 8 ? 'start' : 'middle' });
    label.textContent = metric[0]; svg.appendChild(label);
  });
  for (const [valueIndex, color] of [[1, '#79adff'], [2, '#40d3bd']]) {
    const points = metrics.map((metric, index) => point(index, metric[valueIndex]).join(',')).join(' ');
    svg.appendChild(svgNode('polygon', { points, fill: `${color}33`, stroke: color, 'stroke-width': 3 }));
  }
  root.appendChild(svg);
  const legend = textNode('div', '', 'activity-legend');
  legend.append(textNode('b', sideName('left')), textNode('b', sideName('right'))); root.appendChild(legend);
}

function renderComparison() {
  document.getElementById('comparisonContent').hidden = !profiles.left && !profiles.right;
  if (!profiles.left && !profiles.right) return;
  renderStickyCompareHeader(); renderComparisonOverview();
  renderScore(); renderCategories(); renderDifferences(); renderArmy();
  renderWar(); renderHeadToHead(); renderActivity(); renderResume();
}

function warDate(value) {
  const date = model.parseWarDate(value);
  return date ? date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Tanggal tidak tersedia';
}

function sideName(side) { return profiles[side]?.player?.name || (side === 'left' ? 'Pemain A' : 'Pemain B'); }

function warStatusLabel(war) {
  const status = model.warStatus(war);
  if (status === 'notRoster') return 'Tidak ada arsip cocok · status roster tidak diketahui';
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
  const leftWars = model.filterWars(performances.left?.wars || [], period);
  const rightWars = model.filterWars(performances.right?.wars || [], period);
  displayedWars = model.combineWars(performances.left, performances.right, period);
  const note = document.getElementById('warNote');
  const archiveCount = leftWars.length + rightWars.length;
  note.textContent = `${leftWars.length} arsip untuk ${sideName('left')} dan ${rightWars.length} arsip untuk ${sideName('right')} pada periode ini. Riwayat diambil secara independen dari arsip clan masing-masing pemain. Ketiadaan arsip tidak berarti tidak masuk roster atau melewatkan serangan.${performanceErrors.length ? ` ${performanceErrors.join(' ')}` : ''}`;
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
      const sideWars = side === 'left' ? leftWars : rightWars;
      const sideRows = sideWars.map(war => ({ type: war.type, [side]: war }));
      const sum = model.warSummary(sideRows, side, type);
      player.appendChild(textNode('span', `${sum.wars} arsip saat masuk roster · ${sum.attacks} serangan · ${sum.stars} bintang`));
      player.appendChild(textNode('span', `${formatNumber(sum.starsPerAttack)} bintang/serangan · ${formatPercent(sum.destructionAverage)} destruksi`));
      player.appendChild(textNode('span', `${sum.missedQuota} kuota terlewat pada perang selesai`));
      if (sum.wars && sum.limitedSample) player.appendChild(textNode('small', 'Sampel terbatas (<5 serangan)', 'sample-badge'));
      pair.appendChild(player);
    }
    card.appendChild(pair); summaries.appendChild(card);
  }
  const advanced = document.getElementById('warAdvanced');
  advanced.replaceChildren();
  for (const type of ['CWL', 'War']) {
    const card = textNode('section', '', 'war-advanced-card');
    card.appendChild(textNode('h3', type === 'CWL' ? 'Kualitas serangan CWL' : 'Kualitas serangan War klasik'));
    for (const side of ['left', 'right']) {
      const sideWars = side === 'left' ? leftWars : rightWars;
      const rows = sideWars.map(war => ({ type: war.type, [side]: war }));
      const sum = model.warSummary(rows, side, type);
      const block = textNode('div', '', `war-advanced-player ${side}`);
      const quality = textNode('span', `Sampel ${sum.sampleQuality}`, `quality-badge quality-${sum.sampleQuality}`);
      const head = textNode('div', '', 'war-advanced-head'); head.append(textNode('b', sideName(side)), quality); block.appendChild(head);
      const metrics = textNode('div', '', 'war-metric-grid');
      for (const [label, value] of [
        ['3 bintang', sum.tripleRate == null ? '—' : `${formatPercent(sum.tripleRate)} (${sum.triples}/${sum.attacks})`],
        ['Pemakaian kuota', sum.quotaUsage == null ? 'Belum ada war selesai' : `${formatPercent(sum.quotaUsage)} (${sum.completedAttacks}/${sum.completedQuota})`],
        ['Konsistensi destruksi', sum.destructionDeviation == null ? 'Butuh ≥2 serangan' : `deviasi ${formatPercent(sum.destructionDeviation)}`],
        ['Distribusi bintang', sum.attacks ? `0★ ${sum.starDistribution[0]} · 1★ ${sum.starDistribution[1]} · 2★ ${sum.starDistribution[2]} · 3★ ${sum.starDistribution[3]}` : 'Belum ada serangan']
      ]) { const metric = textNode('div', '', 'war-advanced-metric'); metric.append(textNode('span', label), textNode('strong', value)); metrics.appendChild(metric); }
      block.appendChild(metrics); card.appendChild(block);
    }
    advanced.appendChild(card);
  }
  const charts = document.getElementById('warCharts');
  charts.replaceChildren();
  if (!archiveCount) {
    charts.appendChild(textNode('p', 'Belum ada arsip perang untuk kedua pemain pada periode ini. Ini bukan indikator bahwa pemain tidak masuk roster atau melewatkan serangan.', 'empty-section'));
    return;
  }
  for (const [side, wars] of [['left', leftWars], ['right', rightWars]]) {
    const history = textNode('section', '', `war-player-history ${side}`);
    const heading = textNode('div', '', 'war-player-history-heading');
    heading.append(textNode('h3', sideName(side)), textNode('span', `${wars.length} arsip`));
    history.appendChild(heading);
    if (!performances[side]) {
      history.appendChild(textNode('p', 'Arsip riwayat pemain tidak dapat dimuat.', 'empty-section'));
    } else if (!wars.length) {
      history.appendChild(textNode('p', 'Belum ada riwayat yang direkam untuk pemain ini pada periode terpilih. Status roster tidak diketahui.', 'empty-section'));
    } else {
      const clans = [...new Set(wars.map(war => war.clanName || war.clanTag).filter(Boolean))];
      if (clans.length) history.appendChild(textNode('p', `Arsip clan: ${clans.join(' · ')}`, 'war-history-clans'));
      const list = textNode('div', '', 'war-player-history-list');
      for (const war of wars) {
        const card = textNode('article', '', 'war-chart-card');
        const head = textNode('div', '', 'war-chart-head');
        const round = war.type === 'CWL' ? `CWL · Putaran ${war.round || '—'}` : 'War klasik';
        head.append(textNode('b', `${round} · ${war.opponent?.name || 'Musuh'}`), textNode('small', `${warDate(war.startTime || war.endTime)} · ${war.state || '—'}`));
        const row = textNode('div', '', 'war-own-result');
        const status = war.state === 'warEnded'
          ? war.missed ? 'Kuota terlewat' : `${war.attacks?.length || 0} serangan selesai`
          : war.attacks?.length ? `${war.attacks.length}/${war.quota || '—'} serangan` : (war.state === 'preparation' ? 'Persiapan · belum menyerang' : 'Belum menyerang');
        row.append(textNode('strong', `${war.stars ?? 0}★`), textNode('span', `${war.attacks?.length || 0}/${war.quota || '—'} serangan · ${war.attacks?.length ? `${formatPercent(war.destructionAverage)}% destruksi` : status}`), textNode('small', status));
        card.append(head, row);
        list.appendChild(card);
      }
      history.appendChild(list);
    }
    charts.appendChild(history);
  }
}

function leagueMetric(label, value, detail = '', mark = '') {
  const box = textNode('div', '', 'league-metric');
  const number = textNode('strong', value == null ? 'Tidak tersedia' : String(value));
  if (mark) number.appendChild(comparisonMark(mark, 'league-mark'));
  box.append(textNode('span', label), number);
  if (detail) box.appendChild(textNode('small', detail));
  return box;
}

function sameLeagueSeason() {
  const left = leaguePerformance.left;
  const right = leaguePerformance.right;
  const leftSeason = left?.session?.seasonId;
  const rightSeason = right?.session?.seasonId;
  return Boolean(left && right && leftSeason != null && rightSeason != null
    && String(leftSeason) === String(rightSeason));
}

function leagueMetricMark(side, key, value, lowerIsBetter = false) {
  if (!sameLeagueSeason() || value === null || value === undefined || !Number.isFinite(Number(value))) return '';
  const other = leaguePerformance[side === 'left' ? 'right' : 'left'];
  const otherValue = key === 'rank' ? other?.playerRank
    : key === 'attackStars' ? other?.attack?.starsAverage
      : key === 'attackDestruction' ? other?.attack?.destructionAverage
        : key === 'defenseStars' ? other?.defense?.starsAverage
          : other?.defense?.destructionAverage;
  if (otherValue === null || otherValue === undefined || !Number.isFinite(Number(otherValue))) return '';
  if (Number(value) === Number(otherValue)) return 'equal';
  const better = lowerIsBetter ? Number(value) < Number(otherValue) : Number(value) > Number(otherValue);
  return better ? 'higher' : 'lower';
}

function renderLeagueSide(side, data, error = null) {
  const root = document.getElementById(`leagueResult${side}`);
  root.replaceChildren();
  if (error) {
    root.appendChild(textNode('p', error, 'empty-section'));
    return;
  }
  if (!data) {
    root.appendChild(textNode('p', 'Memuat data Ranked League…', 'empty-section'));
    return;
  }
  const badge = textNode('div', data.leagueTier || 'Tier liga tidak tersedia', 'league-tier-label');
  const sessionName = data.session?.label || 'Sesi tidak diketahui';
  const date = Number(data.session?.seasonId) > 0
    ? new Date(Number(data.session.seasonId) * 1000).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '';
  const meta = textNode('p', `${sessionName}${date ? ` · ${date}` : ''} · ${data.totalMembers ?? 0} pemain dalam grup`, 'league-session-meta');
  const rank = textNode('div', '', 'league-rank-highlight');
  rank.append(textNode('strong', data.playerRank ? `#${data.playerRank}` : '—'), textNode('span', 'Peringkat grup berdasarkan trofi liga'));
  const player = data.player || {};
  const grid = textNode('div', '', 'league-stat-grid');
  grid.append(
    leagueMetric('Trofi liga', formatNumber(player.trophies)),
    leagueMetric('Peringkat grup', data.playerRank ? `#${data.playerRank} / ${data.totalMembers}` : null, '', leagueMetricMark(side, 'rank', data.playerRank, true)),
    leagueMetric('Serangan', player.attackCount == null ? null : player.attackCount, `${player.attackWins ?? '—'} menang · ${player.attackLosses ?? '—'} kalah`),
    leagueMetric('Bintang / serangan', formatNumber(data.attack?.starsAverage), `${data.attack?.sampleSize ?? 0} log serangan`, leagueMetricMark(side, 'attackStars', data.attack?.starsAverage)),
    leagueMetric('Destruksi serangan', formatPercent(data.attack?.destructionAverage), `${data.attack?.sampleSize ?? 0} log serangan`, leagueMetricMark(side, 'attackDestruction', data.attack?.destructionAverage)),
    leagueMetric('Pertahanan', player.defenseCount == null ? null : player.defenseCount, `${player.defenseWins ?? '—'} menang · ${player.defenseLosses ?? '—'} kalah`),
    leagueMetric('Bintang lawan / pertahanan', formatNumber(data.defense?.starsAverage), `${data.defense?.sampleSize ?? 0} log pertahanan`, leagueMetricMark(side, 'defenseStars', data.defense?.starsAverage, true)),
    leagueMetric('Destruksi saat bertahan', formatPercent(data.defense?.destructionAverage), `${data.defense?.sampleSize ?? 0} log pertahanan`, leagueMetricMark(side, 'defenseDestruction', data.defense?.destructionAverage, true))
  );
  root.append(badge, meta, rank, grid);
}

function renderLeagueComparisonNote() {
  const left = leaguePerformance.left;
  const right = leaguePerformance.right;
  const note = document.getElementById('leagueComparisonNote');
  if (!left || !right) {
    note.textContent = 'Peringkat grup tiap pemain ditampilkan terpisah. Grup berbeda tidak membentuk satu leaderboard bersama.';
    return;
  }
  const tiersDiffer = left.leagueTier && right.leagueTier && left.leagueTier !== right.leagueTier;
  const groupsDiffer = left.session?.groupTag && right.session?.groupTag
    && String(left.session.groupTag).toUpperCase() !== String(right.session.groupTag).toUpperCase();
  const leagueNotice = tiersDiffer ? `Level liga berbeda: ${left.leagueTier} dan ${right.leagueTier}. ` : '';
  const groupNotice = groupsDiffer ? 'Kedua pemain berada di grup yang berbeda. ' : '';
  note.textContent = sameLeagueSeason()
    ? `${leagueNotice}${groupNotice}Keduanya mengikuti musim Ranked League yang sama. Tanda ★ menunjukkan nilai unggul, sedangkan = menunjukkan nilai sama untuk metrik yang dibandingkan.`
    : `${leagueNotice}Musim Ranked League kedua pemain berbeda atau tidak lengkap. Angka ditampilkan per pemain tanpa tanda keunggulan.`;
}

function refreshLeagueComparison() {
  for (const side of ['left', 'right']) {
    if (leaguePerformance[side]) renderLeagueSide(side, leaguePerformance[side]);
  }
  renderLeagueComparisonNote();
}

async function loadLeagueSide(side, sessionId, requestId) {
  const profile = profiles[side];
  if (!profile || !sessionId) {
    leaguePerformance[side] = null;
    renderLeagueSide(side, null, 'Tidak ada sesi Ranked League yang tersedia untuk pemain ini.');
    renderLeagueComparisonNote();
    return;
  }
  renderLeagueSide(side, null);
  try {
    const tag = normalizeTag(profile.player.tag);
    const response = await fetch(`/api/player/${encodeURIComponent(tag)}/league-group?session=${encodeURIComponent(sessionId)}&detail=battle&memberTag=${encodeURIComponent(tag)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Data sesi Ranked League tidak tersedia.');
    if (requestId !== leagueRequestId[side]) return;
    leaguePerformance[side] = data;
    refreshLeagueComparison();
  } catch (error) {
    if (requestId !== leagueRequestId[side]) return;
    leaguePerformance[side] = null;
    renderLeagueSide(side, null, error.message);
  }
  renderLeagueComparisonNote();
}

function initializeLeagueComparison() {
  const root = document.getElementById('leagueComparisonGrid');
  root.replaceChildren();
  leaguePerformance.left = null;
  leaguePerformance.right = null;
  for (const side of ['left', 'right']) {
    const requestId = ++leagueRequestId[side];
    const profile = profiles[side];
    const card = textNode('section', '', `league-player-card ${side}`);
    const head = textNode('div', '', 'league-player-card-head');
    head.append(textNode('h3', sideName(side)));
    const select = document.createElement('select');
    select.id = `leagueSession${side}`;
    select.setAttribute('aria-label', `Pilih sesi Ranked League ${sideName(side)}`);
    const sessions = profile?.player?.leagueSessions || [];
    if (!sessions.length) select.add(new Option('Sesi tidak tersedia', ''));
    else {
      for (const session of sessions) {
        const date = Number(session.seasonId) > 0 ? new Date(Number(session.seasonId) * 1000).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : '';
        select.add(new Option(`${session.label}${date ? ` · ${date}` : ''}`, session.id));
      }
      select.value = sessions.some(session => session.id === 'current') ? 'current' : sessions[0].id;
    }
    select.disabled = !sessions.length;
    head.appendChild(select);
    const result = textNode('div', '', 'league-result');
    result.id = `leagueResult${side}`;
    card.append(head, result);
    root.appendChild(card);
    select.addEventListener('change', () => loadLeagueSide(side, select.value, ++leagueRequestId[side]));
    loadLeagueSide(side, select.value, requestId);
  }
  renderLeagueComparisonNote();
}

function svgNode(tag, attributes = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

function renderActivity() {
  const allSharedTrend = model.sharedSnapshots(performances.left, performances.right);
  const period = document.getElementById('activityPeriod').value;
  const metricKey = document.getElementById('activityMetric').value;
  const metricLabel = metricKey === 'donations' ? 'donasi' : 'trofi';
  sharedTrend = model.filterSnapshots(allSharedTrend, period);
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
  note.textContent = `${metricLabel[0].toUpperCase()}${metricLabel.slice(1)} ditampilkan pada ${sharedTrend.length} tanggal yang sama dalam periode terpilih. Donasi adalah counter profil; penurunan counter ditandai sebagai reset/perubahan dan tidak dihitung sebagai delta negatif.${resets ? ' Reset/perubahan counter terdeteksi pada periode ini.' : ''}`;
  const legend = textNode('div', '', 'activity-legend');
  legend.append(textNode('b', sideName('left')), textNode('b', sideName('right')));
  chart.appendChild(legend);
  const svg = svgNode('svg', { viewBox: '0 0 900 240', role: 'img', 'aria-label': `Grafik ${metricLabel} kedua pemain pada tanggal snapshot yang sama` });
  const all = sharedTrend.flatMap(point => [Number(point.left[metricKey] || 0), Number(point.right[metricKey] || 0)]);
  const min = Math.min(...all); const max = Math.max(...all);
  const y = value => 195 - (max === min ? .5 : (value - min) / (max - min)) * 150;
  const x = index => 55 + index / (sharedTrend.length - 1) * 790;
  for (let index = 0; index <= 3; index++) {
    const yy = 45 + index * 50;
    svg.appendChild(svgNode('line', { x1: 55, y1: yy, x2: 845, y2: yy, stroke: '#33475d', 'stroke-width': 1 }));
  }
  for (const [side, color] of [['left', '#79adff'], ['right', '#40d3bd']]) {
    const points = sharedTrend.map((point, index) => `${x(index)},${y(Number(point[side][metricKey] || 0))}`).join(' ');
    svg.appendChild(svgNode('polyline', { points, fill: 'none', stroke: color, 'stroke-width': 3, 'stroke-linejoin': 'round' }));
    sharedTrend.forEach((point, index) => {
      const value = Number(point[side][metricKey] || 0);
      const circle = svgNode('circle', { cx: x(index), cy: y(value), r: 4, fill: color });
      const title = svgNode('title'); title.textContent = `${sideName(side)} · ${point.date} · ${formatNumber(value)} ${metricLabel}`;
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
  if (!profiles.left || !profiles.right) {
    root.appendChild(textNode('p', 'Lengkapi kedua profil untuk membuat resume perbandingan.', 'empty-section'));
    return;
  }
  const names = { left: sideName('left'), right: sideName('right') };
  const advantages = { left: [], right: [], equal: [], recommendations: [], quality: [] };
  for (const category of model.categoryRows(profiles.left, profiles.right)) {
    const marks = model.numberMarks(category.left?.percent, category.right?.percent);
    if (marks.left === 'higher') advantages.left.push(`${category.label} ${formatPercent(category.left.percent)} vs ${formatPercent(category.right.percent)}`);
    else if (marks.right === 'higher') advantages.right.push(`${category.label} ${formatPercent(category.right.percent)} vs ${formatPercent(category.left.percent)}`);
    else if (marks.left === 'equal') advantages.equal.push(`${category.label} setara di ${formatPercent(category.left.percent)}`);
  }
  const armyCounts = { left: 0, right: 0, equal: 0 };
  for (const section of model.armyRows(profiles.left, profiles.right)) for (const row of section.rows) {
    const marks = model.itemLevelMark(row.left, row.right);
    if (marks.left === 'higher') armyCounts.left++;
    else if (marks.right === 'higher') armyCounts.right++;
    else if (marks.left === 'equal') armyCounts.equal++;
  }
  advantages.left.push(`${armyCounts.left} item Army memiliki level aktual lebih tinggi`);
  advantages.right.push(`${armyCounts.right} item Army memiliki level aktual lebih tinggi`);
  if (armyCounts.equal) advantages.equal.push(`${armyCounts.equal} item Army memiliki level sama`);

  const cwl = { left: model.warSummary(displayedWars, 'left', 'CWL'), right: model.warSummary(displayedWars, 'right', 'CWL') };
  if (cwl.left.attacks && cwl.right.attacks) {
    if (cwl.left.starsPerAttack > cwl.right.starsPerAttack) advantages.left.push(`CWL ${cwl.left.starsPerAttack} bintang/serangan`);
    else if (cwl.right.starsPerAttack > cwl.left.starsPerAttack) advantages.right.push(`CWL ${cwl.right.starsPerAttack} bintang/serangan`);
    else advantages.equal.push(`CWL setara ${cwl.left.starsPerAttack} bintang/serangan`);
    const recommended = cwl.left.starsPerAttack === cwl.right.starsPerAttack ? null
      : cwl.left.starsPerAttack > cwl.right.starsPerAttack ? 'left' : 'right';
    if (recommended) advantages.recommendations.push(`${names[recommended]} lebih layak dipertimbangkan untuk roster CWL berdasarkan rata-rata bintang pada periode terpilih.`);
    if (cwl.left.sampleQuality === 'rendah' || cwl.right.sampleQuality === 'rendah') advantages.quality.push('Kesimpulan CWL memiliki sampel rendah; gunakan sebagai indikasi awal.');
  } else advantages.quality.push('Perbandingan CWL belum lengkap karena salah satu pemain belum memiliki serangan terarsip pada periode ini.');

  const leftProgress = profiles.left.progress?.score?.overall;
  const rightProgress = profiles.right.progress?.score?.overall;
  if (leftProgress != null && rightProgress != null) {
    const mature = leftProgress === rightProgress ? null : leftProgress > rightProgress ? 'left' : 'right';
    if (mature) advantages.recommendations.push(`${names[mature]} memiliki progres pasukan dan hero yang lebih tinggi terhadap baseline akun yang tersedia.`);
  }
  if (sharedTrend.length >= 2) {
    const first = sharedTrend[0]; const last = sharedTrend.at(-1);
    const leftDelta = last.left.trophies - first.left.trophies;
    const rightDelta = last.right.trophies - first.right.trophies;
    if (leftDelta !== rightDelta) {
      const active = leftDelta > rightDelta ? 'left' : 'right';
      advantages.recommendations.push(`${names[active]} menunjukkan kenaikan trofi lebih besar pada snapshot bersama periode aktivitas.`);
    }
  } else advantages.quality.push('Rekomendasi aktivitas memerlukan minimal dua snapshot pada tanggal yang sama.');
  if (!profiles.left.progress?.complete || !profiles.right.progress?.complete) advantages.quality.push('Salah satu atau kedua profil memakai baseline parsial; skor progres bukan persentase seluruh akun.');

  const sections = [
    [`Keunggulan ${names.left}`, advantages.left, 'left'],
    [`Keunggulan ${names.right}`, advantages.right, 'right'],
    ['Hasil seimbang', advantages.equal, 'equal'],
    ['Rekomendasi konteks', advantages.recommendations, 'recommendation'],
    ['Kualitas data', advantages.quality, 'quality']
  ];
  for (const [title, lines, className] of sections) {
    const card = textNode('section', '', `resume-section ${className}`);
    card.appendChild(textNode('h3', title));
    if (!lines.length) card.appendChild(textNode('p', 'Belum ada indikator yang cukup.', 'empty-section'));
    else { const list = document.createElement('ul'); for (const line of lines) list.appendChild(textNode('li', line)); card.appendChild(list); }
    root.appendChild(card);
  }
}

async function copyComparisonLink() {
  const status = document.getElementById('shareStatus');
  const url = new URL(location.href);
  if (!url.hash) url.hash = '#progress';
  try {
    await navigator.clipboard.writeText(url.toString());
    status.textContent = 'Tautan disalin.';
  } catch {
    const input = document.createElement('textarea'); input.value = url.toString(); input.style.position = 'fixed'; input.style.opacity = '0';
    document.body.appendChild(input); input.select();
    status.textContent = document.execCommand('copy') ? 'Tautan disalin.' : 'Tidak dapat menyalin tautan.';
    input.remove();
  }
  setTimeout(() => { status.textContent = ''; }, 2500);
}

async function fetchPerformance(tag, context) {
  const response = await fetch(`/api/player/${encodeURIComponent(tag)}/war-history`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Arsip pemain tidak dapat dimuat.');
  return data;
}

async function loadPerformances() {
  async function readBoth() {
    const results = await Promise.allSettled(['left', 'right'].map(async side => {
      if (!profiles[side]) return null;
      return fetchPerformance(normalizeTag(profiles[side].player.tag));
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
    const tags = [...new Set([profiles.left, profiles.right]
      .map(profile => normalizeTag(profile?.player?.clan?.tag))
      .filter(Boolean))];
    await Promise.allSettled(tags.map(async tag => {
      const response = await fetch(`/api/clan/${encodeURIComponent(tag)}/war`);
      if (!response.ok) return;
      const war = await response.json();
      if (war.type === 'CWL') await fetch(`/api/clan/${encodeURIComponent(tag)}/cwl/performance`);
    }));
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
      window.RecentlyOpened?.player({ tag: data.player.tag, name: data.player.name, meta: data.player.townHallLevel ? `TH ${data.player.townHallLevel}` : '' });
      profiles[side] = data;
      renderCard(side, data);
    } catch (error) { showStatus(side, error.message, true); }
  });
  await Promise.allSettled(tasks);
  if (!rosterTag) loadRoster(normalizeTag(profiles.left?.player.clan?.tag || profiles.right?.player.clan?.tag));
  renderComparison();
  initializeLeagueComparison();
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
  location.href = `/compare.html${query.size ? `?${query}` : ''}${location.hash}`;
}

function activateCompareTab(hash = location.hash) {
  const aliases = { war: 'war-cwl', league: 'ranked-league' };
  const requested = String(hash || '').replace(/^#/, '').toLowerCase();
  const key = aliases[requested] || requested;
  const sections = ['progress', 'army', 'war-cwl', 'ranked-league', 'activity'];
  const active = sections.includes(key) ? key : 'progress';
  for (const tab of document.querySelectorAll('.compare-tabs a')) {
    const selected = tab.dataset.tab === active;
    tab.setAttribute('aria-selected', String(selected));
    if (selected) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
  for (const section of sections) document.getElementById(section).hidden = section !== active;
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
document.getElementById('armyMode').addEventListener('change', renderArmy);
document.getElementById('armySort').addEventListener('change', renderArmy);
document.getElementById('armyDifferencesOnly').addEventListener('change', renderArmy);
document.getElementById('warPeriod').addEventListener('change', () => { renderWar(); renderHeadToHead(); renderActivity(); renderResume(); });
document.getElementById('activityPeriod').addEventListener('change', () => { renderActivity(); renderResume(); });
document.getElementById('activityMetric').addEventListener('change', renderActivity);
document.getElementById('exportCsv').addEventListener('click', exportCsv);
document.getElementById('exportPng').addEventListener('click', exportPng);
document.getElementById('copyCompareLink').addEventListener('click', copyComparisonLink);
for (const link of document.querySelectorAll('.compare-tabs a')) link.addEventListener('click', () => activateCompareTab(link.hash));
window.addEventListener('hashchange', () => activateCompareTab());
activateCompareTab();
for (const [key, label] of model.sections) document.getElementById('armyCategory').add(new Option(label, key));
if (clanTag) { document.getElementById('backLink').href = `/?clan=${encodeURIComponent(clanTag)}`; loadRoster(clanTag); }
document.getElementById('player1').value = params.get('player1') || '';
document.getElementById('player2').value = params.get('player2') || '';
if (params.has('player1') || params.has('player2')) loadProfiles();
