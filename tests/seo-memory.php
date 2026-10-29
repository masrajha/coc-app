<?php
declare(strict_types=1);
require dirname(__DIR__) . '/vendor/autoload.php';

use CocTracker\Seo;

// Reproduce a shared-hosting memory budget, regardless of the CLI default.
ini_set('memory_limit', '64M');
$directory = sys_get_temp_dir() . '/clanintel-seo-memory-' . bin2hex(random_bytes(6));
mkdir($directory . '/cache', 0775, true);
try {
    $rows = [];
    for ($i = 0; $i < 2500; $i++) $rows[] = ['name'=>'Cached item '.$i, 'level'=>20, 'maxLevel'=>25, 'village'=>'home', 'extra'=>str_repeat('x', 60)];
    for ($i = 0; $i < 40; $i++) {
        $tag = '#P' . str_pad(strtr(base_convert((string)$i, 10, 4), '0123', '0289'), 4, '0', STR_PAD_LEFT);
        $kind = $i % 2 ? 'players' : 'clans';
        $data = ['tag'=>$tag, 'name'=>'Saved account '.$i, $kind === 'clans' ? 'clanLevel' : 'townHallLevel'=>18, 'troops'=>$rows, 'memberList'=>$rows];
        $entry = ['expires'=>time()+600, 'entry'=>['lastUpdated'=>gmdate('c'), 'data'=>$data]];
        file_put_contents($directory.'/cache/'.hash('sha256', $kind.$tag).'.json', json_encode($entry, JSON_THROW_ON_ERROR));
    }
    unset($rows, $data, $entry);
    // Ignore unrelated/corrupt cache records instead of crashing discovery.
    file_put_contents($directory.'/cache/bad-entry.json', '{"entry":"invalid"}');
    file_put_contents($directory.'/cache/bad-data.json', '{"entry":{"data":"invalid"}}');
    file_put_contents($directory.'/cache/truncated.json', '{');
    foreach (['en','id'] as $lang) {
        $seo = new Seo($directory, 'https://clanintel.example.test', $lang);
        $catalog = $seo->profiles();
        foreach (['clans','players'] as $kind) {
            if (count($catalog[$kind]) !== 20) throw new RuntimeException('All valid profiles must remain discoverable.');
            foreach ($catalog[$kind] as $entry) {
                if (isset($entry['data']['troops']) || isset($entry['data']['memberList'])) throw new RuntimeException('Discovery retained heavy API data.');
            }
            [$status, $html] = $seo->page('/explore/'.$kind, []);
            if ($status !== 200 || !str_contains($html, 'Saved account')) throw new RuntimeException('Directory must render within the hosting memory budget.');
        }
        if (!str_contains($seo->sitemap(), 'players-1.xml')) throw new RuntimeException('Compact discovery must preserve sitemap coverage.');
        unset($seo, $catalog);
    }
    echo 'SEO memory tests passed: both directories/languages and sitemap, 40 large cached profiles, malformed entries, 64 MiB limit; peak '.round(memory_get_peak_usage(true)/1048576, 1)." MiB.\n";
} finally {
    foreach (glob($directory.'/cache/*.json') ?: [] as $file) unlink($file);
    rmdir($directory.'/cache'); rmdir($directory);
}
