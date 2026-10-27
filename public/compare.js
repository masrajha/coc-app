const model = window.CompareModel;
const params = new URLSearchParams(location.search);
const clanTag = normalizeTag(params.get('clan'));
const profiles = { left: null, right: null };
const performances = { left: null, right: null };
const leaguePerformance = { left: null, right: null };
const leagueLoadState = {left:'idle',right:'idle'};
let performanceErrors = [];
let sharedTrend = [];
let displayedWars = [];
let rosterTag = null;
const leagueRequestId = { left: 0, right: 0 };
const legendRanks = {left: null, right: null};
let legendRequestId = 0;
const tr = (key, variables) => window.CocI18n.t(key, variables);
const locale = () => window.CocI18n.formatLocale;
window.CompareBattleLog.configure({data:side=>leaguePerformance[side],name:side=>sideName(side),loading:side=>leagueLoadState[side]==='loading'});
window.CocI18n.setPageTitle('compare');

function normalizeTag(value) {
  const tag = String(value || '').trim().replace(/^#/, '').toUpperCase();
  return /^[0289PYLQGRJCUV]{3,15}$/.test(tag) ? tag : null;
}

function formatNumber(value) { return value == null ? '—' : window.CocI18n.number(Number(value)); }
function formatPercent(value) { return value == null ? '—' : `${window.CocI18n.number(Number(value))}%`; }
function textNode(tag, value, className) {
  const element = document.createElement(tag);
  element.textContent = value;
  if (className) element.className = className;
  return element;
}

function showStatus(side, message, error = false, loading = false) {
  const status = document.getElementById(side === 'left' ? 'status1' : 'status2');
  status.replaceChildren();
  if (loading) { const spinner = document.createElement('span'); spinner.className = 'loading-spinner'; spinner.setAttribute('aria-hidden', 'true'); status.append(spinner); status.classList.add('loading-state'); } else status.classList.remove('loading-state');
  status.appendChild(document.createTextNode(message));
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
  identity.appendChild(textNode('div', `${data.player.clan?.name || tr('player.noClan')} · TH ${data.player.townHallLevel ?? '—'} · BH ${data.player.builderHallLevel ?? '—'}`, 'compare-card-meta'));
  top.appendChild(identity);
  card.appendChild(top);
  const stats = textNode('div', '', 'compare-card-stats');
  for (const [label, value] of [
    [tr('player.trophies'), formatNumber(data.player.trophies)], ['War Stars', formatNumber(data.player.warStars)],
    ['XP', formatNumber(data.player.expLevel)], [tr('player.coverage'), coverage(data.progress)]
  ]) {
    const box = document.createElement('div');
    box.append(textNode('span', label), textNode('strong', value));
    stats.appendChild(box);
  }
  card.appendChild(stats);
  card.appendChild(textNode('div', tr('compare.updated', { date: new Date(data.lastUpdated).toLocaleString(locale()) }), 'card-source'));
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
  const labels = { higher: tr('compare.higher'), equal: tr('compare.equal'), lower: tr('compare.lower'), none: tr('compare.uncomparable') };
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
      item.appendChild(textNode('span', tr('compare.playerUnavailable', { player: tr(side === 'left' ? 'compare.playerA' : 'compare.playerB') })));
      root.appendChild(item); continue;
    }
    const badgeUrl = profile.player.clan?.badgeUrls?.small || profile.player.clan?.badgeUrls?.medium;
    if (badgeUrl) {
      const badge = document.createElement('img'); badge.src = badgeUrl; badge.alt = ''; item.appendChild(badge);
    }
    const identity = document.createElement('div');
    const link = textNode('a', profile.player.name); link.href = profileHref(profile);
    identity.append(link, textNode('small', tr('compare.stickyProgress', { th: profile.player.townHallLevel ?? '—', progress: formatPercent(profile.progress?.score?.overall) })));
    item.appendChild(identity); root.appendChild(item);
  }
}

function renderComparisonOverview() {
  const root = document.getElementById('overviewScore');
  const conclusion = document.getElementById('overviewConclusion');
  root.replaceChildren();
  if (!profiles.left || !profiles.right) {
    conclusion.textContent = tr('compare.completeForOverview');
    return;
  }
  const score = model.progressCategorySummary(profiles.left, profiles.right);
  for (const [label, value, side] of [
    [sideName('left'), score.left, 'left'], [tr('compare.equal'), score.equal, 'equal'], [sideName('right'), score.right, 'right']
  ]) {
    const tile = textNode('div', '', `overview-score-item ${side}`);
    tile.append(textNode('strong', value), textNode('span', label)); root.appendChild(tile);
  }
  const quality = profiles.left.progress?.complete && profiles.right.progress?.complete
    ? '' : tr('compare.partialQuality');
  if (!score.compared) conclusion.textContent = tr('compare.noComparableCategories');
  else if (score.left === score.right) conclusion.textContent = tr('compare.categoryTie', { count: score.compared, quality });
  else {
    const winner = score.left > score.right ? sideName('left') : sideName('right');
    conclusion.textContent = tr('compare.categoryWinner', { winner, won: Math.max(score.left, score.right), total: score.compared, quality });
  }
}

function renderScore() {
  const root = document.getElementById('scoreComparison');
  root.replaceChildren();
  const overallMarks = model.comparableProgress(profiles.left, profiles.right)
    ? model.numberMarks(profiles.left?.progress?.score?.overall, profiles.right?.progress?.score?.overall)
    : { left: 'none', right: 'none' };
  for (const [label, profile, side] of [[tr('compare.playerA'), profiles.left, 'left'], [tr('compare.playerB'), profiles.right, 'right']]) {
    const tile = textNode('div', '', 'score-tile');
    tile.appendChild(textNode('span', `${label} · ${profile?.player.name || tr('player.unavailable')}`));
    const score = textNode('strong', formatPercent(profile?.progress?.score?.overall));
    if (overallMarks[side] !== 'none') score.appendChild(comparisonMark(overallMarks[side]));
    tile.appendChild(score);
    const tag = tr(profile?.progress?.complete ? 'compare.coverageEnough' : 'compare.partialData');
    tile.appendChild(textNode('small', `${tag} · ${coverage(profile?.progress)}`));
    const rushed = !profile?.progress?.complete ? tr('player.rushed.unknown') : tr(profile.progress.rushed.rushed ? 'player.rushed.yes' : 'player.rushed.no');
    tile.appendChild(textNode('div', tr('compare.rushedStatus', { status: rushed }), 'card-source'));
    tile.appendChild(textNode('div', profile?.progress ? tr(profile.progress.tableExactMatch ? 'player.apiMaxSource' : 'player.localTableSource', { th: profile.progress.tableTownHallLevel }) : tr('compare.baselineUnavailable'), 'card-source'));
    root.appendChild(tile);
  }
  const note = document.getElementById('compareNotice');
  const left = profiles.left;
  const right = profiles.right;
  if (!left || !right) note.textContent = tr('compare.oneProfileMissing');
  else if (left.player.tag === right.player.tag) note.textContent = tr('compare.chooseDifferent');
  else if (left.player.townHallLevel !== right.player.townHallLevel) note.textContent = tr('compare.differentTh', { left: left.player.townHallLevel, right: right.player.townHallLevel });
  else if (!model.comparableProgress(left, right)) note.textContent = tr('compare.incomparableBaseline');
  else {
    const a = left.progress.score.overall;
    const b = right.progress.score.overall;
    const difference = a == null || b == null ? null : Math.abs(a - b);
    note.textContent = tr('compare.comparableBaseline', { difference: difference === null ? '' : tr('compare.scoreDifference', { value: formatNumber(difference) }) });
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
  cell.appendChild(textNode('small', value ? tr('compare.mappedItems', { known: value.knownItems, total: value.expectedItems, unmapped: value.unmappedItems?.length ? tr('compare.unmappedItems', { count: value.unmappedItems.length }) : '' }) : tr('player.unavailable')));
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
    root.appendChild(textNode('p', tr('compare.noLevelDifferences'), 'empty-section'));
    return;
  }
  for (const row of rows) {
    const item = textNode('div', '', 'difference-row');
    item.append(textNode('b', row.name), textNode('span', `${row.category}${row.equipmentHero ? ` · ${row.equipmentHero}` : ''}`),
      textNode('strong', tr('compare.levelDifference', { left: row.leftLevel, right: row.rightLevel, difference: row.difference })));
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
  if (!item) return textNode('span', tr('player.unavailable'), 'missing-level');
  const wrapper = textNode('span', '', `item-level ${mark}`);
  const progress = model.itemProgress(item);
  const progressLimit = item.progressMaxLevel;
  const limitLabel = progressLimit != null
    ? tr('compare.maxSource', { source: item.progressMaxSource || tr('compare.baseline'), limit: progressLimit })
    : (item.maxLevel != null ? tr('compare.maxApi', { limit: item.maxLevel }) : tr('compare.capUnavailable'));
  const value = mode === 'progress'
    ? (progress == null ? tr('compare.levelCapMissing', { level: item.level ?? '—' }) : `${formatPercent(progress)} · ${item.level}/${progressLimit}`)
    : tr('compare.levelAndCap', { level: item.level ?? '—', cap: limitLabel });
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
    ? tr('compare.armyProgressNote')
    : tr('compare.armyActualNote');
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
    if (!rows.length) { group.appendChild(textNode('p', tr(differencesOnly ? 'compare.noCategoryDifferences' : 'compare.noCategoryItems'), 'empty-section')); root.appendChild(group); continue; }
    const table = textNode('table', '', 'army-table');
    const head = document.createElement('thead');
    const header = document.createElement('tr');
    for (const title of [tr('compare.item'), profiles.left?.player.name || tr('compare.playerA'), profiles.right?.player.name || tr('compare.playerB')]) header.appendChild(textNode('th', title));
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
  document.getElementById('armyCount').textContent = tr('compare.uniqueItems', { count: formatNumber(count) });
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
    [tr('player.progress'), profiles.left.progress?.score?.overall, profiles.right.progress?.score?.overall],
    ['Hero', profiles.left.progress?.score?.categories?.heroes?.percent, profiles.right.progress?.score?.categories?.heroes?.percent],
    ['Troop', profiles.left.progress?.score?.categories?.troops?.percent, profiles.right.progress?.score?.categories?.troops?.percent],
    ['CWL ★', leftCwl.starsPerAttack == null ? null : leftCwl.starsPerAttack / 3 * 100, rightCwl.starsPerAttack == null ? null : rightCwl.starsPerAttack / 3 * 100],
    [tr('compare.cwlDestruction'), leftCwl.destructionAverage, rightCwl.destructionAverage]
  ].filter(metric => metric[1] !== null && metric[1] !== undefined && metric[2] !== null && metric[2] !== undefined
    && Number.isFinite(Number(metric[1])) && Number.isFinite(Number(metric[2])));
  const heading = textNode('div', '', 'head-to-head-heading');
  heading.append(textNode('h3', 'Head-to-head'), textNode('span', tr('compare.headToHeadMetrics', { count: metrics.length })));
  root.appendChild(heading);
  if (metrics.length < 3) {
    root.appendChild(textNode('p', tr('compare.chartNeedsMetrics'), 'empty-section'));
    return;
  }
  const svg = svgNode('svg', { viewBox: '0 0 560 330', role: 'img', 'aria-label': tr('compare.radarChartLabel') });
  const cx = 280; const cy = 155; const radius = 112;
  const point = (index, value) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / metrics.length;
    const distance = radius * Math.max(0, Math.min(100, Number(value))) / 100;
    return [cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance];
  };
  for (const scale of [.25, .5, .75, 1]) {
    const points = metrics.map((_, index) => point(index, scale * 100).join(',')).join(' ');
    svg.appendChild(svgNode('polygon', { points, fill: 'none', stroke: 'var(--theme-grid,#33475d)', 'stroke-width': 1 }));
  }
  metrics.forEach((metric, index) => {
    const [x, y] = point(index, 100);
    svg.appendChild(svgNode('line', { x1: cx, y1: cy, x2: x, y2: y, stroke: 'var(--theme-grid,#33475d)', 'stroke-width': 1 }));
    const [lx, ly] = point(index, 125);
    const label = svgNode('text', { x: lx, y: ly, fill: 'var(--theme-chart-label,#aebfd2)', 'font-size': 11, 'text-anchor': lx < cx - 8 ? 'end' : lx > cx + 8 ? 'start' : 'middle' });
    label.textContent = metric[0]; svg.appendChild(label);
  });
  for (const [valueIndex, color] of [[1, 'var(--theme-chart-blue,#79adff)'], [2, 'var(--theme-chart-teal,#40d3bd)']]) {
    const points = metrics.map((metric, index) => point(index, metric[valueIndex]).join(',')).join(' ');
    svg.appendChild(svgNode('polygon', { points, fill: valueIndex === 1 ? 'var(--theme-chart-blue-fill,#79adff33)' : 'var(--theme-chart-teal-fill,#40d3bd33)', stroke: color, 'stroke-width': 3 }));
  }
  root.appendChild(svg);
  const legend = textNode('div', '', 'activity-legend');
  legend.append(textNode('b', sideName('left')), textNode('b', sideName('right'))); root.appendChild(legend);
}

function updateComparisonTitle() {
  window.CocI18n.setPageTitle('compare', ['left', 'right'].map((side, index) => profiles[side]?.player?.name || profiles[side]?.player?.tag || normalizeTag(document.getElementById(index ? 'player2' : 'player1').value) || ''));
}

function renderComparison() {
  updateComparisonTitle();
  document.getElementById('comparisonContent').hidden = !profiles.left && !profiles.right;
  if (!profiles.left && !profiles.right) return;
  renderStickyCompareHeader(); renderComparisonOverview();
  renderScore(); renderCategories(); renderDifferences(); renderArmy();
  renderWar(); renderHeadToHead(); renderActivity(); renderResume();
}

function warDate(value) {
  const date = model.parseWarDate(value);
  return date ? date.toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' }) : tr('compare.dateUnavailable');
}

function sideName(side) { return profiles[side]?.player?.name || tr(side === 'left' ? 'compare.playerA' : 'compare.playerB'); }

function warStatusLabel(war) {
  const status = model.warStatus(war);
  if (status === 'notRoster') return tr('compare.rosterUnknown');
  if (status === 'missed') return tr('compare.missedQuota');
  if (status === 'partialMissed') return tr('compare.partialMissed');
  if (status === 'pending') return tr(war.state === 'preparation' ? 'compare.preparation' : 'compare.noAttacksYet');
  return tr('compare.attackCount', { count: war.attacks?.length || 0 });
}

function warStateLabel(state) {
  return tr(({ preparation: 'compare.statePreparation', inWar: 'compare.stateInWar', warEnded: 'compare.stateEnded' })[state] || 'player.unavailable');
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
  const metric = !performances[side] ? tr('compare.archiveUnavailable') : war ? `${war.stars}★ · ${war.attacks?.length || 0}/${war.quota || '—'} · ${war.attacks?.length ? `${formatPercent(war.destructionAverage)} ${tr('player.destruction').toLowerCase()}${model.warStatus(war) === 'partialMissed' ? ` · ${tr('compare.missedQuota').toLowerCase()}` : ''}` : warStatusLabel(war)}` : warStatusLabel(null);
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
  note.textContent = tr('compare.warArchiveNote', { leftCount: leftWars.length, left: sideName('left'), rightCount: rightWars.length, right: sideName('right'), errors: performanceErrors.length ? ` ${performanceErrors.join(' ')}` : '' });
  const summaries = document.getElementById('warSummary');
  summaries.replaceChildren();
  for (const type of ['CWL', 'War']) {
    const card = textNode('div', '', 'war-type-card');
    card.appendChild(textNode('h3', type === 'CWL' ? 'Clan War League' : tr('compare.classicWar')));
    const pair = textNode('div', '', 'war-type-players');
    for (const side of ['left', 'right']) {
      const player = textNode('div', '', 'war-type-player');
      player.appendChild(textNode('b', sideName(side)));
      if (!performances[side]) {
        player.appendChild(textNode('span', tr('compare.archiveUnavailableSentence')));
        pair.appendChild(player); continue;
      }
      const sideWars = side === 'left' ? leftWars : rightWars;
      const sideRows = sideWars.map(war => ({ type: war.type, [side]: war }));
      const sum = model.warSummary(sideRows, side, type);
      player.appendChild(textNode('span', tr('compare.warSummaryCounts', { wars: sum.wars, attacks: sum.attacks, stars: sum.stars })));
      player.appendChild(textNode('span', tr('compare.warSummaryAverages', { stars: formatNumber(sum.starsPerAttack), destruction: formatPercent(sum.destructionAverage) })));
      player.appendChild(textNode('span', tr('compare.warSummaryMissed', { count: sum.missedQuota })));
      if (sum.wars && sum.limitedSample) player.appendChild(textNode('small', tr('compare.limitedSample'), 'sample-badge'));
      pair.appendChild(player);
    }
    card.appendChild(pair); summaries.appendChild(card);
  }
  const advanced = document.getElementById('warAdvanced');
  advanced.replaceChildren();
  for (const type of ['CWL', 'War']) {
    const card = textNode('section', '', 'war-advanced-card');
    card.appendChild(textNode('h3', tr(type === 'CWL' ? 'compare.cwlAttackQuality' : 'compare.classicAttackQuality')));
    for (const side of ['left', 'right']) {
      const sideWars = side === 'left' ? leftWars : rightWars;
      const rows = sideWars.map(war => ({ type: war.type, [side]: war }));
      const sum = model.warSummary(rows, side, type);
      const block = textNode('div', '', `war-advanced-player ${side}`);
      const quality = textNode('span', tr('compare.sampleQuality', { quality: tr(`compare.quality.${sum.sampleQuality}`) }), `quality-badge quality-${sum.sampleQuality}`);
      const head = textNode('div', '', 'war-advanced-head'); head.append(textNode('b', sideName(side)), quality); block.appendChild(head);
      const metrics = textNode('div', '', 'war-metric-grid');
      for (const [label, value] of [
        [tr('compare.threeStars'), sum.tripleRate == null ? '—' : `${formatPercent(sum.tripleRate)} (${sum.triples}/${sum.attacks})`],
        [tr('compare.quotaUse'), sum.quotaUsage == null ? tr('compare.noCompletedWars') : `${formatPercent(sum.quotaUsage)} (${sum.completedAttacks}/${sum.completedQuota})`],
        [tr('compare.destructionConsistency'), sum.destructionDeviation == null ? tr('compare.needTwoAttacks') : tr('compare.deviation', { value: formatPercent(sum.destructionDeviation) })],
        [tr('compare.starDistribution'), sum.attacks ? `0★ ${sum.starDistribution[0]} · 1★ ${sum.starDistribution[1]} · 2★ ${sum.starDistribution[2]} · 3★ ${sum.starDistribution[3]}` : tr('compare.noAttacks')]
      ]) { const metric = textNode('div', '', 'war-advanced-metric'); metric.append(textNode('span', label), textNode('strong', value)); metrics.appendChild(metric); }
      block.appendChild(metrics); card.appendChild(block);
    }
    advanced.appendChild(card);
  }
  const charts = document.getElementById('warCharts');
  charts.replaceChildren();
  if (!archiveCount) {
    charts.appendChild(textNode('p', tr('compare.noWarArchive'), 'empty-section'));
    return;
  }
  for (const [side, wars] of [['left', leftWars], ['right', rightWars]]) {
    const history = textNode('section', '', `war-player-history ${side}`);
    const heading = textNode('div', '', 'war-player-history-heading');
    heading.append(textNode('h3', sideName(side)), textNode('span', tr('compare.archiveCount', { count: wars.length })));
    history.appendChild(heading);
    if (!performances[side]) {
      history.appendChild(textNode('p', tr('compare.playerArchiveFailed'), 'empty-section'));
    } else if (!wars.length) {
      history.appendChild(textNode('p', tr('compare.noPlayerWarHistory'), 'empty-section'));
    } else {
      const clans = [...new Set(wars.map(war => war.clanName || war.clanTag).filter(Boolean))];
      if (clans.length) history.appendChild(textNode('p', tr('compare.clanArchives', { clans: clans.join(' · ') }), 'war-history-clans'));
      const list = textNode('div', '', 'war-player-history-list');
      for (const war of wars) {
        const card = textNode('article', '', 'war-chart-card');
        const head = textNode('div', '', 'war-chart-head');
        const round = war.type === 'CWL' ? tr('compare.cwlRound', { round: war.round || '—' }) : tr('compare.classicWar');
        head.append(textNode('b', `${round} · ${war.opponent?.name || tr('player.enemy')}`), textNode('small', `${warDate(war.startTime || war.endTime)} · ${warStateLabel(war.state)}`));
        const row = textNode('div', '', 'war-own-result');
        const status = war.state === 'warEnded'
          ? war.missed ? tr('compare.missedQuota') : tr('compare.attacksComplete', { count: war.attacks?.length || 0 })
          : war.attacks?.length ? tr('compare.attacksOfQuota', { count: war.attacks.length, quota: war.quota || '—' }) : tr(war.state === 'preparation' ? 'compare.preparingNoAttack' : 'compare.noAttacksYet');
        row.append(textNode('strong', `${war.stars ?? 0}★`), textNode('span', tr('compare.warResult', { attacks: war.attacks?.length || 0, quota: war.quota || '—', detail: war.attacks?.length ? `${formatPercent(war.destructionAverage)} ${tr('player.destruction').toLowerCase()}` : status })), textNode('small', status));
        card.append(head, row);
        list.appendChild(card);
      }
      history.appendChild(list);
    }
    charts.appendChild(history);
  }
}

function sameLeagueSeason() {
  return model.sameLeagueSeason(leaguePerformance.left, leaguePerformance.right);
}

function leagueMetricMark(value, otherValue, lowerIsBetter = false, comparable = true) {
  if (!comparable) return '';
  if (!sameLeagueSeason() || value === null || value === undefined || !Number.isFinite(Number(value))) return '';
  if (otherValue === null || otherValue === undefined || !Number.isFinite(Number(otherValue))) return '';
  const a = Math.round(Number(value) * 100), b = Math.round(Number(otherValue) * 100);
  if (a === b) return 'equal';
  const better = lowerIsBetter ? a < b : a > b;
  return better ? 'higher' : 'lower';
}

function leagueLogCoverage(summary, side) {
  const sample = summary[side];
  return tr(sample.count == null ? 'compare.rankedUnknownCount' : 'compare.rankedCoverage', {
    logs: formatNumber(sample.logCount), count: formatNumber(sample.count)
  });
}

function renderLeagueSide(side, data, error = null) {
  const root = document.getElementById(`leagueResult${side}`);
  root.replaceChildren();
  if (error) {
    root.appendChild(textNode('p', error, 'empty-section'));
    return;
  }
  if (!data) {
    root.appendChild(textNode('p', tr('compare.loadingRanked'), 'empty-section'));
    return;
  }
  const badge = textNode('div', data.leagueTier || tr('compare.tierUnavailable'), 'league-tier-label');
  const sessionName = data.session?.id === 'current' ? tr('player.sessionCurrent') : data.session?.id === 'previous' ? tr('player.sessionPrevious') : tr('compare.sessionUnknown');
  const date = Number(data.session?.seasonId) > 0
    ? new Date(Number(data.session.seasonId) * 1000).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const meta = textNode('p', tr('compare.leagueSessionMeta', { session: sessionName, date: date ? ` · ${date}` : '', count: data.totalMembers ?? 0 }), 'league-session-meta');
  const rank = textNode('div', '', 'league-rank-highlight');
  rank.append(textNode('strong', data.playerRank ? `#${data.playerRank}` : '—'), textNode('span', tr('compare.groupRankByTrophies')));
  const summary = model.leagueSummary(data);
  const quality = textNode('p', `${tr('compare.attacks')}: ${leagueLogCoverage(summary, 'attack')} · ${tr('compare.defenses')}: ${leagueLogCoverage(summary, 'defense')}`, 'league-quality-note');
  const state = textNode('span', tr(summary.ended ? 'compare.rankedEnded' : 'compare.rankedOngoing'), 'league-session-state');
  if (!summary.attack.pointDataComplete || !summary.defense.pointDataComplete) quality.appendChild(textNode('small', tr('compare.rankedPartial')));
  if (summary.stale) quality.appendChild(textNode('small', tr('compare.rankedCached')));
  root.append(badge, meta, rank, state, quality);
  const battleButton=textNode('button',tr('compare.openBattleLog'),'open-compare-battle');
  battleButton.type='button';battleButton.dataset.openBattle=side;
  battleButton.setAttribute('aria-haspopup','dialog');battleButton.setAttribute('aria-controls','compareBattleDrawer');
  battleButton.setAttribute('aria-label',tr('compare.openPlayerBattleLog',{player:sideName(side)}));
  battleButton.addEventListener('click',()=>window.CompareBattleLog.open(side,battleButton));root.append(battleButton);
}

function renderLeagueMetrics() {
  const root = document.getElementById('leagueMetricsTable');
  root.replaceChildren();
  root.hidden = !['left', 'right'].some(side => profiles[side]?.player?.leagueSessions?.length);
  const summaries = Object.fromEntries(['left', 'right'].map(side => [side, model.leagueSummary(leaguePerformance[side])]));
  const points = (value, complete) => ({ value, comparable: complete, detail: complete ? '' : tr('compare.rankedPartialPoints') });
  const average = (value, count) => ({ value, detail: tr('compare.rankedPointSample', { count: formatNumber(count) }) });
  const triples = sample => ({ value: sample.tripleRate, display: sample.tripleRate == null ? null : `${formatNumber(sample.triples)}/${formatNumber(sample.starCount)} · ${formatPercent(Math.round(sample.tripleRate * 100) / 100)}` });
  const definitions = [
    { key: 'player.totalTrophies', trophy: true, get: (d, s) => ({ value: s.totalTrophies }) },
    { key: 'player.attackPoints', trophy: true, get: (d, s) => points(s.attack.points, s.attack.pointDataComplete) },
    { key: 'player.defensePoints', trophy: true, get: (d, s) => ({ ...points(s.defense.totalPoints, s.defense.totalComplete), detail: s.defense.bonusPoints > 0 ? tr('compare.rankedBonusBreakdown', { battle: formatNumber(s.defense.points), bonus: formatNumber(s.defense.bonusPoints) }) : (s.defense.totalComplete ? tr('compare.rankedBattlePointsOnly') : tr('compare.rankedPartialPoints')) }) },
    { key: 'player.defenseBonus', trophy: true, mark: false, get: (d, s) => ({ value: s.defense.bonusKnown ? s.defense.bonusPoints : null, detail: tr(s.ended ? 'compare.rankedBonusFinal' : 'compare.rankedBonusPending') }) },
    { key: 'compare.groupRank', lower: true, get: d => ({ value: d.playerRank, display: d.playerRank ? `#${formatNumber(d.playerRank)} / ${formatNumber(d.totalMembers)}` : null }) },
    ...['attack', 'defense'].map(side => ({ key: side === 'attack' ? 'compare.rankedAttacksUsed' : 'compare.rankedDefensesUsed', mark: false, get: (d, s) => ({ value: s[side].count, display: s[side].count == null ? null : `${formatNumber(s[side].count)} / ${formatNumber(s[side].quota)}`, detail: tr('compare.winLoss', { wins: formatNumber(d.player?.[`${side}Wins`]), losses: formatNumber(d.player?.[`${side}Losses`]) }) }) })),
    { key: 'compare.rankedAttackAverage', trophy: true, get: (d, s) => average(s.attack.pointsAverage, s.attack.pointCount) },
    { key: 'compare.rankedDefenseAverage', trophy: true, get: (d, s) => ({ ...average(s.defense.pointsAverage, s.defense.pointCount), detail: `${tr('compare.rankedPointSample', { count: formatNumber(s.defense.pointCount) })} · ${tr('compare.rankedExcludesBonus')}` }) },
    { key: 'compare.rankedAttackTriples', get: (d, s) => triples(s.attack) },
    { key: 'compare.rankedDefenseTriples', lower: true, get: (d, s) => triples(s.defense) },
    { key: 'compare.starsPerAttack', get: d => ({ value: d.attack?.starsAverage }) },
    { key: 'compare.attackDestruction', percent: true, get: d => ({ value: d.attack?.destructionAverage }) },
    { key: 'compare.opponentStarsPerDefense', lower: true, get: d => ({ value: d.defense?.starsAverage }) },
    { key: 'compare.defenseDestruction', percent: true, lower: true, get: d => ({ value: d.defense?.destructionAverage }) }
  ];
  const table = document.createElement('table'); table.className = 'league-metrics-table';
  const caption = textNode('caption', tr('compare.rankedTableCaption')); table.appendChild(caption);
  const head = document.createElement('thead'), heading = document.createElement('tr');
  for (const label of [tr('compare.rankedMetric'), sideName('left'), sideName('right')]) { const th = textNode('th', label); th.scope = 'col'; heading.appendChild(th); }
  head.appendChild(heading); table.appendChild(head);
  const body = document.createElement('tbody');
  for (const metric of definitions) {
    const row = document.createElement('tr');
    const name = textNode('th', tr(metric.key)); name.scope = 'row'; row.appendChild(name);
    const values = Object.fromEntries(['left', 'right'].map(side => [side, leaguePerformance[side] ? metric.get(leaguePerformance[side], summaries[side]) : { value: null }]));
    for (const side of ['left', 'right']) {
      const item = values[side], other = values[side === 'left' ? 'right' : 'left'];
      const td = document.createElement('td');
      const value = textNode('strong', item.display ?? (metric.percent ? formatPercent(item.value) : formatNumber(item.value == null ? null : Math.round(item.value * 100) / 100)), 'league-table-value');
      if (metric.trophy && item.value != null) { const icon = document.createElement('img'); icon.src = '/assets/trophy.png'; icon.alt = ''; icon.width = 16; icon.height = 16; value.prepend(icon); }
      const mark = leagueMetricMark(item.value, other.value, metric.lower, metric.mark !== false && item.comparable !== false && other.comparable !== false);
      if (mark) value.appendChild(comparisonMark(mark, 'league-mark'));
      td.appendChild(value);
      if (item.detail) td.appendChild(textNode('small', item.detail));
      row.appendChild(td);
    }
    body.appendChild(row);
  }
  table.appendChild(body); root.appendChild(table);
  renderLeagueResume(summaries);
}

function renderLeagueResume(summaries) {
  const root = document.getElementById('leagueResume');
  if (!leaguePerformance.left || !leaguePerformance.right) { root.textContent = tr('compare.rankedResumePending'); return; }
  if (!sameLeagueSeason()) { root.textContent = tr('compare.differentLeagueSeason'); return; }
  const facts = [];
  const a = summaries.left, b = summaries.right;
  for (const [label, left, right, lower, comparable] of [
    ['player.attackPoints', a.attack.points, b.attack.points, false, a.attack.pointDataComplete && b.attack.pointDataComplete],
    ['player.defensePoints', a.defense.totalPoints, b.defense.totalPoints, false, a.defense.totalComplete && b.defense.totalComplete],
    ['compare.rankedAttackTriples', a.attack.tripleRate, b.attack.tripleRate, false, true],
    ['compare.defenseDestruction', leaguePerformance.left.defense?.destructionAverage, leaguePerformance.right.defense?.destructionAverage, true, true]
  ]) {
    const mark = leagueMetricMark(left, right, lower, comparable);
    if (mark && mark !== 'equal') facts.push(tr(lower ? 'compare.rankedResumeLower' : 'compare.rankedResumeHigher', { player: sideName(mark === 'higher' ? 'left' : 'right'), metric: tr(label) }));
  }
  if (!facts.length) facts.push(tr('compare.rankedResumeBalanced'));
  if (leaguePerformance.left.leagueTier !== leaguePerformance.right.leagueTier) facts.push(tr('compare.rankedTierContext'));
  if (!a.attack.pointDataComplete || !a.defense.pointDataComplete || !b.attack.pointDataComplete || !b.defense.pointDataComplete) facts.push(tr('compare.rankedPartial'));
  if (!a.ended || !b.ended) facts.push(tr('compare.rankedProvisional'));
  root.textContent = facts.join(' ');
}

function renderLeagueComparisonNote() {
  const left = leaguePerformance.left;
  const right = leaguePerformance.right;
  const note = document.getElementById('leagueComparisonNote');
  if (!left || !right) {
    note.textContent = tr('compare.leagueSeparateGroups');
    return;
  }
  const tiersDiffer = left.leagueTier && right.leagueTier && left.leagueTier !== right.leagueTier;
  const groupsDiffer = left.session?.groupTag && right.session?.groupTag
    && String(left.session.groupTag).toUpperCase() !== String(right.session.groupTag).toUpperCase();
  const leagueNotice = tiersDiffer ? tr('compare.differentTiers', { left: left.leagueTier, right: right.leagueTier }) : '';
  const groupNotice = groupsDiffer ? tr('compare.differentGroups') : '';
  note.textContent = sameLeagueSeason()
    ? `${leagueNotice}${groupNotice}${tr('compare.sameLeagueSeason')}`
    : `${leagueNotice}${tr('compare.differentLeagueSeason')}`;
}

function refreshLeagueComparison() {
  for (const side of ['left', 'right']) {
    if (leaguePerformance[side]) renderLeagueSide(side, leaguePerformance[side]);
  }
  renderLeagueComparisonNote();
  renderLeagueMetrics();
  window.CompareBattleLog.refresh();
}

async function loadLeagueSide(side, sessionId, requestId) {
  const profile = profiles[side];
  leaguePerformance[side] = null;
  leagueLoadState[side] = profile && sessionId ? 'loading' : 'empty';
  refreshLeagueComparison();
  if (!profile || !sessionId) {
    leaguePerformance[side] = null;
    renderLeagueSide(side, null, tr(profile?.player?.leagueTier?.name === 'Legend I' ? 'compare.legendNoPrevious' : 'compare.noLeagueSession'));
    refreshLeagueComparison();
    return;
  }
  renderLeagueSide(side, null);
  try {
    const tag = normalizeTag(profile.player.tag);
    const response = await window.CocI18n.apiFetch(`/api/player/${encodeURIComponent(tag)}/league-group?session=${encodeURIComponent(sessionId)}&detail=battle&memberTag=${encodeURIComponent(tag)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || tr('compare.leagueSessionUnavailable'));
    if (requestId !== leagueRequestId[side]) return;
    leaguePerformance[side] = data;
    leagueLoadState[side] = 'ready';
  } catch (error) {
    if (requestId !== leagueRequestId[side]) return;
    leaguePerformance[side] = null;
    leagueLoadState[side] = 'error';
    renderLeagueSide(side, null, error.message);
  }
  refreshLeagueComparison();
}

function legendValue(side, field) {
  const profile = profiles[side];
  if (profile?.player?.leagueTier?.name !== 'Legend I') return null;
  return field === 'rank' ? legendRanks[side]?.rank ?? null
    : profile.player.legendStatistics?.currentSeason?.trophies ?? profile.player.trophies ?? null;
}

function legendTransition(side) {
  const change = profiles[side]?.player?.leagueTransition;
  if (!['promoted', 'demoted', 'unchanged'].includes(change?.status)) return tr('player.leagueHistoryUnknown');
  const movement = change.status === 'unchanged' ? change.currentTier : `${change.previousTier} → ${change.currentTier}`;
  return `${tr(`player.leagueChange.${change.status}`)} · ${movement}`;
}

function legendTable(root, rows, comparable = false) {
  root.replaceChildren();
  const table = textNode('table', '', 'league-metrics-table');
  const head = document.createElement('thead'), titles = document.createElement('tr');
  for (const title of [tr('compare.rankedMetric'), sideName('left'), sideName('right')]) {
    const th = textNode('th', title); th.scope = 'col'; titles.append(th);
  }
  head.append(titles); table.append(head);
  const body = document.createElement('tbody');
  for (const row of rows) {
    const line = document.createElement('tr');
    const label = textNode('th', tr(row.key)); label.scope = 'row'; line.append(label);
    const items = {left: row.get('left'), right: row.get('right')};
    const valid = comparable && row.mark && ['left', 'right'].every(side => Number.isFinite(items[side].value));
    const marks = valid ? model.numberMarks(items.left.value * (row.lower ? -1 : 1), items.right.value * (row.lower ? -1 : 1)) : null;
    for (const side of ['left', 'right']) {
      const item = items[side], cell = document.createElement('td');
      const value = textNode('strong', item.text ?? formatNumber(item.value), 'league-table-value');
      if (marks) value.append(comparisonMark(marks[side], 'league-mark'));
      cell.append(value);
      if (item.detail) cell.append(textNode('small', item.detail));
      line.append(cell);
    }
    body.append(line);
  }
  table.append(body); root.append(table);
}

function renderLegendComparison() {
  const root = document.getElementById('legendComparison');
  const context = model.legendContext(profiles.left, profiles.right);
  root.hidden = !context.visible;
  if (!context.visible) return;
  const week = profiles.left?.player?.leagueTransition?.seasonId;
  const period = week ? window.CocI18n.dateTime(new Date(week * 1000), {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}) : profiles.left?.player?.legendStatistics?.currentSeason?.id || tr('compare.sessionUnknown');
  document.getElementById('legendComparisonContext').textContent = tr(!context.both ? 'compare.legendMixedSystems' : context.samePeriod ? 'compare.legendSamePeriod' : 'compare.legendUnconfirmedPeriod', {date:period});
  const ranksComparable = context.samePeriod && ['left', 'right'].every(side => {
    const timestamp = Date.parse(legendRanks[side]?.lastUpdated);
    const start = profiles[side]?.player?.leagueTransition?.seasonId * 1000;
    return Number.isFinite(timestamp) && timestamp >= start && timestamp < start + 7 * 86400000;
  }) && Math.abs(Date.parse(legendRanks.left?.lastUpdated) - Date.parse(legendRanks.right?.lastUpdated)) <= 600000;
  legendTable(document.getElementById('legendComparisonTable'), [
    {key:'compare.legendCurrentTier', get:side => ({text:profiles[side]?.player?.leagueTier?.name || tr('compare.tierUnavailable')})},
    {key:'player.legendSeasonTrophies', mark:true, get:side => ({value:legendValue(side,'trophies'), detail:profiles[side]?.player?.leagueTier?.name !== 'Legend I' ? tr('compare.legendGroupBelow') : profiles[side]?.lastUpdated ? tr('player.globalRankUpdated',{date:window.CocI18n.dateTime(new Date(profiles[side].lastUpdated))}) : ''})},
    {key:'player.legendGlobalRank', mark:ranksComparable, lower:true, get:side => {
      const data=legendRanks[side], rank=legendValue(side,'rank');
      const detail = data?.error || (data?.loading ? tr('player.globalRankLoading') : data?.rank == null && data ? tr('player.globalRankCoverage',{count:formatNumber(data.scanned || 0)}) : data?.lastUpdated ? tr('player.globalRankUpdated',{date:window.CocI18n.dateTime(new Date(data.lastUpdated))}) : '');
      return {value:rank,text:rank ? `#${formatNumber(rank)}` : tr('player.globalRankUnavailable'),detail:profiles[side]?.player?.leagueTier?.name === 'Legend I' ? detail : tr('compare.legendGroupBelow')};
    }},
    {key:'compare.legendCutoff', get:side => {
      const rank=legendValue(side,'rank');
      return {text:rank ? tr(rank<=10000?'player.globalWithinCutoff':'player.globalDemotionZone') : tr('player.globalRankUnavailable')};
    }},
    {key:'compare.legendMovement', get:side=>({text:legendTransition(side)})}
  ], context.samePeriod);
  legendTable(document.getElementById('legendComparisonRecords'), [
    {key:'player.legendBestTrophies',get:side=>({value:profiles[side]?.player?.legendStatistics?.bestSeason?.trophies ?? null})},
    {key:'player.legendBestRank',get:side=>({value:profiles[side]?.player?.legendStatistics?.bestSeason?.rank ?? null})},
    {key:'compare.legendRecordPeriod',get:side=>({text:profiles[side]?.player?.legendStatistics?.bestSeason?.id || tr('player.noData')})}
  ]);
}

async function loadLegendRank(side, request) {
  const profile = profiles[side], tag = normalizeTag(profile.player.tag);
  const rank = profile.player.legendStatistics?.currentSeason?.rank;
  if (Number.isInteger(rank) && rank > 0) {
    legendRanks[side] = {rank,lastUpdated:profile.lastUpdated}; renderLegendComparison(); return;
  }
  legendRanks[side] = {loading:true}; renderLegendComparison();
  try {
    for (let page=0;page<20;page++) {
      if(request!==legendRequestId || profiles[side]!==profile)return;
      const response = await window.CocI18n.apiFetch(`/api/player/${encodeURIComponent(tag)}/global-ranking`);
      const data = await response.json();
      if(request!==legendRequestId || profiles[side]!==profile)return;
      if(!response.ok)throw new Error(data.error || tr('player.globalRankFailed'));
      legendRanks[side] = {...data,loading:Boolean(data.canContinue)}; renderLegendComparison();
      if(!data.canContinue)return;
      await new Promise(resolve=>setTimeout(resolve,750));
    }
    legendRanks[side] = {error:tr('player.globalRankIncomplete')};
  } catch(error) {
    if(request!==legendRequestId || profiles[side]!==profile)return;
    legendRanks[side] = {error:tr('player.globalRankFailed')+' '+error.message};
  }
  renderLegendComparison();
}

function initializeLegendComparison() {
  const request = ++legendRequestId;
  legendRanks.left=null;legendRanks.right=null;
  renderLegendComparison();
  for(const side of ['left','right']) if(profiles[side]?.player?.leagueTier?.name==='Legend I')loadLegendRank(side,request);
}

function initializeLeagueComparison() {
  initializeLegendComparison();
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
    select.setAttribute('aria-label', tr('compare.chooseLeagueSession', { player: sideName(side) }));
    const sessions = profile?.player?.leagueSessions || [];
    if (!sessions.length) select.add(new Option(tr('compare.sessionUnavailable'), ''));
    else {
      for (const session of sessions) {
        const date = Number(session.seasonId) > 0 ? new Date(Number(session.seasonId) * 1000).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        const sessionName = tr(session.id === 'current' ? 'player.sessionCurrent' : 'player.sessionPrevious');
        select.add(new Option(`${sessionName}${date ? ` · ${date}` : ''}`, session.id));
      }
      select.value = profile?.player?.leagueTier?.name === 'Legend I' && sessions.some(session => session.id === 'previous')
        ? 'previous' : sessions.some(session => session.id === 'current') ? 'current' : sessions[0].id;
    }
    select.disabled = !sessions.length;
    head.appendChild(select);
    const result = textNode('div', '', 'league-result');
    result.id = `leagueResult${side}`;
    card.append(head, result);
    if (profile?.player?.leagueTier?.name === 'Legend I' && sessions.some(session => session.id === 'previous')) {
      card.append(textNode('p', tr('compare.legendPreviousKept'), 'league-quality-note'));
    }
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
  const metricLabel = tr(metricKey === 'donations' ? 'player.donations' : 'player.trophies').toLowerCase();
  sharedTrend = model.filterSnapshots(allSharedTrend, period);
  document.getElementById('activityCount').textContent = tr('compare.sharedDates', { count: sharedTrend.length });
  const note = document.getElementById('activityNote');
  const chart = document.getElementById('activityChart');
  const tableRoot = document.getElementById('donationTable');
  chart.replaceChildren(); tableRoot.replaceChildren();
  const enough = sharedTrend.length >= 2;
  document.getElementById('exportCsv').disabled = !profiles.left || !profiles.right || (!displayedWars.length && !enough);
  document.getElementById('exportPng').disabled = !profiles.left || !profiles.right || !enough;
  if (!enough) {
    note.textContent = !performances.left || !performances.right
      ? tr('compare.trendArchiveMissing')
      : tr('compare.trendNeedsSnapshots');
    chart.appendChild(textNode('p', tr('compare.trendChartPending'), 'empty-section'));
    return;
  }
  const leftChanges = model.donationChanges(sharedTrend, 'left');
  const rightChanges = model.donationChanges(sharedTrend, 'right');
  const resets = leftChanges.some(point => point.reset) || rightChanges.some(point => point.reset);
  note.textContent = tr('compare.activityNote', { metric: metricLabel[0].toUpperCase() + metricLabel.slice(1), count: sharedTrend.length, reset: resets ? tr('compare.resetDetected') : '' });
  const legend = textNode('div', '', 'activity-legend');
  legend.append(textNode('b', sideName('left')), textNode('b', sideName('right')));
  chart.appendChild(legend);
  const svg = svgNode('svg', { viewBox: '0 0 900 240', role: 'img', 'aria-label': tr('compare.activityChartLabel', { metric: metricLabel }) });
  const all = sharedTrend.flatMap(point => [Number(point.left[metricKey] || 0), Number(point.right[metricKey] || 0)]);
  const min = Math.min(...all); const max = Math.max(...all);
  const y = value => 195 - (max === min ? .5 : (value - min) / (max - min)) * 150;
  const x = index => 55 + index / (sharedTrend.length - 1) * 790;
  for (let index = 0; index <= 3; index++) {
    const yy = 45 + index * 50;
    svg.appendChild(svgNode('line', { x1: 55, y1: yy, x2: 845, y2: yy, stroke: 'var(--theme-grid,#33475d)', 'stroke-width': 1 }));
  }
  for (const [side, color] of [['left', 'var(--theme-chart-blue,#79adff)'], ['right', 'var(--theme-chart-teal,#40d3bd)']]) {
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
    const text = svgNode('text', { x: x(position), y: 220, fill: 'var(--theme-chart-label,#9eb2c8)', 'font-size': 11, 'text-anchor': position ? 'end' : 'start' });
    text.textContent = label; svg.appendChild(text);
  }
  chart.appendChild(svg);
  const table = document.createElement('table');
  const head = document.createElement('thead'); const headRow = document.createElement('tr');
  for (const label of [tr('compare.date'), `${sideName('left')} · ${tr('player.donations').toLowerCase()}`, 'Delta A', `${sideName('right')} · ${tr('player.donations').toLowerCase()}`, 'Delta B']) headRow.appendChild(textNode('th', label));
  head.appendChild(headRow); table.appendChild(head);
  const body = document.createElement('tbody');
  sharedTrend.forEach((point, index) => {
    const row = document.createElement('tr');
    row.appendChild(textNode('td', point.date));
    for (const [side, change] of [['left', leftChanges[index]], ['right', rightChanges[index]]]) {
      row.appendChild(textNode('td', formatNumber(point[side].donations)));
      row.appendChild(textNode('td', change.reset ? tr('compare.resetChange') : change.delta === null ? '—' : `+${change.delta}`, change.reset ? 'reset-badge' : ''));
    }
    body.appendChild(row);
  });
  table.appendChild(body); tableRoot.appendChild(table);
}

function renderResume() {
  const root = document.getElementById('resumeText');
  root.replaceChildren();
  if (!profiles.left || !profiles.right) {
    root.appendChild(textNode('p', tr('compare.resumeNeedsProfiles'), 'empty-section'));
    return;
  }
  const names = { left: sideName('left'), right: sideName('right') };
  const advantages = { left: [], right: [], equal: [], recommendations: [], quality: [] };
  for (const category of model.categoryRows(profiles.left, profiles.right)) {
    const marks = model.numberMarks(category.left?.percent, category.right?.percent);
    if (marks.left === 'higher') advantages.left.push(`${category.label} ${formatPercent(category.left.percent)} vs ${formatPercent(category.right.percent)}`);
    else if (marks.right === 'higher') advantages.right.push(`${category.label} ${formatPercent(category.right.percent)} vs ${formatPercent(category.left.percent)}`);
    else if (marks.left === 'equal') advantages.equal.push(tr('compare.categoryEqual', { category: category.label, value: formatPercent(category.left.percent) }));
  }
  const armyCounts = { left: 0, right: 0, equal: 0 };
  for (const section of model.armyRows(profiles.left, profiles.right)) for (const row of section.rows) {
    const marks = model.itemLevelMark(row.left, row.right);
    if (marks.left === 'higher') armyCounts.left++;
    else if (marks.right === 'higher') armyCounts.right++;
    else if (marks.left === 'equal') armyCounts.equal++;
  }
  advantages.left.push(tr('compare.armyHigherCount', { count: armyCounts.left }));
  advantages.right.push(tr('compare.armyHigherCount', { count: armyCounts.right }));
  if (armyCounts.equal) advantages.equal.push(tr('compare.armyEqualCount', { count: armyCounts.equal }));

  const cwl = { left: model.warSummary(displayedWars, 'left', 'CWL'), right: model.warSummary(displayedWars, 'right', 'CWL') };
  if (cwl.left.attacks && cwl.right.attacks) {
    if (cwl.left.starsPerAttack > cwl.right.starsPerAttack) advantages.left.push(tr('compare.cwlStars', { value: formatNumber(cwl.left.starsPerAttack) }));
    else if (cwl.right.starsPerAttack > cwl.left.starsPerAttack) advantages.right.push(tr('compare.cwlStars', { value: formatNumber(cwl.right.starsPerAttack) }));
    else advantages.equal.push(tr('compare.cwlStarsEqual', { value: formatNumber(cwl.left.starsPerAttack) }));
    const recommended = cwl.left.starsPerAttack === cwl.right.starsPerAttack ? null
      : cwl.left.starsPerAttack > cwl.right.starsPerAttack ? 'left' : 'right';
    if (recommended) advantages.recommendations.push(tr('compare.cwlRecommendation', { player: names[recommended] }));
    if (cwl.left.sampleQuality === 'rendah' || cwl.right.sampleQuality === 'rendah') advantages.quality.push(tr('compare.cwlLowSample'));
  } else advantages.quality.push(tr('compare.cwlIncomplete'));

  const leftProgress = profiles.left.progress?.score?.overall;
  const rightProgress = profiles.right.progress?.score?.overall;
  if (leftProgress != null && rightProgress != null) {
    const mature = leftProgress === rightProgress ? null : leftProgress > rightProgress ? 'left' : 'right';
    if (mature) advantages.recommendations.push(tr('compare.progressRecommendation', { player: names[mature] }));
  }
  if (sharedTrend.length >= 2) {
    const first = sharedTrend[0]; const last = sharedTrend.at(-1);
    const leftDelta = last.left.trophies - first.left.trophies;
    const rightDelta = last.right.trophies - first.right.trophies;
    if (leftDelta !== rightDelta) {
      const active = leftDelta > rightDelta ? 'left' : 'right';
      advantages.recommendations.push(tr('compare.activityRecommendation', { player: names[active] }));
    }
  } else advantages.quality.push(tr('compare.activityNeedsSnapshots'));
  if (!profiles.left.progress?.complete || !profiles.right.progress?.complete) advantages.quality.push(tr('compare.partialBaselineQuality'));

  const sections = [
    [tr('compare.advantagesFor', { player: names.left }), advantages.left, 'left'],
    [tr('compare.advantagesFor', { player: names.right }), advantages.right, 'right'],
    [tr('compare.balancedResult'), advantages.equal, 'equal'],
    [tr('compare.contextRecommendations'), advantages.recommendations, 'recommendation'],
    [tr('compare.dataQuality'), advantages.quality, 'quality']
  ];
  for (const [title, lines, className] of sections) {
    const card = textNode('section', '', `resume-section ${className}`);
    card.appendChild(textNode('h3', title));
    if (!lines.length) card.appendChild(textNode('p', tr('compare.notEnoughIndicators'), 'empty-section'));
    else { const list = document.createElement('ul'); for (const line of lines) list.appendChild(textNode('li', line)); card.appendChild(list); }
    root.appendChild(card);
  }
}

async function copyComparisonLink(event) {
  const status = document.getElementById(event?.currentTarget?.id === 'copyActiveTabLink' ? 'tabShareStatus' : 'shareStatus');
  await window.CocShare.copyLink(event.currentTarget,status);
}

async function fetchPerformance(tag, context) {
  const response = await window.CocI18n.apiFetch(`/api/player/${encodeURIComponent(tag)}/war-history`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || tr('compare.playerArchiveFailed'));
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
      const response = await window.CocI18n.apiFetch(`/api/clan/${encodeURIComponent(tag)}/war`);
      if (!response.ok) return;
      const war = await response.json();
      if (war.type === 'CWL') await window.CocI18n.apiFetch(`/api/clan/${encodeURIComponent(tag)}/cwl/performance`);
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
    [tr('compare.csvSection'), tr('compare.csvPeriodDate'), tr('compare.csvPlayer'), tr('compare.csvType'), tr('compare.csvOpponent'), tr('compare.csvRound'), tr('compare.attacks'), tr('compare.csvStars'), tr('compare.csvAverageDestruction'), tr('player.trophies'), tr('player.donations'), tr('compare.csvDonationChange'), tr('player.status')],
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
        point[side].donations, change.reset ? tr('compare.resetChange') : change.delta ?? '', '']);
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
  const themeColor = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  ctx.fillStyle = themeColor('--theme-page', '#101820'); ctx.fillRect(0, 0, 1200, 770);
  ctx.fillStyle = themeColor('--theme-text', '#eef5ff'); ctx.font = 'bold 30px sans-serif'; ctx.fillText(tr('compare.heading'), 56, 68);
  ctx.font = '16px sans-serif'; ctx.fillStyle = themeColor('--theme-secondary', '#a9bdd4');
  ctx.fillText(`${sideName('left')}  vs  ${sideName('right')}`, 56, 100);
  ctx.fillText(tr('compare.pngPeriod', { period: document.getElementById('warPeriod').selectedOptions[0].textContent, count: sharedTrend.length }), 56, 127);
  for (const [side, x, color] of [['left', 56, themeColor('--theme-chart-blue', '#79adff')], ['right', 615, themeColor('--theme-chart-teal', '#40d3bd')]]) {
    const profile = profiles[side];
    ctx.fillStyle = themeColor('--theme-inset', '#192b3d'); ctx.fillRect(x, 158, 529, 130);
    ctx.fillStyle = color; ctx.font = 'bold 22px sans-serif'; ctx.fillText(profile.player.name.slice(0, 34), x + 18, 194);
    ctx.fillStyle = themeColor('--theme-text', '#dbe8f8'); ctx.font = '16px sans-serif';
    ctx.fillText(tr('compare.pngScore', { th: profile.player.townHallLevel, score: formatPercent(profile.progress?.score?.overall) }), x + 18, 226);
    const cwl = model.warSummary(displayedWars, side, 'CWL');
    const classic = model.warSummary(displayedWars, side, 'War');
    ctx.fillText(tr('compare.pngWars', { cwlStars: cwl.stars, cwlAttacks: cwl.attacks, classicStars: classic.stars, classicAttacks: classic.attacks }), x + 18, 257);
  }
  ctx.fillStyle = themeColor('--theme-text', '#eef5ff'); ctx.font = 'bold 19px sans-serif'; ctx.fillText(tr('compare.pngTrend'), 56, 335);
  const values = sharedTrend.flatMap(point => [point.left.trophies, point.right.trophies]);
  const min = Math.min(...values); const max = Math.max(...values);
  const x = index => 70 + index / (sharedTrend.length - 1) * 1050;
  const y = value => 565 - (max === min ? .5 : (value - min) / (max - min)) * 190;
  ctx.strokeStyle = themeColor('--theme-grid', '#34495e'); ctx.lineWidth = 1;
  for (let index = 0; index < 4; index++) { const yy = 375 + index * 63; ctx.beginPath(); ctx.moveTo(70, yy); ctx.lineTo(1120, yy); ctx.stroke(); }
  for (const [side, color] of [['left', themeColor('--theme-chart-blue', '#79adff')], ['right', themeColor('--theme-chart-teal', '#40d3bd')]]) {
    ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.beginPath();
    sharedTrend.forEach((point, index) => { if (index) ctx.lineTo(x(index), y(point[side].trophies)); else ctx.moveTo(x(index), y(point[side].trophies)); });
    ctx.stroke();
  }
  ctx.fillStyle = themeColor('--theme-secondary', '#a9bdd4'); ctx.font = '14px sans-serif';
  ctx.fillText(sharedTrend[0].date, 70, 600); ctx.textAlign = 'right'; ctx.fillText(sharedTrend.at(-1).date, 1120, 600); ctx.textAlign = 'left';
  ctx.fillText(tr('compare.pngSource'), 56, 655);
  ctx.fillText(tr('compare.pngCreated', { date: new Date().toLocaleString(locale()) }), 56, 680);
  canvas.toBlob(blob => { if (blob) downloadFile(blob, `player-comparison-${normalizeTag(profiles.left.player.tag)}-${normalizeTag(profiles.right.player.tag)}.png`); }, 'image/png');
}

async function fetchProfile(tag) {
  const response = await window.CocI18n.apiFetch(`/api/player/${encodeURIComponent(tag)}/profile`);
  let data;
  try { data = await response.json(); } catch { throw new Error(tr('compare.profileUnreadable')); }
  if (!response.ok) throw new Error(data.error || tr('compare.profileFailed'));
  return data;
}

async function loadProfiles() {
  updateComparisonTitle();
  const entries = [['left', 'player1', tr('compare.playerA')], ['right', 'player2', tr('compare.playerB')]];
  const tasks = entries.map(async ([side, inputId, label]) => {
    const raw = document.getElementById(inputId).value.trim();
    const tag = normalizeTag(raw);
    if (!raw) { showStatus(side, tr('compare.enterPlayerTag', { player: label })); return; }
    if (!tag) { showStatus(side, tr('compare.invalidPlayerTag', { player: label }), true); return; }
    showStatus(side, tr('compare.loadingPlayer', { player: label }), false, true);
    try {
      const data = await fetchProfile(tag);
      window.RecentlyOpened?.player({ tag: data.player.tag, name: data.player.name, meta: data.player.townHallLevel ? `TH ${data.player.townHallLevel}` : '' });
      profiles[side] = data;
      updateComparisonTitle();
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
  note.textContent = tr('compare.loadingMembers');
  try {
    const response = await window.CocI18n.apiFetch(`/api/clan/${encodeURIComponent(tag)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || tr('compare.memberListUnavailable'));
    const members = [...(data.memberList || [])].sort((a, b) => a.name.localeCompare(b.name));
    for (const id of ['member1', 'member2']) {
      const select = document.getElementById(id);
      select.replaceChildren(new Option(tr('compare.chooseMember'), ''));
      for (const member of members) select.add(new Option(`${member.name} · TH ${member.townHallLevel ?? '—'}`, normalizeTag(member.tag)));
      select.value = normalizeTag(document.getElementById(id === 'member1' ? 'player1' : 'player2').value) || '';
    }
    note.textContent = tr('compare.membersAvailable', { count: members.length, clan: data.name });
  } catch (error) { note.textContent = tr('compare.memberListError', { error: error.message }); }
}

function navigateToComparison() {
  const rawFirst = document.getElementById('player1').value.trim();
  const rawSecond = document.getElementById('player2').value.trim();
  const first = normalizeTag(rawFirst);
  const second = normalizeTag(rawSecond);
  if (rawFirst && !first) { showStatus('left', tr('compare.invalidPlayerTag', { player: tr('compare.playerA') }), true); return; }
  if (rawSecond && !second) { showStatus('right', tr('compare.invalidPlayerTag', { player: tr('compare.playerB') }), true); return; }
  const query = new URLSearchParams();
  if (first) query.set('player1', first);
  if (second) query.set('player2', second);
  const context = clanTag || rosterTag;
  if (context) query.set('clan', context);
  location.href = `/compare.html${query.size ? `?${query}` : ''}${location.hash}`;
}

function activateCompareTab(hash = location.hash || params.get('view')) {
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
  const copyButton=document.getElementById('copyActiveTabLink');
  window.CocShare.resetCopy(copyButton,document.getElementById('tabShareStatus'));
  const label=document.querySelector(`.compare-tabs [data-tab="${active}"]`).textContent.trim();
  copyButton.title=tr('share.copyTabContext',{tab:label});copyButton.setAttribute('aria-label',copyButton.title);
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
document.getElementById('copyActiveTabLink').addEventListener('click', copyComparisonLink);
for (const link of document.querySelectorAll('.compare-tabs a')) link.addEventListener('click', () => activateCompareTab(link.hash));
window.addEventListener('hashchange', () => activateCompareTab());
activateCompareTab();
for (const [key, label] of model.sections) document.getElementById('armyCategory').add(new Option(label, key));
if (clanTag) { document.getElementById('backLink').href = `/?clan=${encodeURIComponent(clanTag)}`; loadRoster(clanTag); }
document.getElementById('player1').value = params.get('player1') || '';
document.getElementById('player2').value = params.get('player2') || '';
if (params.has('player1') || params.has('player2')) loadProfiles();
