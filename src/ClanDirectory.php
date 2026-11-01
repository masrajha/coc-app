<?php

declare(strict_types=1);
namespace CocTracker;

/** A disk-only directory. Filters run over the complete compact catalog before pagination. */
final class ClanDirectory
{
    public function __construct(private string $directory, private string $lang, private \Closure $url) {}

    private function word(string $id, string $en): string { return $this->lang === 'en' ? $en : $id; }
    private function escape(mixed $value): string { return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
    private function number(mixed $value): string
    {
        return is_numeric($value) ? number_format((float)$value, 0, $this->lang === 'en' ? '.' : ',', $this->lang === 'en' ? ',' : '.') : '—';
    }
    private function link(string $path, array $params = []): string { return $this->escape(($this->url)($path, $params)); }
    private function date(string $value): string
    {
        try { $date = new \DateTimeImmutable($value); } catch (\Exception) { return '—'; }
        $date = $date->setTimezone(new \DateTimeZone('UTC'));
        $months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
        return $this->lang === 'en' ? $date->format('M j, Y · H:i') . ' UTC'
            : $date->format('j') . ' ' . $months[(int)$date->format('n') - 1] . $date->format(' Y · H.i') . ' UTC';
    }

    /** Returns shell arguments, or null for an invalid/past-end request. */
    public function render(array $all, array $query): ?array
    {
        foreach (['q','minLevel','minMembers','maxMembers','sort','page'] as $key) {
            if (isset($query[$key]) && !is_string($query[$key])) return null;
        }
        $search = trim($query['q'] ?? '');
        if (!preg_match('/^.{0,80}$/us', $search)) return null;
        $sort = $query['sort'] ?? 'recent';
        $sorts = ['recent'=>$this->word('Terakhir diamati','Recently observed'), 'level'=>$this->word('Level tertinggi','Highest level'),
            'points'=>$this->word('Poin tertinggi','Highest points'), 'name'=>$this->word('Nama A–Z','Name A–Z')];
        if (!isset($sorts[$sort])) return null;
        $filters = [];
        foreach (['minLevel'=>[1,100], 'minMembers'=>[0,50], 'maxMembers'=>[0,50], 'page'=>[1,100000]] as $key => [$min,$max]) {
            $value = $query[$key] ?? '';
            if ($value === '') continue;
            if (!ctype_digit($value) || (int)$value < $min || (int)$value > $max) return null;
            $filters[$key] = (int)$value;
        }
        if (isset($filters['minMembers'], $filters['maxMembers']) && $filters['minMembers'] > $filters['maxMembers']) return null;
        $page = $filters['page'] ?? 1; unset($filters['page']);
        $params = ($search !== '' ? ['q'=>$search] : []) + $filters + ($sort !== 'recent' ? ['sort'=>$sort] : []);
        $needle = ltrim($search, '#');
        $contains = static fn(string $text, string $term): bool => function_exists('mb_stripos') ? mb_stripos($text, $term, 0, 'UTF-8') !== false : stripos($text, $term) !== false;
        $matches = array_filter($all, static function(array $entry, string $tag) use ($search,$needle,$contains,$filters): bool {
            $data = $entry['data'];
            if ($search !== '' && !$contains((string)$data['name'], $search) && ($needle === '' || !$contains($tag, $needle))) return false;
            foreach (['minLevel'=>['clanLevel',true], 'minMembers'=>['members',true], 'maxMembers'=>['members',false]] as $key => [$field,$minimum]) {
                if (!isset($filters[$key])) continue;
                $value = $data[$field] ?? null;
                if (!is_numeric($value) || ($minimum ? $value < $filters[$key] : $value > $filters[$key])) return false;
            }
            return true;
        }, ARRAY_FILTER_USE_BOTH);
        uksort($matches, static function(string $a, string $b) use (&$matches,$sort): int {
            $left = $matches[$a]; $right = $matches[$b];
            if ($sort === 'name') $result = strnatcasecmp($left['data']['name'], $right['data']['name']);
            elseif ($sort === 'recent') $result = strtotime($right['lastUpdated']) <=> strtotime($left['lastUpdated']);
            else {
                $field = $sort === 'level' ? 'clanLevel' : 'clanPoints';
                $l = $left['data'][$field] ?? null; $r = $right['data'][$field] ?? null;
                $result = is_numeric($l) !== is_numeric($r) ? (is_numeric($l) ? -1 : 1) : ((float)$r <=> (float)$l);
            }
            return $result ?: strcmp($a, $b);
        });
        $total = count($matches); $pages = max(1, (int)ceil($total / 50));
        if ($page > $pages) return null;
        $entries = array_slice($matches, ($page - 1) * 50, 50, true);
        $body = '<div class="clan-directory"><form class="directory-filters" method="get" action="/explore/clans"><input type="hidden" name="lang" value="'.$this->lang.'">';
        $body .= '<label class="directory-search">'.$this->word('Nama atau tag klan','Clan name or tag');
        $body .= '<input type="search" name="q" value="'.$this->escape($search).'" maxlength="80" placeholder="'.$this->word('Cari di seluruh direktori…','Search the entire directory…').'"></label>';
        foreach (['minLevel'=>[$this->word('Level minimal','Minimum level'),1,100], 'minMembers'=>[$this->word('Anggota minimal','Minimum members'),0,50], 'maxMembers'=>[$this->word('Anggota maksimal','Maximum members'),0,50]] as $key => [$label,$min,$max]) {
            $body .= '<label>'.$label.'<input type="number" name="'.$key.'" min="'.$min.'" max="'.$max.'" step="1" value="'.($filters[$key] ?? '').'" placeholder="'.$this->word('Semua','Any').'"></label>';
        }
        $body .= '<label>'.$this->word('Urutan','Sort by').'<select name="sort">';
        foreach ($sorts as $value=>$label) $body .= '<option value="'.$value.'"'.($sort === $value ? ' selected' : '').'>'.$label.'</option>';
        $body .= '</select></label><div class="directory-filter-actions"><button type="submit">'.$this->word('Terapkan','Apply').'</button><a href="'.$this->link('/explore/clans').'">'.$this->word('Reset','Reset').'</a></div></form>';
        $from = $total ? ($page - 1) * 50 + 1 : 0; $to = min($page * 50, $total);
        $body .= '<div class="directory-results"><p>'.$this->word('Menampilkan','Showing').' '.$this->number($from).'–'.$this->number($to).' '.$this->word('dari','of').' '.$this->number($total).' '.$this->word('klan','clans').'</p><p>'.$this->word('Halaman','Page').' '.$this->number($page).' / '.$this->number($pages).'</p></div>';
        $body .= '<div class="directory-grid">';
        foreach ($entries as $tag=>$entry) $body .= $this->card((string)$tag, $entry);
        $body .= '</div>';
        if (!$entries) $body .= '<div class="directory-empty"><h2>'.$this->word('Tidak ada klan yang cocok','No matching clans').'</h2><p>'.$this->word('Coba kata kunci lain atau longgarkan filter. Direktori hanya memuat klan yang telah diamati.','Try another search or broaden the filters. This directory only contains observed clans.').'</p><a href="'.$this->link('/explore/clans').'">'.$this->word('Lihat semua klan','View all clans').'</a></div>';
        $body .= '<nav class="directory-pagination" aria-label="'.$this->word('Halaman direktori klan','Clan directory pages').'">';
        $pageLink = function(int $target, string $label, string $rel = '') use ($params): string {
            $url = $this->link('/explore/clans', $params + ($target > 1 ? ['page'=>$target] : []));
            return '<a href="'.$url.'"'.($rel ? ' rel="'.$rel.'"' : '').'>'.$label.'</a>';
        };
        if ($page > 1) $body .= $pageLink($page - 1, $this->word('← Sebelumnya','← Previous'), 'prev');
        $numbers = array_unique(array_merge([1], range(max(1,$page - 2), min($pages,$page + 2)), [$pages])); sort($numbers);
        $previous = 0;
        foreach ($numbers as $number) {
            if ($previous && $number > $previous + 1) $body .= '<span aria-hidden="true">…</span>';
            $body .= $number === $page ? '<span aria-current="page">'.$this->number($number).'</span>' : $pageLink($number, $this->number($number));
            $previous = $number;
        }
        if ($page < $pages) $body .= $pageLink($page + 1, $this->word('Berikutnya →','Next →'), 'next');
        $body .= '</nav><p class="directory-source">'.$this->number(count($all)).' '.$this->word('klan tersimpan. Angka merupakan pengamatan terakhir, bukan statistik langsung.','saved clans. Figures reflect the last observation, not live statistics.').'</p></div>';
        return [$this->word('Jelajahi klan CoC','Explore CoC clans'),
            $this->word('Temukan klan yang diamati ClanIntel dalam 90 hari terakhir. Cari nama atau tag, lalu bandingkan level, anggota, dan poin klan.','Discover clans observed by ClanIntel in the last 90 days. Search by name or tag and compare clan levels, members, and points.'),
            $body, $params + ($page > 1 ? ['page'=>$page] : []), $params === [] && $total > 0];
    }

    private function card(string $tag, array $entry): string
    {
        $data = $entry['data'];
        $badge = $data['badgeUrls']['small'] ?? $data['badgeUrls']['medium'] ?? '';
        if (!is_string($badge) || !filter_var($badge, FILTER_VALIDATE_URL) || parse_url($badge, PHP_URL_SCHEME) !== 'https') $badge = '/assets/brand/clanintel-mark.svg';
        $body = '<article class="directory-clan"><div class="directory-identity"><img class="clan-directory-badge" src="'.$this->escape($badge).'" width="44" height="48" alt="" loading="lazy" decoding="async"><div><h2><a href="'.$this->link('/clan.html',['tag'=>$tag]).'">'.$this->escape($data['name']).'</a></h2><p>#'.$tag.'</p></div></div>';
        $meta = array_filter([$data['location']['name'] ?? null, $data['warLeague']['name'] ?? null], 'is_string');
        if ($meta) $body .= '<p class="directory-clan-meta">'.$this->escape(implode(' · ', $meta)).'</p>';
        $body .= '<dl class="directory-metrics">';
        foreach (['clanLevel'=>[$this->word('Level','Level'),null], 'members'=>[$this->word('Anggota','Members'),'/50'], 'clanPoints'=>[$this->word('Poin klan','Clan points'),null]] as $field=>[$label,$suffix]) {
            $value = $this->number($data[$field] ?? null);
            if (is_numeric($data[$field] ?? null)) $value .= $suffix ?? '';
            $body .= '<div><dt>'.$label.'</dt><dd>'.$value.'</dd></div>';
        }
        $body .= '</dl><div class="directory-observation">';
        $file = $this->directory.'/snapshots/'.$tag.'.json'; $record = is_file($file) ? json_decode((string)file_get_contents($file),true) : null;
        $snapshots = $record['snapshots'] ?? null;
        if (is_array($snapshots)) $body .= '<span>'.$this->number(count(array_filter($snapshots,'is_array'))).' '.$this->word('snapshot harian','daily snapshots').'</span>';
        else $body .= '<span>'.$this->word('Arsip snapshot belum tersedia','Snapshot archive unavailable').'</span>';
        $body .= '<span>'.$this->word('Terakhir diamati','Last observed').' <time datetime="'.$this->escape($entry['lastUpdated']).'">'.$this->date($entry['lastUpdated']).'</time></span></div>';
        return $body.'<div class="directory-clan-actions"><a href="'.$this->link('/clan.html',['tag'=>$tag]).'">'.$this->word('Buka klan →','Open clan →').'</a><a href="'.$this->link('/compare-clan.html',['clan1'=>$tag]).'">'.$this->word('Bandingkan','Compare').'</a></div></article>';
    }
}
