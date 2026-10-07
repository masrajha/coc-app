(function (root) {
  const sections = [
    ['heroes', 'Heroes'], ['heroEquipment', 'Hero Equipment'], ['pets', 'Pets'],
    ['troops', 'Troops'], ['superTroops', 'Super Troops'],
    ['builderBase', 'Builder Base'], ['spells', 'Spells']
  ];
  const categories = [
    ['heroes', 'Hero'], ['troops', 'Troop'], ['spells', 'Spell'],
    ['pets', 'Pet'], ['builderBase', 'Builder Base']
  ];

  function comparableProgress(left, right) {
    if (!left || !right) return false;
    const a = left.progress;
    const b = right.progress;
    return Boolean(a?.complete && b?.complete &&
      left.player.tag !== right.player.tag &&
      left.player.townHallLevel === right.player.townHallLevel &&
      a.tableVersion === b.tableVersion && a.baselineSource === b.baselineSource);
  }

  function armyRows(left, right) {
    return sections.map(([key, label]) => {
      const byName = new Map();
      for (const [side, profile] of [['left', left], ['right', right]]) {
        for (const item of profile?.army?.[key] || []) {
          const id = `${item.equipmentHero || ''}\u0000${item.name}`;
          const row = byName.get(id) || { name: item.name, equipmentHero: item.equipmentHero || null, left: null, right: null };
          row[side] = item;
          byName.set(id, row);
        }
      }
      return { key, label, rows: [...byName.values()].sort((a, b) =>
        (a.equipmentHero || '').localeCompare(b.equipmentHero || '') || a.name.localeCompare(b.name)) };
    });
  }

  function categoryRows(left, right) {
    return categories.map(([key, label]) => ({
      key, label,
      left: key === 'builderBase' ? left?.progress?.score?.builderBase : left?.progress?.score?.categories?.[key],
      right: key === 'builderBase' ? right?.progress?.score?.builderBase : right?.progress?.score?.categories?.[key]
    }));
  }

  function levelDifferences(left, right) {
    if (!left || !right || left.player.townHallLevel !== right.player.townHallLevel) return [];
    return armyRows(left, right).flatMap(section => section.rows.map(row => ({ ...row, category: section.label })))
      .filter(row => row.left && row.right && Number.isInteger(row.left.level) && Number.isInteger(row.right.level) &&
        Number.isInteger(row.left.maxLevel) && row.left.maxLevel === row.right.maxLevel && row.left.level !== row.right.level)
      .map(row => ({ category: row.category, name: row.name, equipmentHero: row.equipmentHero,
        leftLevel: row.left.level, rightLevel: row.right.level, maxLevel: row.left.maxLevel,
        difference: Math.abs(row.left.level - row.right.level) }))
      .sort((a, b) => b.difference - a.difference || a.name.localeCompare(b.name)).slice(0, 5);
  }

  function itemLevelMark(left, right) {
    if (!Number.isInteger(left?.level) || !Number.isInteger(right?.level)) return { left: 'none', right: 'none' };
    if (left.level === right.level) return { left: 'equal', right: 'equal' };
    return left.level > right.level ? { left: 'higher', right: 'lower' } : { left: 'lower', right: 'higher' };
  }

  function itemProgress(item) {
    const level = Number(item?.level);
    const maxLevel = Number(item?.progressMaxLevel);
    return Number.isFinite(level) && Number.isFinite(maxLevel) && maxLevel > 0
      ? Number((level / maxLevel * 100).toFixed(2)) : null;
  }

  function numberMarks(left, right) {
    if (left === null || left === undefined || right === null || right === undefined
      || !Number.isFinite(Number(left)) || !Number.isFinite(Number(right))) return { left: 'none', right: 'none' };
    const a = Number(left); const b = Number(right);
    if (Math.abs(a - b) < .005) return { left: 'equal', right: 'equal' };
    return a > b ? { left: 'higher', right: 'lower' } : { left: 'lower', right: 'higher' };
  }

  function itemComparison(left, right, mode = 'actual') {
    const leftValue = mode === 'progress' ? itemProgress(left) : left?.level;
    const rightValue = mode === 'progress' ? itemProgress(right) : right?.level;
    const marks = numberMarks(leftValue, rightValue);
    return { ...marks, leftValue, rightValue,
      difference: marks.left === 'none' ? null : Number(Math.abs(Number(leftValue) - Number(rightValue)).toFixed(2)) };
  }

  function progressCategorySummary(left, right) {
    const rows = categoryRows(left, right);
    const counts = { left: 0, right: 0, equal: 0, compared: 0 };
    for (const row of rows) {
      const marks = numberMarks(row.left?.percent, row.right?.percent);
      if (marks.left === 'none') continue;
      counts.compared++;
      if (marks.left === 'higher') counts.left++;
      else if (marks.right === 'higher') counts.right++;
      else counts.equal++;
    }
    return counts;
  }

  function parseWarDate(value) {
    if (!value) return null;
    if (/^\d{8}T\d{6}\.\d{3}Z$/.test(value)) {
      return new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}.${value.slice(16, 19)}Z`);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function filterWars(wars, period, now = new Date()) {
    if (period === 'all') return wars;
    if (period === 'cwl-current') return wars.filter(war => {
      const date = parseWarDate(war.startTime || war.endTime);
      return war.type === 'CWL' && date && date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth();
    });
    const days = period === '30d' ? 30 : period === '90d' ? 90 : null;
    if (!days) return wars;
    const cutoff = new Date(now.getTime() - days * 86400000);
    return wars.filter(war => {
      const date = parseWarDate(war.startTime || war.endTime);
      return date && date >= cutoff && date <= now;
    });
  }

  function combineWars(left, right, period = 'cwl-current', now = new Date()) {
    const byId = new Map();
    for (const [side, data] of [['left', left], ['right', right]]) {
      for (const war of filterWars(data?.wars || [], period, now)) {
        const row = byId.get(war.id) || { id: war.id, type: war.type, round: war.round,
          state: war.state, startTime: war.startTime, endTime: war.endTime, opponent: war.opponent,
          left: null, right: null };
        row[side] = war;
        byId.set(war.id, row);
      }
    }
    return [...byId.values()].sort((a, b) => (b.startTime || b.endTime || '').localeCompare(a.startTime || a.endTime || ''));
  }

  function warStatus(war) {
    if (!war) return 'notRoster';
    const used = war.attacks?.length || 0;
    if (war.state === 'warEnded' && used < (war.quota || 0)) return used ? 'partialMissed' : 'missed';
    if (!used) return 'pending';
    return 'attacked';
  }

  function warSummary(rows, side, type) {
    const roster = rows.filter(row => row.type === type && row[side]);
    const attacks = roster.flatMap(row => row[side].attacks || []);
    const stars = attacks.reduce((sum, attack) => sum + (attack.stars || 0), 0);
    const destruction = attacks.reduce((sum, attack) => sum + (attack.destructionPercentage || 0), 0);
    const triples = attacks.filter(attack => Number(attack.stars) === 3).length;
    const completed = roster.filter(row => (row.state || row[side].state) === 'warEnded');
    const completedQuota = completed.reduce((sum, row) => sum + (row[side].quota || 0), 0);
    const completedAttacks = completed.reduce((sum, row) => sum + (row[side].attacks?.length || 0), 0);
    const destructionAverage = attacks.length ? destruction / attacks.length : null;
    const variance = attacks.length > 1 ? attacks.reduce((sum, attack) =>
      sum + Math.pow((attack.destructionPercentage || 0) - destructionAverage, 2), 0) / attacks.length : null;
    const starDistribution = [0, 1, 2, 3].map(value => attacks.filter(attack => Number(attack.stars) === value).length);
    const missedQuota = roster.reduce((sum, row) => sum + ((row.state || row[side].state) === 'warEnded'
      ? Math.max(0, (row[side].quota || 0) - (row[side].attacks?.length || 0)) : 0), 0);
    return { wars: roster.length, attacks: attacks.length, stars, missedQuota,
      starsPerAttack: attacks.length ? Number((stars / attacks.length).toFixed(2)) : null,
      destructionAverage: destructionAverage == null ? null : Number(destructionAverage.toFixed(2)),
      tripleRate: attacks.length ? Number((triples / attacks.length * 100).toFixed(2)) : null,
      triples, completedQuota, completedAttacks,
      quotaUsage: completedQuota ? Number((completedAttacks / completedQuota * 100).toFixed(2)) : null,
      destructionDeviation: variance == null ? null : Number(Math.sqrt(variance).toFixed(2)),
      starDistribution,
      sampleQuality: attacks.length >= 10 ? 'baik' : attacks.length >= 5 ? 'cukup' : 'rendah',
      limitedSample: attacks.length < 5 };
  }

  function sharedSnapshots(left, right) {
    const rightByDate = new Map((right?.trend || []).map(point => [point.date, point]));
    return (left?.trend || []).filter(point => rightByDate.has(point.date))
      .map(point => ({ date: point.date, left: point, right: rightByDate.get(point.date) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function filterSnapshots(points, period) {
    if (period === 'all' || !points.length) return points;
    const days = Number(period);
    if (!Number.isFinite(days) || days <= 0) return points;
    const latest = new Date(`${points.at(-1).date}T00:00:00Z`);
    if (Number.isNaN(latest.getTime())) return points;
    const cutoff = new Date(latest.getTime() - (days - 1) * 86400000);
    return points.filter(point => {
      const date = new Date(`${point.date}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date >= cutoff;
    });
  }

  function donationChanges(points, side) {
    return points.map((point, index) => {
      if (!index) return { date: point.date, delta: null, reset: false };
      const current = point[side].donations;
      const previous = points[index - 1][side].donations;
      return { date: point.date, delta: current >= previous ? current - previous : null, reset: current < previous };
    });
  }

  function resume(left, right, rows, shared, availability = { left: true, right: true }) {
    if (!left || !right) return ['Lengkapi kedua profil untuk membuat resume perbandingan.'];
    const lines = [];
    const a = left.player.name;
    const b = right.player.name;
    lines.push(`${a} (TH ${left.player.townHallLevel}) dan ${b} (TH ${right.player.townHallLevel}) memiliki ${left.player.townHallLevel === right.player.townHallLevel ? 'Town Hall yang sama' : 'Town Hall berbeda'}.`);
    const counts = { left: 0, right: 0, equal: 0 };
    for (const section of armyRows(left, right)) for (const row of section.rows) {
      const mark = itemLevelMark(row.left, row.right);
      if (mark.left === 'higher') counts.left++;
      else if (mark.right === 'higher') counts.right++;
      else if (mark.left === 'equal') counts.equal++;
    }
    lines.push(`Pada item yang dimiliki keduanya, ${a} memiliki level lebih tinggi pada ${counts.left} item, ${b} pada ${counts.right} item, dan ${counts.equal} item setara. Ini membandingkan level mentah, bukan kekuatan akun.`);
    if (!comparableProgress(left, right)) lines.push('Skor progres keseluruhan tidak diberi peringkat karena TH, baseline, atau cakupan data belum setara.');
    else lines.push(`Skor progres pasukan dan hero: ${a} ${left.progress.score.overall}% dan ${b} ${right.progress.score.overall}%.`);
    for (const type of ['CWL', 'War']) {
      const sa = warSummary(rows, 'left', type);
      const sb = warSummary(rows, 'right', type);
      if (sa.wars || sb.wars) lines.push(`${type}: ${a} ${availability.left ? `${sa.wars} roster, ${sa.stars} bintang dari ${sa.attacks} serangan` : 'arsip belum tersedia'}; ${b} ${availability.right ? `${sb.wars} roster, ${sb.stars} bintang dari ${sb.attacks} serangan` : 'arsip belum tersedia'}.${(availability.left && sa.limitedSample) || (availability.right && sb.limitedSample) ? ' Sampel serangan terbatas.' : ''}`);
    }
    if (!rows.length) lines.push(availability.left || availability.right ? 'Belum ada perang terarsip pada periode yang dipilih.' : 'Arsip perang kedua pemain belum tersedia.');
    if (shared.length >= 2) {
      const first = shared[0]; const last = shared[shared.length - 1];
      lines.push(`Pada ${shared.length} tanggal snapshot bersama (${first.date}–${last.date}), perubahan trofi: ${a} ${last.left.trophies - first.left.trophies >= 0 ? '+' : ''}${last.left.trophies - first.left.trophies}; ${b} ${last.right.trophies - first.right.trophies >= 0 ? '+' : ''}${last.right.trophies - first.right.trophies}.`);
    } else lines.push('Tren aktivitas bersama memerlukan sedikitnya dua tanggal snapshot yang sama.');
    return lines;
  }

  const api = { sections, categories, comparableProgress, armyRows, categoryRows, levelDifferences,
    itemLevelMark, itemProgress, numberMarks, itemComparison, progressCategorySummary,
    parseWarDate, filterWars, combineWars, warStatus, warSummary, sharedSnapshots, filterSnapshots, donationChanges, resume };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CompareModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
