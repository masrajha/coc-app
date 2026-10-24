const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('public/share.js', 'utf8');
function shared(address, language = 'en', session) {
  const context = {URL, location: new URL(address), window: {CocI18n: {locale: language}}, document: {getElementById: () => session ? {value: session} : null}};
  vm.runInNewContext(source, context);
  return new URL(context.window.CocShare.url());
}
let url = shared('https://share.example.test/player.html?tag=28P08PG0G#ranked-battles', 'id', 'previous');
assert.equal(url.searchParams.get('lang'), 'id');
assert.equal(url.searchParams.get('view'), 'ranked-battles');
assert.equal(url.searchParams.get('session'), 'previous');
assert.equal(url.hash, '');
url = shared('https://share.example.test/?clan=2GPP802UU#war-roster');
assert.equal(url.pathname, '/clan.html');
assert.equal(url.searchParams.get('tag'), '2GPP802UU');
assert.equal(url.searchParams.has('clan'), false);
assert.equal(url.searchParams.get('view'), 'war-cwl');
url = shared('https://share.example.test/compare.html?player1=28P08PG0G&player2=PJ20G29L#ranked-league');
assert.equal(url.searchParams.get('view'), 'ranked-league');
assert.equal(url.searchParams.get('player2'), 'PJ20G29L');
url = shared('https://share.example.test/compare-clan.html?clan1=2GPP802UU&clan2=9RU089PG');
assert.equal(url.searchParams.get('clan2'), '9RU089PG');
url = shared('https://share.example.test/player.html?tag=28P08PG0G&view=achievements');
assert.equal(url.searchParams.get('view'), 'achievements');
url = shared('https://share.example.test/player.html?tag=28P08PG0G#%invalid');
assert.equal(url.searchParams.get('view'), 'army');
for (const page of ['index', 'player', 'compare', 'compare-clan']) {
  assert.match(fs.readFileSync(`public/${page}.html`, 'utf8'), /src="\/share\.js"/, `${page}: missing share helper`);
}
console.log('Share URL tests passed: language, view, legacy clan links, session and comparisons.');
