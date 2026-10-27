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
  const feedbackTimers = new WeakMap();
  function resetCopy(button, status) {
    clearTimeout(feedbackTimers.get(button));
    button.classList.remove('is-copied','is-copy-error');
    const label=button.querySelector('.copy-link-label') || button;
    label.textContent=window.CocI18n.t(label.dataset.i18n || 'player.copyLink');
    if(status)status.textContent='';
  }
  async function copyLink(button, status) {
    let copied=false;
    try { await navigator.clipboard.writeText(url()); copied=true; }
    catch {
      const input=document.createElement('textarea');input.value=url();input.style.position='fixed';input.style.opacity='0';
      document.body.append(input);input.select();
      try { copied=document.execCommand('copy'); } catch { copied=false; }
      input.remove();button.focus({preventScroll:true});
    }
    clearTimeout(feedbackTimers.get(button));
    if(!copied){
      button.classList.remove('is-copied');button.classList.add('is-copy-error');
      (button.querySelector('.copy-link-label') || button).textContent=window.CocI18n.t('compare.copyFailed');
      if(status)status.textContent=window.CocI18n.t('compare.copyFailed');
      feedbackTimers.set(button,setTimeout(()=>resetCopy(button,status),2500));return false;
    }
    button.classList.remove('is-copy-error');
    button.classList.add('is-copied');
    (button.querySelector('.copy-link-label') || button).textContent=window.CocI18n.t('compare.linkCopied');
    if(status)status.textContent=window.CocI18n.t('compare.linkCopied');
    feedbackTimers.set(button,setTimeout(()=>resetCopy(button,status),2500));
    return true;
  }
  window.CocShare = {url,copyLink,resetCopy};
})();
