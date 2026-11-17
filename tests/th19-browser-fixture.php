<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
require dirname(__DIR__).'/vendor/autoload.php';
use CocTracker\App;
use CocTracker\WarMap;
use Slim\Psr7\Factory\ServerRequestFactory;

$dir=sys_get_temp_dir().'/clanintel-th19-browser-'.bin2hex(random_bytes(5));mkdir($dir);
$_ENV['DATA_DIR']=$dir;$_ENV['COC_API_TOKEN']='browser-fixture-token';$_ENV['APP_URL']='http://fixture.example.test';
try{
    $app=App::create();$factory=new ServerRequestFactory();$pages=[];
    foreach(['id','en'] as $lang)foreach(['/player.html','/compare.html','/clan.html','/tools/zapquake'] as $path){
        $html=(string)$app->handle($factory->createServerRequest('GET',$path.'?lang='.$lang))->getBody();
        $pages[$path.'?lang='.$lang]=str_replace('<script src="https://cdn.tailwindcss.com"></script>','',$html);
    }
    $type=new ReflectionClass(App::class);$service=$type->newInstanceWithoutConstructor();$profiles=[];
    foreach([18=>'player-th18-anonymized.json',19=>'player-th19-synthetic.json'] as $th=>$file){
        $raw=json_decode(file_get_contents(__DIR__.'/fixtures/th19/'.$file),true,512,JSON_THROW_ON_ERROR);
        $profile=$type->getMethod('profile')->invoke($service,$raw,'2026-11-17T10:00:00Z');
        $profile['player']['tag']=$th===19?'#28P08PG0G':'#PJ20G29L';$profiles[$th]=$profile;
    }
    $home=['name'=>'Home fixture','tag'=>'#2GPP802UU','stars'=>0,'members'=>[['name'=>'TH19 fixture','tag'=>'#28P08PG0G','townhallLevel'=>19,'mapPosition'=>1]]];
    $enemy=['name'=>'Enemy fixture','tag'=>'#9RU089PG','stars'=>0,'members'=>[['name'=>'TH18 fixture','tag'=>'#PJ20G29L','townhallLevel'=>18,'mapPosition'=>1]]];
    [$members,$opponents]=WarMap::rosters($home,$enemy,2);
    echo json_encode(['pages'=>$pages,'profiles'=>$profiles,'war'=>['id'=>'fixture','type'=>'War','clan'=>$home,'opponent'=>$enemy,'members'=>$members,'opponentMembers'=>$opponents]],JSON_THROW_ON_ERROR);
}finally{
    $remove=static function(string $path)use(&$remove):void{foreach(scandir($path)?:[] as $name){if($name==='.'||$name==='..')continue;$file=$path.'/'.$name;if(is_dir($file))$remove($file);else unlink($file);}rmdir($path);};
    if(dirname(realpath($dir))===realpath(sys_get_temp_dir()) && str_starts_with(basename($dir),'clanintel-th19-browser-'))$remove($dir);
}
