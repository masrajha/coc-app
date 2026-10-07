<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use CocTracker\App;
use Slim\Psr7\Factory\ServerRequestFactory;

$dataDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'coc-php-smoke-' . bin2hex(random_bytes(4));
$_ENV['DATA_DIR'] = $dataDir;
putenv('DATA_DIR=' . $dataDir);
$warDir = $dataDir . '/wars';
mkdir($warDir, 0775, true);
$snapshotDir = $dataDir . '/snapshots';
mkdir($snapshotDir, 0775, true);
file_put_contents($snapshotDir . '/2GPP802UU.json', json_encode(['clanTag' => '#2GPP802UU', 'snapshots' => [
    ['date' => '2026-10-05', 'capturedAt' => '2026-10-05T00:00:00Z', 'clan' => ['tag' => '#2GPP802UU', 'name' => 'Top Clan', 'level' => 20, 'members' => 50]],
    ['date' => '2026-10-06', 'capturedAt' => '2026-10-06T00:00:00Z', 'clan' => ['tag' => '#2GPP802UU', 'name' => 'Top Clan', 'level' => 20, 'members' => 50]],
]]));
file_put_contents($snapshotDir . '/9RU089PG.json', json_encode(['clanTag' => '#9RU089PG', 'snapshots' => [
    ['date' => '2026-10-06', 'capturedAt' => '2026-10-06T01:00:00Z', 'clan' => ['tag' => '#9RU089PG', 'name' => 'Home', 'level' => 18, 'members' => 42]],
]]));
file_put_contents($warDir . '/2GPP802UU.json', json_encode(['clanTag' => '#2GPP802UU', 'wars' => [[
    'id' => 'War:20261001:OTHER1', 'type' => 'War', 'state' => 'warEnded',
    'startTime' => '20261001T000000.000Z', 'endTime' => '20261002T000000.000Z',
    'opponent' => ['tag' => '#OTHER1', 'name' => 'Musuh Satu'], 'attacksPerMember' => 2,
    'members' => [['tag' => '#2GPP802UU', 'name' => 'Test', 'attacks' => [['stars' => 3, 'destructionPercentage' => 100]]]]
]]]));
file_put_contents($warDir . '/9RU089PG.json', json_encode(['clanTag' => '#9RU089PG', 'wars' => [[
    'id' => 'CWL:20261003:OTHER2', 'type' => 'CWL', 'round' => 2, 'state' => 'warEnded',
    'startTime' => '20261003T000000.000Z', 'endTime' => '20261004T000000.000Z',
    'opponent' => ['tag' => '#OTHER2', 'name' => 'Musuh Dua'], 'attacksPerMember' => 1,
    'members' => [['tag' => '#2GPP802UU', 'name' => 'Test', 'attacks' => [['stars' => 2, 'destructionPercentage' => 88]]]]
]]]));
$app = App::create();
$factory = new ServerRequestFactory();
$cacheDir = $dataDir . '/cache';
if (!is_dir($cacheDir)) mkdir($cacheDir, 0775, true);
$seedApiCache = static function (string $path, array $data) use ($cacheDir): void {
    file_put_contents($cacheDir . '/' . hash('sha256', $path) . '.json', json_encode([
        'expires' => time() + 120,
        'entry' => ['lastUpdated' => gmdate('c'), 'data' => $data]
    ]));
};
$seedApiCache('/locations?limit=100', ['items' => [
    ['id' => '32000066', 'name' => 'Grenada', 'isCountry' => true]
], 'paging' => ['cursors' => ['after' => 'eyJwb3MiOjEwMH0']]]);
$seedApiCache('/locations?limit=100&after=eyJwb3MiOjEwMH0', ['items' => [
    ['id' => '32000000', 'name' => 'Indonesia', 'isCountry' => true]
]]);
$seedApiCache('/locations/global/rankings/players?limit=25', ['items' => [
    ['tag' => '#2GPP802UU', 'name' => 'Top Player', 'rank' => 1, 'trophies' => 6000, 'attackWins' => 125, 'defenseWins' => 34,
        'clan' => ['tag' => '#2GPP802UU', 'name' => 'Top Clan'],
        'league' => ['name' => 'Unranked'], 'leagueTier' => ['name' => 'Legend I']]
]]);
$seedApiCache('/clans/%232GPP802UU', [
    'tag' => '#2GPP802UU', 'name' => 'Top Clan', 'location' => ['id' => 32000000, 'name' => 'Indonesia', 'isCountry' => true]
]);
$seedApiCache('/clans/%239RU089PG', ['tag' => '#9RU089PG', 'name' => 'Home', 'warLeague' => ['name' => 'Master League I']]);
$seedApiCache('/clans/%239RU089PG/currentwar/leaguegroup', ['state' => 'inWar', 'season' => '2026-10', 'clans' => [
    ['tag' => '#9RU089PG', 'name' => 'Home'], ['tag' => '#2GPP802UU', 'name' => 'Away']
], 'rounds' => [
    ['warTags' => ['#WARROUND1']], ['warTags' => ['#WARROUND2']], ['warTags' => ['#WARROUND3']]
]]);
$seedApiCache('/clanwarleagues/wars/%23WARROUND1', [
    'state' => 'warEnded', 'clan' => ['tag' => '#9RU089PG', 'name' => 'Home', 'stars' => 10, 'destructionPercentage' => 90, 'members' => [['attacks' => [['destructionPercentage' => 90]]]]],
    'opponent' => ['tag' => '#2GPP802UU', 'name' => 'Away', 'stars' => 8, 'destructionPercentage' => 80, 'members' => [['attacks' => [['destructionPercentage' => 80]]]]]
]);
$seedApiCache('/clanwarleagues/wars/%23WARROUND2', [
    'state' => 'inWar', 'teamSize' => 1, 'startTime' => '20261006T000000.000Z', 'endTime' => '20261007T000000.000Z',
    'clan' => ['tag' => '#9RU089PG', 'name' => 'Home', 'stars' => 7, 'destructionPercentage' => 70, 'members' => [['attacks' => [['destructionPercentage' => 70]]]]],
    'opponent' => ['tag' => '#2GPP802UU', 'name' => 'Away', 'stars' => 9, 'destructionPercentage' => 88, 'members' => [['attacks' => [['destructionPercentage' => 88]]]]]
]);
$seedApiCache('/clanwarleagues/wars/%23WARROUND3', [
    'state' => 'preparation', 'clan' => ['tag' => '#9RU089PG', 'name' => 'Home', 'stars' => 12, 'destructionPercentage' => 95],
    'opponent' => ['tag' => '#2GPP802UU', 'name' => 'Away', 'stars' => 6, 'destructionPercentage' => 60]
]);
$seedApiCache('/locations/global/rankings/clans?limit=25', ['items' => [
    ['tag' => '#2GPP802UU', 'name' => 'Top Clan', 'rank' => 1, 'clanLevel' => 20, 'members' => 50, 'clanPoints' => 50000]
]]);
$iconDir = dirname(__DIR__) . '/public/icons';
if (!is_dir($iconDir)) mkdir($iconDir, 0775, true);
$iconPath = $iconDir . '/' . hash('sha256', 'heroes:Test Icon') . '.png';
$iconBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVZkAAAAASUVORK5CYII=', true);
file_put_contents($iconPath, $iconBytes);
$playerPath = '/players/%232GPP802UU';
$seedApiCache($playerPath, [
    'tag' => '#2GPP802UU', 'name' => 'Test', 'townHallLevel' => 18,
    'clan' => ['tag' => '#9RU089PG', 'name' => 'Test Clan'],
    'leagueTier' => ['id' => 105000035, 'name' => 'Legend II'],
    'currentLeagueGroupTag' => '#8URPQL0', 'currentLeagueSeasonId' => 1791176400,
    'previousLeagueGroupTag' => '#8U89LYJ', 'previousLeagueSeasonId' => 1790571600,
    'heroes' => [['name' => 'Test Icon', 'level' => 1, 'maxLevel' => 1, 'village' => 'home']]
]);
$currentMembers = [];
for ($rank = 1; $rank <= 60; $rank++) {
    $currentMembers[] = ['playerTag' => $rank === 30 ? '#2GPP802UU' : ($rank === 1 ? '#2R92VJG0U' : '#2P' . $rank),
        'playerName' => 'Player ' . $rank, 'clanTag' => '#2GPP802UU', 'clanName' => 'Test Clan',
        'leagueTrophies' => 7000 - $rank, 'attackWinCount' => 4, 'attackLoseCount' => 1,
        'defenseWinCount' => 3, 'defenseLoseCount' => 2];
}
$seedApiCache('/leaguegroup/%238URPQL0/1791176400?playerTag=%232GPP802UU', ['members' => array_reverse($currentMembers),
    'attackLogs' => [['stars' => 3, 'destructionPercentage' => 100], ['stars' => 2, 'destructionPercentage' => 80]],
    'defenseLogs' => [['stars' => 2, 'destructionPercentage' => 70]]]);
$seedApiCache('/leaguegroup/%238URPQL0/1791176400?playerTag=%232R92VJG0U', ['members' => $currentMembers,
    'attackLogs' => [], 'defenseLogs' => [['stars' => 3, 'destructionPercentage' => 90]]]);
$seedApiCache('/leaguegroup/%238U89LYJ/1790571600?playerTag=%232GPP802UU', ['members' => [
    ['playerTag' => '#2GPP802UU', 'playerName' => 'Test', 'leagueTrophies' => 6200]
]]);
$seedApiCache('/players/%232R92VJG0U', [
    'tag' => '#2R92VJG0U', 'name' => 'Previous Only', 'townHallLevel' => 18,
    'leagueTier' => ['name' => 'Legend I'], 'currentLeagueGroupTag' => '#0',
    'currentLeagueSeasonId' => 1791176400,
    'previousLeagueGroupTag' => '#8U89LYJ', 'previousLeagueSeasonId' => 1790571600
]);
$seedApiCache('/leaguegroup/%238U89LYJ/1790571600?playerTag=%232R92VJG0U', ['members' => [
    ['playerTag' => '#2R92VJG0U', 'playerName' => 'Previous Only', 'leagueTrophies' => 6100]
]]);

$checks = [
    '/' => [200, 'text/html'],
    '/player.html' => [200, 'text/html'],
    '/compare.html' => [200, 'text/html'],
    '/player.css' => [200, 'text/css'],
    '/player-league.css' => [200, 'text/css'],
    '/player-league.js' => [200, 'text/javascript'],
    '/donation.css' => [200, 'text/css'],
    '/donation.js' => [200, 'text/javascript'],
    '/recent.js' => [200, 'text/javascript'],
    '/cwl-master-1.png' => [200, 'image/png'],
    '/cwl-legend.png' => [200, 'image/png'],
    '/league-legend.png' => [200, 'image/png'],
    '/league-electro-dragon.png' => [200, 'image/png'],
    '/rankings.js' => [200, 'text/javascript'],
    '/api/clan/INVALID' => [400, 'application/json'],
    '/api/clan/2GPP802UU/summary' => [200, 'application/json'],
    '/api/clan/INVALID/summary' => [400, 'application/json'],
    '/api/player/INVALID/profile' => [400, 'application/json'],
    '/api/player/2GPP802UU/war-history' => [200, 'application/json'],
    '/api/player/INVALID/war-history' => [400, 'application/json'],
    '/api/player/INVALID/league-group' => [400, 'application/json'],
    '/api/player/2GPP802UU/league-group?session=invalid' => [400, 'application/json'],
    '/api/player/2R92VJG0U/league-group?session=current' => [404, 'application/json'],
    '/api/player-icon?name=Giant%20Arrow&section=invalid' => [400, ''],
    '/api/rankings/locations' => [200, 'application/json'],
    '/api/rankings/players?location=global&limit=25' => [200, 'application/json'],
    '/api/rankings/clans?location=global&limit=25' => [200, 'application/json'],
    '/api/rankings/unknown' => [400, 'application/json'],
    '/api/rankings/players?location=bad%2Fpath' => [400, 'application/json'],
    '/api/clans/popular' => [200, 'application/json'],
    '/api/clan/2GPP802UU/health' => [200, 'application/json'],
    '/api/clan/2GPP802UU/health.csv' => [200, 'text/csv'],
    '/api/clan/9RU089PG/war?round=2' => [200, 'application/json'],
    '/api/clan/9RU089PG/cwl/standings' => [200, 'application/json']
];

try {
    foreach ($checks as $uri => [$expectedStatus, $contentType]) {
        $request = $factory->createServerRequest('GET', $uri);
        $response = $app->handle($request);
        $actualStatus = $response->getStatusCode();
        $actualType = $response->getHeaderLine('Content-Type');
        if ($actualStatus !== $expectedStatus || !str_contains($actualType, $contentType)) {
            throw new RuntimeException(sprintf('%s expected %d / %s, got %d / %s', $uri, $expectedStatus, $contentType, $actualStatus, $actualType));
        }
    }
    $home = (string)$app->handle($factory->createServerRequest('GET', '/'))->getBody();
    foreach ([
        'preserveContent = false',
        "showWarStatus('Memuat data perang...', true)",
        'const isSelected = choice.value === selectedRound',
        "setAttribute('aria-pressed', String(isSelected))",
        "setAttribute('aria-current', 'true')",
        'cwlStandingsSection',
        'cwl/standings',
        'Peringkat CWL',
        'cwlLeagueIcons',
        'cwl-master-1.png'
    ] as $marker) {
        if (!str_contains($home, $marker)) throw new RuntimeException('Navigasi CWL tidak mempertahankan konten atau highlight round terpilih.');
    }
    $playerPage = (string)$app->handle($factory->createServerRequest('GET', '/player.html'))->getBody();
    $comparePage = (string)$app->handle($factory->createServerRequest('GET', '/compare.html'))->getBody();
    foreach ([$home, $playerPage, $comparePage] as $page) {
        foreach (['/donation.css', '/donation.js', 'Dukung pengembangan'] as $marker) {
            if (!str_contains($page, $marker)) throw new RuntimeException('Kontrol donasi belum tersedia di seluruh halaman.');
        }
    }
    foreach (['landing-sidebar', 'recentClans', 'recentPlayers', 'popularClans', 'Clan populer', 'Pantau clan, war, dan progres pemain.', '/recent.js', 'RecentlyOpened', '/api/clans/popular'] as $marker) {
        if (!str_contains($home, $marker)) throw new RuntimeException('Landing operasional atau riwayat terakhir dibuka belum tersedia.');
    }
    foreach ([
        [$home, '/index.css', 'public/index.css'],
        [$home, '/rankings.js', 'public/rankings.js'],
        [$playerPage, '/player.css', 'public/player.css'],
        [$playerPage, '/player-league.js', 'public/player-league.js'],
        [$comparePage, '/compare.css', 'public/compare.css'],
        [$comparePage, '/compare.js', 'public/compare.js']
    ] as [$pageHtml, $assetUrl, $assetFile]) {
        $version = substr(hash_file('sha256', dirname(__DIR__) . '/' . $assetFile), 0, 16);
        if (!str_contains($pageHtml, $assetUrl . '?v=' . $version)) {
            throw new RuntimeException('URL asset tidak memiliki versi konten yang benar: ' . $assetFile);
        }
    }
    foreach (['data-tab="league"', 'leagueComparisonGrid', 'Performa liga'] as $marker) {
        if (!str_contains($comparePage, $marker)) throw new RuntimeException('Panel perbandingan Ranked League tidak tersedia: ' . $marker);
    }
    $compareScript = (string)$app->handle($factory->createServerRequest('GET', '/compare.js'))->getBody();
    foreach (['/war-history', 'leagueTier', 'attackWins', 'defenseWins', 'Bintang / serangan', 'Ketiadaan arsip tidak berarti', 'leagueSession${side}', 'leagueResult${side}'] as $marker) {
        if (!str_contains($compareScript, $marker)) throw new RuntimeException('Perbandingan War/Ranked League tidak lengkap: ' . $marker);
    }
    $compareStyles = (string)$app->handle($factory->createServerRequest('GET', '/compare.css'))->getBody();
    if (!str_contains($compareStyles, '.league-comparison-grid') || !str_contains($compareStyles, '.war-player-history')) {
        throw new RuntimeException('Style panel comparison War/Ranked League tidak tersedia.');
    }
    $playerScript = (string)$app->handle($factory->createServerRequest('GET', '/player.js'))->getBody();
    foreach ([
        'if (!clanTag && playerClanTag) clanTag = playerClanTag;',
        'backLink.href = `/?clan=${encodeURIComponent(clanTag)}`',
        'clanLink.href = `/?clan=${encodeURIComponent(playerClanTag)}`'
    ] as $marker) {
        if (!str_contains($playerScript, $marker)) throw new RuntimeException('Navigasi profil tidak menggunakan tag clan dari data pemain.');
    }
    $htmlResponse = $app->handle($factory->createServerRequest('GET', '/'));
    $assetResponse = $app->handle($factory->createServerRequest('GET', '/index.css'));
    if (!str_contains($htmlResponse->getHeaderLine('Cache-Control'), 'no-cache')
        || !str_contains($assetResponse->getHeaderLine('Cache-Control'), 'immutable')
        || $assetResponse->getHeaderLine('ETag') === '') {
        throw new RuntimeException('Header cache HTML/CSS tidak mendukung asset versioning.');
    }
    foreach (['leagueSession', 'leagueMembers', 'leaguePrev', 'leagueNext', 'leagueRankSummary', 'leagueSidebarEyebrow', 'playerLeagueBadge', 'sidebarLeagueBadge', '/player-league.js'] as $marker) {
        if (!str_contains($playerPage, $marker)) throw new RuntimeException('Kontrol peringkat grup liga tidak tersedia: ' . $marker);
    }
    $leagueScript = (string)$app->handle($factory->createServerRequest('GET', '/player-league.js'))->getBody();
    foreach (["className = 'league-battle-info'", 'showBattle(member, row, true, info)', "aria-haspopup', 'dialog'", "event.key === 'Escape'", 'state.pinned'] as $marker) {
        if (!str_contains($leagueScript, $marker)) throw new RuntimeException('Popup detail pertempuran belum mendukung interaksi tap: ' . $marker);
    }
    $leagueStyles = (string)$app->handle($factory->createServerRequest('GET', '/player-league.css'))->getBody();
    if (!str_contains($leagueStyles, '@media(hover:none)') || !str_contains($leagueStyles, '.league-battle-info{display:inline-grid')) {
        throw new RuntimeException('Ikon popup tidak diaktifkan untuk perangkat layar sentuh.');
    }
    foreach (['landingPanel', 'homeClanTab', 'homePlayerTab', 'homeCompareTab', 'clanTagInput', 'playerTagInput', 'comparePlayerOne', 'comparePlayerTwo', 'searchButton', 'rankingsPanel', 'rankingPlayersTab', 'rankingClansTab', 'rankingLocation', 'joinClanLink', 'OpenClanProfile', 'Join Clan'] as $marker) {
        if (!str_contains($home, $marker)) throw new RuntimeException('Homepage kehilangan kontrol leaderboard: ' . $marker);
    }
    foreach (["location.href = `/?clan=", "location.href = `/player.html?tag=", "location.href = `/compare.html?"] as $marker) {
        if (!str_contains($home, $marker)) throw new RuntimeException('Form pencarian home tidak mengarah ke halaman tujuan yang tersedia.');
    }
    if (!str_contains($home, 'href="/" class="home-brand"') || !str_contains($home, 'aria-label="Kembali ke home"')) {
        throw new RuntimeException('Navigasi kembali ke home tidak tersedia di header.');
    }
    $rankingScript = (string)$app->handle($factory->createServerRequest('GET', '/rankings.js'))->getBody();
    foreach (["'Lokasi'", "'Attacks'", "'Defenses'", "clan?.tag ? 'Memuat…' : 'Tidak tersedia'", '/summary', 'data.location?.name', 'item.attackWins', 'item.defenseWins', 'item.leagueTier?.name'] as $marker) {
        if (!str_contains($rankingScript, $marker)) throw new RuntimeException('Leaderboard pemain tidak menampilkan kolom ranking yang diharapkan.');
    }
    if (str_contains($rankingScript, 'townhall-cell') || str_contains($rankingScript, "'Town Hall'")) {
        throw new RuntimeException('Kolom Town Hall seharusnya tidak lagi ada di leaderboard.');
    }
    if (!preg_match('/const initialClan = new URLSearchParams\(location\.search\)\.get\([\'\"]clan[\'\"]\);[\s\S]*?if \(initialClan\) \{\s*document\.getElementById\([\'\"]landingPanel[\'\"]\)\.hidden = true;\s*document\.getElementById\([\'\"]rankingsPanel[\'\"]\)\.hidden = true;/', $home)) {
        throw new RuntimeException('Leaderboard tidak disembunyikan saat URL memiliki parameter clan.');
    }
    $locations = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/rankings/locations'))->getBody(), true);
    $locationNames = array_column($locations['items'], 'name');
    if (!in_array('Grenada', $locationNames, true) || !in_array('Indonesia', $locationNames, true) || count($locationNames) !== 2) {
        throw new RuntimeException('Pagination daftar lokasi ranking tidak digabungkan.');
    }
    foreach (['players' => 'Top Player', 'clans' => 'Top Clan'] as $type => $expectedName) {
        $ranking = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/rankings/' . $type . '?location=global&limit=25'))->getBody(), true);
        if (($ranking['items'][0]['name'] ?? null) !== $expectedName || ($ranking['location'] ?? null) !== 'global') {
            throw new RuntimeException('Leaderboard ' . $type . ' tidak dipetakan dengan benar.');
        }
    }
    $popularClans = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/clans/popular'))->getBody(), true);
    if (($popularClans['items'][0]['tag'] ?? null) !== '#2GPP802UU' || ($popularClans['items'][0]['snapshotCount'] ?? null) !== 2) {
        throw new RuntimeException('Clan populer tidak diurutkan berdasarkan jumlah snapshot.');
    }
    $playerRanking = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/rankings/players?location=global&limit=25'))->getBody(), true);
    if (($playerRanking['items'][0]['leagueTier']['name'] ?? null) !== 'Legend I') throw new RuntimeException('League tier API tidak diteruskan pada ranking pemain.');
    $clanSummary = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/clan/2GPP802UU/summary'))->getBody(), true);
    if (($clanSummary['location']['name'] ?? null) !== 'Indonesia') throw new RuntimeException('Negara klan tidak tersedia untuk kolom lokasi pemain.');
    $selectedWar = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/clan/9RU089PG/war?round=2'))->getBody(), true);
    if (($selectedWar['round'] ?? null) !== 2 || ($selectedWar['availableRounds'] ?? null) !== [1, 2, 3] || ($selectedWar['type'] ?? null) !== 'CWL') {
        throw new RuntimeException('Daftar round CWL hilang dari respons saat round tertentu dipilih.');
    }
    $standings = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/clan/9RU089PG/cwl/standings'))->getBody(), true);
    if (($standings['league'] ?? null) !== 'Master League I' || ($standings['standings'][0]['tag'] ?? null) !== '#9RU089PG'
        || ($standings['standings'][0]['stars'] ?? null) !== 27 || ($standings['standings'][0]['destruction'] ?? null) != 160
        || ($standings['standings'][0]['rank'] ?? null) !== 1 || ($standings['standings'][1]['rank'] ?? null) !== 2) {
        throw new RuntimeException('Peringkat CWL tidak menghitung akumulasi bintang dan destruksi dengan benar.');
    }
    $icon = $app->handle($factory->createServerRequest('GET', '/api/player-icon?name=Test%20Icon&section=heroes'));
    if ($icon->getStatusCode() !== 200 || $icon->getHeaderLine('Content-Type') !== 'image/png' || (string)$icon->getBody() !== $iconBytes) {
        throw new RuntimeException('Ikon lokal tidak disajikan dengan benar.');
    }
    $profileResponse = $app->handle($factory->createServerRequest('GET', '/api/player/2GPP802UU/profile'));
    $profile = json_decode((string)$profileResponse->getBody(), true);
    if ($profileResponse->getStatusCode() !== 200 || ($profile['army']['heroes'][0]['iconUrls'][0] ?? null) !== '/public/icons/' . basename($iconPath)) {
        throw new RuntimeException('Profil tidak memprioritaskan ikon lokal.');
    }
    if (($profile['player']['clan']['tag'] ?? null) !== '#9RU089PG') throw new RuntimeException('Profil API kehilangan tag clan pemain.');
    if (($profile['player']['leagueTier']['name'] ?? null) !== 'Legend II' || count($profile['player']['leagueSessions'] ?? []) !== 2) {
        throw new RuntimeException('Sesi grup liga tidak tersedia pada profil.');
    }
    $group = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/player/2GPP802UU/league-group?session=current'))->getBody(), true);
    if (($group['playerRank'] ?? null) !== 30 || ($group['totalMembers'] ?? null) !== 60 || ($group['members'][0]['rank'] ?? null) !== 1
        || ($group['members'][0]['attackCount'] ?? null) !== 5 || ($group['members'][0]['defenseCount'] ?? null) !== 5) {
        throw new RuntimeException('Peringkat grup sesi saat ini tidak dihitung dengan benar.');
    }
    $battle = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/player/2GPP802UU/league-group?session=current&detail=battle&memberTag=2GPP802UU'))->getBody(), true);
    if (($battle['attack']['starsAverage'] ?? null) !== 2.5 || ($battle['attack']['destructionAverage'] ?? null) != 90
        || ($battle['defense']['destructionAverage'] ?? null) != 70) {
        throw new RuntimeException('Rata-rata detail pertempuran tidak dihitung dengan benar.');
    }
    if (($battle['leagueTier'] ?? null) !== 'Legend II' || ($battle['playerRank'] ?? null) !== 30
        || ($battle['player']['attackCount'] ?? null) !== 5 || ($battle['player']['defenseCount'] ?? null) !== 5) {
        throw new RuntimeException('Detail Ranked League tidak menyertakan liga, rank, dan jumlah battle.');
    }
    $otherBattle = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/player/2GPP802UU/league-group?session=current&detail=battle&memberTag=2R92VJG0U'))->getBody(), true);
    if (($otherBattle['attack']['sampleSize'] ?? null) !== 0 || !array_key_exists('starsAverage', $otherBattle['attack'])
        || $otherBattle['attack']['starsAverage'] !== null || ($otherBattle['defense']['destructionAverage'] ?? null) != 90) {
        throw new RuntimeException('Detail pemain lain atau riwayat kosong tidak ditangani dengan benar.');
    }
    $previous = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/player/2GPP802UU/league-group?session=previous'))->getBody(), true);
    if (($previous['playerRank'] ?? null) !== 1 || ($previous['session']['id'] ?? null) !== 'previous') {
        throw new RuntimeException('Peringkat sesi terakhir tidak tersedia.');
    }
    $previousOnly = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/player/2R92VJG0U/profile'))->getBody(), true);
    if (($previousOnly['player']['leagueSessions'][0]['id'] ?? null) !== 'previous' || count($previousOnly['player']['leagueSessions'] ?? []) !== 1) {
        throw new RuntimeException('Profil tanpa grup saat ini harus menampilkan sesi terakhir.');
    }
    $previousOnlyGroup = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/player/2R92VJG0U/league-group?session=previous'))->getBody(), true);
    if (($previousOnlyGroup['playerRank'] ?? null) !== 1) throw new RuntimeException('Sesi terakhir pemain tanpa grup saat ini gagal dimuat.');
    $warHistory = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/player/2GPP802UU/war-history'))->getBody(), true);
    if (($warHistory['summary']['wars'] ?? null) !== 2 || ($warHistory['summary']['attacks'] ?? null) !== 2
        || count($warHistory['archiveClans'] ?? []) !== 2
        || !in_array('#2GPP802UU', $warHistory['archiveClans'], true)
        || !in_array('#9RU089PG', $warHistory['archiveClans'], true)) {
        throw new RuntimeException('Riwayat War/CWL tidak dikumpulkan dari arsip lintas clan.');
    }
    $source = (new ReflectionClass(App::class))->newInstanceWithoutConstructor();
    $sourceType = new ReflectionClass(App::class);
    $sourceType->getProperty('dataDir')->setValue($source, $dataDir);
    $sourceType->getProperty('cache')->setValue($source, []);
    $path = '/leaguegroup/%238YGL882/1790571600?playerTag=%23YJPRUUPUG';
    file_put_contents($cacheDir . '/' . hash('sha256', $path) . '.json', json_encode([
        'expires' => time() - 1, 'entry' => ['data' => ['members' => [['playerTag' => '#YJPRUUPUG']]], 'lastUpdated' => '2026-10-05T00:00:00Z']
    ]));
    $timeout = new GuzzleHttp\Exception\ConnectException('Operation timed out', new GuzzleHttp\Psr7\Request('GET', 'https://api.clashofclans.com/v1' . $path));
    $mock = new GuzzleHttp\Handler\MockHandler([$timeout]);
    $sourceType->getProperty('http')->setValue($source, new GuzzleHttp\Client(['handler' => GuzzleHttp\HandlerStack::create($mock)]));
    $originalToken = $_ENV['COC_API_TOKEN'] ?? null;
    $_ENV['COC_API_TOKEN'] = 'smoke-test-token';
    try {
        $stale = $sourceType->getMethod('upstream')->invoke($source, $path, 100, 0, 30 * 86400, true);
        if (($stale['stale'] ?? false) !== true || ($stale['data']['members'][0]['playerTag'] ?? null) !== '#YJPRUUPUG') {
            throw new RuntimeException('Data grup tersimpan tidak digunakan saat API timeout.');
        }
    } finally {
        if ($originalToken === null) unset($_ENV['COC_API_TOKEN']); else $_ENV['COC_API_TOKEN'] = $originalToken;
    }
    echo 'PHP smoke tests passed (' . (count($checks) + 6) . " routes).\n";
} finally {
    @unlink($iconPath);
    if (is_dir($dataDir)) {
        $items = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dataDir, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
        foreach ($items as $item) $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        rmdir($dataDir);
    }
    putenv('DATA_DIR');
    unset($_ENV['DATA_DIR']);
}
