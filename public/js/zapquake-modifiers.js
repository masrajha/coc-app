(function(scope) {
  'use strict';
  const VERSION = '2026-11-04.1';
  const REVIEWED_UNTIL = '2026-11-05';
  const APRIL = 'https://supercell.com/en/games/clashofclans/blog/release-notes/the-sound-of-clash-update/';
  const AUGUST = 'https://supercell.com/en/games/clashofclans/blog/release-notes/august-update-3/';
  const MAY = 'https://supercell.com/en/games/clashofclans/blog/news/state-of-gameplay-part-2/';
  const fail = code => { const error = new Error(code); error.code = code; throw error; };
  function resolve(config, hero) {
    const environment = config.environment || 'normal';
    if (!['normal','ranked','cwl','friendly','esports','custom'].includes(environment)) fail('unsupported');
    const customHP = config.customHPPercent ?? 0, customDamage = config.customDamagePercent ?? 0, flatHP = config.customFlatHP ?? 0;
    if (![customHP,customDamage].every(value => Number.isFinite(value) && value >= -90 && value <= 300 && /^-?\d+(?:\.\d)?$/.test(String(value)))
      || !Number.isInteger(flatHP) || flatHP < 0 || flatHP > 1000000) fail('modifier');
    if (environment !== 'custom' && (customHP || customDamage || flatHP)) fail('modifierConflict');
    if (environment === 'normal') return {id:'normal', heroHPPercent:0, equipmentDamagePercent:0, flatHP:0, commonReduction:0, epicReduction:0, sources:[], version:VERSION};
    if (environment === 'custom') return {id:'custom', heroHPPercent:customHP, equipmentDamagePercent:customDamage, flatHP, commonReduction:0, epicReduction:0, sources:[], version:VERSION, experimental:true};
    const date = config.rulesDate;
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date
      || date < '2026-04-27' || date >= REVIEWED_UNTIL) fail('rulesDate');
    let profile = environment === 'esports' ? 'esports' : config.league;
    const sources = [APRIL];
    if (environment === 'cwl') {
      if (date < '2026-06-01') fail('rulesDate');
      const mapping = date < '2026-08-30' ? {'titan-3':'legend-2','titan-2':'legend-2','titan-1':'legend-1',legend:'legend-1',other:'normal'}
        : {'titan-3':'legend-3','titan-2':'legend-3','titan-1':'legend-2',legend:'legend-1',other:'normal'};
      if (!Object.hasOwn(mapping,profile)) fail('modifier');
      profile = mapping[profile]; sources.push(date < '2026-08-30' ? MAY : AUGUST);
    }
    if (!['normal','legend-3','legend-2','legend-1','esports'].includes(profile) || (environment === 'ranked' && profile === 'esports')) fail('modifier');
    const bonus = {'normal':0,'legend-3':10,'legend-2':15,'legend-1':20,esports:25}[profile];
    return {id:profile, heroHPPercent:hero ? bonus : 0, equipmentDamagePercent:0, flatHP:0,
      commonReduction:profile === 'esports' ? 3 : 0, epicReduction:profile === 'esports' ? 6 : 0,
      sources, validFrom:environment === 'cwl' ? (date < '2026-08-30' ? '2026-06-01' : '2026-08-30') : '2026-04-27',
      validUntil:environment === 'cwl' && date < '2026-08-30' ? '2026-08-30' : REVIEWED_UNTIL, version:VERSION};
  }
  const api = {VERSION, resolve};
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else scope.ZapquakeModifiers = api;
})(typeof window === 'undefined' ? globalThis : window);
