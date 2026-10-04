const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const originalGet = axios.get;
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'coc-tracker-test-'));
let calls = 0;
axios.get = async () => {
    calls += 1;
    return { data: {
        state: 'inWar', teamSize: 2, attacksPerMember: 2,
        clan: {
            name: 'Home', stars: 3, destructionPercentage: 70,
            members: [
                { tag: '#AAA', name: 'One', mapPosition: 2, townhallLevel: 14, attacks: [{ stars: 3, destructionPercentage: 99 }] },
                { tag: '#BBB', name: 'Two', mapPosition: 1, townhallLevel: 15 }
            ]
        },
        opponent: { name: 'Away', stars: 2, destructionPercentage: 60 }
    } };
};

const app = require('../server');

test('papan skor menghitung sisa serangan dan memakai cache', async () => {
    const server = app.listen(0);
    try {
        const base = `http://127.0.0.1:${server.address().port}`;
        const [first, second] = await Promise.all([
            fetch(`${base}/api/clan/2Q2Y/war`),
            fetch(`${base}/api/clan/2Q2Y/war`)
        ]);
        assert.equal(first.status, 200);
        assert.equal(second.status, 200);
        const data = await first.json();
        assert.equal(data.attacksUsed, 1);
        assert.equal(data.attacksRemaining, 3);
        assert.equal(data.members[0].name, 'Two');
        assert.equal(data.members[1].starsEarned, 3);
        assert.equal(data.members[1].destructionAverage, 99);
        assert.equal(data.clan.stars, 3);
        assert.ok(data.lastUpdated);
        assert.equal(calls, 1);
        assert.equal((await fetch(`${base}/api/clan/INVALID/war`)).status, 400);
    } finally {
        server.close();
        axios.get = originalGet;
    }
});

test('navigasi putaran CWL tersedia saat currentwar sudah berisi perang liga', async () => {
    const clanTag = '2GPP802UQ';
    axios.get = async url => {
        if (url.endsWith('/currentwar')) return { data: {
            state: 'inWar', isLeagueEntry: true, teamSize: 1,
            clan: { tag: `#${clanTag}`, name: 'Klan', stars: 3, members: [] },
            opponent: { tag: '#OTHER', name: 'Musuh', members: [] }
        } };
        if (url.endsWith('/leaguegroup')) return { data: {
            state: 'inWar', rounds: [{ warTags: ['#UVROUND1'] }, { warTags: ['#UVROUND2'] }]
        } };
        const first = url.endsWith('%23UVROUND1');
        return { data: {
            state: first ? 'inWar' : 'preparation', teamSize: 1,
            clan: { tag: `#${clanTag}`, name: 'Klan', stars: first ? 3 : 0, members: [] },
            opponent: { tag: '#OTHER', name: 'Musuh', members: [] }
        } };
    };
    const server = app.listen(0);
    try {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/clan/${clanTag}/war`);
        assert.equal(response.status, 200);
        const data = await response.json();
        assert.equal(data.type, 'CWL');
        assert.equal(data.round, 1);
        assert.deepEqual(data.availableRounds, [1, 2]);
    } finally {
        server.close();
        axios.get = originalGet;
    }
});

test('CWL ditemukan saat currentwar menyatakan notInWar dan klan ada di sisi opponent', async () => {
    const requested = [];
    axios.get = async url => {
        requested.push(url);
        if (url.endsWith('/currentwar')) return { data: { state: 'notInWar' } };
        if (url.endsWith('/leaguegroup')) return { data: {
            state: 'inWar', rounds: [{ warTags: ['#0'] }, { warTags: ['#WAR1', '#WAR2'] }]
        } };
        if (url.endsWith('%23WAR1')) return { data: {
            state: 'inWar', clan: { tag: '#OTHER' }, opponent: { tag: '#SOME' }
        } };
        return { data: {
            state: 'inWar', teamSize: 1,
            clan: { tag: '#OTHER', name: 'Musuh', stars: 1, members: [] },
            opponent: { tag: '#2GPP802UU', name: 'Klan saya', stars: 3,
                members: [{ name: 'Penyerang', mapPosition: 1, attacks: [] }] }
        } };
    };
    const server = app.listen(0);
    try {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/clan/2GPP802UU/war`);
        assert.equal(response.status, 200);
        const data = await response.json();
        assert.equal(data.type, 'CWL');
        assert.equal(data.round, 2);
        assert.equal(data.clan.name, 'Klan saya');
        assert.equal(data.attacksRemaining, 1);
        assert.equal(data.state, 'inWar');
        assert.equal(requested.length, 4);
    } finally {
        server.close();
        axios.get = originalGet;
    }
});

test('putaran aktif didahulukan dari persiapan dan putaran dapat dipilih', async () => {
    const clanTag = '2GPP802UV';
    axios.get = async url => {
        if (url.endsWith('/currentwar')) return { data: { state: 'notInWar' } };
        if (url.endsWith('/leaguegroup')) return { data: {
            state: 'inWar', rounds: [{ warTags: ['#ROUND1'] }, { warTags: ['#ROUND2'] }]
        } };
        const first = url.endsWith('%23ROUND1');
        return { data: {
            state: first ? 'inWar' : 'preparation', teamSize: 1,
            clan: { tag: `#${clanTag}`, name: 'Klan', stars: first ? 2 : 0, members: [] },
            opponent: { tag: '#OTHER', name: 'Musuh', members: [] }
        } };
    };
    const server = app.listen(0);
    try {
        const base = `http://127.0.0.1:${server.address().port}/api/clan/${clanTag}/war`;
        const active = await (await fetch(base)).json();
        assert.equal(active.round, 1);
        assert.equal(active.state, 'inWar');
        assert.deepEqual(active.availableRounds, [1, 2]);
        const next = await (await fetch(`${base}?round=2`)).json();
        assert.equal(next.round, 2);
        assert.equal(next.state, 'preparation');
        assert.equal((await fetch(`${base}?round=3`)).status, 400);
    } finally {
        server.close();
        axios.get = originalGet;
    }
});

test('snapshot harian menghasilkan health report dan CSV', async () => {
    const clanTag = '2GPP802UY';
    axios.get = async () => ({ data: {
        name: 'Klan sehat',
        clanLevel: 20,
        clanPoints: 50000,
        members: 2,
        badgeUrls: { large: 'badge.png' },
        memberList: [
            { tag: '#AAA111', name: 'Aktif', role: 'member', expLevel: 200, trophies: 5200, donations: 120, donationsReceived: 60 },
            { tag: '#BBB222', name: 'Diam', role: 'admin', expLevel: 180, trophies: 4800, donations: 0, donationsReceived: 30 }
        ]
    } });
    const server = app.listen(0);
    try {
        const base = `http://127.0.0.1:${server.address().port}`;
        const clan = await fetch(`${base}/api/clan/${clanTag}`);
        assert.equal(clan.status, 200);
        const clanData = await clan.json();
        assert.ok(clanData.snapshotDate);

        const health = await fetch(`${base}/api/clan/${clanTag}/health`);
        assert.equal(health.status, 200);
        const report = await health.json();
        assert.equal(report.snapshots, 1);
        assert.equal(report.summary.review, 1);
        assert.equal(report.members[0].name, 'Diam');
        assert.deepEqual(report.members[0].flags, ['Donasi nol']);

        const csv = await fetch(`${base}/api/clan/${clanTag}/health.csv`);
        assert.equal(csv.status, 200);
        assert.match(csv.headers.get('content-type'), /text\/csv/);
        const text = await csv.text();
        assert.match(text, /Name,Tag,Role,Trophies/);
        assert.match(text, /Diam,#BBB222,admin,4800/);
    } finally {
        server.close();
        axios.get = originalGet;
    }
});

test('rekap performance CWL menggabungkan pemain per putaran', async () => {
    const clanTag = '2GPP802UC';
    axios.get = async url => {
        if (url.endsWith('/leaguegroup')) return { data: {
            state: 'inWar',
            rounds: [{ warTags: ['#CWLROUND1'] }, { warTags: ['#CWLROUND2'] }]
        } };
        const first = url.endsWith('%23CWLROUND1');
        return { data: {
            state: first ? 'warEnded' : 'inWar',
            teamSize: 1,
            clan: {
                tag: `#${clanTag}`,
                name: 'Klan',
                stars: first ? 3 : 2,
                destructionPercentage: first ? 100 : 88,
                members: [
                    {
                        tag: '#PLAYER1',
                        name: 'Striker',
                        mapPosition: 1,
                        townhallLevel: 18,
                        attacks: [{
                            defenderTag: '#DEF1',
                            stars: first ? 3 : 2,
                            destructionPercentage: first ? 100 : 88
                        }]
                    },
                    {
                        tag: '#PLAYER2',
                        name: 'Finisher',
                        mapPosition: 2,
                        townhallLevel: 18,
                        attacks: [{
                            defenderTag: '#DEF2',
                            stars: first ? 1 : 3,
                            destructionPercentage: first ? 80 : 100
                        }]
                    }
                ]
            },
            opponent: { tag: '#OTHER', name: first ? 'Musuh 1' : 'Musuh 2', members: [] }
        } };
    };
    const server = app.listen(0);
    try {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/clan/${clanTag}/cwl/performance`);
        assert.equal(response.status, 200);
        const data = await response.json();
        assert.equal(data.players.length, 2);
        assert.equal(data.players[0].name, 'Striker');
        assert.equal(data.players[0].totals.attacks, 2);
        assert.equal(data.players[0].totals.stars, 5);
        assert.equal(data.players[0].totals.starsPerAttack, 2.5);
        assert.equal(data.players[1].name, 'Finisher');
        assert.equal(data.players[1].totals.stars, 4);
        assert.equal(data.players[0].rounds.length, 2);
        assert.deepEqual(data.availableRounds, [1, 2]);
    } finally {
        server.close();
        axios.get = originalGet;
    }
});

test('progress parsial tidak menyimpulkan status rushed', async () => {
    const playerTag = '2GPP802UL';
    axios.get = async () => ({ data: {
        tag: `#${playerTag}`,
        name: 'Rushed Hero',
        townHallLevel: 16,
        expLevel: 220,
        trophies: 5000,
        heroes: [
            { name: 'Barbarian King', level: 40 },
            { name: 'Archer Queen', level: 42 },
            { name: 'Grand Warden', level: 25 },
            { name: 'Royal Champion', level: 10 }
        ],
        troops: [
            { name: 'Barbarian', level: 6 },
            { name: 'Archer', level: 6 },
            { name: 'Dragon', level: 6 },
            { name: 'Electro Dragon', level: 3 }
        ],
        spells: [
            { name: 'Lightning Spell', level: 6 },
            { name: 'Rage Spell', level: 4 },
            { name: 'Freeze Spell', level: 4 }
        ],
        heroPets: [
            { name: 'L.A.S.S.I', level: 5 },
            { name: 'Unicorn', level: 5 }
        ]
    } });
    const server = app.listen(0);
    try {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/player/${playerTag}/progress`);
        assert.equal(response.status, 200);
        const data = await response.json();
        assert.equal(data.player.name, 'Rushed Hero');
        assert.equal(data.player.townHallLevel, 16);
        assert.equal(data.score.categories.heroes.knownItems, 4);
        assert.ok(data.score.overall < 60);
        assert.equal(data.rushed.rushed, null);
        assert.ok(data.priorities.length > 0);
    } finally {
        server.close();
        axios.get = originalGet;
    }
});

test('progress TH18 menunggu batas maxLevel dari API', async () => {
    const playerTag = '2R92VJG0U';
    axios.get = async () => ({ data: {
        tag: `#${playerTag}`,
        name: 'Yoani Zord_ID',
        townHallLevel: 18,
        expLevel: 300,
        trophies: 6000,
        heroes: [
            { name: 'Barbarian King', level: 100 },
            { name: 'Archer Queen', level: 100 },
            { name: 'Grand Warden', level: 75 },
            { name: 'Royal Champion', level: 50 },
            { name: 'Minion Prince', level: 70 }
        ],
        troops: [
            { name: 'Barbarian', level: 13 },
            { name: 'Archer', level: 13 },
            { name: 'Dragon', level: 12 }
        ],
        spells: [
            { name: 'Lightning Spell', level: 12 },
            { name: 'Rage Spell', level: 7 }
        ],
        heroPets: [
            { name: 'L.A.S.S.I', level: 15 },
            { name: 'Unicorn', level: 15 }
        ]
    } });
    const server = app.listen(0);
    try {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/player/${playerTag}/progress`);
        assert.equal(response.status, 200);
        const data = await response.json();
        assert.equal(data.player.townHallLevel, 18);
        assert.equal(data.tableTownHallLevel, 17);
        assert.equal(data.tableExactMatch, true);
        assert.equal(data.score.categories.heroes.expectedItems, 0);
        assert.equal(data.score.overall, null);
        assert.equal(data.rushed.rushed, null);
    } finally {
        server.close();
        axios.get = originalGet;
    }
});

test('arsip perang menyimpan serangan pemain dan endpoint menampilkan ringkasannya', async () => {
    const clanTag = '2GPP802UY';
    const playerTag = '2R92VJG0U';
    axios.get = async () => ({ data: {
        state: 'warEnded', startTime: '20261001T120000.000Z', endTime: '20261002T120000.000Z',
        attacksPerMember: 2, teamSize: 1,
        clan: { tag: `#${clanTag}`, name: 'Klan', members: [{ tag: `#${playerTag}`, name: 'Pemain', attacks: [
            { defenderTag: '#2GPP802UL', stars: 3, destructionPercentage: 100 }
        ] }] },
        opponent: { tag: '#2GPP802UL', name: 'Musuh', members: [] }
    } });
    const server = app.listen(0);
    try {
        const base = `http://127.0.0.1:${server.address().port}`;
        assert.equal((await fetch(`${base}/api/clan/${clanTag}/war`)).status, 200);
        const response = await fetch(`${base}/api/player/${playerTag}/performance?clan=${clanTag}`);
        assert.equal(response.status, 200);
        const data = await response.json();
        assert.equal(data.summary.wars, 1);
        assert.equal(data.summary.stars, 3);
        assert.equal(data.summary.missed, 1);
        assert.equal(data.wars[0].attacks[0].destructionPercentage, 100);
        assert.equal(data.trendAvailable, false);
    } finally {
        server.close();
        axios.get = originalGet;
    }
});

test('dua putaran CWL yang dibuka bersamaan tidak merusak arsip', async () => {
    const clanTag = '2GPP802UP';
    axios.get = async url => {
        if (url.endsWith('/leaguegroup')) return { data: { state: 'inWar', rounds: [
            { warTags: ['#UVARCH1'] }, { warTags: ['#UVARCH2'] }
        ] } };
        const first = url.includes('UVARCH1');
        return { data: { state: 'warEnded', startTime: first ? '20261001T000000.000Z' : '20261002T000000.000Z',
            attacksPerMember: 1, clan: { tag: `#${clanTag}`, members: [{ tag: '#2R92VJG0U', name: 'Pemain', attacks: [] }] },
            opponent: { tag: first ? '#2GPP802UL' : '#2GPP802UY', name: 'Musuh' } } };
    };
    const server = app.listen(0);
    try {
        const base = `http://127.0.0.1:${server.address().port}`;
        const responses = await Promise.all([1, 2].map(round => fetch(`${base}/api/clan/${clanTag}/war?round=${round}`)));
        const bodies = await Promise.all(responses.map(response => response.json()));
        assert.ok(responses.every(response => response.status === 200 && response.headers.get('content-type')?.includes('json')), JSON.stringify(bodies));
        assert.ok(bodies.every(body => body.state === 'warEnded'), JSON.stringify(bodies));
        const archive = JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, 'wars', `${clanTag}.json`), 'utf8'));
        assert.equal(archive.wars.length, 2);
    } finally {
        server.close();
        axios.get = originalGet;
    }
});

test('arsip dengan ekor JSON rusak dipulihkan dan salinan asli disimpan', async () => {
    const clanTag = '2GPP802U8';
    const folder = path.join(process.env.DATA_DIR, 'wars');
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, `${clanTag}.json`), JSON.stringify({ clanTag: `#${clanTag}`, wars: [] }) + 'sisa-data');
    const server = app.listen(0);
    try {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/player/2R92VJG0U/performance?clan=${clanTag}`);
        assert.equal(response.status, 200);
        assert.equal(JSON.parse(fs.readFileSync(path.join(folder, `${clanTag}.json`), 'utf8')).wars.length, 0);
        assert.ok(fs.readdirSync(folder).some(name => name.startsWith(`${clanTag}.json.corrupt-`)));
    } finally { server.close(); }
});
