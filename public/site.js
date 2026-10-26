// Run before styles: choose the page shell without waiting for API data.
(() => {
  const path = location.pathname;
  const query = new URLSearchParams(location.search);
  document.documentElement.dataset.page = path.endsWith('/player.html') ? 'player'
    : path.endsWith('/compare-clan.html') ? 'compare-clan'
    : path.endsWith('/compare.html') ? 'compare'
    : query.get('tag') || query.get('clan') ? 'clan' : 'home';
})();
