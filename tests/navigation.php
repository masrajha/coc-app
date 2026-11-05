<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';
use CocTracker\App;
use Slim\Psr7\Factory\ServerRequestFactory;
$root=sys_get_temp_dir().'/clanintel-navigation-'.bin2hex(random_bytes(5));mkdir($root);
$old=$_ENV['DATA_DIR']??null;$_ENV['DATA_DIR']=$root;
$assert=static function(bool $value,string $message):void{if(!$value)throw new RuntimeException($message);};
try{
 $app=App::create();$factory=new ServerRequestFactory();
 foreach(['id','en'] as $lang)foreach(['/','/clan.html','/player.html','/compare.html','/compare-clan.html','/tools/zapquake','/leaderboards','/features','/guides','/explore/clans','/explore/players'] as $path){
  $response=$app->handle($factory->createServerRequest('GET',$path.'?lang='.$lang));$html=(string)$response->getBody();
  $assert($response->getStatusCode()===200,'Navigation page failed: '.$path);
  $errors=libxml_use_internal_errors(true);$dom=new DOMDocument();$dom->loadHTML($html);libxml_clear_errors();libxml_use_internal_errors($errors);$xp=new DOMXPath($dom);
  $assert($xp->query('//*[@id="globalPrimaryNavigation"]')->length===1,'Exactly one shared primary navigation: '.$path);
  $assert($xp->query('//*[@id="globalPrimaryNavigation"]//a[starts-with(@href,"/tools/zapquake")]')->length===1,'Zapquake link missing/duplicated: '.$path);
  $assert($xp->query('//button[@aria-controls="globalNavigationMenu"]')->length===1,'Mobile toggle missing: '.$path);
  $assert(str_contains($html,'/js/site.js?v='),'Navigation enhancement must be versioned: '.$path);
  $assert($xp->query('//*[@id="globalPrimaryNavigation"]//details')->length===2,'Compare/explore menus must be accessible details: '.$path);
  foreach($xp->query('//*[@id="globalPrimaryNavigation"]//a') as $a)$assert(str_contains($a->getAttribute('href'),'lang='.$lang),'Navigation must retain language: '.$path);
  if($path==='/player.html')foreach(['backLink','compareLink','playerSearch','playerTag'] as $id)$assert($xp->query('//*[@id="'.$id.'"]')->length===1,'Preserve contextual control '.$id);
  if($path==='/')$assert($xp->query('//*[@id="comparePlayersLink"]')->length===1,'Preserve home compare link ID');
  if($path==='/tools/zapquake')$assert($xp->query('//*[@id="globalPrimaryNavigation"]//a[@data-nav-section="zapquake" and @aria-current="page"]')->length===1,'Zapquake active navigation');
 }
 echo "Shared navigation tests passed: 11 page types, ID/EN, Zapquake link, active state, mobile semantics, and preserved page controls.\n";
}finally{
 if($old===null)unset($_ENV['DATA_DIR']);else $_ENV['DATA_DIR']=$old;
 $remove=static function(string $path)use(&$remove):void{foreach(new DirectoryIterator($path) as $item){if($item->isDot())continue;$item->isDir()?$remove($item->getPathname()):unlink($item->getPathname());}rmdir($path);};
 $remove($root);
}
