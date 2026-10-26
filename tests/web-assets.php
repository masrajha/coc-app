<?php
declare(strict_types=1);
require dirname(__DIR__) . '/vendor/autoload.php';

use CocTracker\App;
use Slim\Psr7\Factory\ServerRequestFactory;

$root = dirname(__DIR__) . '/public';
$manifest = json_decode(file_get_contents($root . '/assets/images/optimized/manifest.json'), true, 512, JSON_THROW_ON_ERROR);
$assert = static function (bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); };
$total = 0;
foreach ($manifest as $entry) {
    $file = $root . '/assets/images/optimized/' . $entry['file'];
    $bytes = file_get_contents($file); $info = getimagesizefromstring($bytes);
    $assert($info && $info['mime'] === 'image/webp', 'Optimized images must be real WebP files.');
    $assert(strlen($bytes) === $entry['bytes'] && $info[0] === $entry['width'] && $info[1] === $entry['height'], 'Image manifest must match the shipped file.');
    $assert(strlen($bytes) <= 180 * 1024, 'Individual artwork must remain under the transfer budget.');
    $total += strlen($bytes);
}
$assert($total < 900 * 1024, 'The complete derivative pack must remain below 900 KiB.');
foreach (['index','player','compare','compare-clan'] as $page) {
    $html = file_get_contents($root . '/' . $page . '.html');
    $assert(str_contains($html, '/site.css') && str_contains($html, '/site.js'), 'Every page must load the shared shell.');
    preg_match_all('~(?:src|srcset)="(/assets/images/[^" ]+)~', $html, $matches);
    foreach ($matches[1] as $image) $assert(str_starts_with($image, '/assets/images/optimized/'), 'Pages must reference web derivatives instead of PNG masters.');
}
$app = App::create(); $factory = new ServerRequestFactory();
$request = $factory->createServerRequest('GET', '/assets/images/optimized/hero-mobile.webp');
$image = $app->handle($request);
$assert($image->getStatusCode() === 200 && $image->getHeaderLine('Content-Type') === 'image/webp', 'Artwork must be served with the correct image type.');
$assert($image->getHeaderLine('Cache-Control') === 'public, max-age=86400', 'Artwork must have a browser cache policy.');
$cached = $app->handle($request->withHeader('If-None-Match', $image->getHeaderLine('ETag')));
$assert($cached->getStatusCode() === 304 && (string)$cached->getBody() === '', 'Unchanged artwork must revalidate without sending its body.');
echo 'Web asset tests passed: ' . count($manifest) . ' WebP derivatives, ' . round($total / 1024) . " KiB, page wiring and HTTP cache validation.\n";
