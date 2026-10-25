(() => {
  let data = null, ready = false, identity = '', view = 'table', side = 'home', selected = null, attack = null;
  const el = id => document.getElementById(id);
  const tr = (key, values) => window.CocI18n.t(`warMap.${key}`, values);
  const number = value => value == null ? '—' : window.CocI18n.number(value);
  const wide = window.matchMedia('(min-width: 1000px)');
  const key = (which, tag) => `${which}:${tag}`;
  const rows = which => (which === 'home' ? data?.members : data?.opponentMembers) || [];
  const name = which => (which === 'home' ? data?.clan?.name : data?.opponent?.name) || tr(which);
  function node(tag, text = '', className = '') {
    const item = document.createElement(tag); item.textContent = text; item.className = className; return item;
  }
  function button(text, handler, className = '') {
    const item = node('button', text, className); item.type = 'button'; item.addEventListener('click', handler); return item;
  }
  function stars(member) {
    if (!member.attacksReceived) return tr('untouched');
    if (member.bestStars == null) return tr('unknown');
    return '★'.repeat(Math.max(0, Math.min(3, Number(member.bestStars)))) + '☆'.repeat(Math.max(0, 3 - Number(member.bestStars)));
  }
  function syncView() {
    el('warRosterTableView').hidden = view !== 'table';
    el('warRosterTableFilters').hidden = view !== 'table';
    el('warMapView').hidden = view !== 'map';
    document.querySelectorAll('[data-war-view]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.warView === view)));
    if (view === 'map') requestAnimationFrame(drawLine);
  }
  function choose(which, member) {
    const focused = document.activeElement?.dataset.baseKey === key(which, member.tag);
    selected = {side: which, tag: member.tag}; attack = null; renderBoards(); renderDetails();
    if (focused) [...el('warMapBoards').querySelectorAll('[data-base-key]')].find(item => item.dataset.baseKey === key(which, member.tag))?.focus({preventScroll: true});
    if (!wide.matches) el('warMapDetails').scrollIntoView({block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  }
  function base(which, member) {
    const item = button('', () => choose(which, member), 'war-map-base');
    item.classList.toggle('is-untouched', !member.attacksReceived);
    item.dataset.baseKey = key(which, member.tag);
    item.classList.toggle('is-triple', Number(member.bestStars) === 3);
    item.classList.toggle('is-selected', selected?.side === which && selected?.tag === member.tag);
    const linked = attack && (attack.attackerTag === member.tag || attack.defenderTag === member.tag);
    item.classList.toggle('is-linked', Boolean(linked));
    item.setAttribute('aria-pressed', String(selected?.side === which && selected?.tag === member.tag));
    item.setAttribute('aria-label', tr('baseLabel', {position: number(member.mapPosition), name: member.name || member.tag, stars: stars(member), destruction: number(member.bestDestruction)}));
    item.append(node('span', stars(member), 'war-map-stars'));
    const icon = node('span', '', 'war-map-icon');
    const level = Number(member.townhallLevel);
    if (Number.isInteger(level) && level >= 1 && level <= 18) {
      const image = document.createElement('img'); image.src = `/th-${level}.webp`; image.alt = ''; image.loading = 'lazy';
      image.addEventListener('error', () => { image.remove(); icon.classList.add('no-image'); }); icon.append(image);
    } else icon.classList.add('no-image');
    icon.append(node('span', `TH ${number(member.townhallLevel)}`, 'war-map-th')); item.append(icon);
    item.append(node('strong', `#${number(member.mapPosition)} ${member.name || member.tag || '—'}`));
    item.append(node('small', member.attacksReceived ? tr('receivedSummary', {count: number(member.attacksReceived), destruction: number(member.bestDestruction)}) : tr('untouched')));
    return item;
  }
  function filtered(which) {
    const search = el('warMapSearch').value.trim().toLocaleLowerCase();
    const filter = el('warMapFilter').value, th = el('warMapTownHall').value;
    return rows(which).filter(member => (!search || `${member.name || ''} ${member.tag || ''} ${member.mapPosition || ''}`.toLocaleLowerCase().includes(search))
      && (th === 'all' || String(member.townhallLevel) === th)
      && (filter === 'all' || (filter === 'untouched' && !member.attacksReceived) || (filter === 'cleanup' && member.attacksReceived > 0 && member.bestStars != null && Number(member.bestStars) < 3) || (filter === 'triple' && Number(member.bestStars) === 3)));
  }
  function renderBoards() {
    if (!ready || !data) return;
    const root = el('warMapBoards'); root.replaceChildren();
    const active = side === 'both' && !wide.matches ? (selected?.side || 'home') : side;
    const sides = active === 'both' ? ['home', 'enemy'] : [active];
    root.classList.toggle('both-sides', sides.length === 2);
    document.querySelectorAll('[data-war-side]').forEach(item => {
      item.hidden = item.dataset.warSide === 'both' && !wide.matches;
      item.setAttribute('aria-pressed', String(item.dataset.warSide === active));
    });
    for (const which of sides) {
      const section = node('section', '', 'war-map-side'); section.dataset.side = which;
      const members = filtered(which);
      section.append(node('h4', `${tr(which)} · ${name(which)}`));
      section.append(node('p', tr('visibleCount', {visible: number(members.length), total: number(rows(which).length)}), 'war-map-count'));
      const canvas = node('div', '', 'war-map-canvas'); canvas.setAttribute('role', 'group'); canvas.setAttribute('aria-label', name(which));
      // Three lanes: left → center → right → center → left. Adjacent
      // bases share vertical space while remaining in separate hit areas.
      members.forEach((member, index) => {
        const item = base(which, member);
        item.style.gridColumn = String([1, 2, 3, 2][index % 4]);
        item.style.gridRow = `${index * 2 + 1} / span 4`;
        item.title = `#${number(member.mapPosition)} ${member.name || member.tag || '—'}`;
        canvas.append(item);
      });
      if (!members.length) canvas.append(node('p', tr('empty'), 'war-map-empty'));
      canvas.addEventListener('scroll', drawLine, {passive: true});
      section.append(canvas); root.append(section);
    }
    requestAnimationFrame(drawLine);
  }
  function attackList(member, direction) {
    const section = node('section', '', 'war-map-log');
    section.append(node('h5', tr(direction === 'outgoing' ? 'outgoing' : 'incoming')));
    const list = node('ol'); const incoming = direction === 'incoming';
    const logs = [...(incoming ? member.incomingAttacks || [] : member.attacks || [])].sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
    for (const log of logs) {
      const item = node('li');
      const target = incoming ? log.attackerName || log.attackerTag : log.defenderName || log.defenderTag;
      const position = incoming ? log.attackerPosition : log.defenderPosition;
      const label = `${log.order == null ? '' : `#${number(log.order)} · `}${position == null ? '' : `#${number(position)} `}${target || '—'} · ${number(log.stars)}★ · ${number(log.destructionPercentage)}%`;
      const action = button(label, () => {
        attack = log;
        side = wide.matches ? 'both' : (incoming ? selected.side : selected.side === 'home' ? 'enemy' : 'home');
        renderBoards(); renderDetails();
        el('warMapDetails').querySelector('.war-map-attack[aria-pressed=true]')?.focus({preventScroll: true});
      }, 'war-map-attack');
      action.setAttribute('aria-pressed', String(attack === log));
      item.append(action); list.append(item);
    }
    section.append(list);
    if (!logs.length) section.append(node('p', tr(incoming && member.attacksReceived ? 'logsUnavailable' : 'noAttacks')));
    else if (incoming && member.attacksReceived > logs.length) section.append(node('p', tr('partialLogs', {shown: number(logs.length), total: number(member.attacksReceived)})));
    return section;
  }
  function renderDetails() {
    const root = el('warMapDetails'); root.replaceChildren();
    const member = selected && rows(selected.side).find(item => item.tag === selected.tag);
    if (!member) { root.append(node('p', tr('chooseBase'))); return; }
    const heading = node('div', '', 'war-map-detail-heading');
    heading.append(node('h4', `#${number(member.mapPosition)} ${member.name || member.tag}`));
    heading.append(button('×', () => { selected = null; attack = null; renderBoards(); renderDetails(); }, 'war-map-close'));
    heading.lastChild.setAttribute('aria-label', tr('close'));
    root.append(heading, node('p', `${name(selected.side)} · TH ${number(member.townhallLevel)}`, 'war-map-count'));
    root.append(node('p', tr('baseResult', {stars: stars(member), destruction: member.attacksReceived ? number(member.bestDestruction) : '—'})));
    root.append(node('p', tr('quota', {used: number(member.attacksUsed), remaining: number(member.attacksRemaining)})));
    if (member.tag) {
      const link = node('a', tr('profile')); const params = new URLSearchParams({tag: member.tag.replace(/^#/, ''), lang: window.CocI18n.locale});
      const clanTag = selected.side === 'home' ? data.clan?.tag : data.opponent?.tag;
      if (clanTag) params.set('clan', clanTag.replace(/^#/, ''));
      link.href = `/player.html?${params}`; root.append(link);
    }
    root.append(attackList(member, 'incoming'), attackList(member, 'outgoing'));
  }
  function drawLine() {
    if (!ready) return;
    const root = el('warMapBoards'); root.querySelector('.war-map-link')?.remove();
    if (!attack || !root.classList.contains('both-sides') || view !== 'map' || !root.clientWidth) return;
    const bases = [...root.querySelectorAll('[data-base-key]')];
    const from = bases.find(item => item.dataset.baseKey === key(selected.side === 'home' ? (attack.attackerTag === selected.tag ? 'home' : 'enemy') : (attack.attackerTag === selected.tag ? 'enemy' : 'home'), attack.attackerTag));
    const to = bases.find(item => item !== from && item.dataset.baseKey.endsWith(`:${attack.defenderTag}`));
    if (!from || !to) return;
    const visible = item => { const r = item.getBoundingClientRect(), canvas = item.closest('.war-map-canvas').getBoundingClientRect(); return r.top >= canvas.top && r.bottom <= canvas.bottom; };
    if (!visible(from) || !visible(to)) return;
    const frame = root.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.classList.add('war-map-link'); svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('viewBox', `0 0 ${frame.width} ${frame.height}`);
    const line = document.createElementNS(svg.namespaceURI, 'line');
    for (const [attribute, value] of Object.entries({x1: a.left + a.width / 2 - frame.left, y1: a.top + a.height / 2 - frame.top, x2: b.left + b.width / 2 - frame.left, y2: b.top + b.height / 2 - frame.top})) line.setAttribute(attribute, value);
    const defs = document.createElementNS(svg.namespaceURI, 'defs'), marker = document.createElementNS(svg.namespaceURI, 'marker');
    for (const [attribute, value] of Object.entries({id: 'warMapArrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse'})) marker.setAttribute(attribute, value);
    const arrow = document.createElementNS(svg.namespaceURI, 'path'); arrow.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    marker.append(arrow); defs.append(marker); line.setAttribute('marker-end', 'url(#warMapArrow)');
    svg.append(defs, line); root.append(svg);
  }
  function render(next) {
    data = next;
    if (!ready) return;
    const nextIdentity = JSON.stringify([data?.clan?.tag, data?.opponent?.tag, data?.startTime, data?.round]);
    if (identity !== nextIdentity) { selected = null; attack = null; identity = nextIdentity; }
    else if (attack) { attack = null; } // Refresh replaces log objects; keep the selected base.
    const th = el('warMapTownHall'), value = th.value;
    const levels = [...new Set([...rows('home'), ...rows('enemy')].map(item => item.townhallLevel).filter(Boolean))].sort((a, b) => b - a);
    th.replaceChildren(new Option(tr('allTh'), 'all'), ...levels.map(level => new Option(`TH ${number(level)}`, String(level))));
    th.value = levels.map(String).includes(value) ? value : 'all';
    renderBoards(); renderDetails(); syncView();
  }
  function init() {
    if (!el('warMapView')) return; ready = true;
    document.querySelectorAll('[data-war-view]').forEach(item => item.addEventListener('click', () => {view = item.dataset.warView; syncView();}));
    document.querySelectorAll('[data-war-side]').forEach(item => item.addEventListener('click', () => {side = item.dataset.warSide; renderBoards();}));
    for (const id of ['warMapSearch', 'warMapFilter', 'warMapTownHall']) el(id).addEventListener(id === 'warMapSearch' ? 'input' : 'change', renderBoards);
    wide.addEventListener('change', renderBoards);
    if (window.ResizeObserver) new ResizeObserver(drawLine).observe(el('warMapBoards'));
    if (data) render(data); else {renderDetails(); syncView();}
  }
  window.ClanWarMap = {render};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
