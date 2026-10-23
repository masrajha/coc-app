<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use CocTracker\App;
use CocTracker\RaidReport;
use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response as UpstreamResponse;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Response;

$directory = sys_get_temp_dir() . '/coc-raids-test-' . bin2hex(random_bytes(5));
mkdir($directory . '/cache', 0775, true);
$previousToken = $_ENV['COC_API_TOKEN'] ?? null;
$_ENV['DATA_DIR'] = $directory;
$_ENV['COC_API_TOKEN'] = 'raid-test-token';
$app = App::create();
$factory = new ServerRequestFactory();
$assert = static function (bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); };
$seed = static function (string $path, array $data) use ($directory): void {
    file_put_contents($directory . '/cache/' . hash('sha256', $path) . '.json', json_encode([
        'expires' => time() + 600, 'entry' => ['lastUpdated' => gmdate('c'), 'data' => $data]
    ]));
};
$get = static function (string $uri, int $status = 200) use ($app, $factory, $assert): array {
    $response = $app->handle($factory->createServerRequest('GET', $uri));
    $assert($response->getStatusCode() === $status, $uri . ': unexpected status ' . $response->getStatusCode());
    return json_decode((string)$response->getBody(), true, 512, JSON_THROW_ON_ERROR);
};
$raw = [
    'state' => 'ongoing', 'startTime' => '20261023T070000.000Z', 'endTime' => '20261026T070000.000Z',
    'capitalTotalLoot' => 5500, 'raidsCompleted' => 2, 'totalAttacks' => 8, 'enemyDistrictsDestroyed' => 9,
    'offensiveReward' => 350, 'defensiveReward' => 200,
    'members' => [
        ['tag' => '#28P08PG0G', 'name' => 'Amerta', 'attacks' => 6, 'attackLimit' => 5, 'bonusAttackLimit' => 1, 'capitalResourcesLooted' => 1200],
        ['tag' => '#PJ20G29L', 'name' => 'Zero attacks', 'attacks' => 0, 'attackLimit' => 5, 'bonusAttackLimit' => 0, 'capitalResourcesLooted' => 0],
        ['tag' => '#Q2YYJ9G00', 'name' => 'Partial']
    ],
    'attackLog' => [['defender' => ['tag' => '#9RU089PG', 'name' => 'Opponent'], 'attackCount' => 4, 'districtCount' => 9, 'districtsDestroyed' => 2,
        'districts' => [['id' => 70000000, 'name' => 'Capital Peak', 'districtHallLevel' => 10, 'destructionPercent' => 70, 'attackCount' => 4]]]],
    'defenseLog' => []
];
$older = array_replace($raw, ['state' => 'ended', 'startTime' => '20261016T070000.000Z', 'endTime' => '20261019T070000.000Z',
    'members' => [['tag' => '#28P08PG0G', 'name' => 'Amerta', 'attacks' => 2, 'attackLimit' => 5, 'bonusAttackLimit' => 0, 'capitalResourcesLooted' => 1000]]]);
$path = '/clans/%232GPP802UU/capitalraidseasons?limit=10';
$seed($path, ['items' => [$raw, $older], 'paging' => ['cursors' => ['after' => 'older-weekend']]]);
$seed($path . '&after=older-weekend', ['items' => [array_replace($older, ['startTime' => '20261009T070000.000Z', 'endTime' => '20261012T070000.000Z', 'members' => []])]]);
$seed('/clans/%239RU089PG/capitalraidseasons?limit=10', ['items' => []]);
$seed('/players/%23PJ20G29L', ['tag' => '#PJ20G29L']);

try {
    $data = $get('/api/clan/2GPP802UU/raids');
    $season = $data['items'][0];
    $assert($season['participants'] === 3 && $season['totalAttacks'] === 8 && $season['loot'] === 5500, 'Clan metrics must use the official totals.');
    $assert($season['members'][0]['quota'] === 6 && $season['members'][0]['remaining'] === 0 && $season['members'][0]['lootPerAttack'] === 200, 'Member quota must include the API bonus attack.');
    $assert($season['members'][1]['lootPerAttack'] === null && $season['members'][1]['remaining'] === 5, 'A player with zero attacks has no invented loot average.');
    $assert($season['members'][2]['quota'] === null && $season['members'][2]['loot'] === null, 'Missing member data must remain unknown.');
    $assert($season['attackLog'][0]['districts'][0]['destruction'] === 70 && $season['attackLog'][0]['districts'][0]['loot'] === null, 'District logs must preserve partial data.');
    $assert($data['paging']['cursors']['after'] === 'older-weekend', 'Pagination cursor was lost.');
    $get('/api/clan/2GPP802UU/raids');
    $archive = json_decode(file_get_contents($directory . '/raids/2GPP802UU.json'), true);
    $assert(count($archive['items']) === 2, 'Refreshing a weekend must update the archive without duplicating it.');
    $page = $get('/api/clan/2GPP802UU/raids?after=older-weekend');
    $assert($page['items'][0]['startTime'] === '20261009T070000.000Z', 'Earlier-weekend cursor was not forwarded.');
    $report = $get('/api/player/28P08PG0G/raids?clan=2GPP802UU');
    $assert(count($report['items']) === 2 && $report['summary']['attacks'] === 8 && $report['summary']['loot'] === 2200, 'Player history must include only this player’s participation.');
    $assert($report['summary']['lootPerAttack'] === 275, 'Player average must be weighted by attacks, not averaged across weekends.');
    $assert($report['items'][1]['remaining'] === 3, 'Ended weekends must retain unused attacks.');
    $moved = $get('/api/player/28P08PG0G/raids?clan=9RU089PG');
    $assert(count($moved['items']) === 2 && $moved['items'][0]['clanTag'] === '#2GPP802UU', 'Moving clans must not hide previously archived participation.');
    $clanless = $get('/api/player/PJ20G29L/raids');
    $assert(count($clanless['items']) === 1 && $clanless['contextClanTag'] === null, 'Clanless players must still have their archived raid history.');
    $get('/api/clan/INVALID/raids', 400);
    $get('/api/clan/2GPP802UU/raids?after=one&before=two', 400);
    $get('/api/player/INVALID/raids', 400);
    $get('/api/player/28P08PG0G/raids?clan[]=bad', 400);
    $invalid = $get('/api/clan/2GPP802UU/raids?limit=0&lang=en', 400);
    $assert($invalid['error'] === 'Invalid Raid Weekend parameter.', 'Raid validation errors must be translated.');
    $partial = RaidReport::season(['startTime' => '20261023T070000.000Z'], '#2GPP802UU', null, '2026-10-23T09:00:00Z');
    $assert($partial['participants'] === null && !$partial['membersAvailable'] && $partial['offensiveReward'] === null, 'Missing API sections must not become zero-valued statistics.');

    $partialType = new ReflectionClass(App::class);
    $partialSource = $partialType->newInstanceWithoutConstructor();
    $partialType->getProperty('dataDir')->setValue($partialSource, $directory);
    $partialRaw = $raw;
    unset($partialRaw['members']);
    $partialType->getProperty('http')->setValue($partialSource, new Client(['http_errors' => false, 'handler' => HandlerStack::create(new MockHandler([
        new UpstreamResponse(200, ['Content-Type' => 'application/json'], json_encode(['items' => [$partialRaw]]))
    ]))]));
    $partialResponse = $partialType->getMethod('clanRaids')->invoke($partialSource, $factory->createServerRequest('GET', '/api/clan/2GPP802UU/raids?limit=11'), new Response(), '2GPP802UU');
    $assert(json_decode((string)$partialResponse->getBody(), true)['items'][0]['membersAvailable'] === false, 'The latest response must acknowledge unavailable member details.');
    $retained = json_decode(file_get_contents($directory . '/raids/2GPP802UU.json'), true);
    $assert(count($retained['items'][0]['members']) === 3, 'A partial API refresh must not erase known archived participants.');
    $partialPlayer = $partialType->getMethod('playerRaids')->invoke($partialSource, $factory->createServerRequest('GET', '/api/player/28P08PG0G/raids?clan=2GPP802UU&limit=11'), new Response(), '28P08PG0G');
    $partialReport = json_decode((string)$partialPlayer->getBody(), true);
    $assert($partialReport['stale'] && count($partialReport['items']) === 2, 'Retained participant data must be identified as saved data.');

    unlink($directory . '/cache/' . hash('sha256', $path) . '.json');
    $type = new ReflectionClass(App::class);
    $source = $type->newInstanceWithoutConstructor();
    $type->getProperty('dataDir')->setValue($source, $directory);
    $mockResponse = static fn() => new UpstreamResponse(503, ['Content-Type' => 'application/json'], json_encode(['reason' => 'inMaintenance', 'message' => 'API is currently in maintenance']));
    $type->getProperty('http')->setValue($source, new Client(['http_errors' => false, 'handler' => HandlerStack::create(new MockHandler([$mockResponse(), $mockResponse()]))]));
    $cachedResponse = $type->getMethod('clanRaids')->invoke($source, $factory->createServerRequest('GET', '/api/clan/2GPP802UU/raids'), new Response(), '2GPP802UU');
    $cached = json_decode((string)$cachedResponse->getBody(), true);
    $assert($cachedResponse->getStatusCode() === 200 && $cached['stale'] && count($cached['items']) === 3, 'Maintenance should preserve archived weekends and mark them stale.');
    $assert($cached['refreshError'] === 'API is currently in maintenance', 'Maintenance details must remain visible.');
    echo "Raid Weekend tests passed: pagination, quotas, partial data, archives, player history, and maintenance.\n";
} finally {
    if ($previousToken === null) unset($_ENV['COC_API_TOKEN']); else $_ENV['COC_API_TOKEN'] = $previousToken;
    unset($_ENV['DATA_DIR']);
    $resolved = realpath($directory);
    if ($resolved && dirname($resolved) === realpath(sys_get_temp_dir()) && str_starts_with(basename($resolved), 'coc-raids-test-')) {
        $entries = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($resolved, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
        foreach ($entries as $entry) $entry->isDir() ? rmdir($entry->getPathname()) : unlink($entry->getPathname());
        rmdir($resolved);
    }
}
