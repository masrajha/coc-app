(function () {
  const PAGE_SIZE = 25;
  const state = { playerTag: null, members: [], sessions: [], page: 0, request: 0, logRequest: 0, comparisonRequest: 0, statisticsRequest: 0, logFilter: 'all', logSort: 'latest', battleCache: new Map(), playerBattleCache: new Map(), hoverTimer: null, hoverKey: null, pinned: false, trigger: null, leagueRule: null, leagueStats: null, statisticsSession: null, playerRank: null, leagueView: 'standings' };
  const clanTag = normalizeTag(new URLSearchParams(location.search).get('clan'));

  function normalizeTag(value) {
    const tag = String(value || '').trim().replace(/^#/, '').toUpperCase();
    return /^[0289PYLQGRJCUV]{3,15}$/.test(tag) ? tag : null;
  }

  function element(id) { return document.getElementById(id); }
  function setText(id, value) { element(id).textContent = value; }
  function setLoading(id, message) { const target = element(id); target.replaceChildren(); const spinner = document.createElement('span'); spinner.className = 'loading-spinner'; spinner.setAttribute('aria-hidden', 'true'); target.append(spinner, document.createTextNode(message)); target.classList.add('loading-state'); }
  function sessionDate(session) {
    if (!session || Number(session.seasonId) <= 0) return '';
    const parts = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'Asia/Jakarta' })
      .formatToParts(new Date(Number(session.seasonId) * 1000)).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sept', 'Okt', 'Nov', 'Des'];
    return `${Number(parts.day)} ${months[Number(parts.month) - 1]} ${parts.year}`;
  }
  function sessionLabel(session) {
    const label = session?.id === 'current' ? 'Saat ini' : session?.id === 'previous' ? 'Sebelumnya' : session?.label || 'Sesi';
    const date = sessionDate(session);
    return `${label}${date ? ` - ${date}` : ''}`;
  }
  const leagueIcons = [
    ['legend', 'legend'], ['electro', 'electro-dragon'], ['titan', 'electro-titan'],
    ['dragon', 'dragon'], ['pekka', 'pekka'], ['p.e.k.k.a', 'pekka'],
    ['golem', 'golem'], ['witch', 'witch'], ['valkyrie', 'valkyrie'],
    ['wizard', 'wizard'], ['archer', 'archer'], ['barbarian', 'barbarian'], ['skeleton', 'skeleton']
  ];

  function leagueBadge(tier) {
    const name = String(tier || '').trim();
    const family = leagueIcons.find(([keyword]) => name.toLowerCase().includes(keyword))?.[1];
    if (!family) return null;
    const roman = name.match(/\b(III|II|I)\s*$/i);
    const numeric = name.match(/\b(\d+)\s*$/);
    const level = family === 'legend' ? roman?.[1].toUpperCase() || null : numeric?.[1] || null;
    const badge = document.createElement('span');
    badge.className = 'league-icon';
    const image = document.createElement('img');
    image.src = `/league-${family}.png`;
    image.alt = '';
    image.width = 52;
    image.height = 52;
    badge.appendChild(image);
    if (level) {
      const number = document.createElement('span');
      number.className = 'league-icon-level';
      number.textContent = level;
      badge.appendChild(number);
    }
    return badge;
  }

  function setLeagueBadge(id, tier) {
    const target = element(id);
    target.replaceChildren();
    const badge = leagueBadge(tier);
    target.hidden = !badge;
    if (!badge) return;
    target.appendChild(badge);
    target.setAttribute('aria-label', `Liga ${tier}`);
    target.title = `Liga ${tier}`;
  }

  function setLeagueTitle(tier) {
    setText('leagueSidebarEyebrow', tier ? `RANKED LEAGUE (${tier})` : 'RANKED LEAGUE');
    setLeagueBadge('sidebarLeagueBadge', tier);
  }

  const tooltip = document.createElement('div');
  tooltip.className = 'league-battle-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  document.body.appendChild(tooltip);
  tooltip.addEventListener('mouseenter', () => {
    if (state.pinned) clearTimeout(state.hoverTimer);
  });

  function positionTooltip(anchor) {
    const rect = anchor.getBoundingClientRect();
    if (state.pinned && window.matchMedia('(max-width: 700px)').matches) {
      tooltip.style.left = '12px';
      tooltip.style.top = 'auto';
      return;
    }
    const left = Math.max(8, Math.min(Math.max(8, rect.left - 275), window.innerWidth - 292));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${rect.top > 160 ? rect.top - 150 : rect.bottom + 8}px`;
  }

  function hideBattle(force = false) {
    if (state.pinned && !force) return;
    clearTimeout(state.hoverTimer);
    state.hoverKey = null;
    state.pinned = false;
    state.trigger?.setAttribute('aria-expanded', 'false');
    state.trigger = null;
    tooltip.classList.remove('is-pinned');
    tooltip.setAttribute('role', 'tooltip');
    tooltip.hidden = true;
  }

  function renderBattle(name, data) {
    const metric = (label, value, unit, count) => {
      const line = document.createElement('div');
      const caption = document.createElement('span');
      caption.textContent = label;
      const number = document.createElement('strong');
      number.textContent = value === null || value === undefined ? 'Belum tersedia' : `${Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 })}${unit}`;
      if (count) number.title = `Dihitung dari ${count} riwayat`;
      line.append(caption, number);
      return line;
    };
    tooltip.replaceChildren();
    if (state.pinned) {
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'league-tooltip-close';
      close.setAttribute('aria-label', 'Tutup detail pertempuran');
      close.textContent = '×';
      close.addEventListener('click', () => hideBattle(true));
      tooltip.appendChild(close);
    }
    const heading = document.createElement('b');
    heading.textContent = `Battle details: ${name}`;
    tooltip.append(heading,
      metric('Rata-rata bintang / serangan', data.attack?.starsAverage, '', data.attack?.sampleSize),
      metric('Rata-rata destruksi / serangan', data.attack?.destructionAverage, '%', data.attack?.sampleSize),
      metric('Rata-rata destruksi / pertahanan', data.defense?.destructionAverage, '%', data.defense?.sampleSize));
    const note = document.createElement('small');
    note.textContent = `Berdasarkan riwayat tersedia: ${data.attack?.sampleSize ?? 0} serangan, ${data.defense?.sampleSize ?? 0} pertahanan.`;
    tooltip.append(note);
  }

  function showBattle(member, row, pinned = false, trigger = null) {
    clearTimeout(state.hoverTimer);
    const tag = normalizeTag(member.tag);
    if (!tag) return;
    const session = element('leagueSession').value;
    const key = `${session}:${tag}`;
    state.hoverKey = key;
    state.pinned = pinned;
    state.trigger?.setAttribute('aria-expanded', 'false');
    state.trigger = pinned ? trigger : null;
    state.trigger?.setAttribute('aria-expanded', 'true');
    tooltip.classList.toggle('is-pinned', pinned);
    tooltip.setAttribute('role', pinned ? 'dialog' : 'tooltip');
    if (pinned) tooltip.setAttribute('aria-label', `Battle details: ${member.name || member.tag}`);
    else tooltip.removeAttribute('aria-label');
    tooltip.replaceChildren();
    if (pinned) {
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'league-tooltip-close';
      close.setAttribute('aria-label', 'Tutup detail pertempuran');
      close.textContent = '×';
      close.addEventListener('click', () => hideBattle(true));
      tooltip.appendChild(close);
    }
    const loading = document.createElement('span');
    loading.className = 'league-tooltip-loading';
    loading.textContent = 'Memuat detail pertempuran…';
    tooltip.appendChild(loading);
    tooltip.hidden = false;
    positionTooltip(row);
    state.hoverTimer = setTimeout(async () => {
      try {
        let data = state.battleCache.get(key);
        if (!data) {
          const url = `/api/player/${encodeURIComponent(state.playerTag)}/league-group?session=${encodeURIComponent(session)}&detail=battle&memberTag=${encodeURIComponent(tag)}`;
          const response = await fetch(url);
          data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Detail tidak tersedia.');
          state.battleCache.set(key, data);
        }
        if (state.hoverKey !== key) return;
        renderBattle(member.name || member.tag, data);
        positionTooltip(row);
      } catch (error) {
        if (state.hoverKey === key) {
          tooltip.querySelector('.league-tooltip-loading')?.remove();
          tooltip.appendChild(document.createTextNode(error.message));
        }
      }
    }, 180);
  }

  function renderPage() {
    const list = element('leagueMembers');
    list.replaceChildren();
    const totalPages = Math.ceil(state.members.length / PAGE_SIZE);
    const start = state.page * PAGE_SIZE;
    for (const member of state.members.slice(start, start + PAGE_SIZE)) {
      const row = document.createElement('li');
      row.className = 'league-member';
      const isCurrent = normalizeTag(member.tag) === state.playerTag;
      if (isCurrent) row.classList.add('is-current');
      const rank = document.createElement('span');
      rank.className = 'league-member-rank';
      rank.textContent = `#${member.rank}`;
      const identity = document.createElement('span');
      identity.className = 'league-member-identity';
      const link = document.createElement('a');
      link.textContent = member.name || member.tag || 'Pemain';
      link.href = playerLeagueHref(member);
      if (isCurrent) link.setAttribute('aria-current', 'page');
      const clan = document.createElement('small');
      clan.textContent = member.clanName || 'Tanpa klan';
      identity.append(link, clan);
      const trophies = document.createElement('strong');
      trophies.className = 'league-member-trophies';
      trophies.textContent = Number(member.trophies || 0).toLocaleString('id-ID');
      trophies.title = 'Trofi liga';
      const activity = document.createElement('span');
      activity.className = 'league-member-activity';
      const attacks = document.createElement('span');
      const defenses = document.createElement('span');
      const attackCount = Number.isFinite(Number(member.attackCount)) && member.attackCount !== null ? Number(member.attackCount) : null;
      const defenseCount = Number.isFinite(Number(member.defenseCount)) && member.defenseCount !== null ? Number(member.defenseCount) : null;
      attacks.textContent = `Attacks ${attackCount ?? '—'}`;
      defenses.textContent = `Defenses ${defenseCount ?? '—'}`;
      attacks.title = 'Jumlah serangan: menang + kalah';
      defenses.title = 'Jumlah pertahanan: menang + kalah';
      activity.append(attacks, defenses);
      const info = document.createElement('button');
      info.type = 'button';
      info.className = 'league-battle-info';
      info.textContent = 'i';
      info.setAttribute('aria-label', `Detail pertempuran ${member.name || member.tag || 'pemain'}`);
      info.setAttribute('aria-haspopup', 'dialog');
      info.setAttribute('aria-expanded', 'false');
      info.title = 'Tampilkan detail pertempuran';
      info.addEventListener('click', event => {
        event.stopPropagation();
        const key = `${element('leagueSession').value}:${normalizeTag(member.tag)}`;
        if (state.pinned && state.hoverKey === key) hideBattle(true);
        else showBattle(member, row, true, info);
      });
      activity.appendChild(info);
      const zone = standingsZone(member.rank);
      if (zone) row.classList.add(`is-${zone}-zone`);
      row.append(rank, identity, trophies, activity);
      row.tabIndex = 0;
      row.addEventListener('mouseenter', () => {
        if (window.matchMedia('(hover: hover)').matches) showBattle(member, row);
      });
      row.addEventListener('mouseleave', hideBattle);
      row.addEventListener('focusin', () => showBattle(member, row));
      row.addEventListener('focusout', hideBattle);
      list.appendChild(row);
    }
    setText('leagueMemberCount', `${state.members.length} pemain`);
    setText('leaguePageInfo', totalPages ? `${state.page + 1} / ${totalPages}` : '—');
    element('leaguePrev').disabled = state.page <= 0;
    element('leagueNext').disabled = state.page >= totalPages - 1;
  }

  function playerLeagueHref(member) {
    const next = new URLSearchParams({ tag: normalizeTag(member.tag) || '' });
    const context = normalizeTag(member.clanTag) || clanTag;
    if (context) next.set('clan', context);
    return `/player.html?${next}#ranked-battles`;
  }

  function standingsZone(rank) {
    const rule = state.leagueRule;
    const total = state.members.length;
    const position = Number(rank);
    if (!rule || !total || !Number.isFinite(position)) return null;
    const promotionCount = Math.max(1, Math.ceil(total * Number(rule.promoted) / 100));
    if (position <= promotionCount) return 'promotion';
    if (rule.demoted === null || rule.demoted === undefined) return null;
    const demotionCount = Math.max(1, Math.ceil(total * Number(rule.demoted) / 100));
    return position >= total - demotionCount + 1 ? 'demotion' : null;
  }

  function topByPerformance(side) {
    const members = Array.isArray(state.leagueStats?.members) ? [...state.leagueStats.members] : [];
    if (side === 'attack') {
      return members.sort((a, b) => Number(b.attackPoints || 0) - Number(a.attackPoints || 0)
        || Number(b.attackTriples || 0) - Number(a.attackTriples || 0)
        || Number(b.attackCount || 0) - Number(a.attackCount || 0)).slice(0, 3);
    }
    return members.sort((a, b) => Number(b.defensePoints || 0) - Number(a.defensePoints || 0)
      || Number(b.defenseStops || 0) - Number(a.defenseStops || 0)
      || Number(b.defenseCount || 0) - Number(a.defenseCount || 0)).slice(0, 3);
  }

  function renderTopList(id, members, side, emptyMessage = 'Statistik battle belum dimuat.') {
    const list = element(id);
    list.replaceChildren();
    if (!members.length) {
      const empty = document.createElement('li');
      empty.className = 'league-stat-empty';
      empty.textContent = emptyMessage;
      list.appendChild(empty);
      return;
    }
    members.forEach((member, index) => {
      const row = document.createElement('li');
      row.className = `league-top-member is-${side}`;
      const place = document.createElement('span'); place.className = 'league-top-place'; place.textContent = `#${index + 1}`;
      const identity = document.createElement('span'); identity.className = 'league-top-identity';
      const name = document.createElement('a');
      name.href = playerLeagueHref(member);
      name.textContent = member.name || member.tag || 'Pemain';
      if (normalizeTag(member.tag) === state.playerTag) name.setAttribute('aria-current', 'page');
      const record = document.createElement('small');
      record.textContent = side === 'attack' ? `${Number(member.attackTriples || 0)} base diratakan (3★)` : `${Number(member.defenseStops || 0)} serangan gagal 3★`;
      identity.append(name, record);
      const rate = document.createElement('span'); rate.className = 'league-top-rate';
      const points = side === 'attack' ? Number(member.attackPoints || 0) : Number(member.defensePoints || 0);
      const battles = side === 'attack' ? Number(member.attackCount || 0) : Number(member.defenseCount || 0);
      const value = document.createElement('strong'); value.textContent = `${points.toLocaleString('id-ID')} poin`;
      const sample = document.createElement('small'); sample.textContent = `${battles} battle`;
      rate.append(value, sample);
      row.append(place, identity, rate);
      list.appendChild(row);
    });
  }

  function addZone(type, title, ranks, trophies, detail) {
    const card = document.createElement('div'); card.className = `league-zone is-${type}`;
    const heading = document.createElement('div'); heading.className = 'league-zone-heading';
    const label = document.createElement('strong'); label.textContent = title;
    const range = document.createElement('span'); range.textContent = ranks;
    heading.append(label, range);
    const cutoff = document.createElement('p');
    cutoff.textContent = trophies === null ? 'Batas trofi belum tersedia.' : `Batas saat ini ${Number(trophies).toLocaleString('id-ID')} trofi.`;
    card.append(heading, cutoff);
    if (detail) {
      const status = document.createElement('small'); status.textContent = detail; card.appendChild(status);
    }
    element('leagueZones').appendChild(card);
  }

  function renderZones() {
    const root = element('leagueZones');
    root.replaceChildren();
    const rule = state.leagueRule;
    if (!rule || !state.members.length) {
      setText('leagueBattleRule', '');
      const empty = document.createElement('p'); empty.className = 'league-stat-empty'; empty.textContent = 'Rule zona tidak tersedia untuk sesi ini.'; root.appendChild(empty);
      return;
    }
    setText('leagueBattleRule', `${rule.battles} battle/minggu`);
    const total = state.members.length;
    const promotionCount = Math.max(1, Math.ceil(total * Number(rule.promoted) / 100));
    const promotionCutoff = state.members[promotionCount - 1] || null;
    const player = state.members.find(member => normalizeTag(member.tag) === state.playerTag) || null;
    const promotionGap = player && promotionCutoff && player.rank > promotionCount
      ? Math.max(0, Number(promotionCutoff.trophies || 0) - Number(player.trophies || 0) + 1) : 0;
    const promotionDetail = player?.rank <= promotionCount
      ? `Posisi #${player.rank}: berada di zona promosi.`
      : player ? `Sekitar ${promotionGap} trofi dari zona promosi.` : '';
    addZone('promotion', `Promosi ${rule.promoted}%`, `#1-${promotionCount}`, promotionCutoff?.trophies ?? null, promotionDetail);
    if (rule.demoted === null || rule.demoted === undefined) {
      addZone('safe', 'Degradasi', 'Tidak ada', null, 'Tier ini tidak memiliki zona degradasi.');
      return;
    }
    const demotionCount = Math.max(1, Math.ceil(total * Number(rule.demoted) / 100));
    const demotionStart = total - demotionCount + 1;
    const demotionCutoff = state.members[demotionStart - 1] || null;
    const safetyCutoff = state.members[demotionStart - 2] || null;
    const inDemotion = player && player.rank >= demotionStart;
    const safetyGap = inDemotion && safetyCutoff
      ? Math.max(0, Number(safetyCutoff.trophies || 0) - Number(player.trophies || 0) + 1) : 0;
    const margin = player && !inDemotion && demotionCutoff
      ? Math.max(0, Number(player.trophies || 0) - Number(demotionCutoff.trophies || 0)) : 0;
    const demotionDetail = !player ? '' : inDemotion
      ? `Posisi #${player.rank}: perlu sekitar ${safetyGap} trofi untuk keluar.`
      : `Posisi #${player.rank}: unggul ${margin} trofi dari batas degradasi.`;
    addZone('demotion', `Degradasi ${rule.demoted}%`, `#${demotionStart}-${total}`, demotionCutoff?.trophies ?? null, demotionDetail);
  }

  function renderStatistics() {
    const coverage = state.leagueStats ? `${state.leagueStats.coverage}/${state.leagueStats.totalMembers} pemain` : 'Semua battle';
    setText('leagueTopAttackMeta', coverage);
    setText('leagueTopDefenseMeta', coverage);
    renderTopList('leagueTopAttack', topByPerformance('attack'), 'attack');
    renderTopList('leagueTopDefense', topByPerformance('defense'), 'defense');
    renderZones();
  }

  async function loadLeagueStatistics(sessionId) {
    if (state.statisticsSession === sessionId && state.leagueStats) return;
    const request = ++state.statisticsRequest;
    state.statisticsSession = sessionId;
    state.leagueStats = null;
    setText('leagueTopAttackMeta', 'Memuat…');
    setText('leagueTopDefenseMeta', 'Memuat…');
    renderTopList('leagueTopAttack', [], 'attack', 'Menghitung seluruh serangan grup…');
    renderTopList('leagueTopDefense', [], 'defense', 'Menghitung seluruh pertahanan grup…');
    try {
      const response = await fetch(`/api/player/${encodeURIComponent(state.playerTag)}/league-group?session=${encodeURIComponent(sessionId)}&detail=statistics`);
      const data = await response.json();
      if (request !== state.statisticsRequest || sessionId !== element('leagueSession').value) return;
      if (!response.ok) throw new Error(data.error || 'Statistik grup tidak dapat dimuat.');
      state.leagueStats = data;
      renderStatistics();
    } catch (error) {
      if (request !== state.statisticsRequest) return;
      setText('leagueTopAttackMeta', 'Tidak tersedia');
      setText('leagueTopDefenseMeta', 'Tidak tersedia');
      renderTopList('leagueTopAttack', [], 'attack', error.message);
      renderTopList('leagueTopDefense', [], 'defense', error.message);
    }
  }

  function setLeagueView(view) {
    state.leagueView = view === 'statistics' ? 'statistics' : 'standings';
    const statistics = state.leagueView === 'statistics';
    element('leagueStandingsHeading').hidden = statistics;
    element('leagueMembers').hidden = statistics;
    element('leaguePagination').hidden = statistics;
    element('leagueStatisticsView').hidden = !statistics;
    for (const tab of document.querySelectorAll('[data-league-view]')) {
      tab.setAttribute('aria-selected', String(tab.dataset.leagueView === state.leagueView));
    }
    if (statistics && state.members.length) loadLeagueStatistics(element('leagueSession').value);
  }

  function renderBattleLogList(id, logs, emptyMessage) {
    const list = element(id);
    list.replaceChildren();
    if (!logs.length) {
      const empty = document.createElement('p'); empty.className = 'ranked-battle-empty'; empty.textContent = emptyMessage; list.appendChild(empty); return;
    }
    logs.forEach((log, index) => {
      const side = id === 'rankedAttackLogs' ? 'attack' : 'defense';
      const card = document.createElement('article'); card.className = `ranked-battle-card ranked-${side}${Number(log.stars) === 3 ? ' ranked-triple' : ''}`;
      const top = document.createElement('div'); top.className = 'ranked-battle-card-top';
      const number = document.createElement('span'); number.textContent = `#${index + 1}`;
      const trophies = document.createElement('strong'); trophies.textContent = log.trophies === null || log.trophies === undefined ? 'Trofi —' : `${Number(log.trophies) >= 0 ? '+' : ''}${Number(log.trophies).toLocaleString('id-ID')} trofi`;
      top.append(number, trophies);
      const stars = document.createElement('div'); stars.className = 'ranked-battle-stars'; stars.setAttribute('aria-label', `${log.stars ?? 0} dari 3 bintang`);
      for (let star = 1; star <= 3; star++) stars.appendChild(Object.assign(document.createElement('span'), { className: star <= Number(log.stars || 0) ? 'earned' : '', textContent: '★' }));
      const destruction = document.createElement('div'); destruction.className = 'ranked-battle-destruction';
      destruction.append(Object.assign(document.createElement('span'), { textContent: 'Destruksi' }), Object.assign(document.createElement('strong'), { textContent: log.destructionPercentage === null || log.destructionPercentage === undefined ? '—' : `${Number(log.destructionPercentage).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%` }));
      const track = document.createElement('div'); track.className = 'ranked-destruction-track';
      const fill = document.createElement('i'); fill.style.width = `${Math.min(100, Math.max(0, Number(log.destructionPercentage || 0)))}%`; track.appendChild(fill);
      card.append(top, stars, destruction, track);
      if (log.opponentName || log.timestamp) {
        const meta = document.createElement('small');
        const parsedTime = log.timestamp ? new Date(log.timestamp) : null;
        const time = parsedTime && !Number.isNaN(parsedTime.getTime()) ? parsedTime.toLocaleString('id-ID') : '';
        meta.textContent = [log.opponentName, time].filter(Boolean).join(' · '); card.appendChild(meta);
      }
      list.appendChild(card);
    });
  }

  function renderPlayerBattleLog(data) {
    const summary = element('rankedBattleSummary'); summary.replaceChildren();
    const metrics = [
      ['Peringkat', data.playerRank ? `#${data.playerRank}/${data.totalMembers}` : '—'],
      ['Bintang / serangan', data.attack?.starsAverage ?? '—'],
      ['Destruksi serangan', data.attack?.destructionAverage == null ? '—' : `${Number(data.attack.destructionAverage).toLocaleString('id-ID')}%`],
      ['Destruksi pertahanan', data.defense?.destructionAverage == null ? '—' : `${Number(data.defense.destructionAverage).toLocaleString('id-ID')}%`]
    ];
    for (const [label, value] of metrics) {
      const item = document.createElement('div'); item.append(Object.assign(document.createElement('span'), { textContent: label }), Object.assign(document.createElement('strong'), { textContent: value })); summary.appendChild(item);
    }
    const allAttackLogs = Array.isArray(data.attack?.logs) ? data.attack.logs : [];
    const allDefenseLogs = Array.isArray(data.defense?.logs) ? data.defense.logs : [];
    const totalTrophies = [...allAttackLogs, ...allDefenseLogs].reduce((sum, log) => sum + (Number.isFinite(Number(log.trophies)) ? Number(log.trophies) : 0), 0);
    const trophyMetric = document.createElement('div');
    const trophyCaption = document.createElement('span'); trophyCaption.textContent = 'Total trofi';
    const trophyValue = document.createElement('strong'); trophyValue.className = 'summary-trophy-value';
    const trophyImage = document.createElement('img'); trophyImage.src = '/assets/trophy.png'; trophyImage.alt = ''; trophyImage.width = 20; trophyImage.height = 20;
    trophyValue.append(trophyImage, document.createTextNode(`${totalTrophies >= 0 ? '+' : ''}${totalTrophies.toLocaleString('id-ID')}`));
    trophyMetric.append(trophyCaption, trophyValue); summary.insertBefore(trophyMetric, summary.children[1]);
    const prepare = logs => logs.filter(log => state.logFilter === 'all' || (state.logFilter === 'triple' && Number(log.stars) === 3) || (state.logFilter === 'low' && Number(log.stars) <= 1) || (state.logFilter === 'highDestruction' && Number(log.destructionPercentage) >= 80)).sort((a, b) => state.logSort === 'stars' ? Number(b.stars || 0) - Number(a.stars || 0) : state.logSort === 'destruction' ? Number(b.destructionPercentage || 0) - Number(a.destructionPercentage || 0) : state.logSort === 'trophies' ? Number(b.trophies || 0) - Number(a.trophies || 0) : String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
    const attacks = prepare(Array.isArray(data.attack?.logs) ? data.attack.logs : []);
    const defenses = prepare(Array.isArray(data.defense?.logs) ? data.defense.logs : []);
    setText('rankedAttackTotal', `${attacks.length} battle`); setText('rankedDefenseTotal', `${defenses.length} battle`);
    const trophyTotal = logs => logs.reduce((sum, log) => sum + (Number.isFinite(Number(log.trophies)) ? Number(log.trophies) : 0), 0);
    const trophyLabel = value => { const image = document.createElement('img'); image.src = '/assets/trophy.png'; image.alt = ''; image.width = 16; image.height = 16; const span = document.createElement('span'); span.textContent = `${value >= 0 ? '+' : ''}${value.toLocaleString('id-ID')}`; span.prepend(image); return span; };
    document.getElementById('rankedAttackTrophies').replaceChildren(trophyLabel(trophyTotal(attacks)));
    document.getElementById('rankedDefenseTrophies').replaceChildren(trophyLabel(trophyTotal(defenses)));
    renderBattleLogList('rankedAttackLogs', attacks, 'Belum ada riwayat serangan pada sesi ini.');
    renderBattleLogList('rankedDefenseLogs', defenses, 'Belum ada riwayat pertahanan pada sesi ini.');
  }

  async function fetchPlayerBattleSession(sessionId) {
    const key = `${state.playerTag}:${sessionId}`;
    let pending = state.playerBattleCache.get(key);
    if (!pending) {
      pending = (async () => {
        const response = await fetch(`/api/player/${encodeURIComponent(state.playerTag)}/league-group?session=${encodeURIComponent(sessionId)}&detail=battle&memberTag=${encodeURIComponent(state.playerTag)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Battle log tidak dapat dimuat.');
        return data;
      })();
      state.playerBattleCache.set(key, pending);
    }
    try {
      return await pending;
    } catch (error) {
      if (state.playerBattleCache.get(key) === pending) state.playerBattleCache.delete(key);
      throw error;
    }
  }

  function battleTrophyPoints(logs) {
    return (Array.isArray(logs) ? logs : []).reduce((sum, log) => sum + (Number.isFinite(Number(log.trophies)) ? Number(log.trophies) : 0), 0);
  }

  function starDistribution(logs) {
    const values = (Array.isArray(logs) ? logs : []).map(log => Number(log.stars)).filter(Number.isFinite);
    return {
      total: values.length,
      low: values.filter(stars => stars <= 1).length,
      two: values.filter(stars => stars === 2).length,
      triple: values.filter(stars => stars >= 3).length
    };
  }

  function renderRankedInsights(previous, current) {
    const root = element('rankedComparisonInsights');
    root.replaceChildren();
    const previousRank = Number(previous.playerRank);
    const currentRank = Number(current.playerRank);
    const rankChange = previousRank - currentRank;
    const verdict = document.createElement('div'); verdict.className = 'ranked-insight-verdict';
    const eyebrow = document.createElement('span'); eyebrow.textContent = 'HASIL SESI';
    const result = document.createElement('strong');
    result.className = rankChange > 0 ? 'is-up' : rankChange < 0 ? 'is-down' : 'is-steady';
    result.textContent = rankChange === 0 ? 'Posisi tetap' : `${rankChange > 0 ? 'Naik' : 'Turun'} ${Math.abs(rankChange)} posisi`;
    verdict.append(eyebrow, result);
    root.appendChild(verdict);

    const signedChange = (value, decimals = 0) => `${value > 0 ? '+' : ''}${value.toLocaleString('id-ID', { maximumFractionDigits: decimals })}`;
    const record = player => player?.attackWins === undefined ? 'Data tidak tersedia' : `${Number(player.attackWins || 0)} menang · ${Number(player.attackLosses || 0)} kalah`;
    const defenseRecord = player => player?.defenseWins === undefined ? 'Data tidak tersedia' : `${Number(player.defenseWins || 0)} menang · ${Number(player.defenseLosses || 0)} kalah`;
    const addPerformance = (title, currentRecord, previousRecord, change) => {
      const item = document.createElement('section'); item.className = 'ranked-insight-performance';
      const heading = document.createElement('div');
      const name = document.createElement('strong'); name.textContent = title;
      const delta = document.createElement('span'); delta.className = change > 0 ? 'is-up' : change < 0 ? 'is-down' : 'is-steady'; delta.textContent = `${signedChange(change)} poin`;
      heading.append(name, delta);
      const now = document.createElement('p'); now.textContent = currentRecord;
      const before = document.createElement('small'); before.textContent = `Sebelumnya: ${previousRecord}`;
      item.append(heading, now, before); root.appendChild(item);
    };
    const attackChange = battleTrophyPoints(current.attack?.logs) - battleTrophyPoints(previous.attack?.logs);
    const defenseChange = battleTrophyPoints(current.defense?.logs) - battleTrophyPoints(previous.defense?.logs);
    addPerformance('Attack', record(current.player), record(previous.player), attackChange);
    addPerformance('Defense', defenseRecord(current.player), defenseRecord(previous.player), defenseChange);

    const distribution = document.createElement('section'); distribution.className = 'ranked-star-distribution';
    const distributionTitle = document.createElement('strong'); distributionTitle.textContent = 'Distribusi bintang serangan';
    const distributionLegend = document.createElement('div'); distributionLegend.className = 'ranked-star-legend';
    [['is-low', '0–1'], ['is-two', '2'], ['is-triple', '3']].forEach(([type, label]) => {
      const key = document.createElement('span'); key.className = type; key.textContent = `${label} bintang`; distributionLegend.appendChild(key);
    });
    distribution.append(distributionTitle, distributionLegend);
    [['Sebelumnya', starDistribution(previous.attack?.logs)], ['Saat ini', starDistribution(current.attack?.logs)]].forEach(([label, data]) => {
      const series = document.createElement('div'); series.className = 'ranked-star-series';
      const caption = document.createElement('span'); caption.textContent = label;
      const bar = document.createElement('div'); bar.className = 'ranked-star-bar';
      [['low', 'is-low'], ['two', 'is-two'], ['triple', 'is-triple']].forEach(([key, type]) => {
        const segment = document.createElement('i'); segment.className = type; segment.style.width = `${data.total ? data[key] / data.total * 100 : 0}%`; segment.title = `${data[key]} dari ${data.total} serangan`; bar.appendChild(segment);
      });
      const tripleRate = document.createElement('b'); tripleRate.textContent = data.total ? `${Math.round(data.triple / data.total * 100)}% 3★` : '—';
      series.append(caption, bar, tripleRate); distribution.appendChild(series);
    });
    root.appendChild(distribution);

    const describe = (value, decimals = 0) => value === 0 ? 'tetap' : `${value > 0 ? 'naik' : 'turun'} ${Math.abs(value).toLocaleString('id-ID', { maximumFractionDigits: decimals })}`;
    const starsChange = Number(current.attack?.starsAverage || 0) - Number(previous.attack?.starsAverage || 0);
    const insight = document.createElement('p'); insight.className = 'ranked-insight-note';
    insight.textContent = `Posisi ${rankChange === 0 ? 'tetap' : `${rankChange > 0 ? 'naik' : 'turun'} ${Math.abs(rankChange)}`}; poin defense ${describe(defenseChange)}, poin attack ${describe(attackChange)}, dan rata-rata bintang ${describe(starsChange, 2)}.`;
    root.appendChild(insight);
  }

  function renderRankedComparison(previous, current) {
    const chart = element('rankedComparisonChart');
    chart.replaceChildren();
    const metrics = [
      { label: 'Posisi grup', previous: previous.playerRank, current: current.playerRank, rank: true },
      { label: 'Poin attack', previous: battleTrophyPoints(previous.attack?.logs), current: battleTrophyPoints(current.attack?.logs) },
      { label: 'Poin defense', previous: battleTrophyPoints(previous.defense?.logs), current: battleTrophyPoints(current.defense?.logs) },
      { label: 'Rata-rata bintang', previous: previous.attack?.starsAverage, current: current.attack?.starsAverage, decimals: 2 },
      { label: 'Total trofi', previous: previous.player?.trophies, current: current.player?.trophies }
    ];
    const valueText = (metric, value) => {
      if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
      if (metric.rank) return `#${Number(value).toLocaleString('id-ID')}`;
      return Number(value).toLocaleString('id-ID', { maximumFractionDigits: metric.decimals ?? 0 });
    };
    for (const metric of metrics) {
      const oldValue = Number(metric.previous);
      const newValue = Number(metric.current);
      const available = metric.previous !== null && metric.previous !== undefined && metric.current !== null && metric.current !== undefined && Number.isFinite(oldValue) && Number.isFinite(newValue);
      const row = document.createElement('div'); row.className = 'ranked-comparison-row';
      const heading = document.createElement('div'); heading.className = 'ranked-comparison-metric';
      const title = document.createElement('strong'); title.textContent = metric.label;
      const delta = document.createElement('span');
      if (!available || oldValue === newValue) {
        delta.className = 'is-steady'; delta.textContent = available ? 'Tetap' : 'Data tidak lengkap';
      } else {
        const improvement = metric.rank ? oldValue - newValue : newValue - oldValue;
        delta.className = improvement > 0 ? 'is-up' : 'is-down';
        const difference = Math.abs(newValue - oldValue).toLocaleString('id-ID', { maximumFractionDigits: metric.decimals ?? 0 });
        delta.textContent = `${improvement > 0 ? 'Naik' : 'Turun'} ${difference}${metric.rank ? ' posisi' : ''}`;
      }
      heading.append(title, delta);
      const bars = document.createElement('div'); bars.className = 'ranked-comparison-bars';
      const values = metric.rank && available
        ? [Math.max(1, Number(previous.totalMembers || 100) - oldValue + 1), Math.max(1, Number(current.totalMembers || 100) - newValue + 1)]
        : [Math.abs(oldValue), Math.abs(newValue)];
      const maximum = Math.max(...values.filter(Number.isFinite), 1);
      [['Sebelumnya', metric.previous, values[0], 'previous'], ['Saat ini', metric.current, values[1], 'current']].forEach(([label, value, chartValue, type]) => {
        const series = document.createElement('div'); series.className = `ranked-comparison-series is-${type}`;
        const caption = document.createElement('span'); caption.textContent = label;
        const track = document.createElement('div'); track.className = 'ranked-comparison-track';
        const fill = document.createElement('i'); fill.style.width = `${Number.isFinite(chartValue) ? Math.max(4, chartValue / maximum * 100) : 0}%`; track.appendChild(fill);
        const valueNode = document.createElement('b'); valueNode.textContent = valueText(metric, value);
        series.append(caption, track, valueNode); bars.appendChild(series);
      });
      row.append(heading, bars); chart.appendChild(row);
    }
    renderRankedInsights(previous, current);
  }

  async function loadRankedComparison(sessions) {
    const root = element('rankedSessionComparison');
    const chart = element('rankedComparisonChart');
    const currentSession = sessions.find(session => session.id === 'current');
    const previousSession = sessions.find(session => session.id === 'previous');
    const request = ++state.comparisonRequest;
    if (!currentSession || !previousSession) { root.hidden = true; chart.replaceChildren(); element('rankedComparisonInsights').replaceChildren(); return; }
    root.hidden = false;
    chart.textContent = 'Memuat perbandingan sesi…';
    try {
      const [previous, current] = await Promise.all([fetchPlayerBattleSession('previous'), fetchPlayerBattleSession('current')]);
      if (request !== state.comparisonRequest) return;
      renderRankedComparison(previous, current);
    } catch (_error) {
      if (request !== state.comparisonRequest) return;
      root.hidden = true;
      chart.replaceChildren();
      element('rankedComparisonInsights').replaceChildren();
    }
  }

  async function loadPlayerBattleLog(sessionId) {
    const request = ++state.logRequest;
    const status = element('rankedBattleStatus'); status.hidden = false; setLoading('rankedBattleStatus', 'Memuat battle log…');
    try {
      const data = await fetchPlayerBattleSession(sessionId);
      if (request !== state.logRequest) return;
      renderPlayerBattleLog(data);
      status.textContent = data.stale ? `Menampilkan data tersimpan · diperbarui ${new Date(data.lastUpdated).toLocaleString('id-ID')}` : `${sessionLabel(data.session)} · ${data.attack?.sampleSize || 0} serangan dan ${data.defense?.sampleSize || 0} pertahanan`;
    } catch (error) {
      if (request !== state.logRequest) return;
      element('rankedBattleSummary').replaceChildren();
      renderBattleLogList('rankedAttackLogs', [], 'Battle log tidak tersedia.'); renderBattleLogList('rankedDefenseLogs', [], 'Battle log tidak tersedia.');
      status.textContent = error.message;
    }
  }

  async function loadSession(sessionId) {
    hideBattle(true);
    setLeagueTitle(null);
    const request = ++state.request;
    const status = element('leagueStatus');
    status.hidden = false;
    setLoading('leagueStatus', 'Memuat peringkat grup…');
    state.members = [];
    state.leagueRule = null;
    state.leagueStats = null;
    state.statisticsSession = null;
    state.statisticsRequest++;
    state.playerRank = null;
    state.page = 0;
    renderPage();
    renderStatistics();
    element('leaguePlayerRank').hidden = true;
    try {
      const response = await fetch(`/api/player/${encodeURIComponent(state.playerTag)}/league-group?session=${encodeURIComponent(sessionId)}`);
      const data = await response.json().catch(() => ({ error: 'Server tidak mengembalikan data grup liga. Coba lagi nanti.' }));
      if (request !== state.request) return;
      if (!response.ok) throw new Error(data.error || 'Peringkat grup tidak dapat dimuat.');
      state.members = Array.isArray(data.members) ? data.members : [];
      state.leagueRule = data.leagueRule || null;
      state.playerRank = data.playerRank || null;
      state.page = data.playerRank ? Math.floor((data.playerRank - 1) / PAGE_SIZE) : 0;
      renderPage();
      renderStatistics();
      if (state.leagueView === 'statistics') loadLeagueStatistics(sessionId);
      const label = data.session.id === 'current' ? 'Sesi saat ini' : 'Sesi terakhir';
      setLeagueTitle(data.leagueTier);
      const tier = data.leagueTier ? `${data.leagueTier} · ` : '';
      const rankText = data.playerRank ? `#${data.playerRank} dari ${data.totalMembers}` : 'Posisi tidak tersedia';
      setText('leagueRankSummary', `${tier}${label} · ${rankText}`);
      const card = element('leaguePlayerRank');
      card.hidden = false;
      card.replaceChildren();
      const rank = document.createElement('strong');
      rank.textContent = data.playerRank ? `#${data.playerRank}` : '—';
      const description = document.createElement('span');
      description.textContent = `${label} · ${data.totalMembers} anggota grup`;
      card.append(rank, description);
      if (data.stale) {
        const updated = data.lastUpdated ? new Date(data.lastUpdated).toLocaleString('id-ID') : 'sebelumnya';
        status.textContent = `Menampilkan data grup tersimpan dari ${updated}; API sedang tidak merespons.`;
      } else {
        status.hidden = true;
      }
    } catch (error) {
      if (request !== state.request) return;
      status.textContent = error.message;
      setText('leagueRankSummary', 'Peringkat grup liga belum tersedia.');
    }
  }

  function initialize(player) {
    hideBattle(true);
    state.battleCache.clear();
    state.playerBattleCache.clear();
    state.comparisonRequest++;
    setLeagueTitle(null);
    setLeagueBadge('playerLeagueBadge', player.leagueTier?.name);
    state.request++;
    state.playerTag = normalizeTag(player.tag);
    state.members = [];
    state.leagueRule = null;
    state.leagueStats = null;
    state.statisticsSession = null;
    state.statisticsRequest++;
    state.playerRank = null;
    state.page = 0;
    renderPage();
    renderStatistics();
    setLeagueView('standings');
    const select = element('leagueSession');
    const battleSelect = element('rankedBattleSession');
    select.replaceChildren();
    battleSelect.replaceChildren();
    const sessions = Array.isArray(player.leagueSessions) ? player.leagueSessions : [];
    state.sessions = sessions;
    for (const session of sessions) {
      const option = document.createElement('option');
      option.value = session.id;
      option.textContent = sessionLabel(session);
      select.appendChild(option);
      battleSelect.appendChild(option.cloneNode(true));
    }
    select.disabled = sessions.length === 0;
    battleSelect.disabled = sessions.length === 0;
    if (!sessions.length) {
      const message = player.leagueTier?.name === 'Legend I'
        ? 'Legend I memakai leaderboard global; tidak ada grup 100 pemain untuk ditampilkan.'
        : 'Belum ada grup liga untuk sesi saat ini atau sesi terakhir.';
      const status = element('leagueStatus');
      status.hidden = false;
      status.textContent = message;
      setText('leagueRankSummary', message);
      element('leaguePlayerRank').hidden = true;
      setText('rankedBattleStatus', message);
      renderBattleLogList('rankedAttackLogs', [], 'Battle log tidak tersedia.'); renderBattleLogList('rankedDefenseLogs', [], 'Battle log tidak tersedia.');
      element('rankedSessionComparison').hidden = true;
      return;
    }
    select.value = sessions.some(session => session.id === 'current') ? 'current' : sessions[0].id;
    battleSelect.value = select.value;
    loadSession(select.value);
    loadPlayerBattleLog(battleSelect.value);
    loadRankedComparison(sessions);
  }

  element('leagueSession').addEventListener('change', event => {
    loadSession(event.target.value);
    element('rankedBattleSession').value = event.target.value;
    loadPlayerBattleLog(event.target.value);
  });
  element('rankedBattleSession').addEventListener('change', event => loadPlayerBattleLog(event.target.value));
  element('rankedLogFilter').addEventListener('change', event => { state.logFilter = event.target.value; loadPlayerBattleLog(element('rankedBattleSession').value); });
  element('rankedLogSort').addEventListener('change', event => { state.logSort = event.target.value; loadPlayerBattleLog(element('rankedBattleSession').value); });
  element('leaguePrev').addEventListener('click', () => {
    if (state.page > 0) { state.page--; renderPage(); }
  });
  element('leagueNext').addEventListener('click', () => {
    if ((state.page + 1) * PAGE_SIZE < state.members.length) { state.page++; renderPage(); }
  });
  document.querySelectorAll('[data-league-view]').forEach(button => button.addEventListener('click', () => setLeagueView(button.dataset.leagueView)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && state.pinned) hideBattle(true);
  });
  window.PlayerLeague = { initialize };
})();
