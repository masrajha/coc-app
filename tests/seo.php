<?php
declare(strict_types=1);
require dirname(__DIR__) . '/vendor/autoload.php';

use CocTracker\App;
use CocTracker\Seo;
use Slim\Psr7\Factory\ServerRequestFactory;

$directory = sys_get_temp_dir() . '/clanintel-seo-' . bin2hex(random_bytes(6));
mkdir($directory . '/cache',0775,true); mkdir($directory . '/snapshots',0775,true);
$old = [];
foreach (['DATA_DIR','APP_URL','COC_API_TOKEN'] as $key) $old[$key] = $_ENV[$key] ?? null;
$_ENV['DATA_DIR']=$directory; $_ENV['APP_URL']='https://clanintel.example.test'; $_ENV['COC_API_TOKEN']='';
$assert = static function(bool $condition,string $message):void { if (!$condition) throw new RuntimeException($message); };
$seed = static function(string $path,array $data,?string $updated=null) use ($directory):void {
    file_put_contents($directory.'/cache/'.hash('sha256',$path).'.json',json_encode(['expires'=>time()+900,'entry'=>['data'=>$data,'lastUpdated'=>$updated??gmdate('c')]]));
};
$dom = static function(string $html):DOMDocument { $previous=libxml_use_internal_errors(true); $document=new DOMDocument();$document->loadHTML($html);libxml_clear_errors();libxml_use_internal_errors($previous);return $document; };
try {
    $seo = new Seo($directory,'https://clanintel.example.test','en');
    $assert(!str_contains($seo->sitemap('pages'),'explore/'),'Empty directories must not enter the sitemap.');
    $player=['tag'=>'#28P08PG0G','name'=>'Test <Player> & $1','townHallLevel'=>18,'trophies'=>1234,'heroes'=>[['name'=>'Archer Queen','level'=>100]],'clan'=>['tag'=>'#2GPP802UU','name'=>'ISTIMEWA']];
    $seed('/players/%2328P08PG0G',$player);
    $seed('/players/%2322PC0Q009',['tag'=>'#22PC0Q009','name'=>'Too old','townHallLevel'=>17],gmdate('c',time()-91*86400));
    $seed('/players/%23PJ20G29L',['tag'=>'#PJ20G29L','name'=>'Not a full profile']);
    $seed('/locations/global/rankings/players?limit=25',['items'=>[['tag'=>'#28P08PG0G','name'=>'Ranked player','rank'=>1,'trophies'=>1234]]]);
    $seed('/locations?limit=100',['items'=>[['id'=>32000087,'name'=>'Indonesia','isCountry'=>true]]]);
    $seed('/locations/32000087/rankings/players?limit=25',['items'=>[['tag'=>'#28P08PG0G','name'=>'Indonesia ranking player','rank'=>7,'trophies'=>1234]]]);
    $seed('/locations/global/rankings/clans-builder-base?limit=25',['items'=>[['tag'=>'#2GPP802UU','name'=>'Builder clan','rank'=>1,'clanBuilderBasePoints'=>12345]]]);
    $seed('/locations/global/rankings/clans?limit=25',['items'=>[['tag'=>'#2GPP802UU','name'=>'Old ranking','rank'=>1,'clanPoints'=>1000]]],gmdate('c',time()-2*86400));
    file_put_contents($directory.'/snapshots/2GPP802UU.json',json_encode(['clanTag'=>'#2GPP802UU','snapshots'=>[
        ['date'=>gmdate('Y-m-d',time()-86400),'capturedAt'=>gmdate('c',time()-86400),'clan'=>['tag'=>'#2GPP802UU','name'=>'ISTIMEWA','level'=>22,'points'=>91000,'members'=>40],'members'=>[]],
        ['date'=>gmdate('Y-m-d'),'capturedAt'=>gmdate('c'),'clan'=>['tag'=>'#2GPP802UU','name'=>'ISTIMEWA','level'=>22,'points'=>92000,'members'=>41],'members'=>[['tag'=>'#28P08PG0G','name'=>'Test <Player> & $1']],'clanCapital'=>['districts'=>[['name'=>'Capital Peak','districtHallLevel'=>10]]]],
    ]]));
    $app=App::create();$factory=new ServerRequestFactory();
    $get=static fn(string $url)=>$app->handle($factory->createServerRequest('GET',$url));
    $robots=$get('/robots.txt');
    $assert($robots->getStatusCode()===200 && str_contains((string)$robots->getBody(),'Sitemap: https://clanintel.example.test/sitemap.xml'),'robots must advertise the public sitemap.');
    $assert(str_contains((string)$robots->getBody(),'Disallow: /api/')&&!str_contains((string)$robots->getBody(),'Disallow: /compare'),'Noindex pages must remain crawlable.');
    $index=$get('/sitemap.xml');$document=new DOMDocument();
    $assert($document->loadXML((string)$index->getBody()),'Sitemap index must be valid XML.');
    $assert(str_contains((string)$index->getBody(),'players-1.xml')&&str_contains((string)$index->getBody(),'clans-1.xml'),'Both saved entity kinds must be discoverable.');
    $allUrls=[];
    foreach ($document->getElementsByTagName('loc') as $location) {
        $url=parse_url($location->textContent,PHP_URL_PATH);$response=$get($url);$xml=new DOMDocument();
        $assert($response->getStatusCode()===200&&$xml->loadXML((string)$response->getBody()),'Every child sitemap must be XML and return 200.');
        $assert(!str_contains((string)$response->getBody(),'22PC0Q009')&&!str_contains((string)$response->getBody(),'PJ20G29L'),'Old and incomplete observations must be excluded.');
        $assert(!str_contains((string)$response->getBody(),'compare.html')&&!str_contains((string)$response->getBody(),'#ranked'),'Comparisons and fragment variants must not enter the sitemap.');
        foreach ($xml->getElementsByTagName('url') as $entry) {
            $assert($entry->getElementsByTagNameNS('http://www.w3.org/1999/xhtml','link')->length===3,'Each URL must have id, en and x-default alternates.');
            $absolute=$entry->getElementsByTagName('loc')->item(0)->textContent;
            $parts=parse_url($absolute);$page=$get($parts['path'].'?'.$parts['query']);$html=(string)$page->getBody();
            $assert($page->getStatusCode()===200,'Every sitemap URL must resolve.');
            $assert(!str_contains($html,'content="noindex,follow"'),'Sitemap must not advertise noindex pages.');
            $parsed=$dom($html);$xp=new DOMXPath($parsed);
            $assert($xp->evaluate('string(//link[@rel="canonical"]/@href)')===$absolute,'Sitemap URLs must equal the canonical identity.');
            $assert($xp->query('//link[@hreflang="id"]')->length===1 && $xp->query('//link[@hreflang="en"]')->length===1,'Each page needs reciprocal language declarations.');
            $allUrls[]=$absolute;
        }
    }
    $assert(count($allUrls)===count(array_unique($allUrls)),'Sitemap entries must be unique.');
    $playerHtml=(string)$get('/player.html?tag=28P08PG0G&lang=en&view=ranked-battles&session=previous&utm_source=test')->getBody();
    $xp=new DOMXPath($dom($playerHtml));
    $assert($xp->evaluate('string(//section[@id="savedProfile"]//h2)')==='Test <Player> & $1 #28P08PG0G','Server summary must preserve literal names safely, including dollar signs.');
    $assert(str_contains($playerHtml,'Archer Queen')&&!str_contains($playerHtml,'<Player>'),'Actual hero data must be present and user text escaped.');
    $assert($xp->evaluate('string(//link[@rel="canonical"]/@href)')==='https://clanintel.example.test/player.html?tag=28P08PG0G&lang=en','View and tracking parameters must not duplicate canonical profiles.');
    $assert(str_contains((string)$get('/clan.html?tag=2GPP802UU&lang=en')->getBody(),'daily snapshots available'),'Clan history coverage must be server rendered.');
    foreach (['/compare.html?lang=en','/compare.html?player1=28P08PG0G&player2=PJ20G29L','/player.html?lang=en','/player.html?tag=INVALID','/player.html?tag=QRCUY0YY2'] as $url) {
        $assert(str_contains((string)$get($url)->getBody(),'content="noindex,follow"'),'Empty, arbitrary or unavailable profiles must not be indexed.');
    }
    foreach (['/features/missing','/guides/missing','/explore/players?page=999','/explore/players?page[]=1','/leaderboards?category[]=players','/sitemaps/players-0.xml','/sitemaps/players-2.xml'] as $url) $assert($get($url)->getStatusCode()===404,'Unknown/past-end pages must return 404: '.$url);
    foreach (['id','en'] as $lang) {
        $guide=(string)$get('/guides/ranked-league?lang='.$lang)->getBody();
        $assert(str_contains($guide,'<html lang="'.$lang.'">')&&str_contains($guide,'application/ld+json')&&str_contains($guide,'Supercell'),'Guide content, structured data and attribution must be localized in initial HTML.');
        $assert(!str_contains($guide,'/api/'),'Guide pages must not rely on an API fetch to show content.');
        $features=(string)$get('/features?lang='.$lang)->getBody();
        $assert(substr_count($features,'class="seo-card-grid seo-feature-cards"')===1,'Feature hub must expose the product pages.');
        foreach (CocTracker\SeoFeatures::all($lang) as $slug=>$feature) {
            $path='/features/'.$slug;
            $response=$get($path.'?lang='.$lang.'&utm_source=test');$html=(string)$response->getBody();
            $xp=new DOMXPath($dom($html));
            $assert($response->getStatusCode()===200&&$response->getHeaderLine('Content-Language')===$lang,'Feature pages must work in both languages.');
            $assert($xp->query('//h1')->length===1&&$xp->evaluate('string(//h1)')===$feature['title'],'Feature heading must be localized server-rendered content.');
            $assert($xp->evaluate('string(//meta[@name="robots"]/@content)')==='index,follow','Product pages must be indexable independently of comparison pairs.');
            $assert($xp->evaluate('string(//link[@rel="canonical"]/@href)')==='https://clanintel.example.test'.$path.'?lang='.$lang,'Feature canonicals must omit tracking parameters.');
            $assert($xp->query('//figure/figcaption')->length===1&&$xp->query('//article/section')->length>=4,'Feature pages need substantive content and clearly labelled visual examples.');
            $assert($xp->query('//nav[contains(@class,"seo-feature-actions")]/a[contains(@href,"#'.$feature['tool'].'")]')->length>=1,'Feature CTA must activate the appropriate home search tab.');
            $schema=json_decode($xp->evaluate('string(//script[@type="application/ld+json"])'),true,512,JSON_THROW_ON_ERROR);
            $assert($schema['@type']==='WebPage'&&$schema['mainEntity']['@type']==='WebApplication'&&count($schema['mainEntity']['featureList'])>=4,'Structured data must describe actual app features.');
            $assert(!str_contains($html,'/api/'),'Feature pages must not require an API request.');
            $assert(str_contains($features,$path.'?lang='.$lang),'Every product page must be discoverable from the feature hub.');
        }
        $home=(string)$get('/?lang='.$lang)->getBody();
        $assert(str_contains($home,'seo-feature-discovery')&&str_contains($home,'/features/player-comparison?lang='.$lang),'Home must expose feature content and links in initial HTML.');
    }
    $assert(str_contains((string)$get('/leaderboards?category=players&lang=en')->getBody(),'Ranked player'),'Rankings must show saved rows in initial HTML.');
    $assert(str_contains((string)$get('/leaderboards?category=players&location=32000087&lang=en')->getBody(),'Indonesia ranking player'),'Country rankings must use their own API endpoint cache.');
    $assert(str_contains((string)$get('/leaderboards?category=clans-builder-base&lang=en')->getBody(),'12,345'),'Builder clan rankings must read clanBuilderBasePoints.');
    $assert(str_contains((string)$get('/leaderboards?category=clans&lang=en')->getBody(),'content="noindex,follow"'),'Stale rankings must not be published as a fresh indexable list.');
    $observed=gmdate('c',time()-3600);$now=gmdate('c');
    $historyPlayer=array_replace($player,['tag'=>'#PJ20G29L']);
    $seo->remember('/players/%23PJ20G29L',['data'=>$historyPlayer,'lastUpdated'=>$observed]);
    $seo->remember('/players/%23PJ20G29L',['data'=>$historyPlayer,'lastUpdated'=>$now]);
    $record=json_decode(file_get_contents($directory.'/seo/players/PJ20G29L.json'),true);
    $assert($record['changedAt']===$observed&&$record['lastUpdated']===$now,'Identical refetches must preserve meaningful lastmod while recording observation time.');
    $newSeo=new Seo($directory,'https://clanintel.example.test','en');
    $assert(str_contains($newSeo->sitemap('players'),$observed),'Profile sitemap lastmod must use the content change timestamp.');
    echo 'SEO tests passed: '.count($allUrls)." canonical multilingual URLs, disk-only discovery, SSR summaries, source escaping, guides, noindex policy and meaningful lastmod.\n";
} finally {
    foreach ($old as $key=>$value) { if ($value===null) unset($_ENV[$key]); else $_ENV[$key]=$value; }
    $remove=static function(string $path) use (&$remove):void { foreach (scandir($path)?:[] as $name) {if ($name==='.'||$name==='..')continue;$file=$path.'/'.$name;if(is_dir($file))$remove($file);else unlink($file);}rmdir($path);};
    $remove($directory);
}
