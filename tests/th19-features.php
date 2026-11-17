<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';
use CocTracker\App;
use CocTracker\PlayerNewEntities as Entities;
use CocTracker\ZapquakeDataset as D;
use CocTracker\ZapquakeTh19;

$check=static function(bool $ok,string $message):void{if(!$ok)throw new RuntimeException($message);};
$meta=Entities::metadata();$check(count($meta['squads'])===12,'Twelve official squad reference definitions.');
$data=Entities::profile(['townHallLevel'=>18,'troops'=>[['name'=>'Dragon','level'=>13]]]);
$check(count($data['squads']['reference'])===11 && $data['squads']['status']==='unavailable','Unlock reference is not player ownership.');
$check($data['townHallTroops']['selection']===null,'Do not infer active Town Hall troop from maxed troops.');
$data=Entities::profile(['townHallLevel'=>19,'squads'=>[['name'=>'Barch Squad','level'=>2],['invalid'=>true]],'guardians'=>[],
    'townHallTroop'=>['name'=>'Wizard','level'=>15]]);
$check($data['squads']['status']==='partial' && $data['squads']['items'][0]['level']===2,'Report valid entries while retaining unknown-contract status.');
$check($data['guardians']['status']==='reported' && $data['guardians']['items']===[],'An empty reported list is distinct from unavailable.');
$check($data['townHallTroops']['selection']['name']==='Wizard','Explicit reported selection is preserved.');
$check(Entities::profile(['townHallLevel'=>19,'squads'=>'wrong'])['squads']['status']==='partial','Malformed fields cannot crash normalization.');
$type=new ReflectionClass(App::class);$app=$type->newInstanceWithoutConstructor();
$profile=$type->getMethod('profile')->invoke($app,['tag'=>'#FIXTURE','townHallLevel'=>19,
    'troops'=>[['name'=>'Smasher','level'=>10],['name'=>'Barch Squad','level'=>2],['name'=>'Barbarian','level'=>14,'maxLevel'=>14]]],'2026-11-17T10:00:00Z');
$check(count($profile['army']['troops'])===1 && $profile['progress']['score']['categories']['troops']['observedItems']===1,'Guardians and squads must not inflate troop progress or coverage.');
$check($profile['newEntities']['guardians']['items'][0]['sourceField']==='troops','Keep the actual source field for provisional API data.');
$rule=$type->getMethod('rankedRule');
$old=$rule->invoke($app,'Archer League 8',strtotime('2026-11-09T05:00:00Z'));
$new=$rule->invoke($app,'Archer League 8',strtotime('2026-11-16T05:00:00Z'));
$check($old['promoted']===50 && $old['demoted']===5 && $new['promoted']===40 && $new['demoted']===10,'Historical and new Archer zones must differ.');
$check($new['battles']===$old['battles'] && $new['version']!==$old['version'],'Rule versions change without inventing battle quota changes.');
$check($rule->invoke($app,'Legend III',strtotime('2026-11-16T05:00:00Z'))['battles']===24,'Legend quotas unchanged.');
$check($rule->invoke($app,'Electro League 32',strtotime('2026-11-16T05:00:00Z'))['demoted']===20,'Electro Dragon II maps to API cumulative division 32.');
$before=D::decode(file_get_contents(dirname(__DIR__).'/public/assets/data/zapquake/2026-11-04.5/dataset.json'));
$after=ZapquakeTh19::apply($before);$again=ZapquakeTh19::apply($before);
$check($after===$again && $before['dataVersion']==='2026-11-04.5','Overlay must be reproducible and leave baseline untouched.');
$items=array_column($after['buildings'],null,'id');
$check($items['spiky-tower']['dataId']===null && $items['spiky-tower']['levels'][1]['hitpoints']===6363,'No fabricated API ID for new targets.');
$check($items['air-defense']['levels'][15]['historicalHitpoints'][0]['hitpoints']===2000,'Retain the old HP for dated calculations.');
$check($items['air-defense']['availablePerTownHall'][count($items['air-defense']['availablePerTownHall'])-1]['count']===null,'Unknown TH19 counts must not be copied from TH18 or invented as zero.');
echo "TH19 feature tests passed: reference vs API ownership, isolated scoring, historical league zones and reproducible selective simulation data.\n";
