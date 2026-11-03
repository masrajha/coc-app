<?php
declare(strict_types=1);
namespace CocTracker;

use GuzzleHttp\Client;

/** Public website JSON, independent of the authenticated game API. Refreshes on demand. */
final class OfficialNews
{
    private const ORIGIN = 'https://supercell.com';
    private float $deadline = 0;

    public function __construct(private string $directory, private string $imageDirectory, private ?\Closure $fetch = null, private ?\Closure $clock = null) {}
    private function now(): int { return $this->clock ? ($this->clock)() : time(); }
    private function read(string $path): array
    {
        $value = is_file($path) ? json_decode((string)file_get_contents($path), true) : null;
        return is_array($value) ? $value : [];
    }
    private function write(string $path, string $body): void
    {
        $tmp = $path.'.'.bin2hex(random_bytes(4)).'.tmp';
        try {
            if (file_put_contents($tmp,$body,LOCK_EX)===false || !rename($tmp,$path)) throw new \RuntimeException('News cache write failed.');
        } finally { if (is_file($tmp)) unlink($tmp); }
    }
    public function latest(string $language): array
    {
        $language = $language === 'en' ? 'en' : 'id';
        if (!is_dir($this->directory) && !@mkdir($this->directory,0775,true) && !is_dir($this->directory)) return $this->result([],true);
        $path=$this->directory.'/'.$language.'.json';$cached=$this->read($path);
        if (($cached['retryAt'] ?? 0)>$this->now() && (isset($cached['articles']) || !empty($cached['failed']))) return $this->result($cached);
        $lock=@fopen($this->directory.'/'.$language.'.lock','c');
        if (!$lock || !flock($lock,LOCK_EX|LOCK_NB)) {
            if (is_resource($lock)) fclose($lock);
            return $this->result($cached,true,15);
        }
        try {
            $cached=$this->read($path);
            if (($cached['retryAt'] ?? 0)>$this->now() && (isset($cached['articles']) || !empty($cached['failed']))) return $this->result($cached);
            $this->deadline=microtime(true)+12;
            try {
                try { $record=$this->article($language,$cached['buildId'] ?? null); }
                catch (\Throwable $error) { if ($language==='en') throw $error; $record=$this->article('en',null); }
                $record['fetchedAt']=gmdate('c',$this->now());
                $record['retryAt']=$this->now()+3600;
                $record['checkedAt']=gmdate('c',$this->now());
                $this->write($path,json_encode($record,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));
                return $this->result($record);
            } catch (\Throwable) {
                // Retain the last successful article; failed refreshes also have a retry backoff.
                $cached['retryAt']=$this->now()+300;
                $cached['checkedAt']=gmdate('c',$this->now());
                $cached['failed']=true;
                try { $this->write($path,json_encode($cached,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)); } catch (\Throwable) {}
                return $this->result($cached,true);
            }
        } finally { flock($lock,LOCK_UN);fclose($lock); }
    }
    private function result(array $cached, bool $stale = false, ?int $retryAfter = null): array
    {
        $article=is_array($cached['article'] ?? null) ? $cached['article'] : null;
        $articles=is_array($cached['articles'] ?? null) ? array_slice($cached['articles'],0,3) : ($article ? [$article] : []);
        return ['article'=>$article,'articles'=>$articles,'stale'=>$article!==null && ($stale || !empty($cached['failed']) || strtotime($cached['fetchedAt'] ?? '')<$this->now()-3600),
            'fetchedAt'=>$cached['fetchedAt'] ?? null,'checkedAt'=>$cached['checkedAt'] ?? null,'retryAfter'=>$retryAfter];
    }
    private function request(string $url, bool $image = false): array
    {
        $parts=parse_url($url);
        $host=$parts['host'] ?? '';
        $valid=($parts['scheme'] ?? '')==='https' && !isset($parts['user']) && !isset($parts['pass']) && !isset($parts['port']);
        if (!$valid || ($image ? !in_array($host,['clashofclans.inbox.supercell.com','cdn.supercell.com'],true) : $host!=='supercell.com')) throw new \RuntimeException('Unexpected news source.');
        $remaining=$this->deadline-microtime(true);
        if ($remaining<0.25) throw new \RuntimeException('News refresh timed out.');
        if ($this->fetch) return ($this->fetch)($url,$image);
        $response=(new Client())->get($url,['timeout'=>min(4,$remaining),'connect_timeout'=>min(2,$remaining),'http_errors'=>false,'allow_redirects'=>false,'stream'=>true,
            'headers'=>['User-Agent'=>'ClanIntel official news reader','Accept'=>$image?'image/webp,image/*':'application/json,text/html']]);
        if ($response->getStatusCode()!==200) throw new \RuntimeException('News source unavailable.');
        $body='';$stream=$response->getBody();$limit=$image?1048576:2097152;
        while (!$stream->eof()) {
            if (microtime(true)>$this->deadline || strlen($body)>$limit) throw new \RuntimeException('News source limit exceeded.');
            $body.=$stream->read(8192);
        }
        if (strlen($body)>$limit) throw new \RuntimeException('News source limit exceeded.');
        return ['body'=>$body,'type'=>strtolower(explode(';',$response->getHeaderLine('Content-Type'))[0])];
    }
    private function nextData(string $url, bool $html): array
    {
        $response=$this->request($url);
        if (!$html) {
            if ($response['type']!=='application/json') throw new \RuntimeException('Expected news JSON.');
            $data=json_decode($response['body'],true,128,JSON_THROW_ON_ERROR);
            if (!is_array($data['pageProps'] ?? null)) throw new \RuntimeException('Missing news data.');
            return [$data['pageProps'],null];
        }
        if ($response['type']!=='text/html') throw new \RuntimeException('Expected news page.');
        $old=libxml_use_internal_errors(true);$dom=new \DOMDocument();$dom->loadHTML($response['body'],LIBXML_NONET);libxml_clear_errors();libxml_use_internal_errors($old);
        $script=(new \DOMXPath($dom))->query('//script[@id="__NEXT_DATA__"]')->item(0);
        $data=json_decode($script?->textContent ?? '',true,128,JSON_THROW_ON_ERROR);
        if (!is_array($data['props']['pageProps'] ?? null)) throw new \RuntimeException('Missing news data.');
        return [$data['props']['pageProps'],$data['buildId'] ?? null];
    }
    private function validBuild(mixed $build): bool { return is_string($build) && (bool)preg_match('/^[a-zA-Z0-9_-]{1,100}$/',$build); }
    private function article(string $language, mixed $build): array
    {
        $base='/en/games/clashofclans/'.($language==='id'?'id/':'').'blog';
        $archive=null;
        if ($this->validBuild($build)) {
            try { [$archive]=$this->nextData(self::ORIGIN.'/_next/data/'.$build.$base.'/page/1.json',false); } catch (\Throwable) {}
        }
        if ($archive===null) [$archive,$build]=$this->nextData(self::ORIGIN.$base.'/page/1/',true);
        $items=array_values(array_filter($archive['articles'] ?? [],'is_array'));
        usort($items,static fn(array $a,array $b):int => (strtotime($b['publishDate'] ?? '') ?: 0) <=> (strtotime($a['publishDate'] ?? '') ?: 0));
        $items=array_slice($items,0,3);
        $item=$items[0] ?? null;
        if (!is_array($item)) throw new \RuntimeException('No latest article.');
        $path=$item['linkUrl'] ?? '';
        if (!is_string($path) || !preg_match('~^'.preg_quote($base,'~').'/[a-z0-9-]+/[a-z0-9-]+/?$~',$path)) throw new \RuntimeException('Unexpected article URL.');
        $path=rtrim($path,'/');$detail=null;
        if ($this->validBuild($build)) {
            try { [$detail]=$this->nextData(self::ORIGIN.'/_next/data/'.$build.$path.'.json',false); } catch (\Throwable) {}
        }
        if ($detail===null) [$detail,$newBuild]=$this->nextData(self::ORIGIN.$path.'/',true);
        if (isset($newBuild) && $this->validBuild($newBuild)) $build=$newBuild;
        if (isset($detail['locale']) && $detail['locale']!==$language) throw new \RuntimeException('Unexpected article language.');
        $title=$this->text($detail['title'] ?? $item['title'] ?? '',160);
        $date=$detail['publishDate'] ?? $item['publishDate'] ?? null;
        if ($title==='' || !is_string($date) || !preg_match('/^\d{4}-\d{2}-\d{2}T/',$date) || strtotime($date)===false) throw new \RuntimeException('Incomplete article.');
        $summary='';
        foreach ($detail['bodyCollection'] ?? [] as $block) {
            foreach ($block['text']['json']['content'] ?? [] as $node) {
                if (($node['nodeType'] ?? '')==='paragraph') $summary=$this->text($this->richText($node),240);
                if ($summary!=='') break 2;
            }
        }
        if ($summary==='') $summary=$this->text($item['descriptionForNewsArchive'] ?? $detail['openGraph']['description'] ?? '',240);
        $image=$this->thumbnail($item['thumbnail']['imgUrl'] ?? null);
        $articles=[['title'=>$title,'summary'=>$summary,'url'=>self::ORIGIN.$path.'/',
            'publishedAt'=>$date,'sourceLanguage'=>$language,'image'=>$image,'contentHash'=>hash('sha256',$title.'|'.$summary.'|'.$date)]];
        // Archive metadata is sufficient for the other cards; avoid fetching every article page.
        foreach (array_slice($items,1) as $item) {
            $path=$item['linkUrl'] ?? '';
            if (!is_string($path) || !preg_match('~^'.preg_quote($base,'~').'/[a-z0-9-]+/[a-z0-9-]+/?$~',$path)) continue;
            $title=$this->text($item['title'] ?? '',160);
            $date=$item['publishDate'] ?? null;
            if ($title==='' || !is_string($date) || strtotime($date)===false) continue;
            $url=self::ORIGIN.rtrim($path,'/').'/';
            if (in_array($url,array_column($articles,'url'),true)) continue;
            $summary=$this->text($item['descriptionForNewsArchive'] ?? '',240);
            $articles[]=['title'=>$title,'summary'=>$summary,'url'=>$url,'publishedAt'=>$date,'sourceLanguage'=>$language,
                'image'=>$this->thumbnail($item['thumbnail']['imgUrl'] ?? null),'contentHash'=>hash('sha256',$title.'|'.$summary.'|'.$date)];
        }
        return ['buildId'=>$this->validBuild($build)?$build:null,'article'=>$articles[0],'articles'=>$articles];
    }
    private function richText(array $node): string
    {
        if (is_string($node['value'] ?? null)) return $node['value'];
        $text='';foreach ($node['content'] ?? [] as $child) if (is_array($child)) $text.=$this->richText($child);
        return $text;
    }
    private function text(mixed $value, int $limit): string
    {
        if (!is_string($value)) return '';
        $value=trim(preg_replace('/\s+/u',' ',html_entity_decode(strip_tags($value),ENT_QUOTES|ENT_HTML5,'UTF-8')) ?? '');
        if (preg_match('/^(.{0,'.$limit.'})(.)?/us',$value,$prefix) && isset($prefix[2]) && $prefix[2]!=='') {
            return preg_replace('/.$/us','',$prefix[1]).'…';
        }
        return $value;
    }
    private function thumbnail(mixed $url): ?string
    {
        if (!is_string($url)) return null;
        try {
            $parts=parse_url($url);
            if (!$parts || !in_array($parts['host'] ?? '',['clashofclans.inbox.supercell.com','cdn.supercell.com'],true) || ($parts['scheme'] ?? '')!=='https' || isset($parts['user']) || isset($parts['port'])) return null;
            parse_str($parts['query'] ?? '',$params);$params['fm']='webp';$params['w']='480';$params['q']='75';
            $url='https://'.$parts['host'].($parts['path'] ?? '/').'?'.http_build_query($params);
            $hash=hash('sha256',$url);
            foreach (['webp','png','jpg'] as $extension) if (is_file($this->imageDirectory.'/'.$hash.'.'.$extension)) return '/assets/images/news/'.$hash.'.'.$extension;
            $response=$this->request($url,true);$info=@getimagesizefromstring($response['body']);
            if (!$info || $info[0]>4096 || $info[1]>4096 || $info[0]*$info[1]>4000000 || !in_array($info['mime'],['image/webp','image/png','image/jpeg'],true)) return null;
            $body=$response['body'];$extension=['image/webp'=>'webp','image/png'=>'png','image/jpeg'=>'jpg'][$info['mime']];
            if (function_exists('imagecreatefromstring') && function_exists('imagewebp')) {
                $source=@imagecreatefromstring($body);
                if ($source) {
                    $width=min(480,imagesx($source));$height=max(1,(int)round(imagesy($source)*$width/imagesx($source)));
                    $small=imagecreatetruecolor($width,$height);imagealphablending($small,false);imagesavealpha($small,true);
                    imagecopyresampled($small,$source,0,0,0,0,$width,$height,imagesx($source),imagesy($source));
                    ob_start();imagewebp($small,null,78);$body=(string)ob_get_clean();$extension='webp';imagedestroy($source);imagedestroy($small);
                }
            }
            if ($body==='' || strlen($body)>163840) return null;
            if (!is_dir($this->imageDirectory) && !@mkdir($this->imageDirectory,0775,true) && !is_dir($this->imageDirectory)) return null;
            $this->write($this->imageDirectory.'/'.$hash.'.'.$extension,$body);
            return '/assets/images/news/'.$hash.'.'.$extension;
        } catch (\Throwable) { return null; }
    }
}
