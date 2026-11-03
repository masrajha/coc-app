<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';

use CocTracker\App;
use CocTracker\AssetPaths;
use Slim\Psr7\Factory\ServerRequestFactory;

$root = realpath(dirname(__DIR__).'/public');
$assert = static function(bool $ok,string $message):void { if (!$ok) throw new RuntimeException($message); };
$resolve = static function(string $reference,string $source) use ($root,$assert):void {
    if (preg_match('~^(?:[a-z]+:|//|#)~i',$reference) || str_contains($reference,'${')) return;
    $path = parse_url($reference,PHP_URL_PATH);
    if (!is_string($path) || !preg_match('/\.(?:js|css|png|webp|svg|ico|jpe?g|ttf|woff2?)$/i',$path)) return;
    $target = realpath(str_starts_with($path,'/') ? $root.$path : dirname($source).'/'.$path);
    $assert($target !== false && str_starts_with($target,$root.DIRECTORY_SEPARATOR) && is_file($target), 'Missing local resource in '.$source.': '.$reference);
};
$assets = [];
$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS));
foreach ($iterator as $file) {
    if (!$file->isFile()) continue;
    $relative = str_replace('\\','/',substr($file->getPathname(),strlen($root)+1));
    $extension = strtolower($file->getExtension());
    if ($extension==='js') $assert(str_starts_with($relative,'js/'),'JavaScript must live under public/js: '.$relative);
    if ($extension==='css') $assert(str_starts_with($relative,'css/'),'Stylesheets must live under public/css: '.$relative);
    if (in_array($extension,['png','webp','svg','ico','jpg','jpeg'],true)) $assert(str_starts_with($relative,'assets/images/'),'Images must live under public/assets/images: '.$relative);
    if (in_array($extension,['js','css','png','webp','svg','ico'],true)) $assets[]=$relative;
    if ($extension==='html') {
        $old=libxml_use_internal_errors(true);$dom=new DOMDocument();$dom->loadHTML(file_get_contents($file->getPathname()));libxml_clear_errors();libxml_use_internal_errors($old);
        foreach ((new DOMXPath($dom))->query('//*[@src or @href]') as $node) foreach (['src','href'] as $attribute) if ($node->hasAttribute($attribute)) $resolve($node->getAttribute($attribute),$file->getPathname());
    }
    if ($extension==='css') {
        preg_match_all('~url\([\s\'"]*([^\)\'"\s]+)~',file_get_contents($file->getPathname()),$matches);
        foreach ($matches[1] as $reference) $resolve($reference,$file->getPathname());
    }
}
$app=App::create();$factory=new ServerRequestFactory();
foreach ($assets as $relative) {
    $response=$app->handle($factory->createServerRequest('GET','/'.$relative));
    $assert($response->getStatusCode()===200,'Organized asset must be served directly: '.$relative);
    $assert(!str_contains($response->getHeaderLine('Content-Type'),'text/html'),'Asset must not return HTML: '.$relative);
    unset($response);
}
foreach (['theme.js','index.css','th-18.webp','bh-10.webp','cwl-master-1.png','league-legend.png','favicon.ico','favicon.svg',
    'assets/brand/clanintel-mark.svg','assets/profile/status.svg','assets/capital/capital-hall-10.webp','assets/donation/paypal.png','assets/trophy.png',
    'assets/libs/html-to-image/html-to-image.js','battle-log-style/coc_pixel_match.css','battle-log-style/demo.css','battle-log-style/demo.js',
    'icons/6670fe7511b1b140b321380d46c64f4194bb820a8cbe7b370ad33d5cbdf1135d.webp','public/icons/6670fe7511b1b140b321380d46c64f4194bb820a8cbe7b370ad33d5cbdf1135d.webp'] as $old) {
    $target=AssetPaths::relocated($old);
    $response=$app->handle($factory->createServerRequest('GET','/'.$old.'?v=old-cache'));
    $assert($target!==null && $response->getStatusCode()===301 && $response->getHeaderLine('Location')==='/'.$target.'?v=old-cache','Legacy asset must redirect once and retain its query: '.$old);
    $assert(AssetPaths::relocated($target)===null,'Organized URLs must not redirect in a loop.');
}
$unknown=$app->handle($factory->createServerRequest('GET','/nonexistent-script.js'));
$assert($unknown->getStatusCode()===404,'Unknown legacy asset names must still return 404.');
echo 'Asset layout tests passed: '.count($assets)." resources, HTML/CSS paths, MIME types, legacy redirects, query retention, and no loops.\n";
