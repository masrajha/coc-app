(() => {
  const locationSelect = document.getElementById('rankingLocation');
  if (!locationSelect) return;

  const status = document.getElementById('rankingStatus');
  const tableWrap = document.getElementById('rankingTableWrap');
  const tableHead = document.getElementById('rankingHead');
  const tableRows = document.getElementById('rankingRows');
  const updated = document.getElementById('rankingUpdated');
  const caption = document.getElementById('rankingCaption');
  const tabs = [...document.querySelectorAll('.ranking-tab')];
  const tr = (key, variables) => window.CocI18n.t(key, variables);
  let rankingType = 'players';
  const isPlayer = () => rankingType.startsWith('players');
  const categoryCaption = () => ({players:'home.rankingCaption',clans:'home.rankingClanCaption','players-builder-base':'feature.rankPlayersBuilder','clans-builder-base':'feature.rankClansBuilder',capitals:'feature.rankCapital'})[rankingType];
  let requestNumber = 0;
  let clanLocationObserver = null;
  let clanLocationQueue = [];
  let clanLocationLookups = 0;
  const clanLocationPromises = new Map();

  const text = (tag, value, className) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value == null || value === '' ? '—' : String(value);
    return node;
  };

  function displayNumber(value) {
    return value == null ? '?' : window.CocI18n.number(Number(value));
  }

  function cleanTag(tag) {
    return String(tag || '').replace(/^#/, '').toUpperCase();
  }

  function addLocationOptions(items) {
    const selected = locationSelect.value || 'global';
    const countries = (items || [])
      .filter(location => location?.isCountry && location.id && location.name)
      .sort((a, b) => a.name.localeCompare(b.name, window.CocI18n.locale));
    for (const location of countries) {
      if ([...locationSelect.options].some(option => option.value === String(location.id))) continue;
      locationSelect.appendChild(new Option(location.name, location.id));
    }
    locationSelect.value = [...locationSelect.options].some(option => option.value === selected) ? selected : 'global';
  }

  async function loadLocations() {
    try {
      const response = await window.CocI18n.apiFetch('/api/rankings/locations');
      const data = await response.json();
      if (response.ok) addLocationOptions(data.items);
    } catch {
      // Global ranking remains usable even if the country list is unavailable.
    }
  }

  function setLoading() {
    clanLocationObserver?.disconnect();
    clanLocationObserver = null;
    clanLocationQueue = [];
    status.hidden = false;
    status.className = 'ranking-status';
    status.textContent = tr('home.loadingLeaderboard');
    tableWrap.hidden = true;
    updated.textContent = '';
    caption.textContent = tr(categoryCaption());
  }

  function appendCell(row, content, className = '') {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    if (content instanceof Node) cell.appendChild(content);
    else cell.textContent = content == null || content === '' ? '—' : String(content);
    row.appendChild(cell);
    return cell;
  }

  function rankBadge(rank) {
    const badge = text('span', `#${rank}`, 'ranking-position');
    if (Number(rank) <= 3) badge.classList.add(`podium-${rank}`);
    return badge;
  }

  function renderPlayer(item, index) {
    const row = document.createElement('tr');
    const rank = item.rank ?? index + 1;
    appendCell(row, rankBadge(rank), 'rank-cell');

    const player = document.createElement('a');
    player.className = 'ranking-name-link';
    player.href = `/player.html?tag=${encodeURIComponent(cleanTag(item.tag))}`;
    const avatar = text('span', String(item.name || item.tag || '?').trim().slice(0, 1).toUpperCase(), 'ranking-avatar player-avatar');
    const identity = document.createElement('span');
    identity.className = 'ranking-identity';
    identity.append(text('strong', item.name || item.tag), text('small', item.tag || ''));
    player.append(avatar, identity);
    appendCell(row, player, 'name-cell');

    const clan = item.clan;
    appendCell(row, clan?.name || '—', 'secondary-cell');
    const countryCell = appendCell(row, tr(clan?.tag ? 'home.loadingShort' : 'home.notAvailable'), 'secondary-cell player-location-cell');
    if (clan?.tag) countryCell.dataset.clanTag = cleanTag(clan.tag);
    appendCell(row, (rankingType === 'players-builder-base' ? item.builderBaseLeague?.name : item.leagueTier?.name || item.league?.name) || '—', 'secondary-cell league-cell');
    appendCell(row, displayNumber(rankingType === 'players-builder-base' ? item.builderBaseTrophies : item.trophies), 'score-cell');
    if (rankingType === 'players') {
      appendCell(row, displayNumber(item.attackWins), 'secondary-cell');
      appendCell(row, displayNumber(item.defenseWins), 'secondary-cell');
    }
    return row;
  }

  function renderClan(item, index) {
    const row = document.createElement('tr');
    const rank = item.rank ?? index + 1;
    appendCell(row, rankBadge(rank), 'rank-cell');

    const clan = document.createElement('a');
    clan.className = 'ranking-name-link';
    clan.href = `/clan.html?clan=${encodeURIComponent(cleanTag(item.tag))}`;
    const badgeUrl = item.badgeUrls?.small || item.badgeUrls?.medium || item.badgeUrls?.large;
    if (badgeUrl) {
      const image = document.createElement('img');
      image.className = 'ranking-avatar clan-avatar';
      image.src = badgeUrl;
      image.alt = '';
      image.loading = 'lazy';
      image.addEventListener('error', () => image.replaceWith(text('span', '⚔', 'ranking-avatar clan-avatar clan-avatar-fallback')), { once: true });
      clan.appendChild(image);
    } else {
      clan.appendChild(text('span', '⚔', 'ranking-avatar clan-avatar clan-avatar-fallback'));
    }
    const identity = document.createElement('span');
    identity.className = 'ranking-identity';
    identity.append(text('strong', item.name || item.tag), text('small', item.tag || ''));
    clan.appendChild(identity);
    appendCell(row, clan, 'name-cell');

    appendCell(row, item.clanLevel ? `Level ${item.clanLevel}` : '—', 'secondary-cell');
    appendCell(row, item.members == null ? '—' : `${item.members}/50`, 'secondary-cell');
    appendCell(row, item.location?.name || '—', 'secondary-cell');
    appendCell(row, displayNumber(rankingType === 'clans-builder-base' ? item.clanBuilderBasePoints : item.clanPoints), 'score-cell');
    return row;
  }

  function render(data) {
    tableHead.replaceChildren();
    tableRows.replaceChildren();
    const headings = isPlayer()
      ? ['home.rank', 'home.player', 'home.clan', 'home.location', 'home.league', 'home.trophies', ...(rankingType === 'players' ? ['home.attacks', 'home.defenses'] : [])]
      : ['home.rank', 'home.clan', 'clan.levelWord', 'home.membersHeading', 'home.location', rankingType === 'capitals' ? 'feature.capitalPoints' : rankingType === 'clans-builder-base' ? 'feature.builderPoints' : 'home.clanPoints'];
    const headRow = document.createElement('tr');
    for (const key of headings) headRow.appendChild(text('th', tr(key)));
    tableHead.appendChild(headRow);

    const items = Array.isArray(data.items) ? data.items : [];
    items.forEach((item, index) => tableRows.appendChild(
      isPlayer() ? renderPlayer(item, index) : renderClan(item, index)
    ));
    if (!items.length) {
      const row = document.createElement('tr');
      const empty = text('td', tr('home.rankingEmpty'), 'ranking-empty');
      empty.colSpan = headings.length;
      row.appendChild(empty);
      tableRows.appendChild(row);
    }
    tableWrap.hidden = false;
    status.hidden = true;
    updated.textContent = data.lastUpdated
      ? tr('home.rankingUpdated', { date: window.CocI18n.dateTime(new Date(data.lastUpdated)) })
      : tr('home.rankingUpdatedUnknown');
    hydrateClanLocations(requestNumber);
  }

  function lookupClanCountry(tag) {
    if (!clanLocationPromises.has(tag)) {
      const request = window.CocI18n.apiFetch(`/api/clan/${encodeURIComponent(tag)}/summary`)
        .then(async response => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Negara klan tidak tersedia');
          return data.location?.name || null;
        });
      clanLocationPromises.set(tag, request);
      request.catch(() => clanLocationPromises.delete(tag));
    }
    return clanLocationPromises.get(tag);
  }

  function pumpClanLocationQueue() {
    while (clanLocationLookups < 4 && clanLocationQueue.length) {
      const { cell, tag, requestId } = clanLocationQueue.shift();
      clanLocationLookups += 1;
      lookupClanCountry(tag)
        .then(country => {
          if (requestId === requestNumber && cell.isConnected) cell.textContent = country || tr('home.notAvailable');
        })
        .catch(() => {
          if (requestId === requestNumber && cell.isConnected) cell.textContent = tr('home.notAvailable');
        })
        .finally(() => {
          clanLocationLookups -= 1;
          pumpClanLocationQueue();
        });
    }
  }

  function hydrateClanLocations(requestId) {
    const cells = [...tableRows.querySelectorAll('.player-location-cell[data-clan-tag]')];
    if (!cells.length) return;
    const enqueue = cell => {
      if (requestId !== requestNumber || !cell.dataset.clanTag) return;
      clanLocationQueue.push({ cell, tag: cell.dataset.clanTag, requestId });
      cell.removeAttribute('data-clan-tag');
      pumpClanLocationQueue();
    };
    if ('IntersectionObserver' in window) {
      clanLocationObserver = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          clanLocationObserver.unobserve(entry.target);
          enqueue(entry.target);
        }
      }, { root: tableWrap, rootMargin: '120px 0px' });
      cells.forEach(cell => clanLocationObserver.observe(cell));
    } else {
      cells.forEach(enqueue);
    }
  }

  async function loadRankings() {
    const currentRequest = ++requestNumber;
    setLoading();
    const params = new URLSearchParams({ location: locationSelect.value || 'global', limit: '25' });
    try {
      const response = await window.CocI18n.apiFetch(`/api/rankings/${rankingType}?${params}`);
      const data = await response.json();
      if (currentRequest !== requestNumber) return;
      if (!response.ok) throw new Error(data.error || tr('home.rankingFailed'));
      render(data);
    } catch (error) {
      if (currentRequest !== requestNumber) return;
      status.className = 'ranking-status error';
      status.textContent = `${error.message} ${tr('home.rankingFailedHelp')}`;
    }
  }

  tabs.forEach(tab => tab.addEventListener('click', () => {
    rankingType = tab.dataset.ranking;
    tabs.forEach(item => {
      const active = item === tab;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
    });
    loadRankings();
  }));
  locationSelect.addEventListener('change', loadRankings);
  document.getElementById('refreshRankings').addEventListener('click', loadRankings);

  loadLocations();
  loadRankings();
})();
