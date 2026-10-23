(() => {
  const storageKey = 'coc-theme';
  const valid = value => ['dark', 'light', 'system'].includes(value);
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  let mode = 'dark';
  try { const saved = localStorage.getItem(storageKey); if (valid(saved)) mode = saved; } catch { /* The current page still supports themes without storage. */ }
  function apply() {
    const theme = mode === 'system' ? (media.matches ? 'dark' : 'light') : mode;
    root.dataset.theme = theme;
    root.dataset.themeMode = mode;
    root.style.colorScheme = theme;
    document.querySelectorAll('[data-theme-switch]').forEach(select => { select.value = mode; });
    window.dispatchEvent(new CustomEvent('coc-theme-changed', {detail: {mode, theme}}));
  }
  function setMode(next) {
    if (!valid(next)) return;
    mode = next;
    try { localStorage.setItem(storageKey, mode); } catch { /* Keep the selection in memory. */ }
    apply();
  }
  apply();
  const systemChanged = () => { if (mode === 'system') apply(); };
  if (media.addEventListener) media.addEventListener('change', systemChanged);
  else media.addListener(systemChanged);
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    mode = valid(event.newValue) ? event.newValue : 'dark'; apply();
  });
  window.CocTheme = {setMode, get mode() { return mode; }, get theme() { return root.dataset.theme; }};
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-language-switch]').forEach(language => {
      const languageLabel = language.closest('label'); if (!languageLabel) return;
      const group = document.createElement('div'); group.className = 'appearance-controls';
      languageLabel.parentNode.insertBefore(group, languageLabel); group.append(languageLabel);
      const label = document.createElement('label'); label.className = 'theme-control';
      const text = document.createElement('span'); text.dataset.i18n = 'theme.label'; text.textContent = 'Tema';
      const select = document.createElement('select'); select.dataset.themeSwitch = ''; select.dataset.i18nAriaLabel = 'theme.label'; select.setAttribute('aria-label', 'Tema');
      for (const value of ['dark', 'light', 'system']) {
        const option = document.createElement('option'); option.value = value; option.dataset.i18n = 'theme.' + value; option.textContent = value; select.append(option);
      }
      select.value = mode; select.addEventListener('change', () => setMode(select.value));
      label.append(text, select); group.append(label); window.CocI18n?.apply(group);
    });
  });
})();
