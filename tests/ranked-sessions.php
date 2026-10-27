<?php
declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use CocTracker\App;
use CocTracker\RankedLeagueHistory;
use CocTracker\GlobalRankings;

$directory = sys_get_temp_dir() . '/coc-ranked-sessions-' . bin2hex(random_bytes(6));
mkdir($directory . '/snapshots', 0775, true);
$type = new ReflectionClass(App::class);
$app = $type->newInstanceWithoutConstructor();
$type->getProperty('dataDir')->setValue($app, $directory);
$resolve = $type->getMethod('rankedSessionTier');
$rule = $type->getMethod('rankedRule');
$start = strtotime('2026-10-19T05:00:00Z');
$session = ['id' => 'previous', 'groupTag' => '#90289UL', 'seasonId' => $start];
$player = ['tag' => '#28P08PG0G', 'leagueTier' => ['name' => 'Legend II']];
$saveSnapshots = static function (array $snapshots) use ($directory): void {
    file_put_contents($directory . '/snapshots/2GPP802UU.json', json_encode(['snapshots' => $snapshots], JSON_THROW_ON_ERROR));
};
$snapshot = static fn(string $date, string $tier): array => ['date' => $date,
    'capturedAt' => $date . 'T10:00:00Z',
    'members' => [['tag' => '#28P08PG0G', 'leagueTier' => ['name' => $tier]]]];
$check = static function (bool $ok, string $message): void { if (!$ok) throw new RuntimeException($message); };
try {
    $saveSnapshots([$snapshot('2026-10-18', 'Legend I'), $snapshot('2026-10-25', 'Legend III'), $snapshot('2026-10-26', 'Legend II')]);
    $tier = $resolve->invoke($app, $player, $session, '2026-10-26T10:00:00Z');
    $check($tier === 'Legend III', 'Promotion must use the tier observed during the previous season.');
    $check($rule->invoke($app, $tier)['battles'] === 24, 'Previous Legend III must retain a 24-battle quota.');

    $saveSnapshots([$snapshot('2026-10-25', 'Legend II')]);
    $player['leagueTier']['name'] = 'Legend III';
    $demoted = $session; $demoted['groupTag'] = '#8UUGLPJ';
    $tier = $resolve->invoke($app, $player, $demoted, '2026-10-26T10:00:00Z');
    $check($tier === 'Legend II' && $rule->invoke($app, $tier)['battles'] === 30, 'Demotion must retain the previous Legend II quota.');

    $saveSnapshots([]);
    $check($resolve->invoke($app, $player, $session, '2026-10-26T10:00:00Z') === 'Legend III', 'Archived season tiers must survive snapshot removal.');
    $unknown = $session; $unknown['groupTag'] = '#8U89LYJ';
    $check($resolve->invoke($app, $player, $unknown, '2026-10-26T10:00:00Z') === null, 'Missing history must not fall back to the current profile tier.');
    $saveSnapshots([['date' => '2026-10-26', 'members' => [['tag' => '#28P08PG0G', 'leagueTier' => ['name' => 'Legend II']]]]]);
    $check($resolve->invoke($app, $player, $unknown, '2026-10-26T10:00:00Z') === null, 'Date-only rollover snapshots must be excluded.');

    $current = ['id' => 'current', 'groupTag' => '#8URPQL0', 'seasonId' => $start + 7 * 86400];
    $check($resolve->invoke($app, $player, $current, '2026-10-27T10:00:00Z') === 'Legend III', 'Current profile tier must be archived.');
    $current['id'] = 'previous'; $player['leagueTier']['name'] = 'Legend II';
    $check($resolve->invoke($app, $player, $current, '2026-11-02T10:00:00Z') === 'Legend III', 'A later promotion must not overwrite the archived season.');
    $legend = ['tag' => '#Y8CPQU8QC', 'leagueTier' => ['name' => 'Legend I']];
    $legendSnapshot = $snapshot('2026-10-23', 'Legend I');
    $legendSnapshot['members'][0]['tag'] = $legend['tag'];
    $report = RankedLeagueHistory::report($legend, '2026-10-26T17:10:15Z', [], [$legendSnapshot], null);
    $check($report['transition']['status'] === 'unchanged', 'Legend I with no group must compare adjacent weekly snapshots.');
    $check(count($report['history']['weeks']) === 2, 'Legend I observations must be stored without a group tag.');
    $legend['leagueTier']['name'] = 'Legend II';
    $next = RankedLeagueHistory::report($legend, '2026-11-02T17:00:00Z', $report['history'], [], null);
    $check($next['transition']['status'] === 'demoted', 'Legend I to II must be a demotion.');
    $legend['leagueTier']['name'] = 'Legend I';
    $next = RankedLeagueHistory::report($legend, '2026-11-09T17:00:00Z', $next['history'], [], null);
    $check($next['transition']['status'] === 'promoted', 'Legend II to I must be a promotion.');
    $unknown = RankedLeagueHistory::report($legend, '2026-11-23T17:00:00Z', $next['history'], [], null);
    $check($unknown['transition']['status'] === 'unknown', 'Missing intervening weeks must not be classified as unchanged.');
    $legend['leagueTier']['name'] = 'Electro League 33';
    $electro = RankedLeagueHistory::report($legend, '2026-11-02T17:00:00Z', [], [], 'Dragon League 30');
    $check($electro['transition']['status'] === 'promoted', 'Numeric league tiers must compare across families.');
    $check(RankedLeagueHistory::weekStart(strtotime('2026-10-26T04:59:59Z')) === $start, 'Monday before 05:00 UTC belongs to the previous week.');
    $check(RankedLeagueHistory::weekStart(strtotime('2026-10-26T05:00:00Z')) === $start + 7 * 86400, 'Weekly rollover must occur at Monday 05:00 UTC.');
    $calls = [];
    $fetch = static function (string $path) use (&$calls): array {
        $calls[] = $path;
        return ['lastUpdated' => '2026-10-27T00:00:00Z', 'data' => str_contains($path, 'after=')
            ? ['items' => [['tag' => '#Y8CPQU8QC', 'rank' => 10001, 'trophies' => 4500]]]
            : ['items' => [['tag' => '#28P08PG0G', 'rank' => 10000]], 'paging' => ['cursors' => ['after' => 'next/page']]]];
    };
    $index = GlobalRankings::advance([], '#Y8CPQU8QC', $fetch);
    $check(count($calls) === 2 && str_contains($calls[1], 'after=next%2Fpage'), 'Global rank lookup must follow encoded cursors.');
    $check(GlobalRankings::result($index, '#28P08PG0G')['standing'] === 'withinCutoff', 'Rank 10,000 remains within the cutoff.');
    $check(GlobalRankings::result($index, '#Y8CPQU8QC')['standing'] === 'demotionZone', 'Rank 10,001 is a provisional demotion position.');
    $unknownRank = GlobalRankings::result($index, '#2R92VJG0U');
    $check($unknownRank['rank'] === null && $unknownRank['standing'] === 'unknown' && !$unknownRank['canContinue'], 'Absence from an exhausted leaderboard must remain unknown.');
    GlobalRankings::advance($index, '#28P08PG0G', static function (): array { throw new RuntimeException('Cached rank must not fetch another page'); });
    $partial = GlobalRankings::advance([], '#2R92VJG0U', static fn(): array => ['lastUpdated' => '2026-10-27T00:00:00Z',
        'data' => ['items' => array_fill(0, 200, ['tag' => '#28P08PG0G', 'rank' => 1]), 'paging' => ['cursors' => []]]]);
    $check(GlobalRankings::result($partial, '#2R92VJG0U')['standing'] === 'unknown', 'Top-200-only API coverage must not imply demotion.');
    echo "Ranked session tests passed: promotion, demotion, historical rules, archive persistence, unknown tier and rollover boundaries.\n";
} finally {
    foreach (['snapshots', 'ranked-sessions'] as $folder) {
        foreach (glob($directory . '/' . $folder . '/*.json') ?: [] as $file) unlink($file);
        if (is_dir($directory . '/' . $folder)) rmdir($directory . '/' . $folder);
    }
    rmdir($directory);
}
