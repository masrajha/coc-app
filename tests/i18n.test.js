const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('public/i18n.js', 'utf8');
const inlineDashboard = fs.readFileSync('public/index.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/);
assert.ok(inlineDashboard, 'Dashboard script is missing');
new vm.Script(inlineDashboard[1], { filename: 'public/index.html' });
const pages = ['public/index.html', 'public/player.html', 'public/compare.html', 'public/compare-clan.html'];
const keys = pages.flatMap(page => [...fs.readFileSync(page, 'utf8').matchAll(/data-i18n(?:-placeholder|-aria-label|-title|-alt)?="([^"]+)"/g)].map(match => match[1]));
const scripts = ['public/index.html', 'public/rankings.js', 'public/player.js', 'public/player-league.js', 'public/compare.js', 'public/donation.js', 'public/raids.js', 'public/clan-compare.js', 'public/clan-labels.js', 'public/account-features.js', 'public/clan-tabs.js'];
const scriptKeys = scripts.flatMap(page => [...fs.readFileSync(page, 'utf8').matchAll(/\btr\(['"]([^'"]+)['"]/g)].map(match => match[1]));
const warMapKeys = [...source.matchAll(/"(warMap\.[^"]+)"\s*:/g)].map(match => match[1]);
const seoKeys = [...fs.readFileSync('src/Seo.php', 'utf8').matchAll(/["'](seo\.[a-zA-Z]+)["']/g)].map(match => match[1]);
const translationKeys = [...new Set([...keys, ...scriptKeys, ...warMapKeys, ...seoKeys])];
const computedKeys = ['theme.label', 'theme.dark', 'theme.light', 'theme.system', 'theme.dark-simple', 'theme.light-simple', ...['wars','cwl','trophies','friendly','games','builder','design','farming','donator','social','talkative','underdog','relaxed','competitive','capital','newbie'].map(key => 'labels.name.' + key), 'compare.quality.rendah', 'compare.quality.cukup', 'compare.quality.baik', 'clan.flag.Donasi nol', 'clan.flag.Trofi 7 hari tidak berubah', 'clan.flag.Donasi 7 hari tidak berubah'];

function createContext(initialLocale, address = 'https://share.example.test/') {
  const storage = new Map(initialLocale ? [['coc-language', initialLocale]] : []);
  let reloads = 0;
  const requests = [];
  const context = {
    Intl,
    URL,
    URLSearchParams,
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
      location: { href: address, search: new URL(address).search, reload: () => { reloads += 1; } },
      history: { replaceState: (_state, _title, next) => { context.window.location.href = String(next); context.window.location.search = new URL(next).search; } }
    },
    CustomEvent: class CustomEvent {}
  };
  vm.runInNewContext(source, context);
  return { context, storage, requests, get reloads() { return reloads; } };
}

const first = createContext();
assert.equal(first.context.window.CocI18n.locale, 'id');
assert.ok(first.context.window.CocI18n.t('brand.disclaimer').includes('Supercell tidak bertanggung jawab'));
assert.equal(createContext('en').context.window.CocI18n.t('brand.policy'), 'Supercell\u2019s Fan Content Policy');
assert.equal(createContext('en').context.window.CocI18n.t('brand.disclaimer'), 'This content is not affiliated with, endorsed, sponsored, or specifically approved by Supercell and Supercell is not responsible for it. For more information see');
const receivedShare = createContext('id', 'https://share.example.test/player.html?tag=28P08PG0G&lang=en&view=army');
assert.equal(receivedShare.context.window.CocI18n.locale, 'en', 'A shared language must override the saved preference.');
receivedShare.context.window.CocI18n.setLocale('id');
assert.equal(new URL(receivedShare.context.window.location.href).searchParams.get('lang'), 'id', 'Changing language must update explicit shared URL language before reloading.');
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
const raidScript = fs.readFileSync('public/raids.js', 'utf8');
const raidDate = raidScript.slice(raidScript.indexOf('  function date('), raidScript.indexOf('  function stateName('));
for (const context of [indonesian.context, english.context]) {
  const formatted = vm.runInNewContext(`${raidDate}; date('20261023T070000.000Z')`, context);
  assert.notEqual(formatted, '—', 'Raid dates must parse the complete Clash timestamp, including hours and minutes');
  assert.match(formatted, /2026/);
}
assert.equal(vm.runInNewContext(`${raidDate}; date(null)`, indonesian.context), '—');
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
const titleCase = createContext('en');
const titleApi = titleCase.context.window.CocI18n;
const titleDocument = titleCase.context.document;
titleApi.setPageTitle('compare', ["O'Connor", 'Amerta Buana']);
assert.equal(titleDocument.title, "Player Comparison: O'Connor vs Amerta Buana - ClanIntel");
// Reapplying static title translations must preserve the resolved player names.
const titleBinding = {dataset:{i18n:'compare.pageTitle'},set textContent(value){titleDocument.title=value;}};
titleDocument.querySelectorAll = selector => selector === '[data-i18n]' ? [titleBinding] : [];
titleApi.apply();
assert.equal(titleDocument.title, "Player Comparison: O'Connor vs Amerta Buana - ClanIntel");
titleApi.setLocale('id');
assert.equal(titleDocument.title, "Perbandingan Pemain: O'Connor vs Amerta Buana - ClanIntel");
titleApi.setPageTitle('compare', ['Amerta Buana']);
assert.equal(titleDocument.title, 'Perbandingan Pemain: Amerta Buana vs Pemain 2 - ClanIntel');
titleApi.setPageTitle('clan', ['ISTIMEWA']);
assert.equal(titleDocument.title, 'Profil Clan: ISTIMEWA - ClanIntel');
titleApi.setPageTitle('compareClan', ['ISTIMEWA', 'Other Clan']);
assert.equal(titleDocument.title, 'Perbandingan Clan: ISTIMEWA vs Other Clan - ClanIntel');
titleApi.setPageTitle('player', ['#28P08PG0G']);
assert.equal(titleDocument.title, 'Profil Pemain: #28P08PG0G - ClanIntel');
titleApi.setPageTitle('player', ["  O'Connor\n Player  "]);
assert.equal(titleDocument.title, "Profil Pemain: O'Connor Player - ClanIntel");
titleApi.setPageTitle('compare');
assert.equal(titleDocument.title, 'Perbandingan Pemain - ClanIntel');
titleApi.setPageTitle('home');
assert.equal(titleDocument.title, 'ClanIntel - Pantau Clan, War & Pemain');
console.log(`i18n tests passed (${keys.length} page bindings, ${scriptKeys.length} script references, contextual titles).`);
