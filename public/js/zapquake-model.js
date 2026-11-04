(function (scope) {
  'use strict';
  const VERSION = '2.2.1';
  const heroModes = id => ({'archer-queen':['ground'],'barbarian-king':['ground'],'royal-champion':['ground'],
    'dragon-duke':['air'],'minion-prince':['air'],'grand-warden':['ground','air']}[id] || []);
  const Modifiers = typeof module !== 'undefined' && module.exports ? require('./zapquake-modifiers.js') : scope.ZapquakeModifiers;
  const fail = code => { const error = new Error(code); error.code = code; throw error; };
  const integer = (value, min, max, code = 'invalid') => {
    if (!Number.isInteger(value) || value < min || value > max) fail(code);
    return value;
  };
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const fraction = (n, d = 1n) => { const divisor = gcd(n < 0n ? -n : n, d); return {n:n / divisor, d:d / divisor}; };
  const add = (a, b) => fraction(a.n * b.d + b.n * a.d, a.d * b.d);
  const asNumber = value => Number(value.n) / Number(value.d);
  const decimal = value => {
    if (!Number.isFinite(value) || !/^-?\d+(?:\.\d{1,6})?$/.test(String(value))) fail('invalid');
    const text = String(value); return fraction(BigInt(text.replace('.', '')), 10n ** BigInt((text.split('.')[1] || '').length));
  };
  const multiply = (a, b) => fraction(a.n * b.n, a.d * b.d);
  const ratio = value => { const item = decimal(value); return fraction(item.n,item.d*100n); };
  const subtract = (a, b) => fraction(a.n * b.d - b.n * a.d, a.d * b.d);
  const min = (a, b) => a.n * b.d <= b.n * a.d ? a : b;
  const bounded = (value, low, high, code) => { if (!Number.isFinite(value) || value < low || value > high) fail(code); decimal(value); return value; };
  const percent = value => {
    if (!Number.isFinite(value) || value < 0 || value > 100) fail('data');
    const text = String(value); if (!/^\d+(?:\.\d{1,6})?$/.test(text)) fail('data');
    return fraction(BigInt(text.replace('.', '')), 100n * 10n ** BigInt((text.split('.')[1] || '').length));
  };
  function create(data) {
    if (data?.schemaVersion !== 1 || data.status !== 'reference-data-only' || data.calculationReady !== false || !['1.1.0','1.2.0','1.2.1','1.3.0'].includes(data.normalizerVersion)
      || !Array.isArray(data.modifiers) || data.modifiers.length) fail('data');
    const maps = {};
    for (const kind of ['buildings', 'heroes', 'spells']) {
      if (!Array.isArray(data[kind]) || !data[kind].length) fail('data');
      maps[kind] = new Map();
      for (const item of data[kind]) {
        if (!/^[a-z0-9-]+$/.test(item.id) || maps[kind].has(item.id) || !Array.isArray(item.levels) || !item.levels.length) fail('data');
        for (const [index, row] of item.levels.entries()) {
          if (row.level !== index + 1) fail('data');
          if (kind !== 'spells') integer(row.hitpoints, 1, 100000000, 'data');
        }
        if(kind==='buildings' && (item.availablePerTownHall!==undefined || data.normalizerVersion==='1.3.0')) {
          if(!Array.isArray(item.availablePerTownHall)||!item.availablePerTownHall.length)fail('data');
          let previous=0;
          for(const row of item.availablePerTownHall){
            integer(row.townHallLevel,1,18,'data');integer(row.count,0,100,'data');
            if(previous&&row.townHallLevel!==previous+1)fail('data');previous=row.townHallLevel;
            if(row.countAfterMerges!==undefined)integer(row.countAfterMerges,0,row.count,'data');
          }
        }
        maps[kind].set(item.id, item);
      }
    }
    for (const id of ['lightning-spell', 'earthquake-spell']) {
      const spell = maps.spells.get(id); if (!spell) fail('data');
      integer(spell.housingSpace, 1, 15, 'data');
      for (const row of spell.levels) {
        integer(row.townHallRequired, 1, 100, 'data');
        if (id === 'lightning-spell') integer(row.damage, 1, 10000000, 'data');
        else { percent(row.buildingDamagePercent); if (row.troopDamagePercent !== null) percent(row.troopDamagePercent); }
      }
    }
    maps.equipment = new Map();
    const mechanics = {'fireball':'direct','giant-arrow':'direct','spiky-ball':'direct','seeking-shield':'direct','rocket-backpack':'direct','flame-blower':'direct','earthquake-boots':'percent','electro-boots':'periodic'};
    for (const item of data.equipment || []) {
      if (!Object.hasOwn(mechanics,item.id) || mechanics[item.id] !== item.modelType || maps.equipment.has(item.id) || !maps.heroes.has(item.hero) || !['common','epic'].includes(item.rarity) || !item.levels?.length) fail('data');
      for (const [index,row] of item.levels.entries()) {
        if (row.level !== index + 1 || !Number.isInteger(row.blacksmithLevelRequired) || row.blacksmithLevelRequired < 0) fail('data');
        if (item.modelType === 'percent') { percent(row.buildingDamagePercent); percent(row.troopDamagePercent); }
        else bounded(row.damage, 0.000001, 10000000, 'data');
      }
      if (item.modelType === 'periodic') bounded(item.tickSeconds,0.01,10,'data');
      maps.equipment.set(item.id,item);
    }
    const rowAt = (kind, id, level) => {
      const item = maps[kind]?.get(id); if (!item) fail('target');
      integer(level, 1, item.levels.length, 'level');
      return item.levels[level - 1];
    };
    function targetLevels(kind, id, townHall = 0) {
      integer(townHall,0,18,'defenderTH');
      const item=maps[kind]?.get(id);if(!item||!['heroes','buildings'].includes(kind))fail('target');
      if(!townHall)return item.levels;
      if(kind==='heroes'){
        const hall=(data.requirements?.['hero-hall']||[]).filter(row=>row.townHallRequired<=townHall).at(-1);
        return hall?item.levels.filter(row=>row.heroHallLevelRequired<=hall.level):[];
      }
      if(!Array.isArray(item.availablePerTownHall))fail('data');
      const availability=item.availablePerTownHall.find(row=>row.townHallLevel===townHall);
      if(!availability||(availability.countAfterMerges??availability.count)===0)return [];
      if(item.id==='town-hall')return item.levels.filter(row=>row.level===townHall);
      return item.levels.filter(row=>row.townHallRequired<=townHall);
    }
    function prepare(config) {
      if (!config || !['buildings', 'heroes'].includes(config.kind)) fail('target');
      if (config.modifiers?.length || config.hpMultiplier != null) fail('unsupported');
      const row = rowAt(config.kind, config.target, config.level);
      if(!targetLevels(config.kind,config.target,config.defenderTownHall??0).some(entry=>entry.level===config.level))fail('defenderTH');
      const hero = config.kind === 'heroes';
      const modes=hero?heroModes(config.target):[];
      const defendingMode=hero?(config.defendingMode || (modes.length===1?modes[0]:'')):null;
      if (hero && !modes.includes(defendingMode)) fail('heroMode');
      if (!Modifiers) fail('data');
      const modifier = Modifiers.resolve(config, hero);
      let baseHP = row.hitpoints;
      if (config.supercharge) {
        if (hero || !maps.buildings.get(config.target).supercharges?.length) fail('supercharge');
        baseHP = integer(config.superchargeHitpoints,1,100000000,'supercharge');
      }
      const actualHP = multiply(decimal(baseHP + modifier.flatHP), add(fraction(1n), ratio(modifier.heroHPPercent)));
      // Rounding is an explicit model convention, not a claim about the game's internal engine.
      const effectiveHP = Math.max(1, Number((actualHP.n * 2n + actualHP.d) / (2n * actualHP.d)));
      const interval = bounded(config.spellInterval ?? 0,0,5,'timing');
      const healing = bounded(config.healingPerSecond ?? 0,0,10000,'timing');
      const position = config.equipmentPosition || 'before'; if (!['before','after'].includes(position)) fail('timing');
      if (config.loadoutMode && !['valid','experiment'].includes(config.loadoutMode)) fail('loadout');
      const capacity = integer(config.capacity, 0, 15, 'capacity');
      const townHall = integer(config.townHall, 0, 18, 'townHall');
      const source = (id, level) => {
        integer(level, 0, maps.spells.get(id).levels.length, 'level');
        if (!level) return null;
        const entry = rowAt('spells', id, level);
        if (townHall && entry.townHallRequired > townHall) fail('spellTH');
        return entry;
      };
      const lightning = source('lightning-spell', config.lightningLevel);
      const earthquake = source('earthquake-spell', config.earthquakeLevel);
      const immune = !hero && ['town-hall', 'clan-castle'].includes(config.target);
      const earthquakePercent = !earthquake ? 0 : !hero ? earthquake.buildingDamagePercent : defendingMode === 'air' ? 0 : earthquake.troopDamagePercent || 0;
      const notes = [];
      if (immune) notes.push('lightningImmune');
      if (hero) notes.push('baseHero');
      if (hero && defendingMode === 'air') notes.push('airImmune');
      if (hero && earthquake && defendingMode === 'ground' && earthquake.troopDamagePercent === null) notes.push('quakeLevel');
      if (townHall) notes.push('presetScope');
      if (modifier.id !== 'normal') notes.push(modifier.experimental ? 'customModifier' : 'modifierActive');
      if (config.supercharge) notes.push('manualSupercharge');
      const selected = config.equipment || []; if (!Array.isArray(selected) || selected.length > 8) fail('loadout');
      const owners = new Map(), ids = new Set(), loadout = [];
      const heroHall = (data.requirements?.['hero-hall'] || []).filter(entry => !townHall || entry.townHallRequired <= townHall).at(-1);
      const blacksmith = (data.requirements?.blacksmith || []).filter(entry => !townHall || entry.townHallRequired <= townHall).at(-1);
      for (const choice of selected) {
        const item = maps.equipment.get(choice.id); if (!item || ids.has(choice.id)) fail('equipment');
        ids.add(choice.id); integer(choice.level,1,item.levels.length,'equipment');
        const level = Math.max(1,choice.level-(item.rarity === 'epic' ? modifier.epicReduction : modifier.commonReduction));
        const stats = item.levels[level - 1], original = item.levels[choice.level - 1];
        const owner = maps.heroes.get(item.hero); const ownerHall = owner.levels[0].heroHallLevelRequired;
        owners.set(item.hero,(owners.get(item.hero)||0)+1);
        if (config.loadoutMode !== 'experiment' && (!heroHall || owners.get(item.hero)>2 || owners.size>heroHall.heroSlots
          || (townHall && (ownerHall>heroHall.level || !blacksmith || original.blacksmithLevelRequired>blacksmith.level || choice.level>blacksmith[item.rarity])))) fail('loadout');
        if (choice.confirmed !== true) fail('equipmentHit');
        if (hero && ['spiky-ball','seeking-shield','rocket-backpack','flame-blower'].includes(item.id)) fail('equipmentTarget');
        if (item.id === 'seeking-shield' && (config.target === 'clan-castle' || (config.target === 'builders-hut' && config.level < 2)
          || (config.target === 'town-hall' && (row.weaponAvailable !== true || config.targetWeaponActive !== true)))) fail('equipmentTarget');
        const time = bounded(choice.time ?? 0,0,30,'timing');
        let amount = stats.damage || 0, ticks = 1;
        if (item.id === 'giant-arrow' && config.target === 'air-defense') amount *= 2;
        if (item.modelType === 'percent') {
          amount = hero ? defendingMode === 'air' ? 0 : stats.troopDamagePercent : stats.buildingDamagePercent;
          notes.push('sharedEarthquake');
        }
        if (item.modelType === 'periodic') {
          const duration = decimal(bounded(choice.duration ?? 0,0,30,'timing')), tick = decimal(item.tickSeconds);
          ticks = Number((duration.n * tick.d) / (duration.d * tick.n));
          if (ticks < 1 || ticks > 75) fail('duration');
        }
        loadout.push({id:item.id, hero:item.hero, selectedLevel:choice.level, effectiveLevel:level, modelType:item.modelType, amount, ticks, time, tickSeconds:item.tickSeconds || 0});
      }
      if (selected.length) notes.push('equipmentAssumed');
      if (config.loadoutMode === 'experiment' && selected.length) notes.push('experimentalLoadout');
      if (healing) notes.push('manualHealing');
      return {row, baseHP:row.hitpoints, effectiveHP, modifier, hero, defendingMode, capacity, lightning, earthquake, earthquakePercent, lightningDamage:lightning && !immune ? lightning.damage : 0,
        notes, loadout, interval, healing, position};
    }
    function run(config, prepared, zaps, quakes) {
      integer(zaps, 0, 15); integer(quakes, 0, 15);
      if ((zaps && !prepared.lightning) || (quakes && !prepared.earthquake)) fail('disabledSource');
      const slots = zaps * maps.spells.get('lightning-spell').housingSpace + quakes * maps.spells.get('earthquake-spell').housingSpace;
      if (slots > prepared.capacity) fail('capacity');
      if (!['earthquake-first', 'lightning-first'].includes(config.order)) fail('order');
      const hp = prepared.effectiveHP, maximum = fraction(BigInt(hp));
      let remaining = maximum, total = fraction(0n), healedTotal = fraction(0n), overkill = fraction(0n), lastTime = fraction(0n), quakeIndex = 0;
      const breakdown = [], events = [];
      const spellOrder = config.order === 'earthquake-first' ? [...Array(quakes).fill('earthquake'), ...Array(zaps).fill('lightning')] : [...Array(zaps).fill('lightning'), ...Array(quakes).fill('earthquake')];
      for (const [index,type] of spellOrder.entries()) events.push({type, at:multiply(decimal(prepared.interval),fraction(BigInt(index))), priority:1, modelType:type});
      for (const equipment of prepared.loadout) for (let tick=0; tick<equipment.ticks; tick++) {
        events.push({type:equipment.id, at:add(decimal(equipment.time),multiply(decimal(equipment.tickSeconds),fraction(BigInt(tick+1)))),
          priority:prepared.position === 'before' ? 0 : 2, modelType:equipment.modelType, amount:equipment.amount,
          selectedLevel:equipment.selectedLevel, effectiveLevel:equipment.effectiveLevel});
      }
      events.sort((a,b)=>{ const difference=a.at.n*b.at.d-b.at.n*a.at.d;return difference<0n?-1:difference>0n?1:a.priority-b.priority; });
      if (prepared.healing && !events.some(event=>event.at.n>0n)) fail('healingTiming');
      for (const event of events) {
        const type = event.type, alreadyDestroyed = remaining.n === 0n;
        let damage = fraction(0n), healed = fraction(0n);
        if (!alreadyDestroyed && prepared.healing) {
          healed=min(subtract(maximum,remaining),multiply(decimal(prepared.healing),subtract(event.at,lastTime)));
          remaining=add(remaining,healed); healedTotal=add(healedTotal,healed);
        }
        lastTime=event.at;
        if (type === 'earthquake' || type === 'earthquake-boots') {
          const base = percent(type === 'earthquake' ? prepared.earthquakePercent : event.amount);
          damage = fraction(BigInt(hp) * base.n, base.d * BigInt(2 * quakeIndex + 1));
          if (!alreadyDestroyed && base.n > 0n) quakeIndex++;
        } else if (type === 'lightning') damage = fraction(BigInt(prepared.lightningDamage));
        else if (event.modelType === 'percent') damage=multiply(maximum,percent(event.amount));
        else damage=multiply(decimal(event.amount),add(fraction(1n),ratio(prepared.modifier.equipmentDamagePercent)));
        if (alreadyDestroyed) damage = fraction(0n);
        total = add(total, damage);
        const delta=subtract(damage,remaining);
        if (!alreadyDestroyed && delta.n >= 0n) { overkill=delta;remaining=fraction(0n); }
        else if (!alreadyDestroyed) remaining=subtract(remaining,damage);
        breakdown.push({type, time:asNumber(event.at), damage:asNumber(damage), healed:asNumber(healed), remaining:asNumber(remaining), unused:alreadyDestroyed,
          ...(event.effectiveLevel ? {selectedLevel:event.selectedLevel,effectiveLevel:event.effectiveLevel} : {})});
      }
      const destroyed = remaining.n === 0n;
      return {status:destroyed ? 'destroyed' : 'survives', baseHitpoints:prepared.baseHP, hitpoints:hp, damage:asNumber(total), remaining:asNumber(remaining), overkill:asNumber(overkill), healed:asNumber(healedTotal),
        equipment:prepared.loadout.map(item=>({id:item.id,hero:item.hero,selectedLevel:item.selectedLevel,effectiveLevel:item.effectiveLevel,ticks:item.ticks})), equipmentCount:prepared.loadout.length,
        modifier:prepared.modifier, defendingMode:prepared.defendingMode, zaps, quakes, slots, thinMargin:destroyed && asNumber(overkill) < hp * 0.01, breakdown, notes:[...prepared.notes], engineVersion:VERSION, dataVersion:data.dataVersion};
    }
    function calculate(config) { return run(config, prepare(config), config.zaps, config.quakes); }
    function search(config) {
      const prepared = prepare(config), maxZaps = integer(config.maxZaps, 0, 15), maxQuakes = integer(config.maxQuakes, 0, 15);
      const results = []; let examined = 0;
      for (let quakes = 0; quakes <= maxQuakes; quakes++) for (let zaps = 0; zaps <= maxZaps; zaps++) {
        if ((zaps && !prepared.lightningDamage) || (quakes && !prepared.earthquakePercent)) continue;
        const slots = zaps * maps.spells.get('lightning-spell').housingSpace + quakes * maps.spells.get('earthquake-spell').housingSpace;
        if (slots > prepared.capacity) continue;
        const result = run(config, prepared, zaps, quakes); examined++;
        if (result.status === 'destroyed') results.push(result);
      }
      results.sort((a, b) => a.slots - b.slots || b.overkill - a.overkill || a.quakes - b.quakes);
      return {status:results.length ? 'found' : 'noSolution', best:results[0] || null, alternatives:results.slice(1, 7), examined, notes:prepared.notes, baseHitpoints:prepared.baseHP, hitpoints:prepared.effectiveHP, modifier:prepared.modifier};
    }
    return {calculate, search, rowAt, targetLevels};
  }
  const api = {VERSION, create, heroModes};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else scope.ZapquakeModel = api;
})(typeof window === 'undefined' ? globalThis : window);
