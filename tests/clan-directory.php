<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';

use CocTracker\Seo;

$directory = sys_get_temp_dir().'/clan-directory-'.bin2hex(random_bytes(5));
mkdir($directory.'/snapshots',0775,true);
$assert = static function(bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); };
$parse = static function(string $html): DOMXPath {
    $old = libxml_use_internal_errors(true); $dom = new DOMDocument(); $dom->loadHTML($html); libxml_clear_errors(); libxml_use_internal_errors($old);
    return new DOMXPath($dom);
};
try {
    $writer = new Seo($directory,'https://clanintel.test','en');
    $tags = [];
    for ($i=0;$i<305;$i++) {
        $tag = 'P'.strtr(str_pad((string)$i,4,'0',STR_PAD_LEFT), ['1'=>'Q','3'=>'L','4'=>'G','5'=>'J','6'=>'C','7'=>'V']);
        $tags[] = $tag;
        $data = ['tag'=>'#'.$tag,'name'=>sprintf('Clan %03d',$i),'clanLevel'=>10+$i%20,'members'=>$i%51,'clanPoints'=>$i*100];
        if ($i===304) $data['name']='Elite <Clan> & "Friends"';
        if ($i===303) unset($data['members'],$data['clanPoints']);
        if ($i===302) $data['badgeUrls']=['small'=>'javascript:alert(1)'];
        if ($i===301) $data['badgeUrls']=['small'=>'https://example.test/badge.png'];
        $writer->remember('/clans/%23'.$tag,['data'=>$data,'lastUpdated'=>gmdate('c',time()-$i*60)]);
    }
    file_put_contents($directory.'/snapshots/'.$tags[0].'.json',json_encode(['snapshots'=>[['date'=>'2026-10-30'],['date'=>'2026-10-31']]]));
    foreach (['id','en'] as $lang) {
        $seo = new Seo($directory,'https://clanintel.test',$lang);
        [$status,$html] = $seo->page('/explore/clans',['page'=>'6']); $xp=$parse($html);
        $assert($status===200 && $xp->query('//article[@class="directory-clan"]')->length===50,'Page 6 must contain 50 server-rendered cards.');
        $assert(str_contains($html,'251–300')&&str_contains($html,'305'),'The result range and filtered total must be visible.');
        $assert($xp->query('//span[@aria-current="page" and text()="6"]')->length===1,'Pagination must mark page 6.');
        $assert($xp->query('//input[@name="lang" and @value="'.$lang.'"]')->length===1,'Forms must retain the active language.');
        $assert($xp->query('//link[@rel="canonical" and contains(@href,"page=6")]')->length===1,'Page 6 must have its own canonical.');
        $assert(str_contains($html,'content="index,follow"'),'Unfiltered directory pages must remain indexable.');
        [$status,$html] = $seo->page('/explore/clans',['q'=>'Elite']); $xp=$parse($html);
        $assert($status===200&&$xp->query('//article[@class="directory-clan"]')->length===1,'Search must include profiles beyond the first page.');
        $assert(str_contains($html,'Elite &lt;Clan&gt; &amp; &quot;Friends&quot;'),'Names must be escaped.');
        $assert(str_contains($html,'content="noindex,follow"'),'Search/filter variants must not create indexable permutations.');
        [$status,$html] = $seo->page('/explore/clans',['q'=>'#'.$tags[304]]);
        $assert($status===200&&$parse($html)->query('//article[@class="directory-clan"]')->length===1,'Search must support a leading hash in tags.');
        [$status,$html] = $seo->page('/explore/clans',['minLevel'=>'20','minMembers'=>'10','maxMembers'=>'40','sort'=>'points']); $xp=$parse($html);
        $last=INF;
        foreach ($xp->query('//article[@class="directory-clan"]') as $card) {
            $metrics=$xp->query('.//dd',$card);$level=(int)$metrics[0]->textContent;$members=(int)$metrics[1]->textContent;$points=(int)str_replace([',','.'],'',$metrics[2]->textContent);
            $assert($level>=20&&$members>=10&&$members<=40&&$points<=$last,'Filters and numeric sorting must apply before slicing the page.');$last=$points;
        }
        $next=$xp->evaluate('string(//a[@rel="next"]/@href)');
        $assert(str_contains($next,'minLevel=20')&&str_contains($next,'minMembers=10')&&str_contains($next,'maxMembers=40')&&str_contains($next,'sort=points')&&str_contains($next,'lang='.$lang),'Pagination must retain all filters, sort, and language.');
        $assert($xp->query('//div[contains(@class,"global-appearance")]/a[@lang="en" and contains(@href,"minLevel=20")]')->length===1,'Language switches must retain directory state.');
        [$status,$html]=$seo->page('/explore/clans',['sort'=>'points']);$xp=$parse($html);
        $assert(str_contains($xp->query('//article[@class="directory-clan"]')->item(0)->textContent,'Elite'),'Highest points must sort first.');
        $assert(str_contains($html,'https://example.test/badge.png')&&!str_contains($html,'javascript:alert'),'Badge URLs must use HTTPS, with a local fallback for invalid sources.');
        [$status,$html]=$seo->page('/explore/clans',[]);
        $assert(str_contains($html,'2 '.($lang==='en'?'daily snapshots':'snapshot harian')),'Cards must show the observed snapshot count.');
        [$status,$html]=$seo->page('/explore/clans',['q'=>'NoSuchClan']);
        $assert($status===200&&str_contains($html,'directory-empty')&&str_contains($html,'content="noindex,follow"'),'An empty search must explain that no saved clan matches.');
        foreach ([['q'=>['bad']],['sort'=>'bad'],['minLevel'=>'0'],['minMembers'=>'51'],['minMembers'=>'40','maxMembers'=>'20'],['page'=>'8'],['page'=>'0']] as $query) {
            $assert($seo->page('/explore/clans',$query)[0]===404,'Invalid and past-end requests must return 404.');
        }
    }
    echo "Clan directory tests passed: ID/EN, page 6, global search, filters, sorting, canonical/indexing, pagination, snapshot coverage, escaping and missing values.\n";
} finally {
    $remove = static function(string $path) use (&$remove): void { foreach (glob($path.'/*')?:[] as $file) is_dir($file)?$remove($file):unlink($file); rmdir($path); };
    $remove($directory);
}
