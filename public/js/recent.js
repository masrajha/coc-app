(() => {
  const LIMIT = 5;
  const keys = { clan: 'coc-recent-clans', player: 'coc-recent-players' };

  function read(type) {
    try { const value = JSON.parse(localStorage.getItem(keys[type]) || '[]'); return Array.isArray(value) ? value : []; }
    catch { return []; }
  }

  function save(type, item) {
    if (!item?.tag) return;
    const tag = String(item.tag).replace(/^#/, '').toUpperCase();
    const next = [{ ...item, tag, openedAt: Date.now() }, ...read(type).filter(entry => String(entry.tag).replace(/^#/, '').toUpperCase() !== tag)].slice(0, LIMIT);
    try { localStorage.setItem(keys[type], JSON.stringify(next)); } catch { /* Browser storage is optional. */ }
    window.dispatchEvent(new CustomEvent('coc-recent-updated', { detail: { type } }));
  }

  window.RecentlyOpened = {
    clan: item => save('clan', item),
    player: item => save('player', item),
    list: read
  };
})();
