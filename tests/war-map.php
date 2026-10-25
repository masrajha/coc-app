<?php
declare(strict_types=1);
require dirname(__DIR__) . '/vendor/autoload.php';

use CocTracker\App;
use CocTracker\WarMap;
use Slim\Psr7\Factory\ServerRequestFactory;

$assert = static function (bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); };
$home = ['tag'=>'#2GPP802UU', 'name'=>'Home', 'stars'=>5, 'members'=>[
    ['tag'=>'#PGQULCUQ9', 'name'=>'Home Two', 'mapPosition'=>2, 'townhallLevel'=>17, 'attacks'=>[
        ['defenderTag'=>'#28P08PG0G','stars'=>2,'destructionPercentage'=>90,'order'=>3,'duration'=>120],
    ]],
    ['tag'=>'#22PC0Q009', 'name'=>'Home <One>', 'mapPosition'=>1, 'townhallLevel'=>18, 'attacks'=>[
        ['defenderTag'=>'#28P08PG0G','stars'=>2,'destructionPercentage'=>85,'order'=>1],
        ['defenderTag'=>'#28P08PG0G','stars'=>3,'destructionPercentage'=>100,'order'=>4],
    ]],
]];
$enemy = ['tag'=>'#9RU089PG', 'name'=>'Enemy', 'stars'=>2, 'members'=>[
    ['tag'=>'#28P08PG0G', 'name'=>'Enemy One', 'mapPosition'=>1, 'townhallLevel'=>18, 'attacks'=>[
        ['defenderTag'=>'#22PC0Q009','stars'=>0,'destructionPercentage'=>35,'order'=>2],
    ]],
    ['tag'=>'#PJ20G29L', 'name'=>'Enemy Two', 'mapPosition'=>2, 'townhallLevel'=>16],
]];
[$own, $opponents] = WarMap::rosters($home, $enemy, 2);
$assert($own[0]['tag'] === '#22PC0Q009' && $own[0]['name'] === 'Home <One>', 'Positions must sort without changing player names.');
$assert($own[0]['attacksReceived'] === 1 && $own[0]['bestStars'] === 0 && $own[0]['bestDestruction'] === 35, 'Home defense must come from enemy attacks, including zero-star attacks.');
$assert($own[0]['starsEarned'] === 5 && $own[0]['attacksRemaining'] === 0, 'Outgoing stars and quota must remain compatible with the roster.');
$assert($opponents[0]['attacksReceived'] === 3 && $opponents[0]['bestStars'] === 3 && $opponents[0]['bestDestruction'] === 100, 'Base stars are the best incoming result, never the sum.');
$assert($opponents[0]['bestAttackerName'] === 'Home <One>', 'The best attacker must come from the correct side.');
$assert($own[1]['attacks'][0]['defenderName'] === 'Enemy One' && $own[1]['attacks'][0]['order'] === 3 && $own[1]['attacks'][0]['duration'] === 120, 'Attack details must preserve targets, order, and duration.');
$assert($opponents[0]['incomingAttacks'][1]['attackerName'] === 'Home <One>', 'Every incoming attack must preserve attacker identity.');
$assert($opponents[1]['attacksReceived'] === 0 && $opponents[1]['incomingAttacks'] === [], 'An untouched base must remain distinct from a zero-star defense.');
[$reverse] = WarMap::rosters($enemy, $home, 1);
$assert($reverse[0]['bestStars'] === 3 && $reverse[0]['attacksRemaining'] === 0, 'Reversing CWL sides must also reverse incoming results and apply the one-attack quota.');
[$unknown] = WarMap::rosters($home, $enemy, null);
$assert($unknown[0]['attacksRemaining'] === null, 'Unknown quotas must not be invented.');
[$partial] = WarMap::rosters(['members'=>[['tag'=>'#22PC0Q009','opponentAttacks'=>2,'bestOpponentAttack'=>['attackerTag'=>'#28P08PG0G','stars'=>2,'destructionPercentage'=>82]]]], $enemy, 2);
$assert($partial[0]['bestStars'] === 2 && $partial[0]['attacksReceived'] === 2 && count($partial[0]['incomingAttacks']) === 1, 'Best-attack summaries must work without inventing missing log entries.');
$home['members'][1]['attacks'] = [['defenderTag'=>'#28P08PG0G','stars'=>2,'destructionPercentage'=>85]];
[, $tie] = WarMap::rosters($home, $enemy, 2);
$assert($tie[0]['bestStars'] === 2 && $tie[0]['bestDestruction'] === 90, 'Equal-star attacks must break ties using destruction.');

$directory = sys_get_temp_dir() . '/coc-war-map-' . bin2hex(random_bytes(5));
$old = $_ENV['DATA_DIR'] ?? null;
try {
    mkdir($directory . '/cache', 0775, true); $_ENV['DATA_DIR'] = $directory;
    $raw = ['state'=>'inWar','teamSize'=>2,'attacksPerMember'=>2,'startTime'=>'20261025T000000.000Z','endTime'=>'20261026T000000.000Z','clan'=>$home,'opponent'=>$enemy];
    file_put_contents($directory . '/cache/' . hash('sha256','/clans/%232GPP802UU/currentwar') . '.json', json_encode(['expires'=>time()+600,'entry'=>['data'=>$raw,'lastUpdated'=>gmdate('c')]]));
    $response = App::create()->handle((new ServerRequestFactory())->createServerRequest('GET','/api/clan/2GPP802UU/war'));
    $body = json_decode((string)$response->getBody(), true);
    $assert($response->getStatusCode() === 200 && $body['members'][0]['incomingAttacks'][0]['attackerName'] === 'Enemy One', 'The API must expose the new home-side defensive details.');
    $assert($body['opponentMembers'][0]['attacks'][0]['defenderName'] === 'Home <One>', 'The API must expose the opponent outgoing details.');
    echo "War map tests passed: two-sided attacks, best defense, zero stars, sorting, CWL quota, incomplete logs and API integration.\n";
} finally {
    if ($old === null) unset($_ENV['DATA_DIR']); else $_ENV['DATA_DIR'] = $old;
    $resolved = realpath($directory);
    if ($resolved && dirname($resolved) === realpath(sys_get_temp_dir()) && str_starts_with(basename($resolved), 'coc-war-map-')) {
        $entries = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($resolved, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
        foreach ($entries as $entry) $entry->isDir() ? rmdir($entry->getPathname()) : unlink($entry->getPathname());
        rmdir($resolved);
    }
}
