<?php
declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use CocTracker\App;
use CocTracker\ClanCapitalReport;
use Slim\Psr7\Factory\ServerRequestFactory;

$directory = sys_get_temp_dir() . '/coc-features-test-' . bin2hex(random_bytes(5));
mkdir($directory . '/cache', 0775, true);
mkdir($directory . '/snapshots', 0775, true);
$previousToken = $_ENV['COC_API_TOKEN'] ?? null;
$previousDirectory = $_ENV['DATA_DIR'] ?? null;
$_ENV['DATA_DIR'] = $directory;
$_ENV['COC_API_TOKEN'] = 'feature-test-token';
$assert = static function (bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); };
$seed = static function (string $path, array $data) use ($directory): void {
    file_put_contents($directory . '/cache/' . hash('sha256', $path) . '.json', json_encode(['expires' => time() + 600, 'entry' => ['lastUpdated' => gmdate('c'), 'data' => $data]]));
};
try {
    $app = App::create(); $factory = new ServerRequestFactory();
    $get = static function (string $url, int $status = 200) use ($app, $factory, $assert): array {
        $response = $app->handle($factory->createServerRequest('GET', $url));
        $assert($response->getStatusCode() === $status, 'Unexpected status for ' . $url);
        return json_decode((string)$response->getBody(), true, 512, JSON_THROW_ON_ERROR);
    };
    foreach (['players-builder-base' => 'builderBaseTrophies', 'clans-builder-base' => 'clanBuilderBasePoints', 'capitals' => 'clanPoints'] as $type => $field) {
        foreach (['global', '32000000'] as $location) {
            $seed('/locations/' . $location . '/rankings/' . $type . '?limit=25', ['items' => [['tag' => '#2GPP802UU', 'name' => $type, $field => 12345]]]);
            $data = $get('/api/rankings/' . $type . '?location=' . $location . '&lang=en');
            $assert($data['type'] === $type && $data['location'] === $location && $data['items'][0][$field] === 12345, 'Category must forward the selected location and preserve its score field.');
        }
    }
    $get('/api/rankings/not-supported', 400);
    $seed('/locations/global/rankings/players?limit=1000', ['items' => [
        ['tag' => '#2GPP802UU', 'rank' => 10000, 'trophies' => 5000],
        ['tag' => '#Y8CPQU8QC', 'rank' => 10001, 'trophies' => 4999]
    ], 'paging' => ['cursors' => []]]);
    $global = $get('/api/player/2GPP802UU/global-ranking');
    $assert($global['rank'] === 10000 && $global['standing'] === 'withinCutoff' && $global['provisional'], 'Global ranking must expose the provisional cutoff status.');
    $global = $get('/api/player/Y8CPQU8QC/global-ranking');
    $assert($global['rank'] === 10001 && $global['standing'] === 'demotionZone', 'Rank beyond 10,000 must be a provisional demotion zone.');
    $global = $get('/api/player/28P08PG0G/global-ranking');
    $assert($global['rank'] === null && $global['standing'] === 'unknown' && !$global['canContinue'], 'Missing tag must remain unknown even when the API has no more pages.');
    $get('/api/player/INVALID/global-ranking', 400);
    $seed('/clans/%239RU089PG', ['tag' => '#9RU089PG', 'location' => ['id' => 32000114, 'name' => 'Indonesia', 'isCountry' => true, 'countryCode' => 'ID']]);
    foreach (['Y8CPQU8QC', 'QCGLCYVYU'] as $countryTag) $seed('/players/%23' . $countryTag,
        ['tag' => '#' . $countryTag, 'leagueTier' => ['name' => 'Legend I'], 'clan' => ['tag' => '#9RU089PG']]);
    $seed('/locations/32000114/rankings/players?limit=1000', ['items' => [['tag' => '#Y8CPQU8QC', 'rank' => 81]], 'paging' => ['cursors' => []]]);
    $country = $get('/api/player/Y8CPQU8QC/country-ranking');
    $assert($country['rank'] === 81 && $country['country']['id'] === 32000114 && $country['country']['name'] === 'Indonesia'
        && $country['source'] === 'clanLocation' && !array_key_exists('standing', $country), 'Country rank must use the clan country and must not classify global demotion.');
    $country = $get('/api/player/QCGLCYVYU/country-ranking');
    $assert($country['rank'] === null && $country['scanned'] === 1 && !$country['canContinue'], 'A tag absent from country results must remain unknown.');
    $assert($get('/api/player/Y8CPQU8QC/global-ranking')['rank'] === 10001, 'Country lookup must not replace or contaminate the global ranking cache.');
    $seed('/players/%23QRCUY0YY2', ['tag' => '#QRCUY0YY2']);
    $assert($get('/api/player/QRCUY0YY2/country-ranking')['reason'] === 'noClan', 'Players without clans must not trigger a country leaderboard request.');
    $seed('/players/%232R92VJG0U', ['tag' => '#2R92VJG0U', 'clan' => ['tag' => '#PJ20G29L']]);
    $seed('/clans/%23PJ20G29L', ['tag' => '#PJ20G29L', 'location' => ['id' => 32000006, 'name' => 'International', 'isCountry' => false]]);
    $assert($get('/api/player/2R92VJG0U/country-ranking')['reason'] === 'noCountry', 'International regions must not be treated as a country.');
    $get('/api/player/INVALID/country-ranking', 400);
    $get('/api/rankings/capitals?location=bad%2Fpath', 400);
    $yesterday = gmdate('Y-m-d', strtotime('-1 day'));
    $capital = ['capitalHallLevel' => 10, 'districts' => [['id' => 1, 'name' => 'Capital Peak', 'districtHallLevel' => 10], ['id' => 2, 'name' => 'Barbarian Camp', 'districtHallLevel' => 5]]];
    $baseline = ['date' => $yesterday, 'clanCapital' => ['districts' => [['id' => 1, 'districtHallLevel' => 9]]]];
    file_put_contents($directory . '/snapshots/2GPP802UU.json', json_encode(['snapshots' => [$baseline]]));
    $seed('/clans/%232GPP802UU', ['tag' => '#2GPP802UU', 'name' => 'Capital Test', 'clanCapital' => $capital]);
    $data = $get('/api/clan/2GPP802UU');
    $assert($data['capitalProgress']['baselineDate'] === $yesterday && $data['capitalProgress']['districts'][0]['delta'] === 1, 'Capital change must use the previous daily snapshot.');
    $assert($data['capitalProgress']['districts'][1]['delta'] === null, 'A district without a baseline must not be marked unchanged or new.');
    $archive = json_decode(file_get_contents($directory . '/snapshots/2GPP802UU.json'), true);
    $assert(end($archive['snapshots'])['clanCapital'] === $capital, 'Capital districts must persist in snapshots.');
    $again = $get('/api/clan/2GPP802UU');
    $assert($again['capitalProgress']['districts'][0]['delta'] === 1, 'Refreshing today must not replace the previous-day baseline.');
    $empty = ClanCapitalReport::progress($capital, [['date' => $yesterday]], gmdate('Y-m-d'));
    $assert($empty['baselineDate'] === null && $empty['districts'][0]['delta'] === null, 'Legacy snapshots must not fabricate district changes.');
    $achievement = ['name' => 'Test achievement', 'stars' => 2, 'value' => 12, 'target' => 20, 'info' => 'API description', 'village' => 'home'];
    $seed('/players/%2328P08PG0G', ['tag' => '#28P08PG0G', 'name' => 'Test', 'townHallLevel' => 17, 'warPreference' => 'in', 'achievements' => [$achievement]]);
    $profile = $get('/api/player/28P08PG0G/profile');
    $assert($profile['player']['warPreference'] === 'in' && $profile['achievements'][0] === $achievement, 'Profile must expose preference and all achievement progress fields.');
    $assert($get('/api/player/28P08PG0G/war-preference')['warPreference'] === 'in', 'Lightweight preference route must reuse the player cache.');
    $seed('/players/%23PJ20G29L', ['tag' => '#PJ20G29L', 'warPreference' => 'out']);
    $assert($get('/api/player/PJ20G29L/war-preference')['warPreference'] === 'out', 'Opt out must remain distinct from missing data.');
    $seed('/players/%239RU089PG', ['tag' => '#9RU089PG']);
    $assert($get('/api/player/9RU089PG/war-preference')['warPreference'] === null, 'Missing preference must remain unknown.');
    $assert($get('/api/player/9RU089PG/profile')['achievements'] === null, 'Missing achievements must remain unavailable.');
    $get('/api/player/INVALID/war-preference?lang=en', 400);
    $superPairs = [
        'Super Barbarian'=>'Barbarian','Super Archer'=>'Archer','Super Giant'=>'Giant','Sneaky Goblin'=>'Goblin',
        'Super Wall Breaker'=>'Wall Breaker','Super Wizard'=>'Wizard','Inferno Dragon'=>'Baby Dragon','Super Minion'=>'Minion',
        'Super Valkyrie'=>'Valkyrie','Super Witch'=>'Witch','Ice Hound'=>'Lava Hound','Rocket Balloon'=>'Balloon',
        'Super Bowler'=>'Bowler','Super Dragon'=>'Dragon','Super Miner'=>'Miner','Super Hog Rider'=>'Hog Rider','Super Yeti'=>'Yeti',
    ];
    $troops=[]; $expected=[];
    foreach ($superPairs as $super=>$base) {
        $level=count($expected)+2; $expected[$super]=[$base,$level,$level+2];
        // Super troops precede their base entries; matching must not depend on API order.
        $troops[]=['name'=>$super,'level'=>1,'maxLevel'=>1,'village'=>'home'];
        $troops[]=['name'=>$base,'level'=>$level,'maxLevel'=>$level+2,'village'=>'home'];
    }
    $troops[]=['name'=>'Barbarian','level'=>99,'maxLevel'=>99,'village'=>'builderBase'];
    $seed('/players/%23Q2YYJ9G00',['tag'=>'#Q2YYJ9G00','name'=>'Super troop test','townHallLevel'=>18,'troops'=>$troops]);
    $superProfile=$get('/api/player/Q2YYJ9G00/profile');
    $supers=array_column($superProfile['army']['superTroops'],null,'name');
    $assert(count($supers)===17 && count($superProfile['army']['troops'])===17,'Super troop normalization must preserve categories and item counts.');
    foreach ($expected as $super=>[$base,$level,$max]) {
        $item=$supers[$super];
        $assert($item['level']===$level && $item['maxLevel']===$max && $item['baseTroop']===$base,'Super troop badges must use the matching Home Village base level: '.$super);
        $assert($item['apiLevel']===1 && $item['apiMaxLevel']===1,'Raw API unlock markers must remain available.');
        $assert($item['progressMaxLevel']===$max,'Comparison progress limits must follow the base troop too.');
    }
    $assert($superProfile['army']['builderBase'][0]['level']===99,'Builder Base levels must not be altered or used as the Home Village source.');
    $assert($superProfile['progress']['score']['categories']['troops']['knownItems']===17,'Super troop normalization must not double count progress items.');
    $seed('/players/%2392GQCPJL9',['tag'=>'#92GQCPJL9','name'=>'Partial super troop test','townHallLevel'=>18,'troops'=>[
        ['name'=>'Super Archer','level'=>1,'maxLevel'=>1,'village'=>'home'],
        ['name'=>'Super Barbarian','level'=>1,'maxLevel'=>1,'village'=>'home'],
        ['name'=>'Barbarian','level'=>8,'village'=>'home'],
    ]]);
    $partial=array_column($get('/api/player/92GQCPJL9/profile')['army']['superTroops'],null,'name');
    $assert($partial['Super Archer']['level']===1 && !isset($partial['Super Archer']['levelSource']),'Missing base troops must not cause an invented level.');
    $assert($partial['Super Barbarian']['level']===8 && $partial['Super Barbarian']['maxLevel']===null,'An unknown base cap must not retain the misleading Super Troop cap of one.');
    echo "Account feature tests passed: ranking categories/locations, capital snapshots, achievements, war preferences and 17 Super Troop base-level mappings.\n";
} finally {
    if ($previousToken === null) unset($_ENV['COC_API_TOKEN']); else $_ENV['COC_API_TOKEN'] = $previousToken;
    if ($previousDirectory === null) unset($_ENV['DATA_DIR']); else $_ENV['DATA_DIR'] = $previousDirectory;
    $resolved = realpath($directory);
    if ($resolved && dirname($resolved) === realpath(sys_get_temp_dir()) && str_starts_with(basename($resolved), 'coc-features-test-')) {
        $entries = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($resolved, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
        foreach ($entries as $entry) $entry->isDir() ? rmdir($entry->getPathname()) : unlink($entry->getPathname());
        rmdir($resolved);
    }
}
