<?php
declare(strict_types=1);
namespace CocTracker;

/** Public, disk-only discovery and server-rendered content. Never calls the game API. */
final class Seo
{
    private const CHUNK = 5000; // Two language URLs per profile: at most 10,000 entries per file.
    private const AGE = 90 * 86400;
    private const PROFILE_FIELDS = ['tag','name','clanLevel','members','clanPoints','warWins','warLeague','location','type','requiredTownhallLevel','clanCapital',
        'townHallLevel','builderHallLevel','expLevel','trophies','warStars','donations','donationsReceived','leagueTier','clan','heroes'];
    private ?array $catalog = null;
    private ?array $savedLocations = null;
    private ?array $savedRankingPages = null;

    public function __construct(private string $directory, private string $origin, private string $lang) {}
    private function word(string $id, string $en): string { return $this->lang === 'en' ? $en : $id; }
    private static function escape(mixed $value): string { return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
    private static function tag(mixed $value): ?string
    {
        if (!is_string($value)) return null;
        $tag = strtoupper(ltrim(trim($value), '#'));
        return preg_match('/^[0289PYLQGRJCUV]{3,15}$/', $tag) ? $tag : null;
    }
    private function read(string $path): array
    {
        if (!is_file($path)) return [];
        $data = json_decode((string)file_get_contents($path), true);
        return is_array($data) ? $data : [];
    }
    private function cache(string $path): array { return $this->read($this->directory . '/cache/' . hash('sha256', $path) . '.json')['entry'] ?? []; }
    private function number(mixed $value): string
    {
        if (!is_numeric($value)) return '—';
        return number_format((float)$value, floor((float)$value) === (float)$value ? 0 : 2, $this->lang === 'en' ? '.' : ',', $this->lang === 'en' ? ',' : '.');
    }
    public function url(string $path, array $params = [], ?string $lang = null): string
    {
        return $this->origin . $path . '?' . http_build_query($params + ['lang' => $lang ?? $this->lang], '', '&', PHP_QUERY_RFC3986);
    }
    private function alternates(string $path, array $params = []): string
    {
        $html = '';
        foreach (['id', 'en', 'x-default'] as $lang) $html .= '<link rel="alternate" hreflang="' . $lang . '" href="' . self::escape($this->url($path, $params, $lang === 'x-default' ? 'en' : $lang)) . '">';
        return $html;
    }

    /** Keep a compact current observation, not an additional daily profile history. */
    public function remember(string $path, array $entry): void
    {
        if (preg_match('~^/locations/(global|[0-9]{1,16})/rankings/(players|clans|players-builder-base|clans-builder-base|capitals)\?limit=(25|50)$~', $path, $ranking)) {
            $folder = $this->directory . '/seo/rankings';
            if (!is_dir($folder) && !@mkdir($folder, 0775, true) && !is_dir($folder)) return;
            if (!is_array($entry['data']['items'] ?? null)) return;
            $file = $folder . '/' . $ranking[1] . '-' . $ranking[2] . '.json';
            $record = ['location'=>$ranking[1], 'category'=>$ranking[2], 'entry'=>$entry];
            $old = $this->read($file);
            if ($old === $record || strtotime((string)($old['entry']['lastUpdated'] ?? '')) > strtotime((string)($entry['lastUpdated'] ?? ''))) return;
            $temporary = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
            if (@file_put_contents($temporary,json_encode($record,JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE),LOCK_EX) !== false) @rename($temporary,$file);
            if (is_file($temporary)) @unlink($temporary);
            return;
        }
        if (!preg_match('~^/(clans|players)/%23([0289PYLQGRJCUV]{3,15})$~i', $path, $match)) return;
        $raw = $entry['data'] ?? []; $tag = self::tag($raw['tag'] ?? null);
        if ($tag !== strtoupper($match[2]) || !is_string($raw['name'] ?? null) || trim($raw['name']) === '') return;
        if (!is_numeric($raw[$match[1] === 'clans' ? 'clanLevel' : 'townHallLevel'] ?? null)) return;
        $saved = ['data' => array_intersect_key($raw, array_flip(self::PROFILE_FIELDS)), 'lastUpdated' => $entry['lastUpdated'] ?? gmdate('c')];
        $folder = $this->directory . '/seo/' . $match[1];
        if (!is_dir($folder) && !@mkdir($folder, 0775, true) && !is_dir($folder)) return;
        $file = $folder . '/' . $tag . '.json';
        $old = $this->read($file);
        $saved['changedAt'] = ($old['data'] ?? null) == $saved['data'] ? ($old['changedAt'] ?? $old['lastUpdated'] ?? $saved['lastUpdated']) : $saved['lastUpdated'];
        if (strtotime((string)($old['lastUpdated'] ?? '')) > strtotime((string)$saved['lastUpdated']) || $old === $saved) return;
        $temporary = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
        if (@file_put_contents($temporary, json_encode($saved, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE), LOCK_EX) !== false) @rename($temporary, $file);
        if (is_file($temporary)) @unlink($temporary);
    }

    private function valid(array $entry, string $kind): bool
    {
        $data = $entry['data'] ?? [];
        if (!is_array($data)) return false;
        $time = strtotime((string)($entry['lastUpdated'] ?? ''));
        return self::tag($data['tag'] ?? null) !== null && is_string($data['name'] ?? null) && trim($data['name']) !== ''
            && is_numeric($data[$kind === 'clans' ? 'clanLevel' : 'townHallLevel'] ?? null)
            && $time !== false && $time >= time() - self::AGE && $time <= time() + 300;
    }

    public function profiles(): array
    {
        if ($this->catalog !== null) return $this->catalog;
        $result = ['clans' => [], 'players' => []];
        $add = function (mixed $entry) use (&$result): void {
            if (!is_array($entry)) return;
            $kind = isset($entry['data']['clanLevel']) ? 'clans' : 'players';
            if (!$this->valid($entry, $kind)) return;
            $tag = self::tag($entry['data']['tag']);
            if (!isset($result[$kind][$tag]) || strtotime($entry['lastUpdated']) >= strtotime($result[$kind][$tag]['lastUpdated'])) {
                // Discovery must not retain entire API profiles (troops, equipment,
                // achievements or clan rosters) for every cached account at once.
                $compact = array_intersect_key($entry, array_flip(['data','lastUpdated','changedAt']));
                $compact['data'] = array_intersect_key($entry['data'], array_flip(self::PROFILE_FIELDS));
                $result[$kind][$tag] = $compact;
            }
        };
        // Seed discovery from existing cache files, including installations predating this feature.
        foreach (glob($this->directory . '/cache/*.json') ?: [] as $path) $add($this->read($path)['entry'] ?? []);
        foreach (glob($this->directory . '/snapshots/*.json') ?: [] as $path) {
            $saved = $this->read($path); $latest = null;
            foreach ($saved['snapshots'] ?? [] as $snapshot) if (is_array($snapshot) && ($latest === null || strcmp((string)($snapshot['capturedAt'] ?? $snapshot['date'] ?? ''), (string)($latest['capturedAt'] ?? $latest['date'] ?? '')) > 0)) $latest = $snapshot;
            if (!$latest) continue;
            $clan = $latest['clan'] ?? [];
            $add(['lastUpdated' => $latest['capturedAt'] ?? (($latest['date'] ?? '') . 'T00:00:00Z'), 'data' => [
                'tag' => $clan['tag'] ?? $saved['clanTag'] ?? null, 'name' => $clan['name'] ?? null, 'clanLevel' => $clan['level'] ?? null,
                'clanPoints' => $clan['points'] ?? null, 'members' => $clan['members'] ?? null, 'clanCapital' => $latest['clanCapital'] ?? null]]);
        }
        foreach (['clans','players'] as $kind) foreach (glob($this->directory . '/seo/' . $kind . '/*.json') ?: [] as $path) $add($this->read($path));
        foreach ($result as &$entries) ksort($entries); unset($entries);
        return $this->catalog = $result;
    }

    public function profile(string $kind, string $tag): ?array
    {
        $entry = $this->read($this->directory . '/seo/' . $kind . '/' . $tag . '.json');
        $cache = $this->cache('/' . $kind . '/' . rawurlencode('#' . $tag));
        if (($cache['lastUpdated'] ?? '') > ($entry['lastUpdated'] ?? '')) $entry = $cache;
        if ($this->valid($entry, $kind) && self::tag($entry['data']['tag']) === $tag) return $entry;
        return $kind === 'clans' ? ($this->profiles()['clans'][$tag] ?? null) : null;
    }

    private function profileSummary(string $kind, string $tag, array $entry): string
    {
        $data = $entry['data'];
        $html = '<section class="seo-context" id="savedProfile" lang="' . $this->lang . '"><div class="command-kicker">CLANINTEL</div><h2>' . self::escape($data['name']) . ' <small>#' . $tag . '</small></h2>';
        $html .= '<p data-i18n="seo.savedNote">' . $this->word('Ringkasan data tersimpan. Periksa waktu pengamatan; statistik langsung dapat lebih baru.', 'Saved data summary. Check the observation time; live statistics may be newer.') . '</p><dl class="seo-metrics">';
        $fields = $kind === 'clans' ? ['clanLevel'=>['seo.level','Level','Level'], 'members'=>['seo.members','Anggota','Members'], 'clanPoints'=>['seo.points','Poin klan','Clan points'], 'warWins'=>['seo.wins','Perang menang','Wars won']]
            : ['townHallLevel'=>['seo.th','Town Hall','Town Hall'], 'trophies'=>['seo.trophies','Trofi','Trophies'], 'warStars'=>['seo.stars','Bintang perang','War stars'], 'donations'=>['seo.donations','Donasi','Donations']];
        foreach ($fields as $key => [$translation,$id,$en]) if (is_numeric($data[$key] ?? null)) $html .= '<div><dt data-i18n="' . $translation . '">' . $this->word($id,$en) . '</dt><dd data-seo-number="' . self::escape($data[$key]) . '">' . $this->number($data[$key]) . '</dd></div>';
        $html .= '</dl><p><span data-i18n="seo.observed">' . $this->word('Diamati', 'Observed') . '</span>: <time datetime="' . self::escape($entry['lastUpdated']) . '" data-seo-date>' . self::escape(gmdate('Y-m-d H:i', strtotime($entry['lastUpdated']))) . ' UTC</time></p>';
        $related = [];
        if ($kind === 'players') {
            if (is_string($data['leagueTier']['name'] ?? null)) $html .= '<p>Ranked League: ' . self::escape($data['leagueTier']['name']) . '</p>';
            $clan = self::tag($data['clan']['tag'] ?? null);
            if ($clan) $related[] = '<a href="' . self::escape($this->url('/clan.html',['tag'=>$clan])) . '">' . self::escape($data['clan']['name'] ?? ('#'.$clan)) . '</a>';
            if (is_array($data['heroes'] ?? null) && $data['heroes']) {
                $html .= '<h3 data-i18n="seo.heroes">' . $this->word('Level hero yang tercatat','Recorded hero levels') . '</h3><ul class="seo-inline-list">';
                foreach (array_slice($data['heroes'],0,8) as $hero) if (is_string($hero['name'] ?? null) && is_numeric($hero['level'] ?? null)) $html .= '<li>' . self::escape($hero['name']) . ': ' . $this->number($hero['level']) . '</li>';
                $html .= '</ul>';
            }
        } else {
            $snapshots = $this->read($this->directory . '/snapshots/' . $tag . '.json')['snapshots'] ?? [];
            usort($snapshots, static fn($a,$b) => strcmp($a['date'] ?? '',$b['date'] ?? ''));
            if ($snapshots) {
                $first = $snapshots[0]; $last = $snapshots[array_key_last($snapshots)];
                $html .= '<h3 data-i18n="seo.archive">' . $this->word('Cakupan snapshot klan','Clan snapshot coverage') . '</h3><p>' . count($snapshots) . ' <span data-i18n="seo.snapshots">' . $this->word('snapshot harian tersedia','daily snapshots available') . '</span>: ' . self::escape($first['date'] ?? '') . ' — ' . self::escape($last['date'] ?? '') . ' (UTC).</p>';
                $html .= '<p data-i18n="seo.snapshotNote">' . $this->word('Tanggal tanpa snapshot tidak berarti aktivitas nol. Snapshot tidak mencatat setiap upgrade bangunan.', 'A date without a snapshot does not mean zero activity. Snapshots do not record every building upgrade.') . '</p>';
                $html .= '<ul class="seo-inline-list">';
                foreach (array_slice($last['members'] ?? [],0,10) as $member) {
                    $memberTag = self::tag($member['tag'] ?? null);
                    if ($memberTag) $html .= '<li><a href="' . self::escape($this->url('/player.html',['tag'=>$memberTag])) . '">' . self::escape($member['name'] ?? '#'.$memberTag) . '</a></li>';
                }
                $html .= '</ul>';
            }
            if (is_array($data['clanCapital']['districts'] ?? null)) {
                $html .= '<h3>Clan Capital</h3><ul class="seo-inline-list">';
                foreach ($data['clanCapital']['districts'] as $district) $html .= '<li>' . self::escape($district['name'] ?? '') . ': ' . $this->number($district['districtHallLevel'] ?? null) . '</li>';
                $html .= '</ul>';
            }
        }
        $related[] = '<a href="' . self::escape($this->url('/guides/' . ($kind === 'clans' ? 'war-cwl' : 'player-progress'))) . '" data-i18n="seo.readGuide">' . $this->word('Panduan membaca statistik','How to read these statistics') . '</a>';
        return $html . '<nav class="seo-links">' . implode(' ', $related) . '</nav></section>';
    }

    /** Normalize SEO identities independently of the share card's selected view. */
    public function decorate(string $html, string $path, array $query): string
    {
        $tag = self::tag($query['tag'] ?? null) ?? self::tag($query['clan'] ?? null);
        $isClan = $path === '/clan.html' || (in_array($path,['/','/index.html'],true) && $tag !== null);
        $kind = $isClan ? 'clans' : ($path === '/player.html' ? 'players' : null);
        $canonicalPath = $kind === 'clans' ? '/clan.html' : ($path === '/index.html' ? '/' : $path);
        $params = $kind && $tag ? ['tag'=>$tag] : [];
        $indexable = $canonicalPath === '/'; $summary = '';
        if ($kind && $tag) {
            $entry = $this->profile($kind,$tag); $indexable = $entry !== null;
            if ($entry) $summary = $this->profileSummary($kind,$tag,$entry);
        }
        // Do not index arbitrary comparison pairs, empty forms or invalid entity requests.
        if (in_array($path,['/compare.html','/compare-clan.html'],true) || ($kind && !$tag)) $indexable = false;
        if ((isset($query['tag']) || isset($query['clan'])) && !$tag) $indexable = false;
        $html = preg_replace('~<link\b(?=[^>]*\brel="canonical")[^>]*>~i','',$html);
        $html = preg_replace('~<meta\b(?=[^>]*\bname="robots")[^>]*>~i','',$html);
        $head = '<link rel="canonical" href="' . self::escape($this->url($canonicalPath,$params)) . '">' . $this->alternates($canonicalPath,$params)
            . '<meta name="robots" content="' . ($indexable ? 'index,follow' : 'noindex,follow') . '">';
        $html = str_replace('</head>',$head.'</head>',$html);
        if ($summary !== '') $html = preg_replace_callback('~</main>~', fn() => $summary . '</main>', $html, 1);
        $links = '<nav class="seo-links seo-footer-links" aria-label="ClanIntel"><a href="' . self::escape($this->url('/guides')) . '" data-i18n="seo.guides">' . $this->word('Panduan','Guides') . '</a><a href="' . self::escape($this->url('/explore/clans')) . '" data-i18n="seo.clans">' . $this->word('Direktori klan','Clan directory') . '</a><a href="' . self::escape($this->url('/explore/players')) . '" data-i18n="seo.players">' . $this->word('Direktori pemain','Player directory') . '</a><a href="' . self::escape($this->url('/leaderboards')) . '" data-i18n="seo.rankings">Leaderboard</a></nav>';
        return preg_replace_callback('~(<footer\b[^>]*>)~', fn($match) => $match[1] . $links, $html,1);
    }

    public function robots(): string
    {
        return "User-agent: *\nDisallow: /api/\nDisallow: /share/\nDisallow: /battle-log-style/\n\nSitemap: " . $this->origin . "/sitemap.xml\n";
    }
    private function locations(): array
    {
        if ($this->savedLocations !== null) return $this->savedLocations;
        $locations = ['global' => 'Global'];
        foreach (glob($this->directory.'/cache/*.json') ?: [] as $file) {
            foreach ($this->read($file)['entry']['data']['items'] ?? [] as $item) {
                if (($item['isCountry'] ?? false) !== true || !is_numeric($item['id'] ?? null) || !is_string($item['name'] ?? null)) continue;
                $locations[(string)(int)$item['id']] = $item['name'];
            }
        }
        return $this->savedLocations = $locations;
    }
    private function ranking(string $type, string $location): array
    {
        $entry = $this->read($this->directory.'/seo/rankings/'.$location.'-'.$type.'.json')['entry'] ?? [];
        foreach ([25,50] as $limit) {
            $cached = $this->cache('/locations/'.$location.'/rankings/'.$type.'?limit='.$limit);
            if (($cached['lastUpdated'] ?? '') > ($entry['lastUpdated'] ?? '')) $entry = $cached;
        }
        $time = strtotime((string)($entry['lastUpdated'] ?? ''));
        if ($time === false || $time < time()-86400 || $time > time()+300) return [];
        $entry['data']['items'] = array_values(array_filter($entry['data']['items'] ?? [],static fn($item)=>is_array($item) && self::tag($item['tag'] ?? null) !== null && is_string($item['name'] ?? null) && is_numeric($item['rank'] ?? null)));
        return $entry;
    }
    private function rankingPages(): array
    {
        if ($this->savedRankingPages !== null) return $this->savedRankingPages;
        $pages = [];
        foreach ($this->locations() as $location=>$name) foreach (['players','clans','players-builder-base','clans-builder-base','capitals'] as $type) {
            if (!empty($this->ranking($type,(string)$location)['data']['items'])) $pages[] = ['category'=>$type] + ($location==='global' ? [] : ['location'=>(string)$location]);
        }
        return $this->savedRankingPages = $pages;
    }
    private function xmlEntry(string $path, array $params = [], ?string $updated = null): string
    {
        $xml = '';
        foreach (['id','en'] as $lang) {
            $xml .= '<url><loc>' . self::escape($this->url($path,$params,$lang)) . '</loc>';
            if ($updated && strtotime($updated) !== false) $xml .= '<lastmod>' . gmdate('c',strtotime($updated)) . '</lastmod>';
            foreach (['id','en','x-default'] as $alternate) $xml .= '<xhtml:link rel="alternate" hreflang="' . $alternate . '" href="' . self::escape($this->url($path,$params,$alternate === 'x-default' ? 'en' : $alternate)) . '"/>';
            $xml .= '</url>';
        }
        return $xml;
    }
    public function sitemap(?string $group = null, int $page = 1): ?string
    {
        if ($group === null) {
            $xml = '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
            $paths = ['/sitemaps/pages.xml','/sitemaps/guides.xml'];
            foreach ($this->profiles() as $kind=>$profiles) for ($i=1;$i<=ceil(count($profiles)/self::CHUNK);$i++) $paths[] = '/sitemaps/'.$kind.'-'.$i.'.xml';
            foreach ($paths as $path) $xml .= '<sitemap><loc>'.self::escape($this->origin.$path).'</loc></sitemap>';
            return $xml.'</sitemapindex>';
        }
        $xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">';
        if ($group === 'pages' && $page === 1) {
            foreach (['/','/guides'] as $path) $xml .= $this->xmlEntry($path);
            foreach ($this->profiles() as $kind=>$profiles) if ($profiles) $xml .= $this->xmlEntry('/explore/'.$kind);
        }
        elseif ($group === 'guides' && $page === 1) foreach (SeoGuides::all('en') as $slug=>$_) $xml .= $this->xmlEntry('/guides/'.$slug,[],SeoGuides::UPDATED);
        elseif (in_array($group,['clans','players'],true) && $page >= 1) {
            $profiles = array_slice($this->profiles()[$group],($page-1)*self::CHUNK,self::CHUNK,true);
            if (!$profiles) return null;
            foreach ($profiles as $tag=>$entry) $xml .= $this->xmlEntry($group === 'clans' ? '/clan.html' : '/player.html',['tag'=>$tag],$entry['changedAt'] ?? null);
        } else return null;
        // Include ranking categories only when saved rows exist; no thin placeholder sitemap entries.
        if ($group === 'pages') foreach ($this->rankingPages() as $params) $xml .= $this->xmlEntry('/leaderboards',$params);
        return $xml.'</urlset>';
    }

    private function shell(string $title, string $description, string $body, string $path, array $params = [], bool $index = true, ?array $article = null): string
    {
        $canonical = $this->url($path,$params); $escape = self::escape(...);
        $head = '<title>'.$escape($title).' - ClanIntel</title><meta name="description" content="'.$escape($description).'"><link rel="canonical" href="'.$escape($canonical).'">'.$this->alternates($path,$params).'<meta name="robots" content="'.($index?'index,follow':'noindex,follow').'">';
        foreach (['og:type'=>$article?'article':'website','og:site_name'=>'ClanIntel','og:title'=>$title.' - ClanIntel','og:description'=>$description,'og:url'=>$canonical,'og:locale'=>$this->lang==='en'?'en_US':'id_ID'] as $name=>$value) $head .= '<meta property="'.$name.'" content="'.$escape($value).'">';
        $schema = ['@context'=>'https://schema.org','@type'=>$article?'Article':'CollectionPage','name'=>$title,'description'=>$description,'url'=>$canonical,'inLanguage'=>$this->lang];
        if ($article) $schema += ['headline'=>$title,'dateModified'=>SeoGuides::UPDATED,'author'=>['@type'=>'Organization','name'=>'ClanIntel']];
        $head .= '<script type="application/ld+json">'.json_encode($schema,JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_UNICODE).'</script>';
        $languageLinks = '<a href="'.$escape($this->url($path,$params,'id')).'" lang="id" hreflang="id">Indonesia</a><a href="'.$escape($this->url($path,$params,'en')).'" lang="en" hreflang="en">English</a>';
        $theme = '<label class="seo-theme">'.$this->word('Tema','Theme').'<select data-seo-theme data-theme-switch aria-label="'.$this->word('Tema','Theme').'">';
        foreach (['dark'=>['Gelap','Dark'],'light'=>['Terang','Light'],'dark-simple'=>['Gelap Simple','Dark Simple'],'light-simple'=>['Terang Simple','Light Simple'],'system'=>['Sistem','System']] as $value=>$labels) $theme .= '<option value="'.$value.'">'.$this->word(...$labels).'</option>';
        $theme .= '</select></label>';
        return '<!doctype html><html lang="'.$this->lang.'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'.$head.'<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="alternate icon" href="/favicon.ico"><link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png"><script src="/theme.js"></script><script src="/seo.js" defer></script><link rel="stylesheet" href="/theme.css"><link rel="stylesheet" href="/theme-simple.css"><link rel="stylesheet" href="/site.css"><link rel="stylesheet" href="/seo.css"></head><body class="command-ui seo-page"><header class="site-header command-header"><div class="header-inner"><a class="command-brand" href="'.$escape($this->url('/')).'"><img class="clanintel-mark" src="/assets/brand/clanintel-mark.svg" width="44" height="44" alt=""><span class="clanintel-wordmark">Clan<span>Intel</span></span></a><nav class="command-header-nav"><a href="'.$escape($this->url('/guides')).'">'.$this->word('Panduan','Guides').'</a><a href="'.$escape($this->url('/explore/clans')).'">'.$this->word('Klan','Clans').'</a><a href="'.$escape($this->url('/explore/players')).'">'.$this->word('Pemain','Players').'</a>'.$languageLinks.$theme.'</nav></div></header><main class="seo-main"><h1>'.$escape($title).'</h1><p class="seo-intro">'.$escape($description).'</p>'.$body.'</main><footer class="footer"><a href="'.$escape($this->url('/')).'">ClanIntel</a><p class="brand-disclaimer">'.$this->word('Konten ini tidak berafiliasi dengan, didukung, disponsori, atau disetujui secara khusus oleh Supercell, dan Supercell tidak bertanggung jawab atas konten ini. Untuk informasi lebih lanjut, lihat','This content is not affiliated with, endorsed, sponsored, or specifically approved by Supercell and Supercell is not responsible for it. For more information see').' <a href="https://www.supercell.com/fan-content-policy" target="_blank" rel="noopener noreferrer"><strong>'.$this->word('Kebijakan Konten Penggemar Supercell','Supercell’s Fan Content Policy').'</strong></a>.</p></footer></body></html>';
    }

    /** Returns [status, html], always from saved data. */
    public function page(string $path, array $query): array
    {
        if ($path === '/guides') {
            $body = '<div class="seo-card-grid">';
            foreach (SeoGuides::all($this->lang) as $slug=>$guide) $body .= '<article><h2><a href="'.self::escape($this->url('/guides/'.$slug)).'">'.self::escape($guide['title']).'</a></h2><p>'.self::escape($guide['intro']).'</p></article>';
            return [200,$this->shell($this->word('Panduan statistik Clash of Clans','Clash of Clans statistics guides'),$this->word('Pelajari Ranked League, War & CWL, progres pemain dan Clan Capital dengan konteks serta batas data yang jelas.','Understand Ranked League, War & CWL, player progress and Clan Capital with clear context and data limitations.'),$body.'</div>',$path)];
        }
        if (str_starts_with($path,'/guides/')) {
            $slug = substr($path,8); $guide = SeoGuides::all($this->lang)[$slug] ?? null;
            if (!$guide) return [404,$this->shell($this->word('Panduan tidak ditemukan','Guide not found'),'','',$path,[],false)];
            $body = '<article class="seo-article"><p>'.$this->word('Diperbarui','Updated').': <time datetime="'.SeoGuides::UPDATED.'">'.SeoGuides::UPDATED.'</time></p>';
            foreach ($guide['sections'] as [$heading,$text]) $body .= '<section><h2>'.self::escape($heading).'</h2><p>'.self::escape($text).'</p></section>';
            $body .= '<p>'.$this->word('Rujukan resmi','Official reference').': <a href="'.self::escape($guide['source'][1]).'" target="_blank" rel="noopener noreferrer">'.self::escape($guide['source'][0]).'</a></p><nav class="seo-links"><a href="'.self::escape($this->url('/')).'#'.$guide['tool'].'">'.$this->word('Coba di ClanIntel','Try it in ClanIntel').'</a><a href="'.self::escape($this->url('/guides')).'">'.$this->word('Semua panduan','All guides').'</a></nav></article>';
            return [200,$this->shell($guide['title'],$guide['intro'],$body,$path,[],true,$guide)];
        }
        if (preg_match('~^/explore/(clans|players)$~',$path,$match)) {
            $kind = $match[1]; $page = $query['page'] ?? '1';
            if (!is_string($page) || !ctype_digit($page) || (int)$page < 1 || (int)$page > 100000) return [404,''];
            $page = (int)$page; $all = $this->profiles()[$kind]; $entries = array_slice($all,($page-1)*50,50,true);
            if ($page>1 && !$entries) return [404,''];
            $title = $kind==='clans'?$this->word('Direktori klan CoC tersimpan','Saved CoC clan directory'):$this->word('Direktori pemain CoC tersimpan','Saved CoC player directory');
            $description = $this->word('Profil yang telah diamati ClanIntel dalam 90 hari terakhir; bukan daftar seluruh akun Clash of Clans.','Profiles observed by ClanIntel in the last 90 days; not a list of every Clash of Clans account.');
            $body = '<div class="seo-card-grid">';
            foreach ($entries as $tag=>$entry) $body .= '<article><h2><a href="'.self::escape($this->url($kind==='clans'?'/clan.html':'/player.html',['tag'=>$tag])).'">'.self::escape($entry['data']['name']).'</a></h2><p>#'.$tag.'</p><p>'.($kind==='clans'?'Level':'Town Hall').' '.$this->number($entry['data'][$kind==='clans'?'clanLevel':'townHallLevel']).'</p></article>';
            if (!$entries) $body .= '<p>'.$this->word('Belum ada profil tersimpan. Buka klan atau pemain untuk mulai mengumpulkan data.','No saved profiles yet. Open a clan or player to start collecting data.').'</p>';
            $body .= '</div><nav class="seo-links">';
            if ($page>1) $body .= '<a href="'.self::escape($this->url($path,$page>2?['page'=>$page-1]:[])).'">'.$this->word('Sebelumnya','Previous').'</a>';
            if (count($all)>$page*50) $body .= '<a href="'.self::escape($this->url($path,['page'=>$page+1])).'">'.$this->word('Berikutnya','Next').'</a>';
            return [200,$this->shell($title,$description,$body.'</nav>',$path,$page>1?['page'=>$page]:[],(bool)$entries)];
        }
        if ($path === '/leaderboards') {
            $type = $query['category'] ?? 'players'; $types = ['players'=>'Players · Home Village','clans'=>'Clans · Home Village','players-builder-base'=>'Players · Builder Base','clans-builder-base'=>'Clans · Builder Base','capitals'=>'Clan Capital'];
            if (!is_string($type) || !isset($types[$type])) return [404,''];
            $location = $query['location'] ?? 'global'; $locations = $this->locations();
            if (!is_string($location) || !isset($locations[$location])) return [404,''];
            $entry = $this->ranking($type,$location);
            $items = $entry['data']['items'] ?? [];
            $body = '<nav class="seo-links">';
            foreach ($types as $key=>$label) $body .= '<a href="'.self::escape($this->url($path,['category'=>$key] + ($location==='global'?[]:['location'=>$location]))).'">'.self::escape($label).'</a>';
            $body .= '</nav><nav class="seo-links">';
            $available=['global'=>'Global'];
            foreach ($this->rankingPages() as $params) if (isset($params['location'])) $available[$params['location']]=$locations[$params['location']];
            foreach ($available as $id=>$name) $body.='<a href="'.self::escape($this->url($path,['category'=>$type] + ($id==='global'?[]:['location'=>$id]))).'">'.self::escape($name).'</a>';
            $body .= '</nav><p>'.$this->word('Daftar peringkat tersimpan, maksimal 25 entri. Filter negara mengikuti endpoint lokasi API; lokasi klan bukan bukti negara pemain.','Saved ranking list, up to 25 entries. Country filters follow the API location endpoint; a clan location does not establish a player’s country.').'</p>';
            if ($items) {
                $body .= '<p>'.$this->word('Diamati','Observed').': '.self::escape($entry['lastUpdated']).'</p><ol class="seo-ranking">';
                foreach (array_slice($items,0,25) as $item) {
                    $tag=self::tag($item['tag']??null); if (!$tag) continue;
                    $score=$type==='capitals'?($item['clanCapitalPoints']??$item['clanPoints']??null):($item[$type==='players-builder-base'?'builderBaseTrophies':($type==='clans-builder-base'?'clanBuilderBasePoints':(str_starts_with($type,'players')?'trophies':'clanPoints'))]??null);
                    $body.='<li><a href="'.self::escape($this->url(str_starts_with($type,'players')?'/player.html':'/clan.html',['tag'=>$tag])).'">#'.$this->number($item['rank']??null).' '.self::escape($item['name']??$tag).'</a><span>'.$this->number($score).'</span></li>';
                }
                $body.='</ol>';
            } else $body.='<p>'.$this->word('Belum ada daftar terbaru tersimpan untuk kategori ini.','No recent list is saved for this category yet.').'</p>';
            $body.='<p><a href="'.self::escape($this->url('/')).'#rankingsPanel">'.$this->word('Buka leaderboard interaktif dan filter negara','Open interactive leaderboards and country filters').'</a></p>';
            return [200,$this->shell($this->word('Peringkat CoC','CoC rankings').' — '.$locations[$location].' — '.$types[$type],$this->word('Peringkat dari API Clash of Clans, dengan kategori Home Village, Builder Base dan Clan Capital.','Rankings from the Clash of Clans API, covering Home Village, Builder Base and Clan Capital.'),$body,$path,['category'=>$type] + ($location==='global'?[]:['location'=>$location]),(bool)$items)];
        }
        return [404,''];
    }
}
