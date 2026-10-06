(function () {
  const PAGE_SIZE = 25;
  const state = { playerTag: null, members: [], page: 0, request: 0 };
  const clanTag = normalizeTag(new URLSearchParams(location.search).get('clan'));

  function normalizeTag(value) {
    const tag = String(value || '').trim().replace(/^#/, '').toUpperCase();
    return /^[0289PYLQGRJCUV]{3,15}$/.test(tag) ? tag : null;
  }

  function element(id) { return document.getElementById(id); }
  function setText(id, value) { element(id).textContent = value; }

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
      row.append(rank, identity, trophies);
      list.appendChild(row);
    }
    setText('leagueMemberCount', `${state.members.length} pemain`);
    setText('leaguePageInfo', totalPages ? `${state.page + 1} / ${totalPages}` : '—');
    element('leaguePrev').disabled = state.page <= 0;
    element('leagueNext').disabled = state.page >= totalPages - 1;
  }

  async function loadSession(sessionId) {
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
      const data = await response.json();
      if (request !== state.request) return;
      if (!response.ok) throw new Error(data.error || 'Peringkat grup tidak dapat dimuat.');
      state.members = Array.isArray(data.members) ? data.members : [];
      state.page = data.playerRank ? Math.floor((data.playerRank - 1) / PAGE_SIZE) : 0;
      renderPage();
      const label = data.session.id === 'current' ? 'Sesi saat ini' : 'Sesi terakhir';
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
      status.hidden = true;
    } catch (error) {
      if (request !== state.request) return;
      status.textContent = error.message;
      setText('leagueRankSummary', 'Peringkat grup liga belum tersedia.');
    }
  }

  function initialize(player) {
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
  window.PlayerLeague = { initialize };
})();
