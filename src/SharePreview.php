<?php
declare(strict_types=1);

namespace CocTracker;

use GuzzleHttp\Client;

final class SharePreview
{
    public const TTL = 900;
    private const VERSION = 1;
    private float $deadline;
    private bool $partial = false;
    private bool $saved = false;

    public function __construct(private string $directory, private \Closure $fetch, private string $baseUrl, private string $locale)
    {
        $this->deadline = microtime(true) + 4.5;
    }

    private function tag(mixed $value): ?string
    {
        if (!is_string($value)) return null;
        $tag = strtoupper(ltrim(trim($value), '#'));
        return preg_match('/^[0289PYLQGRJCUV]{3,15}$/', $tag) ? $tag : null;
    }

    public function context(string $path, array $query): array
    {
        $kind = match ($path) {'/player.html' => 'player', '/compare.html' => 'compare', '/compare-clan.html' => 'compareClan', '/clan.html' => 'clan', default => 'home'};
        if ($kind === 'home' && ($this->tag($query['tag'] ?? null) || $this->tag($query['clan'] ?? null))) $kind = 'clan';
        $tags = match ($kind) {
            'player' => [$this->tag($query['tag'] ?? null)],
            'clan' => [$this->tag($query['tag'] ?? null) ?? $this->tag($query['clan'] ?? null)],
            'compare' => [$this->tag($query['player1'] ?? null), $this->tag($query['player2'] ?? null)],
            'compareClan' => [$this->tag($query['clan1'] ?? null), $this->tag($query['clan2'] ?? null)], default => []
        };
        $views = match ($kind) {
            'player' => ['army', 'progress', 'performance', 'ranked-battles', 'capital-raids', 'achievements'],
            'compare' => ['progress', 'army', 'war-cwl', 'ranked-league', 'activity'],
            'clan' => ['overview', 'members', 'war-cwl', 'capital', 'history'],
            default => ['overview']
        };
        $requested = $query['view'] ?? null;
        $view = is_string($requested) && in_array($requested, $views, true) ? $requested : $views[0];
        $session = ($query['session'] ?? null) === 'previous' ? 'previous' : 'current';
        return ['kind' => $kind, 'tags' => $tags, 'lang' => $this->locale, 'view' => $view, 'session' => $session, 'version' => self::VERSION];
    }

    private function word(string $id, string $en): string { return $this->locale === 'en' ? $en : $id; }

    private function number(mixed $value): string
    {
        if (!is_numeric($value)) return '—';
        return number_format((float)$value, (float)$value === floor((float)$value) ? 0 : 1, $this->locale === 'en' ? '.' : ',', $this->locale === 'en' ? ',' : '.');
    }

    private function data(string $path): ?array
    {
        $remaining = (int)(($this->deadline - microtime(true)) * 1000);
        if ($remaining < 100) { $this->partial = true; return null; }
        try {
            $entry = ($this->fetch)($path, min(2000, $remaining));
            if (!empty($entry['stale'])) $this->saved = true;
            return is_array($entry['data'] ?? null) ? $entry['data'] : null;
        } catch (\Throwable) { $this->partial = true; return null; }
    }

    private function icon(?string $league): ?string
    {
        $name = strtolower($league ?? '');
        foreach (['legend'=>'legend','electro titan'=>'electro-titan','titan'=>'electro-titan','electro'=>'electro-dragon','dragon'=>'dragon','p.e.k.k.a'=>'pekka','pekka'=>'pekka','golem'=>'golem','witch'=>'witch','valkyrie'=>'valkyrie','wizard'=>'wizard','archer'=>'archer','barbarian'=>'barbarian','skeleton'=>'skeleton'] as $word => $icon) {
            if (str_contains($name, $word)) return 'league-' . $icon . '.png';
        }
        return null;
    }

    private function player(?string $tag, array $context, int $index): array
    {
        $raw = $tag ? $this->data('/players/' . rawurlencode('#' . $tag)) : null;
        $name = $raw['name'] ?? ($tag ? '#' . $tag : $this->word('Pemain ', 'Player ') . ($index + 1));
        $league = $raw['leagueTier']['name'] ?? $raw['league']['name'] ?? null;
        $entity = ['name' => $name, 'tag' => $tag ? '#' . $tag : '—', 'badgeText' => 'TH', 'icon' => $this->icon($league),
            'badgeUrl' => $raw['clan']['badgeUrls']['medium'] ?? $raw['clan']['badgeUrls']['small'] ?? null,
            'subtitle' => ($league ?: $this->word('Profil pemain', 'Player profile')) . (!empty($raw['clan']['name']) ? ' · ' . $raw['clan']['name'] : ''),
            'metrics' => [['Town Hall', $this->number($raw['townHallLevel'] ?? null)], [$this->word('Trofi', 'Trophies'), $this->number($raw['trophies'] ?? null)], ['War Stars', $this->number($raw['warStars'] ?? null)]]];
        if (!$raw) { $this->partial = (bool)$tag || $this->partial; return $entity; }
        if (in_array($context['view'], ['ranked-battles', 'ranked-league'], true)) {
            $session = $context['session'];
            $groupTag = $this->tag($raw[$session . 'LeagueGroupTag'] ?? null);
            $season = $raw[$session . 'LeagueSeasonId'] ?? null;
            $group = $groupTag && is_numeric($season) && $season > 0 ? $this->data('/leaguegroup/' . rawurlencode('#' . $groupTag) . '/' . (int)$season . '?playerTag=' . rawurlencode('#' . $tag)) : null;
            $members = array_values(array_filter($group['members'] ?? [], 'is_array'));
            usort($members, static fn($a, $b) => (float)($b['leagueTrophies'] ?? 0) <=> (float)($a['leagueTrophies'] ?? 0));
            $rank = null; $member = null;
            foreach ($members as $position => $candidate) if (strtoupper($candidate['playerTag'] ?? '') === '#' . $tag) { $rank = $position + 1; $member = $candidate; break; }
            $stars = array_filter(array_column($group['attackLogs'] ?? [], 'stars'), 'is_numeric');
            $entity['metrics'] = [[$this->word('Peringkat', 'Group rank'), $rank ? '#' . $rank . '/' . count($members) : '—'],
                [$this->word('Trofi liga', 'League trophies'), $this->number($member['leagueTrophies'] ?? null)],
                [$this->word('Bintang/serangan', 'Stars/attack'), $stars ? $this->number(array_sum($stars) / count($stars)) : '—']];
            $entity['subtitle'] = 'Ranked League · ' . $this->word($session === 'previous' ? 'Sesi sebelumnya' : 'Sesi saat ini', $session === 'previous' ? 'Previous session' : 'Current session');
            if ($session === 'previous' && $this->tag($raw['currentLeagueGroupTag'] ?? null)) $entity['icon'] = null;
        }
        return $entity;
    }

    private function clan(?string $tag, array $context, int $index): array
    {
        $raw = $tag ? $this->data('/clans/' . rawurlencode('#' . $tag)) : null;
        $entity = ['name' => $raw['name'] ?? ($tag ? '#' . $tag : 'Clan ' . ($index + 1)), 'tag' => $tag ? '#' . $tag : '—',
            'badgeText' => isset($raw['clanLevel']) ? (string)$raw['clanLevel'] : 'COC', 'badgeUrl' => $raw['badgeUrls']['medium'] ?? $raw['badgeUrls']['small'] ?? null,
            'subtitle' => ($raw['warLeague']['name'] ?? 'Clan War League') . (isset($raw['clanLevel']) ? ' · Level ' . $raw['clanLevel'] : ''),
            'metrics' => [[$this->word('Anggota', 'Members'), isset($raw['members']) ? $this->number($raw['members']) . '/50' : '—'],
                [$this->word('Poin clan', 'Clan points'), $this->number($raw['clanPoints'] ?? null)], [$this->word('Perang menang', 'Wars won'), $this->number($raw['warWins'] ?? null)]]];
        if (!$raw) { $this->partial = (bool)$tag || $this->partial; return $entity; }
        if ($context['view'] === 'capital') $entity['metrics'] = [['Capital Hall', $this->number($raw['clanCapital']['capitalHallLevel'] ?? null)],
            [$this->word('Trofi Capital', 'Capital trophies'), $this->number($raw['clanCapitalPoints'] ?? null)],
            [$this->word('Distrik', 'Districts'), isset($raw['clanCapital']['districts']) ? count($raw['clanCapital']['districts']) : '—']];
        if ($context['view'] === 'war-cwl') {
            $war = $this->data('/clans/' . rawurlencode('#' . $tag) . '/currentwar');
            if (in_array($war['state'] ?? null, ['inWar', 'preparation', 'warEnded'], true)) {
                $entity['subtitle'] = $this->word('War klasik vs ', 'Classic war vs ') . ($war['opponent']['name'] ?? '—');
                $entity['metrics'] = [[$this->word('Bintang', 'Stars'), $this->number($war['clan']['stars'] ?? null) . ' vs ' . $this->number($war['opponent']['stars'] ?? null)],
                    [$this->word('Destruksi', 'Destruction'), $this->number($war['clan']['destructionPercentage'] ?? null) . '%'],
                    [$this->word('Serangan', 'Attacks'), $this->number($war['clan']['attacks'] ?? null)]];
            }
        }
        return $entity;
    }

    private function read(string $file): ?array
    {
        if (!is_file($file)) return null;
        $data = json_decode((string)file_get_contents($file), true); return is_array($data) ? $data : null;
    }

    private function write(string $file, string $content): void
    {
        $parent = dirname($file); if (!is_dir($parent) && !mkdir($parent, 0775, true) && !is_dir($parent)) throw new \RuntimeException('Share cache is not writable.');
        $temporary = $file . '.' . bin2hex(random_bytes(6)) . '.tmp';
        if (file_put_contents($temporary, $content, LOCK_EX) === false) throw new \RuntimeException('Share cache is not writable.');
        if (!@rename($temporary, $file)) { @unlink($temporary); if (!is_file($file)) throw new \RuntimeException('Share cache could not be saved.'); }
    }

    public function metadata(array $context): array
    {
        $key = hash('sha256', json_encode($context)); $file = $this->directory . '/contexts/' . $key . '.json';
        $cached = $this->read($file);
        if ($cached && ($cached['expires'] ?? 0) > time()) return $cached['metadata'] + ['origin' => $this->baseUrl];
        $kind = $context['kind'];
        $heading = match ($kind) {'player' => $this->word('Profil Pemain', 'Player Profile'), 'clan' => $this->word('Profil Clan', 'Clan Profile'),
            'compare' => $this->word('Perbandingan Pemain', 'Player Comparison'), 'compareClan' => $this->word('Perbandingan Clan', 'Clan Comparison'), default => 'Clan Command Center'};
        $entities = [];
        foreach ($context['tags'] as $index => $tag) $entities[] = in_array($kind, ['player', 'compare'], true) ? $this->player($tag, $context, $index) : $this->clan($tag, $context, $index);
        $view = $context['view'];
        $viewName = match ($view) {'ranked-battles', 'ranked-league' => 'Ranked League', 'capital', 'capital-raids' => 'Clan Capital',
            'war-cwl', 'performance' => 'War & CWL', 'members' => $this->word('Anggota', 'Members'), 'history' => $this->word('Riwayat & Laporan', 'History & Reports'),
            'progress' => $this->word('Progres', 'Progress'), 'achievements' => $this->word('Pencapaian', 'Achievements'), 'army' => 'Army', default => $this->word('Ringkasan', 'Overview')};
        if (!$entities) $entities[] = ['name' => 'Clan Command Center', 'tag' => 'Clash of Clans', 'badgeText' => 'COC', 'subtitle' => $this->word('Pantau clan, war, dan progres pemain', 'Track clans, wars, and player progress'),
            'metrics' => [['Clan', 'War & CWL'], ['Player', 'Ranked League'], ['Compare', 'Clan / Player']]];
        $names = array_column($entities, 'name');
        $title = $kind === 'home' ? $heading : $heading . ': ' . implode(' vs ', $names);
        $description = $kind === 'home' ? $this->word('Statistik clan, perang, Ranked League, dan perbandingan pemain Clash of Clans.', 'Clash of Clans clan statistics, wars, Ranked League, and player comparisons.')
            : $viewName . ' · ' . implode(' vs ', $names) . ' · CoC Clan Command Center';
        $card = ['heading' => $heading, 'context' => $viewName . ' · Clash of Clans', 'entities' => $entities,
            'notice' => $this->partial ? $this->word('Sebagian data belum tersedia', 'Some data is currently unavailable') : ($this->saved ? $this->word('Menggunakan data tersimpan', 'Using saved data') : ''),
            'footer' => $this->word('Snapshot dibuat ', 'Snapshot generated ') . gmdate('d M Y H:i') . ' UTC · ' . (parse_url($this->baseUrl, PHP_URL_HOST) ?: 'CoC Clan Command Center')];
        $hash = hash('sha256', json_encode($card, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE));
        $this->write($this->directory . '/images/' . $hash . '.json', json_encode($card, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR));
        $metadata = ['title' => $title . ' - CoC Clan Command Center', 'description' => $description, 'imageId' => $hash, 'context' => $context];
        $this->write($file, json_encode(['expires' => time() + ($this->partial ? 60 : self::TTL), 'metadata' => $metadata], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
        return $metadata + ['origin' => $this->baseUrl];
    }

    public function urls(array $metadata): array
    {
        $context = $metadata['context']; $kind = $context['kind'];
        $path = match ($kind) {'player'=>'/player.html','clan'=>'/clan.html','compare'=>'/compare.html','compareClan'=>'/compare-clan.html',default=>'/'};
        $params = ['lang' => $context['lang']];
        foreach ($context['tags'] as $index => $tag) if ($tag) $params[match ($kind) {'compare'=>'player' . ($index + 1),'compareClan'=>'clan' . ($index + 1),default=>'tag'}] = $tag;
        if ($kind !== 'home') $params['view'] = $context['view'];
        if (in_array($context['view'], ['ranked-battles', 'ranked-league'], true)) $params['session'] = $context['session'];
        return ['url' => $this->baseUrl . $path . '?' . http_build_query($params, '', '&', PHP_QUERY_RFC3986), 'image' => $this->baseUrl . '/share/image/' . $metadata['imageId'] . '.png'];
    }

    public function html(string $html, array $metadata): string
    {
        $urls = $this->urls($metadata);
        $escape = static fn(string $value): string => htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $html = preg_replace_callback('/<title\b[^>]*>.*?<\/title>/is', fn() => '<title>' . $escape($metadata['title']) . '</title>', $html, 1);
        $tags = ['og:type'=>'website', 'og:site_name'=>'CoC Clan Command Center', 'og:title'=>$metadata['title'], 'og:description'=>$metadata['description'],
            'og:url'=>$urls['url'], 'og:locale'=>$this->locale === 'en' ? 'en_US' : 'id_ID', 'og:image'=>$urls['image'], 'og:image:type'=>'image/png',
            'og:image:width'=>'1200', 'og:image:height'=>'630', 'og:image:alt'=>$metadata['title']];
        $head = '<link rel="canonical" href="' . $escape($urls['url']) . '">' . "\n";
        foreach ($tags as $property => $content) $head .= '<meta property="' . $property . '" content="' . $escape($content) . '">' . "\n";
        foreach (['description'=>$metadata['description'], 'twitter:card'=>'summary_large_image', 'twitter:title'=>$metadata['title'], 'twitter:description'=>$metadata['description'], 'twitter:image'=>$urls['image']] as $name => $content) $head .= '<meta name="' . $name . '" content="' . $escape($content) . '">' . "\n";
        return preg_replace_callback('/<\/head>/i', fn() => $head . '</head>', $html, 1);
    }

    private function asset(string $url): ?string
    {
        $parts = parse_url($url);
        if (!$parts || ($parts['scheme'] ?? '') !== 'https' || ($parts['host'] ?? '') !== 'api-assets.clashofclans.com' || isset($parts['user']) || isset($parts['port'])) return null;
        $file = $this->directory . '/assets/' . hash('sha256', $url) . '.img';
        if (is_file($file) && filemtime($file) > time() - 86400) return file_get_contents($file) ?: null;
        try {
            $client = new Client(['timeout'=>1.5,'read_timeout'=>1.5,'http_errors'=>false,'allow_redirects'=>false]);
            $response = $client->get($url, ['stream'=>true]);
            if ($response->getStatusCode() !== 200) return null;
            $stream = $response->getBody(); $bytes = ''; $deadline = microtime(true) + 1.5;
            while (!$stream->eof() && strlen($bytes) <= 1048576) {
                if (microtime(true) > $deadline) return null;
                $chunk = $stream->read(min(8192, 1048577 - strlen($bytes)));
                if ($chunk === '') return null;
                $bytes .= $chunk;
            }
            if (strlen($bytes) > 1048576 || !str_starts_with($response->getHeaderLine('Content-Type'), 'image/')) return null;
            $this->write($file, $bytes); return $bytes;
        } catch (\Throwable) { return null; }
    }

    public function image(string $hash): ?string
    {
        if (!preg_match('/^[a-f0-9]{64}$/', $hash)) return null;
        $file = $this->directory . '/images/' . $hash . '.png';
        if (is_file($file)) return file_get_contents($file) ?: null;
        $card = $this->read($this->directory . '/images/' . $hash . '.json'); if (!$card) return null;
        $bytes = (new ShareCard())->render($card, fn(string $url) => $this->asset($url));
        $this->write($file, $bytes); return $bytes;
    }
}
