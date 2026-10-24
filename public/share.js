(() => {
  function url(input = location.href) {
    const result = new URL(input, location.href);
    result.searchParams.set('lang', window.CocI18n.locale);
    const aliases = {'clan-overview':'overview','clan-activity':'members','clan-war':'war-cwl','war-roster':'war-cwl','cwl-standings':'war-cwl','clan-performance':'war-cwl','matchup-map':'war-cwl','clan-capital':'capital','clan-war-log':'history','clan-actions':'history','war':'war-cwl','league':'ranked-league'};
    const path = result.pathname;
    const clan = path.endsWith('/clan.html') || (['/', '/index.html'].includes(path) && (result.searchParams.has('clan') || result.searchParams.has('tag')));
    const views = clan ? ['overview','members','war-cwl','capital','history'] : path.endsWith('/player.html') ? ['army','progress','performance','ranked-battles','capital-raids','achievements'] : path.endsWith('/compare.html') ? ['progress','army','war-cwl','ranked-league','activity'] : ['overview'];
    let hash = ''; try { hash = decodeURIComponent(result.hash.slice(1)); } catch { /* Ignore invalid fragments. */ }
    const requested = aliases[hash] || hash || result.searchParams.get('view');
    result.searchParams.set('view', views.includes(requested) ? requested : views[0]);
    if (result.searchParams.get('view') === 'ranked-battles') {
      const session = document.getElementById('rankedBattleSession')?.value || result.searchParams.get('session');
      if (['current','previous'].includes(session)) result.searchParams.set('session', session);
    }
    if (clan && ['/', '/index.html'].includes(path)) {
      result.pathname = '/clan.html';
      if (!result.searchParams.has('tag') && result.searchParams.has('clan')) result.searchParams.set('tag', result.searchParams.get('clan'));
      result.searchParams.delete('clan');
    }
    result.hash = '';
    return result.toString();
  }
  window.CocShare = {url};
})();
