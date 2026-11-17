<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';
use CocTracker\App;
use CocTracker\GameCatalog;
use CocTracker\SeoZapquake;
use CocTracker\ShareCard;
use CocTracker\SharePreview;
use CocTracker\ZapquakeDataset as D;
use Slim\Psr7\Factory\ServerRequestFactory;

$root=dirname(__DIR__);
$check=static function(bool $ok,string $message):void{if(!$ok)throw new RuntimeException($message);};
$art=D::decode(file_get_contents($root.'/public/assets/images/th19/sources.json'));
$check(count($art['assets'])===8 && $art['totalBytes']<=80000,'Bounded compressed TH19 artwork batch.');
$total=0;
foreach($art['assets'] as $asset){
    $path=$root.'/public/assets/images/'.$asset['output'];$raw=file_get_contents($path);$size=getimagesizefromstring($raw);
    $check(hash('sha256',$raw)===$asset['sha256'] && strlen($raw)===$asset['bytes'],'Artwork checksum: '.$asset['output']);
    $check($size && $size['mime']==='image/webp' && max($size[0],$size[1])<=144 && strlen($raw)<=24000,'Artwork format/budget: '.$asset['output']);
    $total+=strlen($raw);
}
$check($total===$art['totalBytes'],'Asset manifest total must match actual files.');
$catalog=GameCatalog::load($root.'/public/assets/data/game-catalog');$check($catalog!==null,'Active progress catalog is valid.');
$zapManifest=D::decode(file_get_contents($root.'/public/assets/data/zapquake/manifest.json'));
$body=file_get_contents($root.'/public/assets/data/zapquake/'.$zapManifest['dataset']);
$check(hash('sha256',$body)===$zapManifest['sha256'],'Active simulator checksum.');D::validate(D::decode($body));
$old=file_get_contents($root.'/public/assets/data/zapquake/2026-11-04.5/dataset.json');
$check(hash('sha256',$old)==='bebd8dc95c47bbf124133915608d90b41e66afd35b82c8d173f4e0a6d143e1a8','Frozen rollback release must remain intact.');
$baseline=D::decode(file_get_contents($root.'/public/assets/data/game-catalog/2026-11-17.2-baseline/catalog.json'));
GameCatalog::validate($baseline,'2026-11-17.2-baseline');

$temp=sys_get_temp_dir().'/clanintel-th19-release-'.bin2hex(random_bytes(5));mkdir($temp);
$previous=$_ENV['DATA_DIR']??null;$_ENV['DATA_DIR']=$temp;
try{
    $app=App::create();$factory=new ServerRequestFactory();
    foreach($art['assets'] as $asset){
        $response=$app->handle($factory->createServerRequest('GET','/assets/images/'.$asset['output']));
        $check($response->getStatusCode()===200 && str_contains($response->getHeaderLine('Content-Type'),'image/webp'),'Artwork route: '.$asset['output']);
    }
    foreach(['id','en'] as $lang){
        $response=$app->handle($factory->createServerRequest('GET','/tools/zapquake?lang='.$lang));$html=(string)$response->getBody();
        $check(str_contains($html,'Town Hall 19') && str_contains($html,'Lightning 14') && str_contains($html,'Firecracker Tower'),'Initial SEO HTML includes honest TH19 support.');
        $check(substr_count($html,'rel="canonical"')===1 && str_contains($html,'hreflang="'.$lang.'"'),'Canonical and language alternatives remain valid.');
        $check(count(SeoZapquake::questions($lang))===5,'TH19 FAQ is localized.');
        $raw=['name'=>'TH19 Release Fixture','tag'=>'#28P08PG0G','townHallLevel'=>19,'trophies'=>0,'warStars'=>0];
        $share=new SharePreview($temp.'/'.$lang,static fn()=>['data'=>$raw],'https://release.example.test',$lang);
        $meta=$share->metadata($share->context('/player.html',['tag'=>'28P08PG0G']));
        $card=D::decode(file_get_contents($temp.'/'.$lang.'/images/'.$meta['imageId'].'.json'));
        $check($card['entities'][0]['townHall']===19 && $card['entities'][0]['metrics'][0][1]==='19','Share card retains TH19 identity, including zero trophies.');
        foreach([false,true] as $raster){$png=(new ShareCard($raster))->render($card);$size=getimagesizefromstring($png);$check($size[0]===1200 && $size[1]===630,'PNG works with GD and built-in fallback.');}
    }
}finally{
    if($previous===null)unset($_ENV['DATA_DIR']);else $_ENV['DATA_DIR']=$previous;
    $remove=static function(string $path)use(&$remove):void{foreach(scandir($path)?:[] as $name){if($name==='.'||$name==='..')continue;$file=$path.'/'.$name;if(is_dir($file))$remove($file);else unlink($file);}rmdir($path);};
    $check(str_starts_with(basename($temp),'clanintel-th19-release-') && dirname(realpath($temp))===realpath(sys_get_temp_dir()),'Cleanup confined to this test temp directory.');$remove($temp);
}
echo "TH19 release tests passed: eight compressed assets, deployment routes, catalog/simulator checksums, preserved rollback, localized SEO and TH19 share PNGs.\n";
