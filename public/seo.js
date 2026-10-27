// Localize server summaries to the active app language; never fetch data or hide content.
document.addEventListener('DOMContentLoaded', () => {
  const i18n = window.CocI18n;
  if (i18n) {
    const summary = document.getElementById('savedProfile'); if (summary) summary.lang = i18n.locale;
    document.querySelectorAll('[data-seo-number]').forEach(node => { node.textContent = i18n.number(Number(node.dataset.seoNumber)); });
    document.querySelectorAll('[data-seo-date]').forEach(node => {
      const date = new Date(node.dateTime);
      if (!Number.isNaN(date.getTime())) node.textContent = i18n.dateTime(date, {dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}) + ' UTC';
    });
    document.querySelectorAll('.seo-links a,#savedProfile a').forEach(link => {
      const url = new URL(link.href, location.href);
      if (url.origin === location.origin) { url.searchParams.set('lang', i18n.locale); link.href = url.href; }
    });
  }
  document.querySelectorAll('[data-seo-theme]').forEach(select => {
    select.value = window.CocTheme?.mode || 'dark';
    select.addEventListener('change', () => window.CocTheme?.setMode(select.value));
  });
});
