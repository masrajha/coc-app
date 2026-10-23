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
    echo "Account feature tests passed: ranking categories/locations, capital snapshots, achievements, and war preferences.\n";
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
