const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const app = require('../server');

test('profil memuat level semua kelompok Army dan halaman pemain terpisah', async () => {
    const original = axios.get;
    axios.get = async () => ({ data: {
        tag: '#2GPP802UU', name: 'Pemain', townHallLevel: 18, builderHallLevel: 10,
        heroes: [{ name: 'Barbarian King', level: 110, maxLevel: 110, village: 'home' }, { name: 'Battle Machine', level: 35, village: 'builderBase' }],
        heroEquipment: [
            { name: 'Rage Vial', level: 18, maxLevel: 18 },
            { name: 'Snake Bracelet', level: 18 }, { name: 'Action Figure', level: 18 },
            { name: 'Monolith Arrow', level: 18 }, { name: 'Heroic Torch', level: 18 },
            { name: 'Meteor Staff', level: 18 }, { name: 'Frost Flake', level: 18 },
            { name: 'Rocket Backpack', level: 18 }, { name: 'Revenge Deck', level: 18 },
            { name: 'Item Baru', level: 1 }
        ],
        troops: [{ name: 'Barbarian', level: 14 }, { name: 'Super Barbarian', level: 14 }, { name: 'Unicorn', level: 15 }, { name: 'Raged Barbarian', level: 18, village: 'builderBase' }],
        spells: [{ name: 'Rage Spell', level: 6 }]
    } });
    const server = app.listen(0);
    try {
        const base = `http://127.0.0.1:${server.address().port}`;
        const response = await fetch(`${base}/api/player/2GPP802UU/profile`);
        assert.equal(response.status, 200);
        const profile = await response.json();
        assert.equal(profile.army.heroes[0].level, 110);
        assert.equal(profile.army.heroEquipment[0].equipmentHero, 'Barbarian King');
        assert.deepEqual(profile.army.heroEquipment.slice(1, 9).map(item => item.equipmentHero),
            ['Barbarian King', 'Archer Queen', 'Archer Queen', 'Grand Warden', 'Minion Prince', 'Royal Champion', 'Dragon Duke', 'Dragon Duke']);
        assert.equal(profile.army.heroEquipment[9].equipmentHero, null);
        assert.equal(profile.army.pets[0].name, 'Unicorn');
        assert.equal(profile.army.troops[0].name, 'Barbarian');
        assert.equal(profile.army.superTroops[0].name, 'Super Barbarian');
        assert.equal(profile.army.builderBase.length, 2);
        assert.equal(profile.army.spells[0].level, 6);
        assert.equal(profile.progress.tableExactMatch, true);
        assert.equal(profile.progress.complete, false);
        assert.equal((await fetch(`${base}/player.html`)).status, 200);
        assert.equal((await fetch(`${base}/api/player/invalid/profile`)).status, 400);
    } finally {
        server.close();
        axios.get = original;
    }
});

test('ikon wiki diproksikan sebagai gambar dan disimpan dalam cache', async () => {
    const original = axios.get;
    let calls = 0;
    axios.get = async url => {
        calls += 1;
        assert.match(url, /static\.wikia\.nocookie\.net/);
        return { data: Buffer.from([137, 80, 78, 71]), headers: { 'content-type': 'image/png' } };
    };
    const server = app.listen(0);
    try {
        const base = `http://127.0.0.1:${server.address().port}`;
        const url = `${base}/api/player-icon?name=Royal%20Champion&section=heroes`;
        const [first, second] = await Promise.all([fetch(url), fetch(url)]);
        assert.equal(first.status, 200);
        assert.equal(second.status, 200);
        assert.match(first.headers.get('content-type'), /image\/png/);
        assert.equal(calls, 1);
        assert.equal((await fetch(`${base}/api/player-icon?name=https://other.site&section=heroes`)).status, 400);
    } finally {
        server.close();
        axios.get = original;
    }
});

test('ikon Hero Equipment mencari berkas dengan nama item', async () => {
    const original = axios.get;
    const requested = [];
    axios.get = async (url, options) => {
        requested.push({ url, options });
        if (url.endsWith('/api.php')) {
            return { data: { query: { pages: [
                { title: 'File:Rage Vial.png', imageinfo: [{ url: 'https://static.wikia.nocookie.net/clashofclans/images/example/Rage_Vial.png' }] }
            ] } } };
        }
        return { data: Buffer.from([137, 80, 78, 71]), headers: { 'content-type': 'image/png' } };
    };
    const server = app.listen(0);
    try {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/player-icon?name=Rage%20Vial&section=heroEquipment`);
        assert.equal(response.status, 200);
        assert.match(requested[0].options.params.titles, /File:Rage_Vial\.png/);
        assert.equal(requested.length, 2);
    } finally {
        server.close();
        axios.get = original;
    }
});

test('Barbarian Puppet memakai URL gambar yang diberikan', async () => {
    const original = axios.get;
    const urls = [];
    axios.get = async url => {
        urls.push(url);
        return { data: Buffer.from([137, 80, 78, 71]), headers: { 'content-type': 'image/png' } };
    };
    const server = app.listen(0);
    try {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/player-icon?name=Barbarian%20Puppet&section=heroEquipment`);
        assert.equal(response.status, 200);
        assert.equal(urls.length, 1);
        assert.match(urls[0], /\/9\/96\/Barbarian_Puppet\.png/);
    } finally {
        server.close();
        axios.get = original;
    }
});

test('ikon equipment memakai jalur gambar statis bila API wiki gagal', async () => {
    const original = axios.get;
    const urls = [];
    axios.get = async url => {
        urls.push(url);
        if (url.endsWith('/api.php')) throw new Error('Wiki API tidak tersedia');
        return { data: Buffer.from([137, 80, 78, 71]), headers: { 'content-type': 'image/png' } };
    };
    const server = app.listen(0);
    try {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/player-icon?name=Rage%20Gem&section=heroEquipment`);
        assert.equal(response.status, 200);
        assert.match(urls[1], /static\.wikia\.nocookie\.net\/clashofclans\/images\/[a-f0-9]\/\w\w\/Rage_Gem\.png/);
    } finally {
        server.close();
        axios.get = original;
    }
});

test('rushed TH18 hanya dinilai saat batas item dari API cukup lengkap', async () => {
    const original = axios.get;
    const items = (prefix, count) => Array.from({ length: count }, (_, index) => ({ name: `${prefix} ${index}`, level: 3, maxLevel: 10, village: 'home' }));
    axios.get = async () => ({ data: {
        tag: '#2R92VJG0U', name: 'Tester', townHallLevel: 18, builderHallLevel: 10,
        heroes: items('Hero', 5), troops: items('Troop', 20), spells: items('Spell', 12), heroPets: items('Pet', 10)
    } });
    const server = app.listen(0);
    try {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/player/2R92VJG0U/progress`);
        const data = await response.json();
        assert.equal(data.complete, true);
        assert.equal(data.score.overall, 30);
        assert.equal(data.rushed.rushed, true);
        assert.ok(data.priorities.length > 0);
    } finally {
        server.close();
        axios.get = original;
    }
});
