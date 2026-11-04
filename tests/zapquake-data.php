<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';

use CocTracker\ZapquakeDataset as D;
use CocTracker\App;
use Slim\Psr7\Factory\ServerRequestFactory;

$assert = static function(bool $ok, string $message): void { if (!$ok) throw new RuntimeException($message); };
$reject = static function(Closure $operation, string $message) use ($assert): void {
    try { $operation(); } catch (Throwable) { return; }
    $assert(false, $message);
};
$root = sys_get_temp_dir().'/clanintel-zapquake-test-'.bin2hex(random_bytes(5)); mkdir($root);
$public = dirname(__DIR__).'/public/assets/data/zapquake';
try {
    $license = (string)file_get_contents($public.'/2026-11-04.1/LICENSE.txt');
    $rows = [
        'data/home/defenses/air-defense.json'=>['id'=>'air-defense','dataId'=>1000012,'name'=>'Air Defense','base'=>'home','category'=>'defense','availablePerTownHall'=>[['townHallLevel'=>4,'count'=>1],['townHallLevel'=>5,'count'=>1,'countAfterMerges'=>0]],'levels'=>[
            ['level'=>1,'townHallRequired'=>4,'hitpoints'=>800], ['level'=>2,'townHallRequired'=>4,'hitpoints'=>850],
            ['level'=>1,'supercharge'=>true,'townHallRequired'=>18,'hitpoints'=>900]]],
        'data/home/spells/lightning-spell.json'=>['id'=>'lightning-spell','dataId'=>26000000,'name'=>'Lightning Spell','base'=>'home','category'=>'spell','housingSpace'=>1,
            'levels'=>[['level'=>1,'townHallRequired'=>5,'damage'=>150]]],
        'data/home/spells/earthquake-spell.json'=>['id'=>'earthquake-spell','dataId'=>26000010,'name'=>'Earthquake Spell','base'=>'home','category'=>'spell','housingSpace'=>1,
            'levels'=>[['level'=>1,'townHallRequired'=>8,'buildingDamagePercent'=>14.5,'radius'=>3.5]]],
        'data/home/heroes/grand-warden.json'=>['id'=>'grand-warden','dataId'=>28000002,'name'=>'Grand Warden','base'=>'home','category'=>'hero',
            'levels'=>[['level'=>1,'heroHallLevelRequired'=>5,'hitpoints'=>850]]],
        'data/home/town-hall/town-hall.json'=>['id'=>'town-hall','dataId'=>1000001,'name'=>'Town Hall','base'=>'home','category'=>'town-hall',
            'levels'=>[['level'=>1,'hitpoints'=>400],['level'=>2,'hitpoints'=>1600]]],
        'data/home/resource-buildings/clan-castle.json'=>['id'=>'clan-castle','dataId'=>1000006,'name'=>'Clan Castle','base'=>'home','category'=>'resource','availablePerTownHall'=>[['townHallLevel'=>3,'count'=>1]],
            'levels'=>[['level'=>1,'townHallRequired'=>3,'hitpoints'=>600]]],
        'package.json'=>['name'=>'clash-of-clans-data','version'=>'0.19.1','license'=>'MIT'],
    ];
    $raw = array_map(static fn(array $row): string=>D::json($row), $rows); $raw['LICENSE'] = $license;
    $lock = ['schemaVersion'=>1,'dataVersion'=>'fixture-1','reviewedAt'=>'2026-11-04','effectiveAt'=>null,
        'repository'=>'https://github.com/chiefpansancolt/clash-of-clans-data','revision'=>str_repeat('a',40),'packageVersion'=>'0.19.1','license'=>'MIT','excludedBuildings'=>[],'files'=>[]];
    foreach ($raw as $path=>$body) $lock['files'][] = ['path'=>$path,'sha256'=>hash('sha256',$body),'bytes'=>strlen($body)];
    D::atomic($root.'/lock.json',D::json($lock)); $lock = D::lock($root.'/lock.json');
    $calls = 0;
    $fetch = static function(string $url) use ($raw,&$calls): string {
        $calls++; $path = explode('/'.str_repeat('a',40).'/', $url,2)[1] ?? '';
        return $raw[$path] ?? throw new RuntimeException('Unexpected source URL.');
    };
    $assert(D::download($lock,$root.'/raw',$fetch)===8,'Download all pinned source files.');
    $assert(D::download($lock,$root.'/raw',$fetch)===0 && $calls===8,'Verified raw files must be reused offline.');
    $bundle = D::build($lock,$root.'/raw'); $data = $bundle['dataset'];
    $assert(count($data['buildings'][0]['levels'])===2 && $data['buildings'][0]['levels'][0]['hitpoints']===800,'Keep normal level 1 and HP despite repeated charge level 1.');
    $assert($data['buildings'][0]['supercharges'][0]['baseLevel']===null,'Do not invent a supercharge/base-level binding.');
    $assert($data['spells'][0]['levels'][0]['troopDamagePercent']===null,'Missing troop damage stays unknown, not zero.');
    $assert($data['heroes'][0]['levels'][0]['townHallRequired']===null && $data['heroes'][0]['levels'][0]['heroHallLevelRequired']===5,'Hero Hall requirements must not be mistaken for TH levels.');
    $assert($data['heroes'][0]['hitpointContext']==='base-before-defensive-modifiers' && $data['heroes'][0]['defendingMode']===null,'Do not assume hero defensive bonuses or ground/air mode.');
    $buildingIndex=array_column($data['buildings'],null,'id');
    $assert($buildingIndex['air-defense']['availablePerTownHall'][1]['countAfterMerges']===0,'Preserve zero after merging instead of replacing it with the original count.');
    foreach ([['count'=>-1],['countAfterMerges'=>2],['townHallLevel'=>7]] as $change) {
        $bad=$bundle;$bad['dataset']['buildings'][0]['availablePerTownHall'][1]=array_replace($bad['dataset']['buildings'][0]['availablePerTownHall'][1],$change);
        $reject(fn()=>D::validate($bad['dataset']),'Reject malformed availability or merge counts.');
    }
    $assert($buildingIndex['town-hall']['levels'][1]['townHallRequired']===2 && $buildingIndex['clan-castle']['levels'][0]['hitpoints']===600,'Import TH levels using their own level and preserve Castle HP.');
    $assert(D::json(D::build($lock,$root.'/raw'))===D::json($bundle),'Repeated imports are deterministic.');
    $manifest = D::publish($root.'/public',$bundle); $active = file_get_contents($root.'/public/manifest.json');
    $assert(hash_file('sha256',$root.'/public/fixture-1/dataset.json')===$manifest['sha256'],'Published manifest must identify exact dataset bytes.');
    D::publish($root.'/public',$bundle);
    $assert(file_get_contents($root.'/public/manifest.json')===$active,'Same-version publication is idempotent.');
    $changed = $bundle; $changed['dataset']['buildings'][0]['levels'][0]['hitpoints']=810;
    $reject(fn()=>D::publish($root.'/public',$changed),'Reject mutation of immutable release.');
    $assert(file_get_contents($root.'/public/manifest.json')===$active,'Rejected publication preserves active manifest.');
    $changes = D::diff($data,$changed['dataset'])['changes'];
    $assert(count($changes)===1 && $changes[0]['path']==='/buildings/air-defense/levels/level-1/hitpoints' && $changes[0]['before']===800 && $changes[0]['after']===810,'Diff must identify HP changes by stable item/level IDs.');
    $changed['dataset']['dataVersion']='fixture-2'; D::publish($root.'/public',$changed);
    $assert(is_file($root.'/public/fixture-1/dataset.json'),'Publishing a newer version keeps older releases.');
    D::publish($root.'/public',$bundle);
    $assert(file_get_contents($root.'/public/manifest.json')===$active,'Rollback only changes the active pointer to an intact release.');
    foreach (['hitpoints'=>0,'townHallRequired'=>-1,'level'=>4] as $field=>$value) {
        $bad=$bundle; $bad['dataset']['buildings'][0]['levels'][0][$field]=$value;
        $reject(fn()=>D::publish($root.'/public',$bad),'Reject invalid published '.$field);
    }
    $bad=$bundle;$bad['dataset']['modifiers']=[['id'=>'unverified']];
    $reject(fn()=>D::publish($root.'/public',$bad),'Reject unverified modifier activation.');
    $bad=$bundle;$bad['dataset']['calculationReady']=true;
    $reject(fn()=>D::publish($root.'/public',$bad),'Do not label reference statistics calculation-ready.');
    $bad=$bundle;$bad['license']='';
    $reject(fn()=>D::publish($root.'/public',$bad),'Require retained source attribution.');
    $bad=$bundle;$bad['dataset']['heroes'][0]['levels'][0]['townHallRequired']=5;
    $reject(fn()=>D::publish($root.'/public',$bad),'Reject invented direct hero TH requirements.');
    $bad=$bundle;$bad['dataset']['heroes'][0]['levels'][0]['hitpoints']=0;
    $reject(fn()=>D::publish($root.'/public',$bad),'Reject invalid hero HP.');
    $bad=$bundle;$bad['dataset']['heroes'][0]['defendingMode']='ground';
    $reject(fn()=>D::publish($root.'/public',$bad),'Reject unverified defending mode.');
    $bad=$bundle;$bad['dataset']['buildings'][2]['levels'][0]['townHallRequired']=2;
    $reject(fn()=>D::publish($root.'/public',$bad),'Reject TH requirement inconsistent with its level.');
    D::atomic($root.'/raw/data/home/spells/lightning-spell.json','corrupt');
    $reject(fn()=>D::build($lock,$root.'/raw'),'Corrupted raw source must not import.');
    $reject(fn()=>D::download($lock,$root.'/raw',static fn(string $url):string=>'bad bytes'),'Invalid downloads must fail checksums.');
    $assert(file_get_contents($root.'/public/manifest.json')===$active,'Download/import failures preserve last valid public release.');
    D::download($lock,$root.'/raw',$fetch);
    $malformed=$rows['data/home/defenses/air-defense.json'];$malformed['levels'][1]['level']=1;
    $body=D::json($malformed);D::atomic($root.'/raw/data/home/defenses/air-defense.json',$body);
    $badLock=$lock;$badLock['files'][0]['sha256']=hash('sha256',$body);$badLock['files'][0]['bytes']=strlen($body);
    $reject(fn()=>D::build($badLock,$root.'/raw'),'Even checksummed upstream content must pass semantic duplicate-level validation.');
    $badLock=$lock;$badLock['files'][0]['path']='../outside.json'; D::atomic($root.'/bad-lock.json',D::json($badLock));
    $reject(fn()=>D::lock($root.'/bad-lock.json'),'Reject traversal in source manifest.');
    $releaseManifest=D::decode((string)file_get_contents($public.'/manifest.json'));
    $releaseBody=(string)file_get_contents($public.'/'.$releaseManifest['dataset']);$reference=D::decode($releaseBody);D::validate($reference);
    $assert(hash('sha256',$releaseBody)===$releaseManifest['sha256'],'Committed dataset checksum must match active manifest.');
    $assert(count($reference['buildings'])===23 && count($reference['spells'])===2 && count($reference['heroes'])===6,'Expanded scope: defenses, TH, Castle, six heroes, two spells.');
    $indexed=array_column($reference['buildings'],null,'id');
    $assert($indexed['air-defense']['levels'][0]['hitpoints']===800 && count($indexed['air-defense']['levels'])===16,'Pin a representative real source HP row and coverage boundary.');
    $spells=array_column($reference['spells'],null,'id');
    $assert(count($spells['lightning-spell']['levels'])===13 && count($spells['earthquake-spell']['levels'])===8,'Retain all imported spell levels.');
    $assert(count($indexed['town-hall']['levels'])===18 && count($indexed['clan-castle']['levels'])===14,'Retain full Town Hall and Castle level coverage.');
    $assert($indexed['town-hall']['levels'][11]['weaponAvailable']===true && $indexed['town-hall']['levels'][17]['weaponAvailable']===false,'Seeking Shield eligibility uses actual weapon availability, not the assumption that all TH12+ have a weapon.');
    $heroes=array_column($reference['heroes'],null,'id');
    foreach (['archer-queen'=>110,'barbarian-king'=>110,'dragon-duke'=>25,'grand-warden'=>85,'minion-prince'=>95,'royal-champion'=>55] as $id=>$levels)
        $assert(count($heroes[$id]['levels'])===$levels,'Full hero level coverage: '.$id);
    $assert(count($reference['equipment'])===8,'Eight normalized equipment damage sources.');
    $equipment=array_column($reference['equipment'],null,'id');
    $assert($equipment['earthquake-boots']['levels'][17]['buildingDamagePercent']==40 && $equipment['earthquake-boots']['levels'][17]['troopDamagePercent']==20,'Parse equipment percent strings into numeric values.');
    $assert($equipment['electro-boots']['tickSeconds']===0.4 && $equipment['electro-boots']['levels'][26]['damage']==80,'Normalize aura tick period and damage per hit, not DPS as per-hit damage.');
    $assert($equipment['giant-arrow']['levels'][17]['damage']==2000,'Retain base projectile damage; target-specific multiplier belongs to engine.');
    $assert($reference['requirements']['hero-hall'][11]['heroSlots']===4 && $reference['requirements']['blacksmith'][0]['common']===9,'Retain Hero Hall slots and Blacksmith level caps.');
    $bad=$reference;$bad['equipment'][0]['hero']='town-hall';$reject(fn()=>D::validate($bad),'Equipment owner must be a hero, not another item.');
    $bad=$reference;$index=array_search('earthquake-boots',array_column($bad['equipment'],'id'));$bad['equipment'][$index]['levels'][0]['buildingDamagePercent']=101;
    $reject(fn()=>D::validate($bad),'Reject equipment percentages outside range.');
    foreach (glob($public.'/*/dataset.json') as $historical) D::validate(D::decode((string)file_get_contents($historical)));
    $app=App::create();$factory=new ServerRequestFactory();
    foreach (['manifest.json',$releaseManifest['dataset'],$releaseManifest['license']] as $path) {
        $response=$app->handle($factory->createServerRequest('GET','/assets/data/zapquake/'.$path));
        $assert($response->getStatusCode()===200 && !str_contains($response->getHeaderLine('Content-Type'),'text/html'),'Public data and license must deploy and serve as assets.');
        $assert($path==='manifest.json' ? str_contains($response->getHeaderLine('Cache-Control'),'no-cache') : str_contains($response->getHeaderLine('Cache-Control'),'immutable'),'Manifest refresh and immutable release caching.');
    }
    foreach (['id'=>'Kalkulator Zapquake','en'=>'Zapquake Calculator'] as $lang=>$title) {
        $response=$app->handle($factory->createServerRequest('GET','https://example.test/tools/zapquake?lang='.$lang));$html=(string)$response->getBody();
        $assert($response->getStatusCode()===200 && $response->getHeaderLine('Content-Language')===$lang,'Standalone calculator route and language.');
        $assert(str_contains($html,'<title>'.$title.' - ClanIntel</title>') && str_contains($html,'<html lang="'.$lang.'"'),'Localized server metadata.');
        $assert(str_contains($html,'rel="canonical"') && str_contains($html,'hreflang="en"') && str_contains($html,'/js/zapquake-model.js?v='),'Canonical, language alternatives and versioned assets.');
    }
    $redirect=$app->handle($factory->createServerRequest('GET','/zapquake.html?lang=en'));
    $assert($redirect->getStatusCode()===301 && $redirect->getHeaderLine('Location')==='/tools/zapquake?lang=en','Redirect legacy calculator filename to its canonical path.');
    echo "Zapquake data tests passed: pinned checksums, deterministic normalization, semantic validation, safe supercharge separation, immutable publication, rollback, diff, failure retention, attribution, and public assets.\n";
} finally {
    $remove=static function(string $path) use (&$remove):void {foreach (new DirectoryIterator($path) as $file) {if ($file->isDot()) continue;$file->isDir()?$remove($file->getPathname()):unlink($file->getPathname());}rmdir($path);};
    if (str_starts_with($root,sys_get_temp_dir().'/clanintel-zapquake-test-')) $remove($root);
}
