(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('homeNews');
    const params = new URLSearchParams(location.search);
    if (!root || !['/', '/index.html'].includes(location.pathname) || params.get('tag') || params.get('clan')) return;
    const el = id => document.getElementById(id);
    const tr = key => window.CocI18n.t(key);
    const fallback = '/assets/images/optimized/fortress-backdrop.webp';
    let record = null, requestId = 0, timer;
    root.hidden = false;
    function articleUrl(article) {
      const url = new URL(article.url);
      if (url.protocol !== 'https:' || url.hostname !== 'supercell.com' || url.username || url.password || !url.pathname.startsWith('/en/games/clashofclans/')) throw new Error('Invalid news URL');
      return url;
    }
    function paint() {
      el('homeNewsArchive').href = 'https://supercell.com/en/games/clashofclans/' + (window.CocI18n.locale === 'id' ? 'id/' : '') + 'blog/page/1/';
      if (!record?.article) return;
      const cards = document.createDocumentFragment();
      const articles = Array.isArray(record.articles) && record.articles.length ? record.articles.slice(0, 3) : [record.article];
      for (const article of articles) {
        const url = articleUrl(article);
        const card = document.createElement('article');
        card.className = 'home-news-article';
        const link = document.createElement('a'); link.className = 'home-news-item';
        link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
        const image = document.createElement('img');
        image.width = 480; image.height = 270; image.alt = ''; image.loading = 'lazy'; image.decoding = 'async';
        image.src = /^\/assets\/images\/news\/[a-f0-9]{64}\.(webp|png|jpg)$/.test(article.image || '') ? article.image : fallback;
        image.onerror = () => { image.onerror = null; image.src = fallback; };
        const copy = document.createElement('div'); copy.className = 'home-news-copy';
        const meta = document.createElement('div'); meta.className = 'home-news-meta';
        const source = document.createElement('span');
        source.textContent = tr(article.sourceLanguage === 'id' ? 'news.sourceId' : 'news.sourceEn');
        const time = document.createElement('time'); const date = new Date(article.publishedAt);
        time.dateTime = Number.isNaN(date.getTime()) ? '' : date.toISOString();
        time.textContent = Number.isNaN(date.getTime()) ? '' : window.CocI18n.dateTime(date, {day:'numeric',month:'short',year:'numeric'});
        meta.append(source, time);
        const heading = document.createElement('h3');
        heading.textContent = article.title; heading.lang = article.sourceLanguage;
        copy.append(heading, meta); link.append(image, copy); card.append(link); cards.append(card);
      }
      el('homeNewsCards').replaceChildren(cards);
      el('homeNewsStale').hidden = !record.stale;
      el('homeNewsStatus').hidden = true;
      el('homeNewsCards').hidden = false;
    }
    async function load(retry = false) {
      const id = ++requestId;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 16000);
      clearTimeout(timer);
      try {
        const response = await window.CocI18n.apiFetch('/api/news/latest', {signal:controller.signal});
        const data = await response.json();
        if (id !== requestId) return;
        if (!data.article) {
          if (response.status === 202 && data.retryAfter && !retry) {
            timer = setTimeout(() => load(true), Math.min(30, Math.max(5, data.retryAfter)) * 1000);
            return;
          }
          throw new Error('News unavailable');
        }
        for (const article of (Array.isArray(data.articles) && data.articles.length ? data.articles : [data.article])) articleUrl(article);
        record = data;
        paint();
      } catch {
        if (id !== requestId) return;
        if (record?.article) { record.stale = true; paint(); return; }
        const status = el('homeNewsStatus');
        status.classList.remove('loading-state');
        status.textContent = tr('news.unavailable');
      } finally { clearTimeout(timeout); }
    }
    paint();
    load();
    window.addEventListener('coc-language-changed', () => {
      if (record?.article) paint();
      load();
    });
  });
})();
