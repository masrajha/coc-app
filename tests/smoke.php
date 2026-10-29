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
    ['date' => '2026-10-05', 'capturedAt' => '2026-10-05T00:00:00Z', 'clan' => ['tag' => '#2GPP802UU', 'name' => 'Top Clan', 'level' => 20, 'members' => 50], 'members' => [['tag' => '#2GPP802UU', 'name' => 'Test', 'trophies' => 6000, 'donations' => 1, 'donationsReceived' => 1, 'leagueTier' => ['name' => 'Legend II']]]],
    ['date' => '2026-10-06', 'capturedAt' => '2026-10-06T00:00:00Z', 'clan' => ['tag' => '#2GPP802UU', 'name' => 'Top Clan', 'level' => 20, 'members' => 50], 'members' => [['tag' => '#2GPP802UU', 'name' => 'Test', 'trophies' => 6000, 'donations' => 2, 'donationsReceived' => 1, 'leagueTier' => ['name' => 'Legend II']]]],
]]));
file_put_contents($snapshotDir . '/9RU089PG.json', json_encode(['clanTag' => '#9RU089PG', 'snapshots' => [
    ['date' => '2026-10-06', 'capturedAt' => '2026-10-06T01:00:00Z', 'clan' => ['tag' => '#9RU089PG', 'name' => 'Home', 'level' => 18, 'members' => 42],
        'members' => [['tag' => '#28P08PG0G', 'leagueTier' => ['name' => 'Legend III']]]],
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
$seedApiCache('/labels/clans?limit=100', ['items' => [['id' => 56000000, 'name' => 'Clan Wars', 'iconUrls' => ['small' => 'https://example.com/label.png']]]]);
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
$seedApiCache('/clans/%232GPP802UU/warlog?limit=10', [
    'items' => [['result' => 'win', 'endTime' => '20261010T000000.000Z', 'teamSize' => 15,
        'clan' => ['tag' => '#2GPP802UU', 'stars' => 42, 'destructionPercentage' => 96.4],
        'opponent' => ['tag' => '#9RU089PG', 'name' => 'Other Clan', 'stars' => 38, 'destructionPercentage' => 89.2]]],
    'paging' => ['cursors' => ['after' => 'older-wars']]
]);
$seedApiCache('/clans/%232GPP802UU/warlog?limit=10&after=older-wars', [
    'items' => [['result' => 'lose', 'endTime' => '20261001T000000.000Z', 'opponent' => ['name' => 'Previous Clan']]]
]);
$seedApiCache('/clans?name=Elite&minMembers=30&limit=20', [
    'items' => [['tag' => '#2GPP802UU', 'name' => 'Elite Clan', 'clanLevel' => 22, 'members' => 35, 'clanPoints' => 50000]],
    'paging' => ['cursors' => ['after' => 'next-page']]
]);
$seedApiCache('/clans?name=Elite&minMembers=30&limit=20&after=next-page', [
    'items' => [['tag' => '#9RU089PG', 'name' => 'Elite Two', 'clanLevel' => 19, 'members' => 33, 'clanPoints' => 45000]],
    'paging' => ['cursors' => ['before' => 'previous-page']]
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
    'heroes' => [['name' => 'Test Icon', 'level' => 1, 'maxLevel' => 1, 'village' => 'home']],
    'heroEquipment' => [
        ['name' => 'Portal Pendant', 'level' => 1, 'maxLevel' => 27, 'village' => 'home'],
        ['name' => 'Future Gear', 'level' => 1, 'maxLevel' => 18, 'village' => 'home']
    ]
]);
$currentMembers = [];
for ($rank = 1; $rank <= 60; $rank++) {
    $currentMembers[] = ['playerTag' => $rank === 30 ? '#2GPP802UU' : ($rank === 1 ? '#2R92VJG0U' : '#2P' . $rank),
        'playerName' => 'Player ' . $rank, 'clanTag' => '#2GPP802UU', 'clanName' => 'Test Clan',
        'leagueTrophies' => 7000 - $rank, 'attackWinCount' => 4, 'attackLoseCount' => 1,
        'defenseWinCount' => 3, 'defenseLoseCount' => 2];
}
$seedApiCache('/leaguegroup/%238URPQL0/1791176400?playerTag=%232GPP802UU', ['members' => array_reverse($currentMembers),
    'attackLogs' => [['stars' => 3, 'destructionPercentage' => 100, 'trophies' => 3000], ['stars' => 2, 'destructionPercentage' => 80, 'trophies' => 3000]],
    'defenseLogs' => [['stars' => 2, 'destructionPercentage' => 70, 'trophies' => 941]]]);
$seedApiCache('/leaguegroup/%238URPQL0/1791176400?playerTag=%232R92VJG0U', ['members' => $currentMembers,
    'attackLogs' => [], 'defenseLogs' => [['stars' => 3, 'destructionPercentage' => 90]]]);
$seedApiCache('/players/%2328P08PG0G', [
    'tag' => '#28P08PG0G', 'name' => 'Amerta Buana', 'townHallLevel' => 18,
    'leagueTier' => ['name' => 'Legend II'],
    'currentLeagueSeasonId' => 0,
    'previousLeagueGroupTag' => '#8UUGLPJ', 'previousLeagueSeasonId' => 1791176400
]);
$seedApiCache('/players/%23Y8CPQU8QC', [
    'tag' => '#Y8CPQU8QC', 'name' => 'Baraa', 'townHallLevel' => 18, 'trophies' => 5281,
    'leagueTier' => ['id' => 105000036, 'name' => 'Legend I'],
    'currentLeagueGroupTag' => '#0', 'currentLeagueSeasonId' => 1791176400,
    'previousLeagueGroupTag' => '#0', 'previousLeagueSeasonId' => 1790571600,
    'legendStatistics' => ['currentSeason' => ['trophies' => 5281], 'bestSeason' => ['id' => '2025-12-01', 'rank' => 1128, 'trophies' => 5610]]
]);
foreach (['QCGLCYVYU' => ['#8CLVVJ0', 1790571600], 'QRCUY0YY2' => ['#8U0YUP2', 1791176400]] as $legendTag => [$oldGroup, $oldSeason]) {
    $seedApiCache('/players/%23' . $legendTag, ['tag' => '#' . $legendTag, 'name' => $legendTag, 'leagueTier' => ['name' => 'Legend I'],
        'currentLeagueGroupTag' => '#0', 'previousLeagueGroupTag' => $oldGroup, 'previousLeagueSeasonId' => $oldSeason]);
    $seedApiCache('/leaguegroup/' . rawurlencode($oldGroup) . '/' . $oldSeason . '?playerTag=%23' . $legendTag,
        ['members' => [['playerTag' => '#' . $legendTag, 'playerName' => $legendTag, 'leagueTrophies' => 1200]],
            'attackLogs' => array_fill(0, 30, ['stars' => 3, 'destructionPercentage' => 100, 'trophies' => 40]), 'defenseLogs' => []]);
}
$bonusAttackLogs = array_fill(0, 22, ['stars' => 3, 'destructionPercentage' => 100, 'trophies' => 35]);
$bonusAttackLogs[] = ['stars' => 2, 'destructionPercentage' => 90, 'trophies' => 33];
$bonusAttackLogs[] = ['stars' => 2, 'destructionPercentage' => 83, 'trophies' => 35];
$bonusDefenseLogs = array_fill(0, 20, ['stars' => 3, 'destructionPercentage' => 100, 'trophies' => 9]);
$bonusDefenseLogs[] = ['stars' => 2, 'destructionPercentage' => 90, 'trophies' => 15];
$bonusDefenseLogs[] = ['stars' => 2, 'destructionPercentage' => 80, 'trophies' => 15];
$seedApiCache('/leaguegroup/%238UUGLPJ/1791176400?playerTag=%2328P08PG0G', [
    'members' => [['playerTag' => '#28P08PG0G', 'playerName' => 'Amerta Buana', 'leagueTrophies' => 1066]],
    'attackLogs' => $bonusAttackLogs,
    'defenseLogs' => $bonusDefenseLogs
]);
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
    '/clan.html' => [200, 'text/html'],
    '/player.html' => [200, 'text/html'],
    '/compare.html' => [200, 'text/html'],
    '/player.css' => [200, 'text/css'],
    '/war-summary.js' => [200, 'text/javascript'],
    '/war-summary.css' => [200, 'text/css'],
    '/player-profile.css' => [200, 'text/css'],
    '/player-overview.js' => [200, 'text/javascript'],
    '/assets/profile/status.svg' => [200, 'image/svg+xml'],
    '/assets/profile/coverage.svg' => [200, 'image/svg+xml'],
    '/player-league.css' => [200, 'text/css'],
    '/player-league.js' => [200, 'text/javascript'],
    '/th-1.webp' => [200, 'image/webp'],
    '/th-17.webp' => [200, 'image/webp'],
    '/th-18.webp' => [200, 'image/webp'],
    '/bh-1.webp' => [200, 'image/webp'],
    '/bh-10.webp' => [200, 'image/webp'],
    '/donation.css' => [200, 'text/css'],
    '/donation.js' => [200, 'text/javascript'],
    '/recent.js' => [200, 'text/javascript'],
    '/compare-battles.js' => [200, 'text/javascript'],
    '/compare-overview-model.js' => [200, 'text/javascript'],
    '/compare-overview.js' => [200, 'text/javascript'],
    '/compare-overview.css' => [200, 'text/css'],
    '/compare-ranked-layout.js' => [200, 'text/javascript'],
    '/compare-ranked-layout.css' => [200, 'text/css'],
    '/compare-game.js' => [200, 'text/javascript'],
    '/compare-game-view.js' => [200, 'text/javascript'],
    '/compare-game-view.css' => [200, 'text/css'],
    '/battle-log-style/compare-view.html' => [200, 'text/html'],
    '/assets/libs/html-to-image/html-to-image.js' => [200, 'text/javascript'],
    '/favicon.svg' => [200, 'image/svg+xml'],
    '/assets/brand/clanintel-mark.svg' => [200, 'image/svg+xml'],
    '/assets/brand/apple-touch-icon.png' => [200, 'image/png'],
    '/ranked-game.js' => [200, 'text/javascript'],
    '/ranked-game-model.js' => [200, 'text/javascript'],
    '/ranked-game-view.js' => [200, 'text/javascript'],
    '/ranked-game-view.css' => [200, 'text/css'],
    '/battle-log-style/player-view.html' => [200, 'text/html'],
    '/cwl-master-1.png' => [200, 'image/png'],
    '/cwl-legend.png' => [200, 'image/png'],
    '/league-legend.png' => [200, 'image/png'],
    '/league-electro-dragon.png' => [200, 'image/png'],
    '/rankings.js' => [200, 'text/javascript'],
    '/theme.js' => [200, 'text/javascript'],
    '/theme.css' => [200, 'text/css'],
    '/theme-simple.css' => [200, 'text/css'],
    '/api/clan/INVALID' => [400, 'application/json'],
    '/api/clan/2GPP802UU/summary' => [200, 'application/json'],
    '/api/clan/INVALID/summary' => [400, 'application/json'],
    '/api/clan/2GPP802UU/war-log' => [200, 'application/json'],
    '/api/clan/2GPP802UU/war-log?limit=0' => [400, 'application/json'],
    '/api/clan/2GPP802UU/war-log?after=one&before=two' => [400, 'application/json'],
    '/api/player/INVALID/profile' => [400, 'application/json'],
    '/api/player/2GPP802UU/war-history' => [200, 'application/json'],
    '/api/player/INVALID/war-history' => [400, 'application/json'],
    '/api/player/INVALID/league-group' => [400, 'application/json'],
    '/api/player/2GPP802UU/league-group?session=invalid' => [400, 'application/json'],
    '/api/player/2R92VJG0U/league-group?session=current' => [404, 'application/json'],
    '/api/player-icon?name=Giant%20Arrow&section=invalid' => [400, ''],
    '/api/rankings/locations' => [200, 'application/json'],
    '/api/clans/labels?lang=en' => [200, 'application/json'],
    '/compare-clan.html' => [200, 'text/html'],
    '/api/rankings/players?location=global&limit=25' => [200, 'application/json'],
    '/api/rankings/clans?location=global&limit=25' => [200, 'application/json'],
    '/api/rankings/unknown' => [400, 'application/json'],
    '/api/rankings/players?location=bad%2Fpath' => [400, 'application/json'],
    '/api/clans/popular' => [200, 'application/json'],
    '/api/clans/search?name=Elite&minMembers=30' => [200, 'application/json'],
    '/api/clans/search?name=El' => [400, 'application/json'],
    '/api/clans/search?name=Elite&minMembers=40&maxMembers=20' => [400, 'application/json'],
    '/api/clans/search?name=Elite&after=one&before=two' => [400, 'application/json'],
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
    $englishError = $app->handle($factory->createServerRequest('GET', '/api/clan/INVALID?lang=en'));
    $englishErrorBody = json_decode((string)$englishError->getBody(), true);
    if ($englishError->getHeaderLine('Content-Language') !== 'en' || ($englishErrorBody['error'] ?? null) !== 'Invalid clan tag.') {
        throw new RuntimeException('English API errors must follow the selected language.');
    }
    $englishHeaderError = $app->handle($factory->createServerRequest('GET', '/api/clan/INVALID')->withHeader('Accept-Language', 'en-US,en;q=0.9'));
    if ($englishHeaderError->getHeaderLine('Content-Language') !== 'en') {
        throw new RuntimeException('The API must honor Accept-Language when lang is absent.');
    }
    $labels = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/clans/labels'))->getBody(), true);
    if (($labels['items'][0]['id'] ?? null) !== 56000000 || empty($labels['items'][0]['iconUrls']['small'])) {
        throw new RuntimeException('Clan labels must preserve API IDs and icon URLs.');
    }
    $clanSearch = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/clans/search?name=Elite&minMembers=30'))->getBody(), true);
    $warLog = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/clan/2GPP802UU/war-log'))->getBody(), true);
    if (($warLog['items'][0]['result'] ?? null) !== 'win' || ($warLog['paging']['cursors']['after'] ?? null) !== 'older-wars') {
        throw new RuntimeException('War log must return classic war results and its pagination cursor.');
    }
    $olderWarLog = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/clan/2GPP802UU/war-log?after=older-wars'))->getBody(), true);
    if (($olderWarLog['items'][0]['opponent']['name'] ?? null) !== 'Previous Clan') {
        throw new RuntimeException('War log must forward the cursor for earlier wars.');
    }
    if (($clanSearch['items'][0]['name'] ?? null) !== 'Elite Clan' || ($clanSearch['paging']['cursors']['after'] ?? null) !== 'next-page') {
        throw new RuntimeException('Clan search must return items and its next cursor.');
    }
    $clanSearchNext = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/clans/search?name=Elite&minMembers=30&after=next-page'))->getBody(), true);
    if (($clanSearchNext['items'][0]['name'] ?? null) !== 'Elite Two' || ($clanSearchNext['paging']['cursors']['before'] ?? null) !== 'previous-page') {
        throw new RuntimeException('Clan search must forward pagination cursors.');
    }
    $englishSearchError = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/clans/search?name=El&lang=en'))->getBody(), true);
    if (($englishSearchError['error'] ?? null) !== 'Clan name must contain 3 to 80 characters.') {
        throw new RuntimeException('Clan search validation must follow the selected language.');
    }
    $englishCsv = $app->handle($factory->createServerRequest('GET', '/api/clan/2GPP802UU/health.csv?lang=en'));
    if ($englishCsv->getHeaderLine('Content-Language') !== 'en' || !str_starts_with((string)$englishCsv->getBody(), 'Name,Tag,Role,')) {
        throw new RuntimeException('English CSV headings must follow the selected language.');
    }
    $indonesianCsv = $app->handle($factory->createServerRequest('GET', '/api/clan/2GPP802UU/health.csv?lang=id'));
    if ($indonesianCsv->getHeaderLine('Content-Language') !== 'id' || !str_starts_with((string)$indonesianCsv->getBody(), 'Nama,Tag,Peran,')) {
        throw new RuntimeException('Indonesian CSV headings must follow the selected language.');
    }
    $home = (string)$app->handle($factory->createServerRequest('GET', '/'))->getBody();
    foreach ([
        'preserveContent = false',
        "showWarStatus(tr('clan.loadingWar'), true, true)",
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
    $clanComparePage = (string)$app->handle($factory->createServerRequest('GET', '/compare-clan.html'))->getBody();
    foreach ([$home, $playerPage, $comparePage, $clanComparePage] as $page) {
        foreach (['ClanIntel', '/favicon.svg', '/assets/brand/clanintel-mark.svg', 'data-i18n="brand.disclaimer"', 'https://www.supercell.com/fan-content-policy'] as $brandMarker) {
            if (!str_contains($page, $brandMarker)) throw new RuntimeException('ClanIntel branding or disclaimer missing: ' . $brandMarker);
        }
    }
    foreach (['/i18n.js', 'data-language-switch', 'data-i18n="snapshot.title"'] as $marker) {
        if (!str_contains($playerPage, $marker)) throw new RuntimeException('Pemilih bahasa halaman player belum lengkap: ' . $marker);
    }
    foreach (['/i18n.js', 'data-language-switch', 'data-i18n="compare.heading"'] as $marker) {
        if (!str_contains($comparePage, $marker)) throw new RuntimeException('Pemilih bahasa halaman compare belum lengkap: ' . $marker);
    }
    foreach (['landing-sidebar', 'recentClans', 'recentPlayers', 'popularClans', 'Clan populer', 'Kenali klanmu. Pantau perang.', '/recent.js', 'RecentlyOpened', '/api/clans/popular', 'data-health-sort', 'memberLeagueBadge', 'renderHealthRows'] as $marker) {
        if (!str_contains($home, $marker)) throw new RuntimeException('Landing operasional atau riwayat terakhir dibuka belum tersedia.');
    }
    foreach (['clanSectionNav', 'clan-overview', 'warCommandStrip', 'warProjection', 'rosterTownHall', 'rosterSort', 'matchup-map', 'warMemberDialog', 'renderWarCommand', 'rosterTheoreticalLimit', 'ourReachableMaximum', 'openWarMemberDialog', 'window.ClanTabs.activateFromHash'] as $marker) {
        if (!str_contains($home, $marker)) throw new RuntimeException('Command center clan CL1-CL3 belum lengkap: ' . $marker);
    }
    if (!str_contains($home, 'return rosterSize * 3;') || str_contains($home, 'const ourMaximum = clanStars + maxAdditional;')) {
        throw new RuntimeException('Batas teoretis war harus dihitung dari jumlah roster dikali tiga.');
    }
    foreach (['cwlPositionInsight', 'performanceKpis', 'performanceDistribution', 'healthSearch', 'data-health-filter', 'healthVisibleCount', 'clanReportSummary', 'copyClanSummary', 'exportWarRoster', 'renderPerformanceInsights', 'filteredHealthMembers', 'refreshClanReport'] as $marker) {
        if (!str_contains($home, $marker)) throw new RuntimeException('Analitik dan laporan clan CL4-CL7 belum lengkap: ' . $marker);
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
    foreach (['href="#army"', 'href="#war-cwl"', 'href="#ranked-league"', 'leagueComparisonGrid', 'Performa liga', 'stickyCompareHeader', 'overviewScore', 'armyMode', 'armyDifferencesOnly', 'armySort', 'headToHeadChart', 'warAdvanced', 'activityPeriod', 'activityMetric', 'copyCompareLink'] as $marker) {
        if (!str_contains($comparePage, $marker)) throw new RuntimeException('Panel perbandingan Ranked League tidak tersedia: ' . $marker);
    }
    $compareScript = (string)$app->handle($factory->createServerRequest('GET', '/compare.js'))->getBody();
    foreach (['/war-history', 'leagueTier', 'leagueSummary', 'renderLeagueMetrics', 'compare.starsPerAttack', 'compare.warArchiveNote', 'leagueSession${side}', 'leagueResult${side}', 'sameLeagueSeason', 'leagueMetricMark', 'defenseDestruction', 'compare.differentTiers', 'compare.differentGroups', 'renderComparisonOverview', 'renderStickyCompareHeader', 'itemComparison', 'activateCompareTab', "window.addEventListener('hashchange'", 'renderHeadToHead', 'sampleQuality', 'tripleRate', 'copyComparisonLink', 'compare.contextRecommendations'] as $marker) {
        if (!str_contains($compareScript, $marker)) throw new RuntimeException('Perbandingan War/Ranked League tidak lengkap: ' . $marker);
    }
    $compareStyles = (string)$app->handle($factory->createServerRequest('GET', '/compare.css'))->getBody();
    if (!str_contains($compareStyles, '.league-comparison-grid') || !str_contains($compareStyles, '.war-player-history')
        || !str_contains($compareStyles, '.head-to-head-chart') || !str_contains($compareStyles, '.war-advanced-grid')
        || !str_contains($compareStyles, '.resume-section')) {
        throw new RuntimeException('Style panel comparison War/Ranked League tidak tersedia.');
    }
    $playerScript = (string)$app->handle($factory->createServerRequest('GET', '/player.js'))->getBody();
    foreach ([
        'renderBaseLevel',
        '/${type}-${numericLevel}.webp',
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
    foreach (['leagueSession', 'leagueMembers', 'leaguePrev', 'leagueNext', 'leagueRankSummary', 'leagueSidebarEyebrow', 'playerLeagueBadge', 'sidebarLeagueBadge', 'leagueStandingsView', 'leagueRankingInsights', 'leagueStatisticsView', 'leagueStatisticsMetric', 'leagueStatisticsSummary', 'leagueDistributionChart', 'leagueBoxplotChart', 'leagueTopAttack', 'leagueTopAttackMeta', 'leagueTopDefense', 'leagueTopDefenseMeta', 'leagueZones', 'data-league-view="statistics"', '/player-league.js'] as $marker) {
        if (!str_contains($playerPage, $marker)) throw new RuntimeException('Kontrol peringkat grup liga tidak tersedia: ' . $marker);
    }
    foreach (['data-tab="ranked-battles"', 'rankedBattleSession', 'rankedBattleSummary', 'rankedSessionComparison', 'rankedComparisonChart', 'rankedComparisonInsights', 'rankedAttackLogs', 'rankedDefenseLogs'] as $marker) {
        if (!str_contains($playerPage, $marker)) throw new RuntimeException('Tab battle log Ranked League tidak tersedia: ' . $marker);
    }
    foreach (['rankedAttackTrophies', 'rankedDefenseTrophies'] as $marker) {
        if (!str_contains($playerPage, $marker)) throw new RuntimeException('Total trofi battle log belum tersedia: ' . $marker);
    }
    foreach (['player-overview', 'playerOverviewCards', 'progressSearch', 'progressFilter', 'upgradePlanner', 'progressDistribution', 'progressRadar', 'rankedLogFilter', 'rankedLogSort'] as $marker) {
        if (!str_contains($playerPage, $marker)) throw new RuntimeException('Dashboard player P5-P9 tidak lengkap: ' . $marker);
    }
    foreach (['performanceQuality', 'performanceDistribution', 'playerResume', 'playerResumeText', 'dataSourceNote', 'copyPlayerResume', 'copyPlayerLink', 'exportPlayerCsv'] as $marker) {
        if (!str_contains($playerPage, $marker)) throw new RuntimeException('Statistik dan resume player P10-P14 tidak lengkap: ' . $marker);
    }
    $leagueScript = (string)$app->handle($factory->createServerRequest('GET', '/player-league.js'))->getBody();
    foreach (['loadPlayerBattleLog', 'renderPlayerBattleLog', 'renderBattleLogList', 'loadRankedComparison', 'renderRankedComparison', 'renderRankedInsights', 'starDistribution', 'sessionLabel', "timeZone: 'Asia/Jakarta'", 'destructionPercentage', 'ranked-battle-stars'] as $marker) {
        if (!str_contains($leagueScript, $marker)) throw new RuntimeException('Renderer battle log Ranked League tidak lengkap: ' . $marker);
    }
    foreach (['topByPerformance', 'renderTopList', 'loadLeagueStatistics', 'detail=statistics', 'attackTriples', 'defenseStops', 'player.attackTriples', 'player.defenseStops', 'renderZones', 'setLeagueView', 'playerLeagueHref', 'standingsZone', 'row.classList.add(`is-${zone}-zone`)', 'leagueRule', 'describeValues', 'standardDeviation', 'renderDescriptiveStatistics', 'renderDistribution', 'renderBoxplot', '1.5 * iqr'] as $marker) {
        if (!str_contains($leagueScript, $marker) && !str_contains($playerPage, $marker)) throw new RuntimeException('Statistik sidebar Ranked League tidak lengkap: ' . $marker);
    }
    if (!str_contains($leagueScript, '/assets/trophy.png')) throw new RuntimeException('Aset ikon trofi battle log belum digunakan.');
    foreach (["className = 'league-battle-info'", 'showBattle(member, row, true, info)', "aria-haspopup', 'dialog'", "event.key === 'Escape'", 'state.pinned'] as $marker) {
        if (!str_contains($leagueScript, $marker)) throw new RuntimeException('Popup detail pertempuran belum mendukung interaksi tap: ' . $marker);
    }
    if (!str_contains($leagueScript, "family === 'legend' ? roman?.[1].toUpperCase() || null : numeric?.[1] || null")) {
        throw new RuntimeException('Label badge liga harus memakai Romawi hanya untuk Legend dan angka untuk liga lain.');
    }
    $leagueStyles = (string)$app->handle($factory->createServerRequest('GET', '/player-league.css'))->getBody();
    if (!str_contains($leagueStyles, '@media(hover:none)') || !str_contains($leagueStyles, '.league-battle-info{display:inline-grid')) {
        throw new RuntimeException('Ikon popup tidak diaktifkan untuk perangkat layar sentuh.');
    }
    foreach (['.league-view-tabs', '.league-top-member', '.league-member.is-promotion-zone', '.league-member.is-demotion-zone', '.league-zone.is-promotion', '.league-zone.is-demotion', '.league-stat-summary', '.league-distribution-chart', '.league-density-curve', '.league-boxplot-box'] as $marker) {
        if (!str_contains($leagueStyles, $marker)) throw new RuntimeException('Style statistik sidebar Ranked League tidak lengkap: ' . $marker);
    }
    $playerStyles = (string)$app->handle($factory->createServerRequest('GET', '/player.css'))->getBody();
    foreach (['.ranked-session-comparison', '.ranked-comparison-layout', '.ranked-comparison-row', '.ranked-comparison-series.is-current', '.ranked-comparison-metric .is-up', '.ranked-comparison-metric .is-down', '.ranked-comparison-insights', '.ranked-star-bar', '.ranked-insight-note'] as $marker) {
        if (!str_contains($playerStyles, $marker)) throw new RuntimeException('Style perbandingan sesi Ranked League tidak lengkap: ' . $marker);
    }
    foreach (['landingPanel', 'homeClanTab', 'homePlayerTab', 'homeCompareTab', 'clanTagInput', 'playerTagInput', 'comparePlayerOne', 'comparePlayerTwo', 'searchButton', 'rankingsPanel', 'rankingPlayersTab', 'rankingClansTab', 'rankingLocation', 'joinClanLink', 'OpenClanProfile', 'Join Clan'] as $marker) {
        if (!str_contains($home, $marker)) throw new RuntimeException('Homepage kehilangan kontrol leaderboard: ' . $marker);
    }
    foreach (["location.href = `/clan.html?tag=", "location.href = `/player.html?tag=", "location.href = `/compare.html?"] as $marker) {
        if (!str_contains($home, $marker)) throw new RuntimeException('Form pencarian home tidak mengarah ke halaman tujuan yang tersedia.');
    }
    if (!str_contains($home, 'href="/" class="home-brand"') || !str_contains($home, 'aria-label="ClanIntel"')) {
        throw new RuntimeException('Navigasi kembali ke home tidak tersedia di header.');
    }
    $rankingScript = (string)$app->handle($factory->createServerRequest('GET', '/rankings.js'))->getBody();
    foreach (['home.clanLocationColumn', 'home.attacks', 'home.defenses', 'home.notAvailable', '/summary', 'data.location?.name', 'item.attackWins', 'item.defenseWins', 'item.leagueTier?.name'] as $marker) {
        if (!str_contains($rankingScript, $marker)) throw new RuntimeException('Leaderboard pemain tidak menampilkan kolom ranking yang diharapkan.');
    }
    $i18nScript = (string)$app->handle($factory->createServerRequest('GET', '/i18n.js'))->getBody();
    foreach (['data-language-switch', 'data-i18n', 'coc-language', 'id-ID', 'en-US', "'home.rankingsTitle'", "'clan.joinRules'"] as $marker) {
        if (!str_contains($i18nScript, $marker)) throw new RuntimeException('Fondasi multibahasa beranda belum lengkap: ' . $marker);
    }
    if (str_contains($rankingScript, 'townhall-cell') || str_contains($rankingScript, "'Town Hall'")) {
        throw new RuntimeException('Kolom Town Hall seharusnya tidak lagi ada di leaderboard.');
    }
    if (!str_contains($home, "pageParams.get('tag') || pageParams.get('clan')")
        || !str_contains($home, "document.getElementById('landingPanel').hidden = true")
        || !str_contains($home, "document.getElementById('rankingsPanel').hidden = true")) {
        throw new RuntimeException('Dashboard clan tidak memproses parameter tag/clan dengan benar.');
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
    $health = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/clan/2GPP802UU/health'))->getBody(), true);
    if (($health['members'][0]['leagueTier']['name'] ?? null) !== 'Legend II') throw new RuntimeException('League tier anggota tidak diteruskan ke laporan aktivitas.');
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
    $pendant = $profile['army']['heroEquipment'][0] ?? [];
    if (($pendant['equipmentHero'] ?? null) !== 'Minion Prince' || ($pendant['maxLevel'] ?? null) !== 27
        || ($pendant['iconUrls'][0] ?? null) !== '/public/icons/6670fe7511b1b140b321380d46c64f4194bb820a8cbe7b370ad33d5cbdf1135d.webp') {
        throw new RuntimeException('Portal Pendant harus masuk ke Minion Prince dan memakai ikon lokal.');
    }
    if (($profile['army']['heroEquipment'][1]['name'] ?? null) !== 'Future Gear'
        || ($profile['army']['heroEquipment'][1]['equipmentHero'] ?? null) !== null) {
        throw new RuntimeException('Equipment baru dari API harus tetap tampil walau belum masuk katalog.');
    }
    $pendantIcon = $app->handle($factory->createServerRequest('GET', '/api/player-icon?name=Portal%20Pendant&section=heroEquipment'));
    if ($pendantIcon->getStatusCode() !== 200 || $pendantIcon->getHeaderLine('Content-Type') !== 'image/webp'
        || !str_starts_with((string)$pendantIcon->getBody(), 'RIFF')) {
        throw new RuntimeException('Ikon Portal Pendant harus tersedia secara lokal sebagai WebP.');
    }
    if (($profile['player']['clan']['tag'] ?? null) !== '#9RU089PG') throw new RuntimeException('Profil API kehilangan tag clan pemain.');
    if (($profile['army']['heroes'][0]['progressMaxLevel'] ?? null) !== 1 || ($profile['army']['heroes'][0]['progressMaxSource'] ?? null) !== 'TH 18') {
        throw new RuntimeException('Profil tidak menyematkan batas level progres sesuai Town Hall pada item Army.');
    }
    if (($profile['player']['leagueTier']['name'] ?? null) !== 'Legend II' || count($profile['player']['leagueSessions'] ?? []) !== 2) {
        throw new RuntimeException('Sesi grup liga tidak tersedia pada profil.');
    }
    $group = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/player/2GPP802UU/league-group?session=current'))->getBody(), true);
    if (($group['playerRank'] ?? null) !== 30 || ($group['totalMembers'] ?? null) !== 60 || ($group['members'][0]['rank'] ?? null) !== 1
        || ($group['members'][0]['attackCount'] ?? null) !== 5 || ($group['members'][0]['defenseCount'] ?? null) !== 5
        || ($group['leagueRule']['battles'] ?? null) !== 30 || ($group['leagueRule']['promoted'] ?? null) !== 3
        || ($group['leagueRule']['demoted'] ?? null) !== 15) {
        throw new RuntimeException('Peringkat grup sesi saat ini tidak dihitung dengan benar.');
    }
    $battle = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/player/2GPP802UU/league-group?session=current&detail=battle&memberTag=2GPP802UU'))->getBody(), true);
    if (($battle['attack']['starsAverage'] ?? null) !== 2.5 || ($battle['attack']['destructionAverage'] ?? null) != 90
        || ($battle['defense']['destructionAverage'] ?? null) != 70) {
        throw new RuntimeException('Rata-rata detail pertempuran tidak dihitung dengan benar.');
    }
    if (count($battle['attack']['logs'] ?? []) !== 2 || ($battle['attack']['logs'][0]['stars'] ?? null) !== 3
        || ($battle['attack']['logs'][0]['destructionPercentage'] ?? null) != 100
        || count($battle['defense']['logs'] ?? []) !== 1) {
        throw new RuntimeException('Battle log Ranked League tidak diteruskan ke profil pemain.');
    }
    if (($battle['leagueTier'] ?? null) !== 'Legend II' || ($battle['playerRank'] ?? null) !== 30
        || ($battle['player']['attackCount'] ?? null) !== 5 || ($battle['player']['defenseCount'] ?? null) !== 5) {
        throw new RuntimeException('Detail Ranked League tidak menyertakan liga, rank, dan jumlah battle.');
    }
    if (($battle['defense']['remainingSlots'] ?? null) !== 29
        || ($battle['defense']['bonusPoints'] ?? null) !== 0
        || ($battle['defense']['bonusLogs'] ?? null) !== []
        || ($battle['defense']['points'] ?? null) !== 941) {
        throw new RuntimeException('Sesi liga yang masih berjalan tidak boleh mendapat bonus pertahanan.');
    }
    $bonusBattle = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/player/28P08PG0G/league-group?session=previous&detail=battle&memberTag=28P08PG0G'))->getBody(), true);
    foreach (['QCGLCYVYU', 'QRCUY0YY2'] as $legendTag) {
        $oldBattle = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/player/' . $legendTag . '/league-group?session=previous&detail=battle&memberTag=' . $legendTag))->getBody(), true);
        if (($oldBattle['leagueTier'] ?? null) !== 'Legend II' || ($oldBattle['leagueRule']['battles'] ?? null) !== 30) {
            throw new RuntimeException('Old Legend II groups must remain identifiable after promotion to Legend I when snapshots are missing.');
        }
    }
    $legendProfile = json_decode((string)$app->handle($factory->createServerRequest('GET', '/api/player/Y8CPQU8QC/profile'))->getBody(), true);
    if ($legendProfile['player']['leagueSessions'] !== []
        || $legendProfile['player']['legendStatistics']['currentSeason']['trophies'] !== 5281
        || $legendProfile['player']['legendStatistics']['bestSeason']['rank'] !== 1128
        || $legendProfile['player']['leagueTransition']['status'] !== 'unknown'
        || !is_file($dataDir . '/ranked-players/Y8CPQU8QC.json')) {
        throw new RuntimeException('Legend I must expose available season statistics and archive history without creating a group.');
    }
    if (($bonusBattle['session']['id'] ?? null) !== 'previous'
        || ($bonusBattle['leagueTier'] ?? null) !== 'Legend III'
        || ($bonusBattle['leagueRule']['battles'] ?? null) !== 24
        || ($bonusBattle['attack']['points'] ?? null) !== 838
        || ($bonusBattle['defense']['battlePoints'] ?? null) !== 210
        || ($bonusBattle['defense']['remainingSlots'] ?? null) !== 2
        || ($bonusBattle['defense']['bonusPoints'] ?? null) !== 18
        || array_column($bonusBattle['defense']['bonusLogs'] ?? [], 'trophies') !== [9, 9]
        || ($bonusBattle['defense']['points'] ?? null) !== 228) {
        throw new RuntimeException('Battle log Legend III tidak menghasilkan dua bonus +9 dan total defense +228.');
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
    $maintenanceMessage = 'API is currently in maintenance, please come back later';
    $maintenanceFailure = new CocTracker\UpstreamFailure(503, null, json_encode(['reason' => 'inMaintenance', 'message' => $maintenanceMessage]));
    foreach (['id' => 'Gagal mengambil data dari API Clash of Clans.', 'en' => 'Could not fetch data from the Clash of Clans API.'] as $locale => $prefix) {
        $sourceType->getProperty('locale')->setValue($source, $locale);
        $response = $sourceType->getMethod('failure')->invoke($source, new Slim\Psr7\Response(), $maintenanceFailure);
        $errorData = json_decode((string)$response->getBody(), true);
        if ($response->getStatusCode() !== 503 || $response->getHeaderLine('Content-Language') !== $locale
            || ($errorData['error'] ?? null) !== $prefix . ' ' . $maintenanceMessage
            || ($errorData['reason'] ?? null) !== 'inMaintenance' || ($errorData['message'] ?? null) !== $maintenanceMessage) {
            throw new RuntimeException('Pesan JSON API harus terlihat di browser dan mempertahankan bahasa pesan aplikasi.');
        }
    }
    $sourceType->getProperty('locale')->setValue($source, 'id');
    $invalidFailure = new CocTracker\UpstreamFailure(503, null, '<html>Upstream unavailable</html>');
    $invalidResponse = $sourceType->getMethod('failure')->invoke($source, new Slim\Psr7\Response(), $invalidFailure);
    $invalidData = json_decode((string)$invalidResponse->getBody(), true);
    if (($invalidData['error'] ?? null) !== 'Gagal mengambil data dari API Clash of Clans.' || isset($invalidData['message'])) {
        throw new RuntimeException('Respons upstream selain JSON harus memakai pesan fallback tanpa meneruskan HTML.');
    }
    $rankedRuleMethod = $sourceType->getMethod('rankedRule');
    $rankedRules = $sourceType->getReflectionConstant('RANKED_RULES')->getValue();
    foreach ($rankedRules as $tierName => $expectedRule) {
        $legacyTierName = str_ireplace(' League ', ' ', $tierName);
        if ($rankedRuleMethod->invoke($source, $tierName) !== $expectedRule
            || $rankedRuleMethod->invoke($source, $legacyTierName) !== $expectedRule) {
            throw new RuntimeException('Rule Ranked League tidak cocok untuk nama tier API: ' . $tierName);
        }
    }
    if (($rankedRuleMethod->invoke($source, '  pekka league 24  ')['battles'] ?? null) !== 12
        || ($rankedRuleMethod->invoke($source, 'Legend League II')['battles'] ?? null) !== 30
        || $rankedRuleMethod->invoke($source, 'Unknown League 99') !== null) {
        throw new RuntimeException('Normalisasi nama tier Ranked League tidak konsisten.');
    }
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
