const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const model = require('../public/compare-model');

function profile(tag, th, complete = true) {
  return { player: { tag, townHallLevel: th }, progress: {
    complete, tableVersion: 'v1', baselineSource: 'API',
    score: { categories: { heroes: { percent: 80, knownItems: 1, expectedItems: 1 } } }
  }, army: { heroes: [], heroEquipment: [] } };
}

test('skor hanya dibandingkan ketika dua pemain dan baseline benar-benar sebanding', () => {
  const left = profile('#2R92VJG0U', 18);
  const right = profile('#2GPP802UU', 18);
  assert.equal(model.comparableProgress(left, right), true);
  assert.equal(model.comparableProgress(left, profile('#2GPP802UU', 17)), false);
  assert.equal(model.comparableProgress(left, profile('#2GPP802UU', 18, false)), false);
  assert.equal(model.comparableProgress(left, profile('#2R92VJG0U', 18)), false);
  assert.equal(model.comparableProgress(left, null), false);
});

test('matriks Army menyatukan item yang sama dan mempertahankan item yang tidak ada di salah satu sisi', () => {
  const left = profile('#2R92VJG0U', 18);
  const right = profile('#2GPP802UU', 18);
  left.army.heroes = [{ name: 'Barbarian King', level: 100 }];
  right.army.heroes = [{ name: 'Barbarian King', level: 110 }, { name: 'Archer Queen', level: 110 }];
  left.army.heroEquipment = [{ name: 'Rage Vial', equipmentHero: 'Barbarian King', level: 18 }];
  right.army.heroEquipment = [{ name: 'Rage Vial', equipmentHero: 'Barbarian King', level: 15 }];
  const rows = model.armyRows(left, right);
  const heroes = rows.find(section => section.key === 'heroes').rows;
  assert.equal(heroes.length, 2);
  assert.equal(heroes.find(item => item.name === 'Archer Queen').left, null);
  assert.equal(heroes.find(item => item.name === 'Barbarian King').right.level, 110);
  assert.equal(rows.find(section => section.key === 'heroEquipment').rows[0].equipmentHero, 'Barbarian King');
  assert.equal(model.categoryRows(left, null)[0].right, undefined);
});

test('selisih level hanya memakai item dan batas API yang sebanding', () => {
  const left = profile('#2R92VJG0U', 18);
  const right = profile('#2GPP802UU', 18);
  left.army.heroes = [{ name: 'Barbarian King', level: 90, maxLevel: 110 }, { name: 'Archer Queen', level: 80, maxLevel: null }];
  right.army.heroes = [{ name: 'Barbarian King', level: 110, maxLevel: 110 }, { name: 'Archer Queen', level: 110, maxLevel: null }];
  assert.deepEqual(model.levelDifferences(left, right).map(item => [item.name, item.difference]), [['Barbarian King', 20]]);
  right.player.townHallLevel = 17;
  assert.deepEqual(model.levelDifferences(left, right), []);
});

test('penanda item membedakan level unggul, setara, dan tidak tersedia', () => {
  assert.deepEqual(model.itemLevelMark({ level: 110 }, { level: 100 }), { left: 'higher', right: 'lower' });
  assert.deepEqual(model.itemLevelMark({ level: 18 }, { level: 18 }), { left: 'equal', right: 'equal' });
  assert.deepEqual(model.itemLevelMark(null, { level: 18 }), { left: 'none', right: 'none' });
});

test('war CWL dan klasik dipisah menurut periode, roster, dan kuota yang selesai', () => {
  const current = '20261005T120000.000Z';
  const old = '20260801T120000.000Z';
  const left = { wars: [
    { id: 'cwl-1', type: 'CWL', round: 1, state: 'warEnded', startTime: current, quota: 1, attacks: [{ stars: 3, destructionPercentage: 100 }], stars: 3 },
    { id: 'classic', type: 'War', state: 'warEnded', startTime: old, quota: 2, attacks: [{ stars: 2, destructionPercentage: 80 }], stars: 2 }
  ] };
  const right = { wars: [
    { id: 'cwl-1', type: 'CWL', round: 1, state: 'warEnded', startTime: current, quota: 1, attacks: [], stars: 0 }
  ] };
  const now = new Date('2026-10-06T00:00:00Z');
  const rows = model.combineWars(left, right, 'cwl-current', now);
  assert.equal(rows.length, 1);
  assert.equal(model.warSummary(rows, 'left', 'CWL').starsPerAttack, 3);
  assert.equal(model.warSummary(rows, 'right', 'CWL').missedQuota, 1);
  assert.equal(model.warSummary(rows, 'left', 'War').attacks, 0);
  assert.equal(model.combineWars(left, right, 'all', now).length, 2);
  assert.equal(model.combineWars(left, right, '30d', now).length, 1);
  assert.equal(model.combineWars(left, right, '90d', now).length, 2);
  assert.equal(model.warStatus(null), 'notRoster');
  assert.equal(model.warStatus(right.wars[0]), 'missed');
  assert.equal(model.warStatus({ state: 'inWar', quota: 1, attacks: [] }), 'pending');
  assert.equal(model.warStatus(left.wars[1]), 'partialMissed');
});

test('tren memakai tanggal bersama dan reset donasi tidak menjadi delta negatif', () => {
  const left = { trend: [
    { date: '2026-10-03', trophies: 500, donations: 1500 },
    { date: '2026-10-04', trophies: 550, donations: 100 },
    { date: '2026-10-05', trophies: 560, donations: 130 }
  ] };
  const right = { trend: [
    { date: '2026-10-04', trophies: 600, donations: 200 },
    { date: '2026-10-05', trophies: 620, donations: 240 }
  ] };
  const points = model.sharedSnapshots(left, right);
  assert.deepEqual(points.map(point => point.date), ['2026-10-04', '2026-10-05']);
  assert.deepEqual(model.donationChanges(points, 'left').map(point => point.delta), [null, 30]);
  assert.deepEqual(model.donationChanges(points, 'right').map(point => point.delta), [null, 40]);
  right.trend.unshift({ date: '2026-10-03', trophies: 590, donations: 210 });
  const full = model.sharedSnapshots(left, right);
  assert.equal(model.donationChanges(full, 'left')[1].reset, true);
  assert.equal(model.donationChanges(full, 'left')[1].delta, null);
});

test('resume menyebut batas data dan tidak mengubah arsip gagal menjadi nol serangan', () => {
  const left = profile('#2R92VJG0U', 18, false);
  const right = profile('#2GPP802UU', 17, false);
  left.player.name = 'Pemain A';
  right.player.name = 'Pemain B';
  const rows = [{ type: 'CWL', left: { attacks: [{ stars: 3, destructionPercentage: 100 }], quota: 1, state: 'warEnded' }, right: null }];
  const lines = model.resume(left, right, rows, [], { left: true, right: false });
  assert.ok(lines.some(line => line.includes('arsip belum tersedia')));
  assert.ok(lines.some(line => line.includes('TH berbeda') || line.includes('Town Hall berbeda')));
  assert.ok(lines.some(line => line.includes('Sampel serangan terbatas')));
});

test('halaman perbandingan dan profil tetap ada di frontend PHP', () => {
  const publicDir = path.join(__dirname, '..', 'public');
  const html = fs.readFileSync(path.join(publicDir, 'compare.html'), 'utf8');
  const profile = fs.readFileSync(path.join(publicDir, 'player.html'), 'utf8');
  const home = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /id="player1"/);
  assert.match(html, /id="player2"/);
  assert.match(html, /compare-model\.js/);
  assert.match(html, /data-tab="war"/);
  assert.match(html, /data-tab="activity"/);
  assert.match(html, /id="comparisonResume"/);
  assert.ok(fs.existsSync(path.join(publicDir, 'compare.js')));
  assert.match(profile, /id="compareLink"/);
  assert.match(home, /id="comparePlayersLink"/);
});
