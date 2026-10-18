const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('public/i18n.js', 'utf8');
const inlineDashboard = fs.readFileSync('public/index.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/);
assert.ok(inlineDashboard, 'Dashboard script is missing');
new vm.Script(inlineDashboard[1], { filename: 'public/index.html' });
const pages = ['public/index.html', 'public/player.html', 'public/compare.html'];
const keys = pages.flatMap(page => [...fs.readFileSync(page, 'utf8').matchAll(/data-i18n(?:-placeholder|-aria-label|-title|-alt)?="([^"]+)"/g)].map(match => match[1]));
const scripts = ['public/index.html', 'public/rankings.js', 'public/player.js', 'public/player-league.js', 'public/compare.js', 'public/donation.js'];
const scriptKeys = scripts.flatMap(page => [...fs.readFileSync(page, 'utf8').matchAll(/\btr\(['"]([^'"]+)['"]/g)].map(match => match[1]));
const translationKeys = [...new Set([...keys, ...scriptKeys])];
const computedKeys = ['compare.quality.rendah', 'compare.quality.cukup', 'compare.quality.baik', 'clan.flag.Donasi nol', 'clan.flag.Trofi 7 hari tidak berubah', 'clan.flag.Donasi 7 hari tidak berubah'];

function createContext(initialLocale) {
  const storage = new Map(initialLocale ? [['coc-language', initialLocale]] : []);
  let reloads = 0;
  const requests = [];
  const context = {
    Intl,
    fetch: (url, options) => { requests.push({ url, options }); return Promise.resolve({ ok: true }); },
    localStorage: {
      getItem: key => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value)
    },
    document: {
      documentElement: { lang: 'id' },
      addEventListener() {},
      querySelectorAll: () => []
    },
    window: {
      dispatchEvent() {},
      location: { reload: () => { reloads += 1; } }
    },
    CustomEvent: class CustomEvent {}
  };
  vm.runInNewContext(source, context);
  return { context, storage, requests, get reloads() { return reloads; } };
}

const first = createContext();
assert.equal(first.context.window.CocI18n.locale, 'id');
assert.equal(first.context.document.documentElement.lang, 'id');
assert.equal(first.context.window.CocI18n.number(1234.5), '1.234,5');
assert.equal(first.context.window.CocI18n.dateTime(new Date('2026-10-18T00:00:00Z'), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }), '18 Oktober 2026');
assert.equal(first.context.window.CocI18n.apiUrl('/api/clan/ABC'), '/api/clan/ABC?lang=id');
first.context.window.CocI18n.apiFetch('/api/clan/ABC');
assert.equal(first.requests[0].url, '/api/clan/ABC?lang=id');
for (const key of [...translationKeys, ...computedKeys]) assert.ok(first.context.window.CocI18n.hasTranslation(key, 'id'), `Missing Indonesian translation: ${key}`);
first.context.window.CocI18n.setLocale('en');
assert.equal(first.storage.get('coc-language'), 'en');
assert.equal(first.context.document.documentElement.lang, 'en');
assert.equal(first.reloads, 1);

const english = createContext('en');
assert.equal(english.context.window.CocI18n.t('player.noClan'), 'No clan');
assert.equal(english.context.window.CocI18n.number(1234.5), '1,234.5');
assert.equal(english.context.window.CocI18n.dateTime(new Date('2026-10-18T00:00:00Z'), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }), 'October 18, 2026');
assert.equal(english.context.window.CocI18n.apiUrl('/api/clan/ABC/war?round=2'), '/api/clan/ABC/war?round=2&lang=en');
english.context.window.CocI18n.apiFetch('/api/clan/ABC/war?round=2');
assert.equal(english.requests[0].url, '/api/clan/ABC/war?round=2&lang=en');
const indonesian = createContext('id');
for (const key of ['home.noClans', 'home.noPlayers', 'clan.loading', 'clan.loadingWar', 'player.noWars', 'compare.enterA']) {
  assert.notEqual(indonesian.context.window.CocI18n.t(key), english.context.window.CocI18n.t(key), `The empty/loading state must be translated: ${key}`);
}
for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  assert.match(html, /<html lang="id">/, `${page}: missing initial document language`);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1(?:\.0)?">/, `${page}: missing mobile viewport`);
  assert.match(html, /data-language-switch/, `${page}: missing language switch`);
}
for (const file of ['public/index.css', 'public/player.css', 'public/compare.css']) {
  const css = fs.readFileSync(file, 'utf8');
  assert.match(css, /\.loading-spinner\s*\{[^}]*animation:/, `${file}: loading animation missing`);
  assert.doesNotMatch(css, /\\n\+\.loading-state/, `${file}: invalid loading CSS`);
}
for (const key of [...translationKeys, ...computedKeys]) {
  assert.ok(english.context.window.CocI18n.hasTranslation(key, 'en'), `Missing English translation: ${key}`);
}
console.log(`i18n tests passed (${keys.length} page bindings, ${scriptKeys.length} script references).`);
