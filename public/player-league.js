(function () {
  const PAGE_SIZE = 25;
  const state = { playerTag: null, members: [], page: 0, request: 0, battleCache: new Map(), hoverTimer: null, hoverKey: null, pinned: false, trigger: null };
  const clanTag = normalizeTag(new URLSearchParams(location.search).get('clan'));

  function normalizeTag(value) {
    const tag = String(value || '').trim().replace(/^#/, '').toUpperCase();
    return /^[0289PYLQGRJCUV]{3,15}$/.test(tag) ? tag : null;
  }

  function element(id) { return document.getElementById(id); }
  function setText(id, value) { element(id).textContent = value; }
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
    const level = roman ? roman[1].toUpperCase() : numeric ? ['I', 'III', 'II'][Number(numeric[1]) % 3] : null;
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
      const next = new URLSearchParams({ tag: normalizeTag(member.tag) || '' });
      const context = normalizeTag(member.clanTag) || clanTag;
      if (context) next.set('clan', context);
      link.href = `/player.html?${next}`;
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

  async function loadSession(sessionId) {
    hideBattle(true);
    setLeagueTitle(null);
    const request = ++state.request;
    const status = element('leagueStatus');
    status.hidden = false;
    status.textContent = 'Memuat peringkat grup...';
    state.members = [];
    state.page = 0;
    renderPage();
    element('leaguePlayerRank').hidden = true;
    try {
      const response = await fetch(`/api/player/${encodeURIComponent(state.playerTag)}/league-group?session=${encodeURIComponent(sessionId)}`);
      const data = await response.json().catch(() => ({ error: 'Server tidak mengembalikan data grup liga. Coba lagi nanti.' }));
      if (request !== state.request) return;
      if (!response.ok) throw new Error(data.error || 'Peringkat grup tidak dapat dimuat.');
      state.members = Array.isArray(data.members) ? data.members : [];
      state.page = data.playerRank ? Math.floor((data.playerRank - 1) / PAGE_SIZE) : 0;
      renderPage();
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
    setLeagueTitle(null);
    setLeagueBadge('playerLeagueBadge', player.leagueTier?.name);
    state.request++;
    state.playerTag = normalizeTag(player.tag);
    state.members = [];
    state.page = 0;
    renderPage();
    const select = element('leagueSession');
    select.replaceChildren();
    const sessions = Array.isArray(player.leagueSessions) ? player.leagueSessions : [];
    for (const session of sessions) {
      const option = document.createElement('option');
      option.value = session.id;
      const date = Number(session.seasonId) > 0
        ? new Date(Number(session.seasonId) * 1000).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : '';
      option.textContent = `${session.label}${date ? ` · ${date}` : ''}`;
      select.appendChild(option);
    }
    select.disabled = sessions.length === 0;
    if (!sessions.length) {
      const message = player.leagueTier?.name === 'Legend I'
        ? 'Legend I memakai leaderboard global; tidak ada grup 100 pemain untuk ditampilkan.'
        : 'Belum ada grup liga untuk sesi saat ini atau sesi terakhir.';
      const status = element('leagueStatus');
      status.hidden = false;
      status.textContent = message;
      setText('leagueRankSummary', message);
      element('leaguePlayerRank').hidden = true;
      return;
    }
    select.value = sessions.some(session => session.id === 'current') ? 'current' : sessions[0].id;
    loadSession(select.value);
  }

  element('leagueSession').addEventListener('change', event => loadSession(event.target.value));
  element('leaguePrev').addEventListener('click', () => {
    if (state.page > 0) { state.page--; renderPage(); }
  });
  element('leagueNext').addEventListener('click', () => {
    if ((state.page + 1) * PAGE_SIZE < state.members.length) { state.page++; renderPage(); }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && state.pinned) hideBattle(true);
  });
  window.PlayerLeague = { initialize };
})();
