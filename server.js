const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');
const { createHash } = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_BASE = 'https://api.clashofclans.com/v1';
const CACHE_TTL_MS = 2 * 60 * 1000;
const API_TIMEOUT_MS = Number(process.env.COC_API_TIMEOUT_MS || 20000);
const API_RETRIES = Number(process.env.COC_API_RETRIES || 1);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const cache = new Map();
const pending = new Map();
const iconCache = new Map();
const pendingIcons = new Map();
const pendingWarWrites = new Map();
const WIKI_ICON_TTL_MS = 24 * 60 * 60 * 1000;
const WIKI_ICON_MISS_TTL_MS = 10 * 60 * 1000;
const ROYAL_CHAMPION_ICON = 'https://static.wikia.nocookie.net/clashofclans/images/8/8e/Avatar_Hero_Royal_Champion.png/revision/latest/scale-to-width-down/100?cb=20200913051659';
const VERIFIED_EQUIPMENT_ICONS = {
    'Barbarian Puppet': 'https://static.wikia.nocookie.net/clashofclans/images/9/96/Barbarian_Puppet.png/revision/latest/scale-to-width-down/100?cb=20231211153430'
};

const PROGRESS_TABLE_VERSION = '2026-10-api-max-with-partial-th-table';
const TH_CATEGORY_WEIGHTS = {
    heroes: 0.4,
    troops: 0.35,
    spells: 0.15,
    pets: 0.1
};
const TH_MAX_LEVELS = {
    11: {
        heroes: { 'Barbarian King': 50, 'Archer Queen': 50, 'Grand Warden': 20 },
        troops: { 'Barbarian': 8, 'Archer': 8, 'Giant': 8, 'Wizard': 8, 'Dragon': 6, 'P.E.K.K.A': 7, 'Baby Dragon': 5, 'Miner': 5, 'Electro Dragon': 2, 'Bowler': 3 },
        spells: { 'Lightning Spell': 8, 'Healing Spell': 7, 'Rage Spell': 5, 'Jump Spell': 3, 'Freeze Spell': 6, 'Poison Spell': 5, 'Haste Spell': 5 },
        pets: {}
    },
    12: {
        heroes: { 'Barbarian King': 65, 'Archer Queen': 65, 'Grand Warden': 40 },
        troops: { 'Barbarian': 9, 'Archer': 9, 'Giant': 9, 'Wizard': 9, 'Dragon': 7, 'P.E.K.K.A': 8, 'Baby Dragon': 6, 'Miner': 6, 'Electro Dragon': 3, 'Bowler': 4, 'Yeti': 2 },
        spells: { 'Lightning Spell': 9, 'Healing Spell': 7, 'Rage Spell': 6, 'Jump Spell': 3, 'Freeze Spell': 7, 'Poison Spell': 6, 'Haste Spell': 5, 'Bat Spell': 5 },
        pets: {}
    },
    13: {
        heroes: { 'Barbarian King': 75, 'Archer Queen': 75, 'Grand Warden': 50, 'Royal Champion': 25 },
        troops: { 'Barbarian': 9, 'Archer': 9, 'Giant': 10, 'Wizard': 10, 'Dragon': 8, 'P.E.K.K.A': 9, 'Baby Dragon': 7, 'Miner': 7, 'Electro Dragon': 4, 'Bowler': 5, 'Yeti': 3, 'Dragon Rider': 2 },
        spells: { 'Lightning Spell': 9, 'Healing Spell': 8, 'Rage Spell': 6, 'Jump Spell': 4, 'Freeze Spell': 7, 'Poison Spell': 7, 'Haste Spell': 5, 'Bat Spell': 5 },
        pets: {}
    },
    14: {
        heroes: { 'Barbarian King': 80, 'Archer Queen': 80, 'Grand Warden': 55, 'Royal Champion': 30 },
        troops: { 'Barbarian': 10, 'Archer': 10, 'Giant': 10, 'Wizard': 10, 'Dragon': 9, 'P.E.K.K.A': 9, 'Baby Dragon': 8, 'Miner': 8, 'Electro Dragon': 5, 'Bowler': 6, 'Yeti': 4, 'Dragon Rider': 3 },
        spells: { 'Lightning Spell': 9, 'Healing Spell': 8, 'Rage Spell': 6, 'Jump Spell': 4, 'Freeze Spell': 7, 'Poison Spell': 8, 'Haste Spell': 5, 'Bat Spell': 5, 'Invisibility Spell': 4 },
        pets: { 'L.A.S.S.I': 10, 'Electro Owl': 10, 'Mighty Yak': 10, 'Unicorn': 10 }
    },
    15: {
        heroes: { 'Barbarian King': 90, 'Archer Queen': 90, 'Grand Warden': 65, 'Royal Champion': 40 },
        troops: { 'Barbarian': 11, 'Archer': 11, 'Giant': 11, 'Wizard': 11, 'Dragon': 10, 'P.E.K.K.A': 10, 'Baby Dragon': 9, 'Miner': 9, 'Electro Dragon': 6, 'Bowler': 7, 'Yeti': 5, 'Dragon Rider': 4, 'Electro Titan': 3, 'Root Rider': 2 },
        spells: { 'Lightning Spell': 10, 'Healing Spell': 9, 'Rage Spell': 6, 'Jump Spell': 4, 'Freeze Spell': 7, 'Poison Spell': 9, 'Haste Spell': 5, 'Bat Spell': 6, 'Invisibility Spell': 4, 'Recall Spell': 4 },
        pets: { 'L.A.S.S.I': 10, 'Electro Owl': 10, 'Mighty Yak': 10, 'Unicorn': 10, 'Frosty': 10, 'Diggy': 10, 'Poison Lizard': 10, 'Phoenix': 10 }
    },
    16: {
        heroes: { 'Barbarian King': 95, 'Archer Queen': 95, 'Grand Warden': 70, 'Royal Champion': 45 },
        troops: { 'Barbarian': 12, 'Archer': 12, 'Giant': 12, 'Wizard': 12, 'Dragon': 11, 'P.E.K.K.A': 11, 'Baby Dragon': 10, 'Miner': 10, 'Electro Dragon': 7, 'Bowler': 8, 'Yeti': 6, 'Dragon Rider': 5, 'Electro Titan': 4, 'Root Rider': 3, 'Druid': 2 },
        spells: { 'Lightning Spell': 11, 'Healing Spell': 10, 'Rage Spell': 6, 'Jump Spell': 5, 'Freeze Spell': 7, 'Poison Spell': 10, 'Haste Spell': 5, 'Bat Spell': 6, 'Invisibility Spell': 4, 'Recall Spell': 5, 'Overgrowth Spell': 3 },
        pets: { 'L.A.S.S.I': 15, 'Electro Owl': 15, 'Mighty Yak': 15, 'Unicorn': 15, 'Frosty': 10, 'Diggy': 10, 'Poison Lizard': 10, 'Phoenix': 10, 'Spirit Fox': 10, 'Angry Jelly': 10 }
    },
    17: {
        heroes: { 'Barbarian King': 100, 'Archer Queen': 100, 'Grand Warden': 75, 'Royal Champion': 50, 'Minion Prince': 70 },
        troops: { 'Barbarian': 13, 'Archer': 13, 'Giant': 13, 'Wizard': 13, 'Dragon': 12, 'P.E.K.K.A': 12, 'Baby Dragon': 11, 'Miner': 11, 'Electro Dragon': 8, 'Bowler': 9, 'Yeti': 7, 'Dragon Rider': 6, 'Electro Titan': 5, 'Root Rider': 4, 'Druid': 3 },
        spells: { 'Lightning Spell': 12, 'Healing Spell': 11, 'Rage Spell': 7, 'Jump Spell': 5, 'Freeze Spell': 8, 'Poison Spell': 11, 'Haste Spell': 6, 'Bat Spell': 7, 'Invisibility Spell': 5, 'Recall Spell': 6, 'Overgrowth Spell': 4 },
        pets: { 'L.A.S.S.I': 15, 'Electro Owl': 15, 'Mighty Yak': 15, 'Unicorn': 15, 'Frosty': 15, 'Diggy': 15, 'Poison Lizard': 15, 'Phoenix': 15, 'Spirit Fox': 15, 'Angry Jelly': 15 }
    }
};

app.use(cors());
app.use(express.static('public'));

function normalizeTag(value) {
    const tag = String(value || '').trim().replace(/^#/, '').toUpperCase();
    return /^[0289PYLQGRJCUV]{3,15}$/.test(tag) ? tag : null;
}

async function fetchCoC(path) {
    const cached = cache.get(path);
    if (cached && cached.expiresAt > Date.now()) return cached;
    if (pending.has(path)) return pending.get(path);

    const request = requestCoC(path).then(response => {
        const entry = {
            data: response.data,
            lastUpdated: new Date().toISOString(),
            expiresAt: Date.now() + CACHE_TTL_MS
        };
        cache.set(path, entry);
        return entry;
    }).finally(() => pending.delete(path));

    pending.set(path, request);
    return request;
}

async function requestCoC(path) {
    let lastError;
    for (let attempt = 0; attempt <= API_RETRIES; attempt++) {
        try {
            return await axios.get(`${API_BASE}${path}`, {
                headers: {
                    Authorization: `Bearer ${process.env.COC_API_TOKEN}`,
                    Accept: 'application/json'
                },
                timeout: API_TIMEOUT_MS
            });
        } catch (error) {
            lastError = error;
            if (!shouldRetryCoC(error) || attempt === API_RETRIES) throw error;
        }
    }
    throw lastError;
}

function shouldRetryCoC(error) {
    const retryCodes = new Set(['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN']);
    const retryStatuses = new Set([502, 503, 504]);
    return retryCodes.has(error.code) || retryStatuses.has(error.response?.status);
}

function sendError(res, error, isWar = false) {
    if (error instanceof SyntaxError || (error.path && String(error.path).startsWith(DATA_DIR))) {
        return res.status(500).json({ error: 'Arsip data lokal tidak dapat dibaca. Periksa berkas di folder data/wars.' });
    }
    const status = error.response?.status || (error.code === 'ECONNABORTED' ? 504 : 502);
    const messages = {
        403: isWar ? 'Data perang tidak tersedia. Periksa akses API dan pengaturan privasi war log klan.' : 'Akses API ditolak. Periksa token dan alamat IP yang didaftarkan.',
        404: isWar ? 'Data perang tidak tersedia untuk klan ini.' : 'Klan tidak ditemukan.',
        429: 'Batas permintaan API tercapai. Coba lagi sebentar.',
        504: 'API Clash of Clans tidak merespons tepat waktu. Coba lagi sebentar; jika terus terjadi, periksa koneksi server, token, dan IP yang didaftarkan di developer.clashofclans.com.'
    };
    if (error.code === 'EACCES' && error.syscall === 'connect') {
        return res.status(502).json({ error: 'Server tidak diizinkan terhubung ke API Clash of Clans. Periksa izin jaringan proses server.' });
    }
    res.status(status).json({ error: messages[status] || 'Gagal mengambil data dari API Clash of Clans.' });
}

function clanPath(req, res) {
    const tag = normalizeTag(req.params.tag);
    if (!tag) {
        res.status(400).json({ error: 'Tag klan tidak valid.' });
        return null;
    }
    return `/clans/${encodeURIComponent(`#${tag}`)}`;
}

function todayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

function snapshotPath(clanTag) {
    return path.join(DATA_DIR, 'snapshots', `${clanTag}.json`);
}

async function readSnapshots(clanTag) {
    try {
        const content = await fs.readFile(snapshotPath(clanTag), 'utf8');
        const parsed = JSON.parse(content);
        return Array.isArray(parsed.snapshots) ? parsed.snapshots : [];
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

async function writeSnapshots(clanTag, snapshots) {
    await fs.mkdir(path.dirname(snapshotPath(clanTag)), { recursive: true });
    const payload = { clanTag: `#${clanTag}`, snapshots };
    await fs.writeFile(snapshotPath(clanTag), `${JSON.stringify(payload, null, 2)}\n`);
}

function buildSnapshot(clanTag, clan) {
    return {
        date: todayKey(),
        capturedAt: new Date().toISOString(),
        clan: {
            tag: `#${clanTag}`,
            name: clan.name,
            level: clan.clanLevel,
            points: clan.clanPoints,
            members: clan.members
        },
        members: (clan.memberList || []).map(member => ({
            tag: member.tag,
            name: member.name,
            role: member.role,
            expLevel: member.expLevel,
            trophies: member.trophies || 0,
            donations: member.donations || 0,
            donationsReceived: member.donationsReceived || 0
        }))
    };
}

async function saveDailySnapshot(clanTag, clan) {
    const snapshots = await readSnapshots(clanTag);
    const snapshot = buildSnapshot(clanTag, clan);
    const existingIndex = snapshots.findIndex(item => item.date === snapshot.date);
    if (existingIndex >= 0) snapshots[existingIndex] = snapshot;
    else snapshots.push(snapshot);
    snapshots.sort((a, b) => a.date.localeCompare(b.date));
    await writeSnapshots(clanTag, snapshots.slice(-120));
    return snapshot;
}

function findSnapshotAtOrBefore(snapshots, date) {
    const key = todayKey(date);
    return [...snapshots].reverse().find(snapshot => snapshot.date <= key) || null;
}

function memberMap(snapshot) {
    return new Map((snapshot?.members || []).map(member => [member.tag, member]));
}

function buildHealthReport(clanTag, snapshots) {
    const latest = snapshots[snapshots.length - 1] || null;
    if (!latest) {
        return { clanTag: `#${clanTag}`, snapshots: 0, members: [], summary: { review: 0, stable: 0 }, generatedAt: new Date().toISOString() };
    }
    const latestDate = new Date(`${latest.date}T00:00:00.000Z`);
    const sevenDaysAgo = new Date(latestDate);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
    const thirtyDaysAgo = new Date(latestDate);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
    const seven = findSnapshotAtOrBefore(snapshots, sevenDaysAgo);
    const thirty = findSnapshotAtOrBefore(snapshots, thirtyDaysAgo);
    const sevenMap = memberMap(seven);
    const thirtyMap = memberMap(thirty);

    const members = latest.members.map(member => {
        const weekBase = sevenMap.get(member.tag);
        const monthBase = thirtyMap.get(member.tag);
        const donationsReceived = member.donationsReceived || 0;
        const donationRatio = donationsReceived === 0 ? null : Number((member.donations / donationsReceived).toFixed(2));
        const trophyDelta7 = weekBase ? member.trophies - weekBase.trophies : null;
        const trophyDelta30 = monthBase ? member.trophies - monthBase.trophies : null;
        const flags = [];
        if (member.donations === 0) flags.push('Donasi nol');
        if (trophyDelta7 === 0) flags.push('Trofi 7 hari tidak berubah');
        if (weekBase && member.donations === weekBase.donations && member.donationsReceived === weekBase.donationsReceived) {
            flags.push('Donasi 7 hari tidak berubah');
        }
        return {
            tag: member.tag,
            name: member.name,
            role: member.role,
            trophies: member.trophies,
            donations: member.donations,
            donationsReceived: member.donationsReceived,
            donationRatio,
            trophyDelta7,
            trophyDelta30,
            flags,
            status: flags.length ? 'review' : 'stable'
        };
    }).sort((a, b) => b.flags.length - a.flags.length || a.name.localeCompare(b.name));

    return {
        clanTag: `#${clanTag}`,
        clanName: latest.clan.name,
        generatedAt: new Date().toISOString(),
        latestSnapshot: latest.date,
        snapshots: snapshots.length,
        comparison: {
            sevenDayBaseline: seven?.date || null,
            thirtyDayBaseline: thirty?.date || null
        },
        summary: {
            review: members.filter(member => member.status === 'review').length,
            stable: members.filter(member => member.status === 'stable').length
        },
        members
    };
}

function csvEscape(value) {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function healthReportCsv(report) {
    const header = ['Name', 'Tag', 'Role', 'Trophies', 'Delta 7d', 'Delta 30d', 'Donated', 'Received', 'Donation Ratio', 'Status', 'Flags'];
    const rows = report.members.map(member => [
        member.name,
        member.tag,
        member.role,
        member.trophies,
        member.trophyDelta7,
        member.trophyDelta30,
        member.donations,
        member.donationsReceived,
        member.donationRatio,
        member.status,
        member.flags.join('; ')
    ]);
    return [header, ...rows].map(row => row.map(csvEscape).join(',')).join('\n');
}

function playerPath(req, res) {
    const tag = normalizeTag(req.params.tag);
    if (!tag) {
        res.status(400).json({ error: 'Tag pemain tidak valid.' });
        return null;
    }
    return `/players/${encodeURIComponent(`#${tag}`)}`;
}

function wikiIconFiles(name, section) {
    const base = name.replace(/\s+/g, '_');
    if (section === 'heroes' || (section === 'builderBase' && /^Battle (Machine|Copter)$/.test(name))) {
        return [`Avatar_Hero_${base}.png`, `${base}_Icon.png`];
    }
    if (section === 'spells') return [`${base}_info.png`, `Avatar_${base}.png`, `${base}_Icon.png`];
    if (section === 'heroEquipment') return [`${base}.png`, `${base}_info.png`, `Icon_${base}.png`, `${base}_Icon.png`, `Avatar_${base}.png`];
    return [`Avatar_${base}.png`, `${base}_Icon.png`];
}

function staticWikiIconUrl(file) {
    const hash = createHash('md5').update(file).digest('hex');
    return `https://static.wikia.nocookie.net/clashofclans/images/${hash[0]}/${hash.slice(0, 2)}/${encodeURIComponent(file)}/revision/latest/scale-to-width-down/100`;
}

async function downloadWikiIcon(imageUrl) {
    const parsed = new URL(imageUrl);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'static.wikia.nocookie.net') return null;
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 6000, maxContentLength: 400000 });
    const type = String(response.headers['content-type'] || '').split(';')[0].toLowerCase();
    if (!['image/png', 'image/webp', 'image/jpeg', 'image/gif'].includes(type)) return null;
    return { body: Buffer.from(response.data), type };
}

async function fetchWikiIcon(name, section) {
    let imageUrl = section === 'heroes' && name === 'Royal Champion' ? ROYAL_CHAMPION_ICON :
        section === 'heroEquipment' ? VERIFIED_EQUIPMENT_ICONS[name] || null : null;
    const files = wikiIconFiles(name, section);
    if (!imageUrl) {
      try {
        const response = await axios.get('https://clashofclans.fandom.com/api.php', {
            params: { action: 'query', prop: 'imageinfo', iiprop: 'url', format: 'json', formatversion: 2,
                titles: files.map(file => `File:${file}`).join('|') },
            timeout: 8000
        });
        const pages = response.data?.query?.pages || [];
        for (const file of files) {
            const title = `File:${file}`.replace(/_/g, ' ').toLowerCase();
            const page = pages.find(entry => entry.title?.replace(/_/g, ' ').toLowerCase() === title);
            if (page?.imageinfo?.[0]?.url) { imageUrl = page.imageinfo[0].url; break; }
        }
        if (!imageUrl && section === 'heroEquipment') {
            const article = await axios.get('https://clashofclans.fandom.com/api.php', {
                params: { action: 'query', prop: 'images', imlimit: 'max', format: 'json', formatversion: 2, titles: name },
                timeout: 8000
            });
            const images = article.data?.query?.pages?.[0]?.images || [];
            const normalized = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
            const wanted = normalized(name);
            const imageName = entry => normalized(entry.title.replace(/^File:/i, '').replace(/\.[^.]+$/, ''));
            const match = images
                .filter(entry => /\.(png|webp|jpe?g|gif)$/i.test(entry.title) && imageName(entry).includes(wanted))
                .sort((a, b) => {
                    const rank = entry => imageName(entry) === wanted ? 0 : /(?:icon|info|avatar|equipment)/.test(imageName(entry)) ? 1 : 2;
                    return rank(a) - rank(b) || imageName(a).length - imageName(b).length;
                })[0];
            if (match) {
                const detail = await axios.get('https://clashofclans.fandom.com/api.php', {
                    params: { action: 'query', prop: 'imageinfo', iiprop: 'url', format: 'json', formatversion: 2, titles: match.title },
                    timeout: 8000
                });
                imageUrl = detail.data?.query?.pages?.[0]?.imageinfo?.[0]?.url || null;
            }
        }
      } catch { /* Berkas statis dicoba di bawah bila API wiki gagal. */ }
    }
    const urls = [...new Set([imageUrl, ...files.map(staticWikiIconUrl)].filter(Boolean))];
    for (const url of urls) {
        try {
            const image = await downloadWikiIcon(url);
            if (image) return image;
        } catch { /* Coba nama berkas berikutnya. */ }
    }
    return null;
}

app.get('/api/player-icon', async (req, res) => {
    const name = String(req.query.name || '');
    const section = String(req.query.section || '');
    if (!/^[\w .&'-]{1,70}$/.test(name) || !new Set(['heroes', 'heroEquipment', 'pets', 'troops', 'superTroops', 'builderBase', 'spells']).has(section)) {
        return res.status(400).end();
    }
    const key = `${section}:${name}`;
    const cached = iconCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
        if (!cached.image) return res.status(404).end();
        return res.type(cached.image.type).set('Cache-Control', 'public, max-age=86400').send(cached.image.body);
    }
    try {
        if (!pendingIcons.has(key)) {
            const request = fetchWikiIcon(name, section).then(image => {
                iconCache.set(key, { image, expiresAt: Date.now() + (image ? WIKI_ICON_TTL_MS : WIKI_ICON_MISS_TTL_MS) });
                return image;
            }).finally(() => pendingIcons.delete(key));
            pendingIcons.set(key, request);
        }
        const image = await pendingIcons.get(key);
        if (!image) return res.status(404).end();
        res.type(image.type).set('Cache-Control', 'public, max-age=86400').send(image.body);
    } catch {
        res.status(502).end();
    }
});

function scoreItems(items, maxTable, useApiMax = false, village = 'home') {
    const known = [];
    const missing = [];
    const itemMap = new Map((items || []).filter(item => village === 'builderBase' ? item.village === 'builderBase' : item.village !== 'builderBase').map(item => [item.name, item]));
    const limits = useApiMax ? Object.fromEntries([...itemMap].filter(([, item]) => Number.isInteger(item.maxLevel) && item.maxLevel > 0).map(([name, item]) => [name, item.maxLevel])) : maxTable || {};

    for (const [name, maxLevel] of Object.entries(limits)) {
        const item = itemMap.get(name);
        if (!item) {
            missing.push({ name, level: 0, maxLevel });
            continue;
        }
        known.push({
            name,
            level: item.level || 0,
            maxLevel,
            percent: maxLevel ? Math.min(100, Number(((item.level || 0) / maxLevel * 100).toFixed(2))) : 0
        });
    }

    const totalCurrent = known.reduce((sum, item) => sum + item.level, 0);
    const totalMax = known.reduce((sum, item) => sum + item.maxLevel, 0);
    const percent = totalMax ? Number((totalCurrent / totalMax * 100).toFixed(2)) : null;
    const lowest = [...known].filter(item => item.percent < 100).sort((a, b) => a.percent - b.percent).slice(0, 5);
    const unmapped = [...itemMap.values()].filter(item => !(item.name in limits)).map(item => item.name);

    return {
        percent,
        knownItems: known.length,
        expectedItems: Object.keys(limits).length,
        missingItems: missing.length,
        unmappedItems: unmapped,
        lowest,
        items: known,
        missing
    };
}

function weightedProgress(categories) {
    const available = Object.entries(categories)
        .filter(([name, category]) => category.percent !== null && TH_CATEGORY_WEIGHTS[name]);
    const weightTotal = available.reduce((sum, [name]) => sum + TH_CATEGORY_WEIGHTS[name], 0);
    if (!weightTotal) return null;
    return Number(available.reduce((sum, [name, category]) =>
        sum + category.percent * (TH_CATEGORY_WEIGHTS[name] / weightTotal), 0).toFixed(2));
}

function explainRushed(categories, overall) {
    const weakCategories = Object.entries(categories)
        .filter(([, category]) => category.percent !== null && category.percent < 60)
        .map(([name]) => name);
    const veryWeakCategories = Object.entries(categories)
        .filter(([, category]) => category.percent !== null && category.percent < 50)
        .map(([name]) => name);
    const rushed = overall !== null && overall < 60 && veryWeakCategories.length > 0;
    const reasons = [];
    if (overall === null) reasons.push('Data batas level belum cukup untuk menghitung skor.');
    if (overall !== null && overall < 60) reasons.push('Skor keseluruhan di bawah 60%.');
    for (const name of veryWeakCategories) reasons.push(`Kategori ${name} di bawah 50%.`);
    for (const name of weakCategories.filter(name => !veryWeakCategories.includes(name))) {
        reasons.push(`Kategori ${name} perlu perhatian karena di bawah 60%.`);
    }
    if (!reasons.length) reasons.push('Kategori utama yang tersedia masih berada di ambang aman.');
    return {
        rushed,
        label: rushed ? 'Terindikasi rushed' : 'Tidak terindikasi rushed',
        reasons
    };
}

function resolveProgressTable(townHall) {
    if (TH_MAX_LEVELS[townHall]) return { townHallLevel: townHall, table: TH_MAX_LEVELS[townHall], exact: true };
    const available = Object.keys(TH_MAX_LEVELS)
        .map(Number)
        .filter(level => level <= townHall)
        .sort((a, b) => b - a);
    const fallback = available[0] || Math.max(...Object.keys(TH_MAX_LEVELS).map(Number));
    return { townHallLevel: fallback, table: TH_MAX_LEVELS[fallback] || {}, exact: false };
}

function buildPlayerProgress(player) {
    const townHall = player.townHallLevel || player.townhallLevel;
    const resolvedTable = resolveProgressTable(townHall);
    const maxTable = resolvedTable.table;
    const apiBaseline = townHall === 18;
    const pets = player.heroPets || player.pets || (player.troops || []).filter(item => PET_NAMES.has(item.name));
    const categories = {
        heroes: scoreItems(player.heroes, maxTable.heroes, apiBaseline),
        troops: scoreItems((player.troops || []).filter(item => !SUPER_TROOP_NAMES.has(item.name) && !PET_NAMES.has(item.name)), maxTable.troops, apiBaseline),
        spells: scoreItems(player.spells, maxTable.spells, apiBaseline),
        pets: scoreItems(pets, maxTable.pets, apiBaseline)
    };
    const overall = weightedProgress(categories);
    const coverage = Object.values(categories).reduce((sum, category) => sum + category.knownItems, 0);
    const unmapped = Object.values(categories).reduce((sum, category) => sum + category.unmappedItems.length + category.missingItems, 0);
    const minimumCoverage = { heroes: 5, troops: 20, spells: 12, pets: 10 };
    const complete = apiBaseline && coverage > 0 && unmapped === 0 &&
        Object.entries(minimumCoverage).every(([name, minimum]) => categories[name].knownItems >= minimum);
    const rushed = complete ? explainRushed(categories, overall) : { rushed: null, label: 'Belum dapat dinilai', reasons: ['Cakupan batas level belum lengkap; status rushed ditahan agar tidak menyesatkan.'] };
    const priorities = Object.entries(categories).flatMap(([category, value]) => value.lowest.map(item => ({ category, ...item, levelsRemaining: Math.max(0, item.maxLevel - item.level) }))).sort((a, b) => a.percent - b.percent || b.levelsRemaining - a.levelsRemaining).slice(0, 10);
    const builderItems = [...(player.heroes || []), ...(player.troops || []), ...(player.spells || [])].filter(item => item.village === 'builderBase');
    const builderBase = scoreItems(builderItems, {}, player.builderHallLevel === 10, 'builderBase');
    return {
        tableVersion: PROGRESS_TABLE_VERSION,
        tableTownHallLevel: resolvedTable.townHallLevel,
        tableExactMatch: apiBaseline,
        complete,
        minimumCoverage,
        baselineSource: apiBaseline ? 'maxLevel dari API pemain pada TH 18' : `tabel lokal TH ${resolvedTable.townHallLevel} (parsial)`,
        player: {
            tag: player.tag,
            name: player.name,
            townHallLevel: townHall,
            expLevel: player.expLevel,
            trophies: player.trophies,
            clan: player.clan ? { tag: player.clan.tag, name: player.clan.name } : null
        },
        score: {
            label: 'Progres pasukan dan hero',
            overall,
            weights: TH_CATEGORY_WEIGHTS,
            categories,
            builderBase
        },
        rushed,
        priorities,
        limitations: [
            'API profil pemain tidak menyediakan level bangunan, tembok, dan upgrade berjalan.',
            apiBaseline ? 'Batas level TH 18 dan BH 10 diambil dari maxLevel API bila tersedia; item tanpa batas tidak masuk skor.' : `Tabel lokal TH ${resolvedTable.townHallLevel} belum tervalidasi untuk seluruh item dan update terbaru; status rushed tidak dihitung.`,
            'Skor hanya meliputi pasukan, hero, spell, dan pet; bukan persentase maksimal seluruh akun.'
        ],
        generatedAt: new Date().toISOString()
    };
}

const PET_NAMES = new Set(['L.A.S.S.I', 'Electro Owl', 'Mighty Yak', 'Unicorn', 'Frosty', 'Diggy', 'Poison Lizard', 'Phoenix', 'Spirit Fox', 'Angry Jelly', 'Sneezy']);
const SUPER_TROOP_NAMES = new Set(['Super Barbarian', 'Super Archer', 'Super Giant', 'Sneaky Goblin', 'Super Wall Breaker', 'Super Wizard', 'Inferno Dragon', 'Super Minion', 'Super Valkyrie', 'Super Witch', 'Ice Hound', 'Rocket Balloon', 'Super Bowler', 'Super Dragon', 'Super Miner', 'Super Hog Rider', 'Super Yeti']);
const EQUIPMENT_BY_HERO = {
    'Barbarian King': ['Barbarian Puppet', 'Rage Vial', 'Earthquake Boots', 'Vampstache', 'Giant Gauntlet', 'Spiky Ball', 'Snake Bracelet', 'Stick Horse'],
    'Archer Queen': ['Archer Puppet', 'Invisibility Vial', 'Giant Arrow', 'Healer Puppet', 'Frozen Arrow', 'Magic Mirror', 'Action Figure', 'Monolith Arrow'],
    'Minion Prince': ['Henchmen Puppet', 'Dark Orb', 'Metal Pants', 'Noble Iron', 'Dark Crown', 'Meteor Staff'],
    'Grand Warden': ['Eternal Tome', 'Life Gem', 'Rage Gem', 'Healing Tome', 'Fireball', 'Lavaloon Puppet', 'Heroic Torch'],
    'Royal Champion': ['Royal Gem', 'Seeking Shield', 'Hog Rider Puppet', 'Haste Vial', 'Rocket Spear', 'Electro Boots', 'Frost Flake'],
    'Dragon Duke': ['Fire Heart', 'Flame Blower', 'Stun Blaster', 'Electro Fangs', 'Rocket Backpack', 'Revenge Deck']
};
const EQUIPMENT_HERO = Object.fromEntries(Object.entries(EQUIPMENT_BY_HERO)
    .flatMap(([hero, names]) => names.map(name => [name, hero])));

function playerItem(item) {
    return {
        name: item.name,
        level: item.level,
        maxLevel: item.maxLevel ?? null,
        village: item.village || 'home',
        equipmentHero: EQUIPMENT_HERO[item.name] || null
    };
}

function buildPlayerProfile(player, lastUpdated) {
    const army = {
        heroes: [],
        heroEquipment: [],
        pets: [],
        troops: [],
        superTroops: [],
        builderBase: [],
        spells: []
    };
    for (const hero of player.heroes || []) {
        army[hero.village === 'builderBase' ? 'builderBase' : 'heroes'].push(playerItem(hero));
    }
    for (const equipment of player.heroEquipment || []) army.heroEquipment.push(playerItem(equipment));
    for (const pet of player.heroPets || player.pets || []) army.pets.push(playerItem(pet));
    const seenPets = new Set(army.pets.map(item => item.name));
    for (const troop of player.troops || []) {
        const item = playerItem(troop);
        if (troop.village === 'builderBase') army.builderBase.push(item);
        else if (PET_NAMES.has(troop.name)) {
            if (!seenPets.has(troop.name)) army.pets.push(item);
            seenPets.add(troop.name);
        } else if (SUPER_TROOP_NAMES.has(troop.name)) army.superTroops.push(item);
        else army.troops.push(item);
    }
    for (const spell of player.spells || []) {
        army[spell.village === 'builderBase' ? 'builderBase' : 'spells'].push(playerItem(spell));
    }
    return {
        player: {
            tag: player.tag,
            name: player.name,
            townHallLevel: player.townHallLevel,
            builderHallLevel: player.builderHallLevel,
            expLevel: player.expLevel,
            trophies: player.trophies,
            bestTrophies: player.bestTrophies,
            builderBaseTrophies: player.builderBaseTrophies,
            warStars: player.warStars,
            donations: player.donations,
            donationsReceived: player.donationsReceived,
            role: player.role,
            league: player.league ? { name: player.league.name, iconUrls: player.league.iconUrls } : null,
            clan: player.clan ? { tag: player.clan.tag, name: player.clan.name, badgeUrls: player.clan.badgeUrls } : null
        },
        army,
        progress: buildPlayerProgress(player),
        lastUpdated
    };
}

async function findCwlWar(path, clanTag, selectedRound = null) {
    let group;
    try {
        group = await fetchCoC(`${path}/currentwar/leaguegroup`);
    } catch (error) {
        if (error.response?.status === 404) return null;
        throw error;
    }
    if (group.data.state === 'notInWar') return null;
    const rounds = group.data.rounds || [];
    if (selectedRound !== null && selectedRound > rounds.length) {
        return { invalidRound: true };
    }
    const availableRounds = rounds.flatMap((round, index) =>
        (round.warTags || []).some(tag => tag && tag !== '#0') ? [index + 1] : []);

    async function getRound(index) {
        const tags = (rounds[index].warTags || [])
            .filter(tag => tag && tag !== '#0');
        const wars = await Promise.allSettled(tags.map(tag =>
            fetchCoC(`/clanwarleagues/wars/${encodeURIComponent(tag)}`)));
        const matching = wars
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value)
            .find(entry => [entry.data.clan?.tag, entry.data.opponent?.tag]
                .some(tag => tag?.toUpperCase() === `#${clanTag}`));
        if (matching) return { ...matching, round: index + 1, availableRounds };
        const failed = wars.find(result => result.status === 'rejected' && result.reason.response?.status !== 404);
        if (failed) throw failed.reason;
        return null;
    }

    if (selectedRound !== null) {
        return (await getRound(selectedRound - 1)) ||
            { data: { state: 'cwlWaiting' }, lastUpdated: group.lastUpdated, availableRounds, round: selectedRound };
    }

    // Putaran berikutnya dapat masuk fase persiapan sebelum putaran sekarang selesai.
    // Utamakan inWar; jika tidak ada, pilih persiapan atau hasil terbaru.
    let preparation = null;
    for (let index = rounds.length - 1; index >= 0; index--) {
        const war = await getRound(index);
        if (!war) continue;
        if (war.data.state === 'inWar') return war;
        if (war.data.state === 'preparation') preparation ||= war;
        if (war.data.state === 'warEnded') return preparation || war;
    }
    return preparation ||
        { data: { state: 'cwlWaiting' }, lastUpdated: group.lastUpdated, availableRounds };
}

async function fetchCwlGroup(path) {
    try {
        return await fetchCoC(`${path}/currentwar/leaguegroup`);
    } catch (error) {
        if (error.response?.status === 404) return null;
        throw error;
    }
}

async function fetchCwlWars(path, clanTag) {
    const group = await fetchCwlGroup(path);
    if (!group || group.data.state === 'notInWar') {
        return { availableRounds: [], wars: [], lastUpdated: group?.lastUpdated || new Date().toISOString() };
    }

    const rounds = group.data.rounds || [];
    const availableRounds = rounds.flatMap((round, index) =>
        (round.warTags || []).some(tag => tag && tag !== '#0') ? [index + 1] : []);
    const wars = [];

    for (let index = 0; index < rounds.length; index++) {
        const tags = (rounds[index].warTags || []).filter(tag => tag && tag !== '#0');
        const results = await Promise.allSettled(tags.map(tag =>
            fetchCoC(`/clanwarleagues/wars/${encodeURIComponent(tag)}`)));
        const matching = results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value)
            .find(entry => [entry.data.clan?.tag, entry.data.opponent?.tag]
                .some(tag => tag?.toUpperCase() === `#${clanTag}`));
        if (matching) wars.push({ ...matching, round: index + 1 });
        const failed = results.find(result => result.status === 'rejected' && result.reason.response?.status !== 404);
        if (failed) throw failed.reason;
    }

    return { availableRounds, wars, lastUpdated: group.lastUpdated };
}

function summarizeWarForClan(entry, clanTag) {
    const data = entry.data;
    const ownTag = `#${clanTag}`;
    const reversed = data.opponent?.tag?.toUpperCase() === ownTag;
    const clan = (reversed ? data.opponent : data.clan) || {};
    const opponent = (reversed ? data.clan : data.opponent) || {};
    const members = (clan.members || []).map(member => {
        const attacks = member.attacks || [];
        const stars = attacks.reduce((sum, attack) => sum + (attack.stars || 0), 0);
        const destruction = attacks.reduce((sum, attack) => sum + (attack.destructionPercentage || 0), 0);
        return {
            tag: member.tag,
            name: member.name,
            mapPosition: member.mapPosition,
            townhallLevel: member.townhallLevel,
            attacks: attacks.length,
            stars,
            destructionAverage: attacks.length ? Number((destruction / attacks.length).toFixed(2)) : 0
        };
    });
    return {
        round: entry.round || null,
        state: data.state,
        opponent: opponent.name || null,
        clanStars: clan.stars || 0,
        opponentStars: opponent.stars || 0,
        clanDestruction: clan.destructionPercentage || 0,
        opponentDestruction: opponent.destructionPercentage || 0,
        members
    };
}

function warArchivePath(clanTag) {
    return path.join(DATA_DIR, 'wars', `${clanTag}.json`);
}

async function readWarArchive(clanTag) {
    try {
        const content = await fs.readFile(warArchivePath(clanTag), 'utf8');
        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch (error) {
            // Penulisan versi lama bisa saling menimpa dan menyisakan ekor JSON.
            // Simpan salinan asli, lalu ambil dokumen JSON lengkap pertama.
            let depth = 0;
            let inString = false;
            let escaped = false;
            let end = -1;
            for (let index = 0; index < content.length; index++) {
                const char = content[index];
                if (inString) {
                    if (escaped) escaped = false;
                    else if (char === '\\') escaped = true;
                    else if (char === '"') inString = false;
                } else if (char === '"') inString = true;
                else if (char === '{') depth++;
                else if (char === '}' && --depth === 0) { end = index + 1; break; }
            }
            if (end < 0) throw error;
            parsed = JSON.parse(content.slice(0, end));
            const backup = `${warArchivePath(clanTag)}.corrupt-${Date.now()}`;
            await fs.copyFile(warArchivePath(clanTag), backup);
            await writeWarArchive(clanTag, parsed.wars || []);
        }
        return Array.isArray(parsed.wars) ? parsed.wars : [];
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

async function writeWarArchive(clanTag, wars) {
    const target = warArchivePath(clanTag);
    await fs.mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;
    try {
        await fs.writeFile(temporary, `${JSON.stringify({ clanTag: `#${clanTag}`, wars }, null, 2)}\n`);
        await fs.rename(temporary, target);
    } finally {
        await fs.unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
}

async function archiveWar(clanTag, entry, type, round = null) {
    const previous = pendingWarWrites.get(clanTag) || Promise.resolve();
    const current = previous.catch(() => {}).then(() => archiveWarUnlocked(clanTag, entry, type, round));
    pendingWarWrites.set(clanTag, current);
    try { await current; }
    finally { if (pendingWarWrites.get(clanTag) === current) pendingWarWrites.delete(clanTag); }
}

async function archiveWarUnlocked(clanTag, entry, type, round = null) {
    const data = entry.data;
    if (!data || data.state === 'notInWar' || data.state === 'cwlWaiting') return;
    const ownTag = `#${clanTag}`;
    const reversed = data.opponent?.tag?.toUpperCase() === ownTag;
    const clan = (reversed ? data.opponent : data.clan) || {};
    const opponent = (reversed ? data.clan : data.opponent) || {};
    if (clan.tag?.toUpperCase() !== ownTag) return;
    const id = `${type}:${data.startTime || data.endTime || entry.warTag || round}:${opponent.tag || 'unknown'}`;
    const members = (clan.members || []).map(member => ({
        tag: member.tag, name: member.name, townhallLevel: member.townhallLevel,
        attacks: (member.attacks || []).map(attack => ({
            defenderTag: attack.defenderTag, stars: attack.stars || 0,
            destructionPercentage: attack.destructionPercentage || 0
        }))
    }));
    const wars = await readWarArchive(clanTag);
    const record = { id, type, round, state: data.state, startTime: data.startTime || null,
        endTime: data.endTime || null, opponent: { tag: opponent.tag, name: opponent.name },
        attacksPerMember: Number.isInteger(data.attacksPerMember) ? data.attacksPerMember : type === 'CWL' ? 1 : 2,
        members, updatedAt: entry.lastUpdated };
    const index = wars.findIndex(war => war.id === id);
    if (index >= 0) wars[index] = record;
    else wars.push(record);
    wars.sort((a, b) => (a.startTime || a.updatedAt || '').localeCompare(b.startTime || b.updatedAt || ''));
    await writeWarArchive(clanTag, wars.slice(-120));
}

function buildPlayerWarPerformance(playerTag, clanTag, wars, snapshots) {
    const rows = wars.filter(war => war.members.some(member => member.tag?.toUpperCase() === `#${playerTag}`))
        .map(war => {
            const member = war.members.find(item => item.tag?.toUpperCase() === `#${playerTag}`);
            const attacks = member.attacks || [];
            return { id: war.id, type: war.type, round: war.round, state: war.state,
                startTime: war.startTime, endTime: war.endTime, opponent: war.opponent,
                quota: war.attacksPerMember, attacks,
                stars: attacks.reduce((sum, attack) => sum + attack.stars, 0),
                destructionAverage: attacks.length ? Number((attacks.reduce((sum, attack) => sum + attack.destructionPercentage, 0) / attacks.length).toFixed(2)) : 0,
                missed: war.state === 'warEnded' && attacks.length < war.attacksPerMember };
        }).sort((a, b) => (b.startTime || b.endTime || '').localeCompare(a.startTime || a.endTime || ''));
    const attacks = rows.flatMap(row => row.attacks);
    const trend = snapshots.map(snapshot => {
        const member = snapshot.members?.find(item => item.tag?.toUpperCase() === `#${playerTag}`);
        return member ? { date: snapshot.date, trophies: member.trophies, donations: member.donations,
            donationsReceived: member.donationsReceived } : null;
    }).filter(Boolean);
    return { playerTag: `#${playerTag}`, clanTag: `#${clanTag}`, wars: rows,
        summary: { wars: rows.length, attacks: attacks.length,
            stars: attacks.reduce((sum, attack) => sum + attack.stars, 0),
            starsPerAttack: attacks.length ? Number((attacks.reduce((sum, attack) => sum + attack.stars, 0) / attacks.length).toFixed(2)) : null,
            destructionAverage: attacks.length ? Number((attacks.reduce((sum, attack) => sum + attack.destructionPercentage, 0) / attacks.length).toFixed(2)) : null,
            missed: rows.filter(row => row.missed).length },
        trend: trend.length >= 2 ? trend : [], trendAvailable: trend.length >= 2,
        note: 'Arsip perang dimulai ketika aplikasi mengambil data perang. Perang lama yang belum pernah diambil tidak tersedia.' };
}

app.get('/api/clan/:tag/war', async (req, res) => {
    const path = clanPath(req, res);
    if (!path) return;
    const selectedRound = req.query.round === undefined ? null : Number(req.query.round);
    if (selectedRound !== null && (!Number.isInteger(selectedRound) || selectedRound < 1)) {
        return res.status(400).json({ error: 'Nomor putaran tidak valid.' });
    }
    try {
        let entry = selectedRound === null ? await fetchCoC(`${path}/currentwar`) : null;
        let isCwl = Boolean(entry?.data.isLeagueEntry);
        let round = null;
        let availableRounds = [];
        if (selectedRound !== null || entry.data.state === 'notInWar' || isCwl) {
            const cwl = await findCwlWar(path, normalizeTag(req.params.tag), selectedRound);
            if (cwl?.invalidRound) return res.status(400).json({ error: 'Putaran CWL tidak tersedia.' });
            if (cwl) {
                entry = cwl;
                isCwl = true;
                round = cwl.round || null;
                availableRounds = cwl.availableRounds || [];
            }
        }
        if (!entry) return res.status(404).json({ error: 'Data CWL tidak tersedia untuk klan ini.' });
        const { data, lastUpdated } = entry;
        const state = data.state;
        if (state === 'notInWar') return res.json({ state, lastUpdated });
        if (state === 'cwlWaiting') return res.json({ state, type: 'CWL', round, availableRounds, lastUpdated });
        await archiveWar(normalizeTag(req.params.tag), entry, isCwl ? 'CWL' : 'War', round);

        const ownTag = `#${normalizeTag(req.params.tag)}`;
        const reversed = isCwl && data.opponent?.tag?.toUpperCase() === ownTag;
        const clan = (reversed ? data.opponent : data.clan) || {};
        const opponent = (reversed ? data.clan : data.opponent) || {};
        const attacksPerMember = Number.isInteger(data.attacksPerMember)
            ? data.attacksPerMember : (isCwl ? 1 : null);
        const members = (clan.members || []).map(member => {
            const attacks = member.attacks || [];
            const starsEarned = attacks.reduce((sum, attack) => sum + (attack.stars || 0), 0);
            const destructionTotal = attacks.reduce((sum, attack) => sum + (attack.destructionPercentage || 0), 0);
            return {
                tag: member.tag,
                name: member.name,
                mapPosition: member.mapPosition,
                townhallLevel: member.townhallLevel,
                starsEarned,
                destructionAverage: attacks.length ? Number((destructionTotal / attacks.length).toFixed(2)) : 0,
                attacksUsed: attacks.length,
                attacksRemaining: attacksPerMember === null ? null : Math.max(0, attacksPerMember - attacks.length),
                attacks: attacks.map(attack => ({
                    defenderTag: attack.defenderTag,
                    stars: attack.stars,
                    destructionPercentage: attack.destructionPercentage
                }))
            };
        }).sort((a, b) => (a.mapPosition || 0) - (b.mapPosition || 0));
        const allAttacks = members.flatMap(member =>
            member.attacks.map(attack => ({ ...attack, attackerTag: member.tag, attackerName: member.name })));
        const opponentMembers = (opponent.members || []).map(member => {
            const incoming = allAttacks.filter(attack => attack.defenderTag === member.tag);
            const best = incoming.reduce((current, attack) => {
                if (!current) return attack;
                if ((attack.stars || 0) !== (current.stars || 0)) {
                    return (attack.stars || 0) > (current.stars || 0) ? attack : current;
                }
                return (attack.destructionPercentage || 0) > (current.destructionPercentage || 0) ? attack : current;
            }, null);
            return {
                tag: member.tag,
                name: member.name,
                mapPosition: member.mapPosition,
                townhallLevel: member.townhallLevel,
                attacksReceived: incoming.length,
                bestStars: best?.stars || 0,
                bestDestruction: best?.destructionPercentage || 0,
                bestAttackerName: best?.attackerName || null
            };
        }).sort((a, b) => (a.mapPosition || 0) - (b.mapPosition || 0));
        const used = members.reduce((sum, member) => sum + member.attacksUsed, 0);
        res.json({
            state,
            type: isCwl ? 'CWL' : 'Perang biasa',
            round,
            availableRounds,
            startTime: data.startTime,
            endTime: data.endTime,
            teamSize: data.teamSize,
            attacksPerMember,
            attacksUsed: used,
            attacksRemaining: attacksPerMember === null ? null : members.reduce((sum, member) => sum + member.attacksRemaining, 0),
            clan: { name: clan.name, tag: clan.tag, stars: clan.stars || 0, destructionPercentage: clan.destructionPercentage || 0, attacks: clan.attacks || used },
            opponent: { name: opponent.name, tag: opponent.tag, stars: opponent.stars || 0, destructionPercentage: opponent.destructionPercentage || 0, attacks: opponent.attacks || 0 },
            members,
            opponentMembers,
            lastUpdated
        });
    } catch (error) {
        sendError(res, error, true);
    }
});

app.get('/api/clan/:tag/cwl/performance', async (req, res) => {
    const path = clanPath(req, res);
    if (!path) return;
    const tag = normalizeTag(req.params.tag);
    try {
        const { availableRounds, wars, lastUpdated } = await fetchCwlWars(path, tag);
        for (const war of wars) await archiveWar(tag, war, 'CWL', war.round);
        const roundSummaries = wars.map(entry => summarizeWarForClan(entry, tag));
        const players = new Map();

        for (const round of roundSummaries) {
            for (const member of round.members) {
                const player = players.get(member.tag) || {
                    tag: member.tag,
                    name: member.name,
                    townhallLevel: member.townhallLevel,
                    totals: { attacks: 0, stars: 0, destructionSum: 0, roundsPlayed: 0, missed: 0 },
                    rounds: []
                };
                player.name = member.name;
                player.townhallLevel = member.townhallLevel;
                player.totals.attacks += member.attacks;
                player.totals.stars += member.stars;
                player.totals.destructionSum += member.destructionAverage * member.attacks;
                if (member.attacks > 0) player.totals.roundsPlayed += 1;
                else player.totals.missed += 1;
                player.rounds.push({
                    round: round.round,
                    opponent: round.opponent,
                    state: round.state,
                    attacks: member.attacks,
                    stars: member.stars,
                    destructionAverage: member.destructionAverage
                });
                players.set(member.tag, player);
            }
        }

        const playerSummaries = [...players.values()].map(player => ({
            ...player,
            totals: {
                ...player.totals,
                destructionAverage: player.totals.attacks
                    ? Number((player.totals.destructionSum / player.totals.attacks).toFixed(2))
                    : 0,
                starsPerAttack: player.totals.attacks
                    ? Number((player.totals.stars / player.totals.attacks).toFixed(2))
                    : 0
            }
        })).sort((a, b) =>
            b.totals.stars - a.totals.stars ||
            b.totals.starsPerAttack - a.totals.starsPerAttack ||
            b.totals.destructionAverage - a.totals.destructionAverage ||
            a.name.localeCompare(b.name));

        res.json({
            type: 'CWL',
            availableRounds,
            rounds: roundSummaries.map(round => ({
                round: round.round,
                state: round.state,
                opponent: round.opponent,
                clanStars: round.clanStars,
                opponentStars: round.opponentStars,
                clanDestruction: round.clanDestruction,
                opponentDestruction: round.opponentDestruction
            })),
            players: playerSummaries,
            lastUpdated
        });
    } catch (error) {
        sendError(res, error, true);
    }
});

app.get('/api/clan/:tag', async (req, res) => {
    const path = clanPath(req, res);
    if (!path) return;
    try {
        const tag = normalizeTag(req.params.tag);
        const { data } = await fetchCoC(path);
        const snapshot = await saveDailySnapshot(tag, data);
        res.json({ ...data, snapshotDate: snapshot.date });
    } catch (error) {
        sendError(res, error);
    }
});

app.get('/api/clan/:tag/health', async (req, res) => {
    const tag = normalizeTag(req.params.tag);
    if (!tag) return res.status(400).json({ error: 'Tag klan tidak valid.' });
    try {
        const snapshots = await readSnapshots(tag);
        res.json(buildHealthReport(tag, snapshots));
    } catch (error) {
        sendError(res, error);
    }
});

app.get('/api/clan/:tag/health.csv', async (req, res) => {
    const tag = normalizeTag(req.params.tag);
    if (!tag) return res.status(400).type('text/plain').send('Tag klan tidak valid.');
    try {
        const report = buildHealthReport(tag, await readSnapshots(tag));
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="clan-health-${tag}-${todayKey()}.csv"`);
        res.send(healthReportCsv(report));
    } catch (error) {
        const status = error.response?.status || 500;
        res.status(status).type('text/plain').send('Gagal membuat laporan CSV.');
    }
});

app.get('/api/player/:tag/progress', async (req, res) => {
    const path = playerPath(req, res);
    if (!path) return;
    try {
        const { data, lastUpdated } = await fetchCoC(path);
        res.json({ ...buildPlayerProgress(data), lastUpdated });
    } catch (error) {
        sendError(res, error);
    }
});

app.get('/api/player/:tag/profile', async (req, res) => {
    const path = playerPath(req, res);
    if (!path) return;
    try {
        const { data, lastUpdated } = await fetchCoC(path);
        res.json(buildPlayerProfile(data, lastUpdated));
    } catch (error) {
        sendError(res, error);
    }
});

app.get('/api/player/:tag/performance', async (req, res) => {
    const playerTag = normalizeTag(req.params.tag);
    const clanTag = normalizeTag(req.query.clan);
    if (!playerTag || !clanTag) return res.status(400).json({ error: 'Tag pemain dan klan harus valid.' });
    try {
        const [wars, snapshots] = await Promise.all([readWarArchive(clanTag), readSnapshots(clanTag)]);
        res.json(buildPlayerWarPerformance(playerTag, clanTag, wars, snapshots));
    } catch (error) {
        sendError(res, error);
    }
});

if (require.main === module) {
    app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));
}

module.exports = app;
