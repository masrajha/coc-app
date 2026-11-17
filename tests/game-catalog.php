<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';

use CocTracker\App;
use CocTracker\GameCatalog;

$assert=static function(bool $ok,string $message):void { if(!$ok)throw new RuntimeException($message); };
$directory=dirname(__DIR__).'/public/assets/data/game-catalog';
$catalog=GameCatalog::load($directory);
$assert($catalog!==null,'Published catalog must pass checksum/schema validation.');
$assert($catalog->resolve('heroes','Archer Queen',18)['maxAtTownHall']===110,'TH18 must not use global TH19 max 115.');
$assert($catalog->resolve('heroes','Archer Queen',19)['maxAtTownHall']===115,'Official TH19 hero cap must be available.');
$assert($catalog->resolve('heroes','Grand Warden',18)['maxAtTownHall']===85,'Use per-level Hero Hall requirements rather than stale summary caps.');
$assert($catalog->resolve('troops','Barbarian',17)['maxAtTownHall']===12,'TH17 troop caps follow laboratory and TH requirements.');
$assert($catalog->resolve('spells','Heroic Spell',17)['maxAtTownHall']===2 && $catalog->resolve('spells','Heroic Spell',18)['maxAtTownHall']===3,'Heroic Spell is not exclusively TH19.');
$assert($catalog->resolve('pets','Angry Jelly',18)['maxAtTownHall']===15,'TH18 pet changes must be included.');
$assert($catalog->resolve('heroEquipment','Earthquake Boots',10)['maxAtTownHall']===12,'Equipment must honor Blacksmith caps.');
$assert($catalog->resolve('heroEquipment','Flame Blower',14)['maxAtTownHall']===null,'Equipment cannot unlock before its hero.');
$assert($catalog->resolve('heroEquipment','Earthquake Boots',19)['maxAtTownHall']===null,'Unannounced TH19 equipment caps must not inherit an older TH.');
$assert($catalog->resolve('heroes','Archer Queen',20)['maxAtTownHall']===null && $catalog->resolve('heroes','Archer Queen',18,115)['maxAtTownHall']===null,'Future THs and levels above catalog must remain unknown.');
$assert(!$catalog->completeAt(19) && $catalog->completeAt(18),'Partial TH19 data must not become a complete catalog.');
$assert($catalog->equipmentHero('Portal Pendant')==='Minion Prince','Equipment hero metadata comes from the shared catalog.');

$type=new ReflectionClass(App::class);$app=$type->newInstanceWithoutConstructor();
$progress=$type->getMethod('progress');$profile=$type->getMethod('profile');
$raw=['tag'=>'#FIXTURE','townHallLevel'=>18];
foreach(['heroes','troops','spells','pets'] as $section) {
    $target=$section==='pets'?'heroPets':$section;
    foreach($catalog->limits($section,18) as $name=>$maximum)$raw[$target][]=['name'=>$name,'level'=>$maximum,'maxLevel'=>999,'village'=>'home'];
}
$p=$progress->invoke($app,$raw);
$assert($p['complete'] && $p['score']['overall']===100.0 && $p['rushed']['rushed']===false,'A complete TH18 roster must be evaluated against per-TH caps, ignoring misleading API maxima.');
$result=$profile->invoke($app,$raw,'2026-11-17T10:00:00Z');
foreach($result['army']['heroes'] as $item)$assert($item['level']===$item['progressMaxLevel'] && $item['progressDataVersion']===$catalog->version(),'Army and progress must resolve identical maxima and versions.');
array_pop($raw['spells']);$p=$progress->invoke($app,$raw);
$assert(!$p['complete'] && $p['rushed']['rushed']===null && $p['score']['categories']['spells']['missingItems']===1,'Missing and unknown items must not be treated as unlocked zero-level items.');
$raw['troops'][]=['name'=>'Future Pet Or Troop','level'=>7,'maxLevel'=>100];
$assert(in_array('Future Pet Or Troop',$progress->invoke($app,$raw)['score']['categories']['troops']['unmappedItems'],true),'Unknown names remain visible in coverage.');
$greedy=$profile->invoke($app,['tag'=>'#FIXTURE','townHallLevel'=>18,'troops'=>[['name'=>'Greedy Raven','level'=>1,'maxLevel'=>10,'village'=>'home']]],'2026-11-17T10:00:00Z');
$assert(count($greedy['army']['pets'])===1 && count($greedy['army']['troops'])===0,'New catalog pets must not be misclassified as troops.');

$manifest=json_decode(file_get_contents($directory.'/manifest.json'),true,512,JSON_THROW_ON_ERROR);
$data=json_decode(file_get_contents($directory.'/'.$manifest['catalog']),true,512,JSON_THROW_ON_ERROR);
$items=array_column($data['items'],null,'id');
$assert($items['spiky-tower']['levels'][1]['hitpoints']===6363 && !$items['spiky-tower']['simulationReady'],'New building HP can be recorded without enabling simulation.');
$lightning=end($items['lightning-spell']['levels']);
$assert($lightning['level']===14 && $lightning['damage']===null,'Unknown new damage must stay null.');
$assert($items['air-defense']['levels'][15]['hitpoints']===2050 && $items['air-defense']['supercharges'][0]['status']==='removed-in-th19-update','Old-level balance changes and removed supercharges must be audited.');
$assert(count($data['audit']['requirementConflicts'])>0,'Source conflicts must remain visible.');
$assert(GameCatalog::load(__DIR__.'/fixtures/nonexistent')===null,'Missing data must fail closed.');
$invalid=$progress->invoke($app,['townHallLevel'=>18,'heroes'=>[['name'=>'Archer Queen','level'=>null,'maxLevel'=>115]]]);
$assert($invalid['score']['overall']===null && $invalid['score']['categories']['heroes']['knownItems']===0,'Missing levels cannot turn into zero percent.');
echo "Game catalog tests passed: per-TH caps, Hero Hall/Lab/Blacksmith requirements, TH19 partial coverage, API maxima isolation, new pet classification and data provenance.\n";
