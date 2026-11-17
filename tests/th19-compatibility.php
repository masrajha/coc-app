<?php
declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use CocTracker\App;

$type = new ReflectionClass(App::class);
$app = $type->newInstanceWithoutConstructor();
$profile = $type->getMethod('profile');
$progress = $type->getMethod('progress');
$assert = static function (bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
};
foreach (['player-th18-anonymized.json', 'player-th19-synthetic.json'] as $fixture) {
    $raw = json_decode(file_get_contents(__DIR__ . '/fixtures/th19/' . $fixture), true, 512, JSON_THROW_ON_ERROR);
    $result = $profile->invoke($app, $raw, '2026-11-16T10:00:00Z');
    $p = $result['progress'];
    $assert($result['player']['townHallLevel'] === $raw['townHallLevel'], 'TH must remain unchanged.');
    $assert($p['rushed']['rushed'] === null && !$p['complete'], 'Partial fixtures must not yield a rushed verdict.');
    $assert($p['tableTownHallLevel'] === $raw['townHallLevel'] && $p['tableVersion'] === '2026-11-17.2', 'Use the shared per-TH catalog, never a TH17 fallback.');
    foreach (['heroes', 'troops', 'spells', 'pets'] as $section) {
        foreach ($result['army'][$section] as $item) {
            $assert(array_key_exists('progressMaxLevel',$item) && isset($item['progressCapStatus']), 'Every item must declare known or unknown cap status.');
        }
    }
    if ($raw['townHallLevel'] === 19) {
        $heroes = array_column($result['army']['heroes'], null, 'name');
        $assert($heroes['Archer Queen']['level'] === 115 && $heroes['Archer Queen']['maxLevel'] === 115, 'Keep actual and API maximum levels for inspection.');
        $assert($heroes['Archer Queen']['progressMaxLevel'] === 115 && $heroes['Future Hero']['progressMaxLevel'] === null, 'Official TH19 caps are usable; unknown heroes remain unknown.');
        $assert(isset($heroes['Future Hero']) && $result['army']['heroEquipment'][0]['name'] === 'Future Equipment', 'Unknown items must survive normalization.');
        $assert($p['score']['categories']['troops']['observedItems'] === 2, 'Observed coverage must not disappear when caps are missing.');
        $assert(count($heroes['Future Hero']['iconUrls']) > 0, 'Unknown item icons must keep the existing fallback chain.');
    }
}
$future = $progress->invoke($app, ['townHallLevel' => 20, 'heroes' => [['name'=>'Archer Queen', 'level'=>120, 'maxLevel'=>120]]]);
$assert($future['score']['overall'] === null, 'The safety rule must cover future Town Halls too.');
$lower = $progress->invoke($app, ['townHallLevel'=>17, 'heroes'=>[['name'=>'Archer Queen', 'level'=>95, 'maxLevel'=>115]]]);
$assert($lower['score']['categories']['heroes']['items'][0]['maxLevel'] === 100, 'An exact local TH17 baseline must not be replaced by a global API cap.');
$stale = $progress->invoke($app, ['townHallLevel'=>17, 'heroes'=>[['name'=>'Archer Queen', 'level'=>111, 'maxLevel'=>115]]]);
$assert($stale['score']['overall'] === null && in_array('Archer Queen', $stale['score']['categories']['heroes']['unmappedItems'], true), 'A level above the local cap indicates stale data, not 105% progress.');
$unknown = $progress->invoke($app, ['townHallLevel'=>1, 'heroes'=>[['name'=>'Archer Queen', 'level'=>1, 'maxLevel'=>115]]]);
$assert($unknown['tableTownHallLevel'] === null && $unknown['score']['overall'] === null, 'Never substitute a higher TH table for a lower TH.');
echo "TH19 compatibility: TH18/19/future safety, raw levels, unknown items and stale baselines passed.\n";
