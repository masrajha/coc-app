(() => {
  const root = document.getElementById('clanResult');
  const navigation = document.getElementById('clanSectionNav');
  if (!root || !navigation) return;
  const tabs = [...navigation.querySelectorAll('[data-clan-tab]')];
  const panels = [...root.querySelectorAll('.clan-tab-panel')];
  let active = 'overview';
  function targetForHash() {
    try { return document.getElementById(decodeURIComponent(location.hash.slice(1))); }
    catch { return null; }
  }
  function openDetails(target) {
    for (let parent = target; parent && parent !== root; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS') parent.open = true;
    }
  }
  function activate(id, scroll = false, target = null) {
    if (!panels.some(panel => panel.id === id)) id = 'overview';
    active = id;
    panels.forEach(panel => { panel.hidden = panel.id !== id; });
    tabs.forEach(tab => {
      const selected = tab.dataset.clanTab === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected) tab.setAttribute('aria-current', 'page'); else tab.removeAttribute('aria-current');
    });
    if (target) openDetails(target);
    window.dispatchEvent(new CustomEvent('clan-tab-change', {detail: {tab: id}}));
    if (scroll) requestAnimationFrame(() => (target || navigation).scrollIntoView({block: 'start', behavior: 'auto'}));
  }
  function activateFromHash(scroll = false) {
    const target = targetForHash();
    const panel = target?.closest('.clan-tab-panel');
    activate(panel?.id || 'overview', scroll, target && panel ? target : null);
  }
  function reveal(id) {
    const target = document.getElementById(id);
    if (!target?.closest('.clan-tab-panel')) return;
    history.pushState(null, '', '#' + encodeURIComponent(id));
    activateFromHash(true);
  }
  root.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    let target; try { target = document.getElementById(decodeURIComponent(link.hash.slice(1))); } catch { return; }
    if (!target?.closest('.clan-tab-panel')) return;
    event.preventDefault(); reveal(target.id);
  });
  navigation.addEventListener('keydown', event => {
    const tab = event.target.closest('[data-clan-tab]'); if (!tab) return;
    const index = tabs.indexOf(tab); let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault(); reveal(tabs[next].dataset.clanTab); tabs[next].focus();
  });
  window.addEventListener('hashchange', () => activateFromHash(false));
  window.addEventListener('popstate', () => activateFromHash(false));
  window.ClanTabs = {activateFromHash, reveal, get active() { return active; }};
  activateFromHash(false);
})();
