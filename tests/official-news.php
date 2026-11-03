<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';

use CocTracker\OfficialNews;
use CocTracker\App;
use Slim\Psr7\Factory\ServerRequestFactory;

$root=sys_get_temp_dir().'/clanintel-news-'.bin2hex(random_bytes(5));mkdir($root);
$assert=static function(bool $ok,string $message):void {if (!$ok) throw new RuntimeException($message);};
$now=time();$calls=[];$fail=false;$build='build-one';$jsonFailure=false;$idFailure=false;$badLink=false;$multiple=false;
$archive=static fn(string $lang):array=>['articles'=>[['title'=>'Archive title','linkUrl'=>'/en/games/clashofclans/'.($lang==='id'?'id/':'').'blog/news/test-article','publishDate'=>'2026-11-01T08:00:00Z',
    'thumbnail'=>['imgUrl'=>'https://clashofclans.inbox.supercell.com/test.png']]]];
$detail=static fn(string $lang):array=>[
    'title'=>$lang==='id'?'Berita <b>resmi</b>':'Official <b>news</b>', 'locale'=>$lang, 'publishDate'=>'2026-11-01T08:00:00Z',
    'bodyCollection'=>[
        ['text'=>['json'=>['content'=>[
            ['nodeType'=>'paragraph','content'=>[['nodeType'=>'text','value'=>str_repeat('Useful news. ',40)]]],
        ]]]],
    ],
];
$fetch=static function(string $url,bool $image) use (&$calls,&$fail,&$build,&$jsonFailure,&$idFailure,&$badLink,&$multiple,$archive,$detail):array {
    $calls[]=$url;
    if ($fail) throw new RuntimeException('Source failed');
    if ($image) return ['body'=>base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='),'type'=>'image/png'];
    $lang=str_contains($url,'/clashofclans/id/')?'id':'en';
    if ($idFailure&&$lang==='id') throw new RuntimeException('Translation unavailable');
    $props=str_contains($url,'/page/1')?$archive($lang):$detail($lang);
    if ($multiple && isset($props['articles'])) {
        $base=$props['articles'][0];
        foreach ([29,31,30] as $day) {
            $item=$base;$item['title']='News '.$day;$item['linkUrl'].='-'.$day;
            $item['publishDate']='2026-10-'.$day.'T08:00:00Z';$item['descriptionForNewsArchive']='<b>Short excerpt</b>';
            $props['articles'][]=$item;
        }
    }
    if ($badLink&&isset($props['articles'])) $props['articles'][0]['linkUrl']='https://attacker.invalid/news';
    if (str_ends_with($url,'.json')) {
        if ($jsonFailure||!str_contains($url,'/_next/data/'.$build.'/')) throw new RuntimeException('Old build');
        return ['type'=>'application/json','body'=>json_encode(['pageProps'=>$props])];
    }
    return ['type'=>'text/html','body'=>'<!doctype html><html><head><meta charset="utf-8"></head><body><script type="application/json" id="__NEXT_DATA__">'.json_encode(['buildId'=>$build,'props'=>['pageProps'=>$props]]).'</script></body></html>'];
};
$clock=static function() use (&$now):int {return $now;};
$service=new OfficialNews($root.'/news',$root.'/images',$fetch,$clock);
$oldDir=$_ENV['DATA_DIR'] ?? null;
try {
    $first=$service->latest('id');
    $assert($first['article']['title']==='Berita resmi'&&$first['article']['sourceLanguage']==='id','Read localized structured data and sanitize title.');
    $assert(strlen($first['article']['summary'])<300&&str_ends_with($first['article']['summary'],'…'),'Keep excerpts short.');
    $assert(str_starts_with($first['article']['image'],'/assets/images/news/'),'Cache thumbnail locally.');
    $assert(count($calls)===3,'Cold refresh reads the archive, detail JSON, and one thumbnail.');
    $assert($service->latest('id')===$first&&count($calls)===3,'Fresh visits must not fetch upstream again.');
    $now+=3601;$service->latest('id');
    $assert(count($calls)===5&&str_contains($calls[3],'/_next/data/build-one/'),'Refresh expired data via the cached build; reuse the thumbnail.');
    $now+=3601;$build='build-two';$second=$service->latest('id');
    $assert($second['article']['title']==='Berita resmi'&&str_contains(implode('|',$calls),'/_next/data/build-two/'),'Discover a new build when the old JSON URL fails.');
    $now+=3601;$fail=true;$count=count($calls);$saved=$service->latest('id');
    $assert($saved['stale']&&$saved['article']['url']===$first['article']['url'],'Retain the last good article on failure.');
    $after=count($calls);$service->latest('id');$assert(count($calls)===$after&&$after>$count,'Back off after a failed refresh.');
    $fail=false;$now+=301;$jsonFailure=true;$html=$service->latest('id');
    $assert(!$html['stale']&&$html['article']['sourceLanguage']==='id','Embedded JSON in HTML is the fallback when JSON routes change.');
    $jsonFailure=false;$idFailure=true;
    $fallback=new OfficialNews($root.'/fallback',$root.'/images',$fetch,$clock);
    $assert($fallback->latest('id')['article']['sourceLanguage']==='en','Fall back explicitly to the English source if Indonesian is unavailable.');
    $idFailure=false;$fail=true;
    $cold=new OfficialNews($root.'/cold',$root.'/images',$fetch,$clock);$empty=$cold->latest('en');
    $assert($empty['article']===null,'Cold failures return a safe empty state.');$count=count($calls);$cold->latest('en');$assert(count($calls)===$count,'Cold failures must also back off.');
    $fail=false;$badLink=true;
    $bad=new OfficialNews($root.'/bad',$root.'/images',$fetch,$clock);
    $assert($bad->latest('en')['article']===null&&!str_contains(implode('|',$calls),'attacker.invalid'),'Never follow arbitrary article URLs.');$badLink=false;
    $multiple=true;
    $multi=new OfficialNews($root.'/multi',$root.'/images',$fetch,$clock);$count=count($calls);$three=$multi->latest('en');
    $assert(count($three['articles'])===3&&$three['articles'][0]===$three['article'],'Return three cards and retain the first-article compatibility field.');
    $assert(array_column($three['articles'],'publishedAt')===['2026-11-01T08:00:00Z','2026-10-31T08:00:00Z','2026-10-30T08:00:00Z'],'Select the three latest articles in descending publication order.');
    $assert($three['articles'][1]['summary']==='Short excerpt'&&count($calls)-$count===2,'Use sanitized archive metadata without fetching every article page.');
    $count=count($calls);$assert($multi->latest('en')===$three&&count($calls)===$count,'Cache all three cards together.');
    $now+=3601;$fail=true;$retained=$multi->latest('en');
    $assert($retained['stale']&&$retained['articles']===$three['articles'],'Keep all three saved cards on source failure.');$fail=false;
    mkdir($root.'/legacy');file_put_contents($root.'/legacy/en.json',json_encode(['article'=>$first['article'],'retryAt'=>$now+3600]));
    $assert(count((new OfficialNews($root.'/legacy',$root.'/images',$fetch,$clock))->latest('en')['articles'])===3,'Upgrade an existing single-article cache without waiting an hour.');
    $multiple=false;
    mkdir($root.'/locked');$lock=fopen($root.'/locked/en.lock','c');flock($lock,LOCK_EX);
    $count=count($calls);$locked=(new OfficialNews($root.'/locked',$root.'/images',$fetch,$clock))->latest('en');
    $assert($locked['retryAfter']===15&&count($calls)===$count,'Concurrent refreshes must not duplicate upstream calls.');flock($lock,LOCK_UN);fclose($lock);
    // Exercise the public endpoint using fresh cache only: no game API key or network needed.
    mkdir($root.'/api/news',0775,true);$record=json_decode(file_get_contents($root.'/news/id.json'),true);$record['retryAt']=time()+3600;
    file_put_contents($root.'/api/news/id.json',json_encode($record));$_ENV['DATA_DIR']=$root.'/api';
    $app=App::create();$factory=new ServerRequestFactory();$response=$app->handle($factory->createServerRequest('GET','/api/news/latest?lang=id'));
    $assert($response->getStatusCode()===200&&$response->getHeaderLine('Content-Language')==='id'&&$response->getHeaderLine('Cache-Control')==='no-store','News endpoint must serve localized cache independently of authenticated game data.');
    $assert(json_decode((string)$response->getBody(),true)['article']['title']==='Berita resmi','Endpoint must return the saved article.');
    echo "Official news tests passed: hourly cache, ID/EN, build rotation, embedded JSON fallback, excerpts, thumbnails, stale data, backoff, single-flight lock, URL restrictions, and API cache response.\n";
} finally {
    if ($oldDir===null) unset($_ENV['DATA_DIR']); else $_ENV['DATA_DIR']=$oldDir;
    $remove=static function(string $path) use (&$remove):void {foreach (glob($path.'/*')?:[] as $file) is_dir($file)?$remove($file):unlink($file);rmdir($path);};
    if (str_starts_with($root,sys_get_temp_dir().'/clanintel-news-')) $remove($root);
}
