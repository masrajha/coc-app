<?php
declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use CocTracker\App;
use CocTracker\ShareCard;
use CocTracker\SharePreview;
use Slim\Psr7\Factory\ServerRequestFactory;

$directory = sys_get_temp_dir() . '/coc-share-test-' . bin2hex(random_bytes(5));
mkdir($directory . '/cache', 0775, true);
$old = [];
foreach (['DATA_DIR', 'COC_API_TOKEN', 'APP_URL'] as $key) $old[$key] = $_ENV[$key] ?? null;
$_ENV['DATA_DIR'] = $directory; $_ENV['COC_API_TOKEN'] = 'private-test-token'; $_ENV['APP_URL'] = 'https://share.example.test';
$assert = static function (bool $test, string $message): void { if (!$test) throw new RuntimeException($message); };
$seed = static function (string $path, array $data) use ($directory): void {
    file_put_contents($directory . '/cache/' . hash('sha256', $path) . '.json', json_encode(['expires'=>time()+900, 'entry'=>['data'=>$data,'lastUpdated'=>gmdate('c')]]));
};
try {
    $name = 'Amerta <Player> & "Name" $1';
    $player = ['tag'=>'#28P08PG0G','name'=>$name,'townHallLevel'=>18,'trophies'=>1050,'warStars'=>3184,'leagueTier'=>['name'=>'Legend III'],
        'currentLeagueGroupTag'=>'#9RU089PG','currentLeagueSeasonId'=>10,'previousLeagueGroupTag'=>'#9RU089PG','previousLeagueSeasonId'=>9];
    $seed('/players/%2328P08PG0G', $player);
    $seed('/players/%23PJ20G29L', ['tag'=>'#PJ20G29L','name'=>'Other Player','townHallLevel'=>17,'trophies'=>900,'warStars'=>2000]);
    $seed('/clans/%232GPP802UU', ['tag'=>'#2GPP802UU','name'=>'ISTIMEWA','clanLevel'=>22,'members'=>28,'clanPoints'=>9100,'warWins'=>264,'warLeague'=>['name'=>'Master League I']]);
    $seed('/clans/%239RU089PG', ['tag'=>'#9RU089PG','name'=>'Other Clan','clanLevel'=>20,'members'=>40,'clanPoints'=>8800]);
    $seed('/leaguegroup/%239RU089PG/10?playerTag=%2328P08PG0G', ['members'=>[['playerTag'=>'#PJ20G29L','leagueTrophies'=>1100],['playerTag'=>'#28P08PG0G','leagueTrophies'=>1050]],'attackLogs'=>[['stars'=>3],['stars'=>2]]]);
    $seed('/leaguegroup/%239RU089PG/9?playerTag=%2328P08PG0G', ['members'=>[['playerTag'=>'#28P08PG0G','leagueTrophies'=>1066]]]);
    $app = App::create(); $factory = new ServerRequestFactory();
    $get = static function (string $url) use (&$app, $factory) { return $app->handle($factory->createServerRequest('GET', $url)); };
    $metadata = static function (string $html): array {
        $oldErrors = libxml_use_internal_errors(true); $dom = new DOMDocument(); $dom->loadHTML($html); libxml_clear_errors(); libxml_use_internal_errors($oldErrors);
        $result = []; foreach ($dom->getElementsByTagName('meta') as $meta) if ($meta->hasAttribute('property')) $result[$meta->getAttribute('property')] = $meta->getAttribute('content');
        $result['title'] = $dom->getElementsByTagName('title')->item(0)?->textContent;
        return $result;
    };
    $response = $get('/player.html?tag=28P08PG0G&lang=en&view=ranked-battles');
    $html = (string)$response->getBody(); $meta = $metadata($html);
    $assert($response->getStatusCode() === 200 && $response->getHeaderLine('Content-Language') === 'en', 'Shared HTML must be localized.');
    $assert($meta['og:title'] === 'Player Profile: ' . $name . ' - CoC Clan Command Center', 'Names and dollar signs must survive metadata escaping.');
    $assert($meta['og:title'] === $meta['title'] && $meta['og:locale'] === 'en_US', 'Initial title must match Open Graph metadata.');
    $assert(!str_contains($html, 'private-test-token') && !str_contains($html, '<Player>'), 'HTML must not expose tokens or unescaped names.');
    $assert(str_contains($meta['og:url'], 'view=ranked-battles') && str_contains($meta['og:url'], 'lang=en'), 'Canonical URL must preserve language and view.');
    $assert(str_starts_with($meta['og:image'], 'https://share.example.test/share/image/'), 'Image URL must use the configured public origin.');
    $imagePath = parse_url($meta['og:image'], PHP_URL_PATH);
    $pngResponse = $get($imagePath); $png = (string)$pngResponse->getBody();
    $info = getimagesizefromstring($png);
    $assert($pngResponse->getStatusCode() === 200 && $pngResponse->getHeaderLine('Content-Type') === 'image/png' && $info[0] === 1200 && $info[1] === 630, 'Public image must be a real 1200x630 PNG.');
    $assert(strlen($png) > 5000 && str_contains($pngResponse->getHeaderLine('Cache-Control'), 'immutable'), 'Image must contain card content and immutable caching.');
    $again = $metadata((string)$get('/player.html?tag=28P08PG0G&lang=en&view=ranked-battles')->getBody());
    $assert($again['og:image'] === $meta['og:image'], 'Metadata should reuse the 15-minute image snapshot.');
    $conditional = $app->handle($factory->createServerRequest('GET', $imagePath)->withHeader('If-None-Match', $pngResponse->getHeaderLine('ETag')));
    $assert($conditional->getStatusCode() === 304 && (string)$conditional->getBody() === '', 'Image ETags must support conditional requests.');
    $assert($get('/share/image/' . str_repeat('0',64) . '.png')->getStatusCode() === 404, 'Unknown image IDs must not expose files.');
    $assert($get('/share/image/not-a-hash.png')->getStatusCode() === 404, 'Invalid image IDs must be rejected.');
    $comparison = $metadata((string)$get('/compare.html?player1=28P08PG0G&player2=PJ20G29L&lang=en&view=army')->getBody());
    $assert(str_contains($comparison['og:title'], $name . ' vs Other Player'), 'Player comparison must use both names.');
    $clan = $metadata((string)$get('/clan.html?tag=2GPP802UU&lang=id&view=members')->getBody());
    $assert($clan['og:title'] === 'Profil Clan: ISTIMEWA - CoC Clan Command Center' && $clan['og:locale'] === 'id_ID', 'Clan metadata must be available before JavaScript.');
    $clanComparison = $metadata((string)$get('/compare-clan.html?clan1=2GPP802UU&clan2=9RU089PG&lang=en')->getBody());
    $assert(str_contains($clanComparison['og:title'], 'ISTIMEWA vs Other Clan'), 'Clan comparison must use both names.');
    $home = $metadata((string)$get('/?lang=id')->getBody());
    $assert(isset($home['og:image'], $home['og:description']), 'Home must have a generic share card.');
    $previous = $metadata((string)$get('/player.html?tag=28P08PG0G&lang=en&view=ranked-battles&session=previous')->getBody());
    $assert($previous['og:image'] !== $meta['og:image'] && str_contains($previous['og:url'], 'session=previous'), 'League sessions must have separate snapshot identities.');
    // Force the snapshot cache to expire, then make the source profile change.
    foreach (glob($directory . '/share/contexts/*.json') as $file) {
        $entry = json_decode(file_get_contents($file), true);
        if (($entry['metadata']['imageId'] ?? '') === basename($imagePath, '.png')) { $entry['expires'] = 0; file_put_contents($file, json_encode($entry)); }
    }
    $seed('/players/%2328P08PG0G', array_replace($player, ['name'=>'Updated Player'])); $app = App::create();
    $fresh = $metadata((string)$get('/player.html?tag=28P08PG0G&lang=en&view=ranked-battles')->getBody());
    $assert($fresh['og:image'] !== $meta['og:image'] && str_contains($fresh['og:title'], 'Updated Player'), 'Expired snapshots must rebuild from updated data.');
    $assert((string)$get($imagePath)->getBody() === $png, 'Earlier image URLs must remain immutable.');
    $service = new SharePreview($directory . '/failure', static function () { throw new RuntimeException('private upstream details'); }, 'https://share.example.test', 'en');
    $fallback = $service->metadata($service->context('/player.html', ['tag'=>'28P08PG0G']));
    $bytes = $service->image($fallback['imageId']);
    $assert(str_starts_with($bytes, "\x89PNG") && !str_contains(json_encode($fallback), 'private upstream'), 'API errors must still provide a safe fallback card.');
    $card = ['heading'=>'Player Comparison','context'=>'Ranked League','entities'=>[
        ['name'=>'Amerta Buana','tag'=>'#28P08PG0G','subtitle'=>'Legend III','metrics'=>[['Town Hall','18'],['Trophies','1,050'],['Rank','#3/100']]],
        ['name'=>'Other Player','tag'=>'#PJ20G29L','subtitle'=>'Electro League 33','metrics'=>[['Town Hall','17'],['Trophies','950'],['Rank','#8/100']]]],
        'footer'=>'Snapshot generated 24 Oct 2026 UTC'];
    $bitmap = (new ShareCard(true))->render($card);
    $assert(getimagesizefromstring($bitmap)[0] === 1200 && strlen($bitmap) > 5000, 'Renderer must work without GD.');
    $previewDirectory = dirname(__DIR__) . '/.chrome-icon-test/share';
    if (!is_dir($previewDirectory)) mkdir($previewDirectory, 0775, true);
    file_put_contents($previewDirectory . '/bitmap.png', $bitmap);
    file_put_contents($previewDirectory . '/auto.png', (new ShareCard())->render($card));
    echo "Share tests passed: server metadata, escaping, locales, four page types, public PNGs, cache refresh, immutable images and no-GD fallback.\n";
} finally {
    foreach ($old as $key=>$value) { if ($value === null) unset($_ENV[$key]); else $_ENV[$key] = $value; }
    $resolved = realpath($directory);
    if ($resolved && dirname($resolved) === realpath(sys_get_temp_dir()) && str_starts_with(basename($resolved), 'coc-share-test-')) {
        $entries = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($resolved, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
        foreach ($entries as $entry) $entry->isDir() ? rmdir($entry->getPathname()) : unlink($entry->getPathname());
        rmdir($resolved);
    }
}
