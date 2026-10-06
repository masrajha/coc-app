<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use CocTracker\App;
use Slim\Psr7\Factory\ServerRequestFactory;

$dataDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'coc-php-smoke-' . bin2hex(random_bytes(4));
$_ENV['DATA_DIR'] = $dataDir;
putenv('DATA_DIR=' . $dataDir);
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
    '/league-legend.png' => [200, 'image/png'],
    '/league-electro-dragon.png' => [200, 'image/png'],
    '/rankings.js' => [200, 'text/javascript'],
    '/api/clan/INVALID' => [400, 'application/json'],
    '/api/clan/2GPP802UU/summary' => [200, 'application/json'],
    '/api/clan/INVALID/summary' => [400, 'application/json'],
    '/api/player/INVALID/profile' => [400, 'application/json'],
    '/api/player/INVALID/league-group' => [400, 'application/json'],
    '/api/player/2GPP802UU/league-group?session=invalid' => [400, 'application/json'],
    '/api/player/2R92VJG0U/league-group?session=current' => [404, 'application/json'],
    '/api/player-icon?name=Giant%20Arrow&section=invalid' => [400, ''],
    '/api/rankings/locations' => [200, 'application/json'],
    '/api/rankings/players?location=global&limit=25' => [200, 'application/json'],
    '/api/rankings/clans?location=global&limit=25' => [200, 'application/json'],
    '/api/rankings/unknown' => [400, 'application/json'],
    '/api/rankings/players?location=bad%2Fpath' => [400, 'application/json'],
    '/api/clan/2GPP802UU/health' => [200, 'application/json'],
    '/api/clan/2GPP802UU/health.csv' => [200, 'text/csv']
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
    $playerPage = (string)$app->handle($factory->createServerRequest('GET', '/player.html'))->getBody();
    foreach (['leagueSession', 'leagueMembers', 'leaguePrev', 'leagueNext', 'leagueRankSummary', 'leagueSidebarEyebrow', 'playerLeagueBadge', 'sidebarLeagueBadge', '/player-league.js'] as $marker) {
        if (!str_contains($playerPage, $marker)) throw new RuntimeException('Kontrol peringkat grup liga tidak tersedia: ' . $marker);
    }
    foreach (['rankingsPanel', 'rankingPlayersTab', 'rankingClansTab', 'rankingLocation'] as $marker) {
        if (!str_contains($home, $marker)) throw new RuntimeException('Homepage kehilangan kontrol leaderboard: ' . $marker);
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
    if (!preg_match('/const initialClan = new URLSearchParams\(location\.search\)\.get\([\'\"]clan[\'\"]\);[\s\S]*?if \(initialClan\) \{\s*document\.getElementById\([\'\"]rankingsPanel[\'\"]\)\.hidden = true;/', $home)) {
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
    $playerRanking = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/rankings/players?location=global&limit=25'))->getBody(), true);
    if (($playerRanking['items'][0]['leagueTier']['name'] ?? null) !== 'Legend I') throw new RuntimeException('League tier API tidak diteruskan pada ranking pemain.');
    $clanSummary = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/clan/2GPP802UU/summary'))->getBody(), true);
    if (($clanSummary['location']['name'] ?? null) !== 'Indonesia') throw new RuntimeException('Negara klan tidak tersedia untuk kolom lokasi pemain.');
    $icon = $app->handle($factory->createServerRequest('GET', '/api/player-icon?name=Test%20Icon&section=heroes'));
    if ($icon->getStatusCode() !== 200 || $icon->getHeaderLine('Content-Type') !== 'image/png' || (string)$icon->getBody() !== $iconBytes) {
        throw new RuntimeException('Ikon lokal tidak disajikan dengan benar.');
    }
    $profileResponse = $app->handle($factory->createServerRequest('GET', '/api/player/2GPP802UU/profile'));
    $profile = json_decode((string)$profileResponse->getBody(), true);
    if ($profileResponse->getStatusCode() !== 200 || ($profile['army']['heroes'][0]['iconUrls'][0] ?? null) !== '/public/icons/' . basename($iconPath)) {
        throw new RuntimeException('Profil tidak memprioritaskan ikon lokal.');
    }
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
