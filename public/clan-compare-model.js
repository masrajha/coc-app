/* Pure calculations shared by the comparison page and regression tests. */
(function (root) {
  const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  const date = value => new Date(String(value || '').replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\.\d+)?Z$/, '$1-$2-$3T$4:$5:$6$7Z'));
  function profile(clan) {
    const members = Array.isArray(clan.memberList) ? clan.memberList : [];
    const halls = members.map(m => number(m.townHallLevel)).filter(n => n !== null && n > 0);
    const distribution = {};
    halls.forEach(n => { distribution[n] = (distribution[n] || 0) + 1; });
    const donations = members.map(m => number(m.donations)).filter(n => n !== null);
    return { known: halls.length, total: number(clan.members), average: halls.length ? halls.reduce((a,b) => a+b,0)/halls.length : null, distribution,
      donations: donations.length ? donations.reduce((a,b)=>a+b,0) : null, donationKnown: donations.length, donors: donations.length ? donations.filter(n=>n>0).length : null };
  }
  function wars(items, days, now = Date.now()) {
    const rows = (items || []).filter(w => ['win','lose','tie'].includes(w.result) && Number.isFinite(+date(w.endTime)) && +date(w.endTime) <= now && +date(w.endTime) >= now - days*86400000);
    const destruction = rows.map(w => number(w.clan?.destructionPercentage)).filter(n => n !== null);
    const stars = rows.filter(w => number(w.clan?.stars) !== null && number(w.teamSize) > 0);
    return { count: rows.length, wins: rows.filter(w => w.result === 'win').length, losses: rows.filter(w => w.result === 'lose').length, ties: rows.filter(w => w.result === 'tie').length,
      winRate: rows.length ? rows.filter(w => w.result === 'win').length / rows.length*100 : null,
      destruction: destruction.length ? destruction.reduce((a,b)=>a+b,0)/destruction.length : null,
      starRate: stars.length ? stars.reduce((a,w)=>a+w.clan.stars,0)/stars.reduce((a,w)=>a+w.teamSize*3,0)*100 : null };
  }
  function sharedRaids(left, right) {
    return [...new Set((left || []).map(r => r.startTime).filter(s => s && (right || []).some(r => r.startTime === s)))].sort().reverse();
  }
  function raid(season) {
    if (!season) return null;
    const attacks = number(season.totalAttacks), loot = number(season.loot);
    return { ...season, lootPerAttack: attacks > 0 && loot !== null ? loot/attacks : null };
  }
  const model = { profile, wars, sharedRaids, raid, date };
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.ClanCompareModel = model;
})(typeof window === 'object' ? window : globalThis);
