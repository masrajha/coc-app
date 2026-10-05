<?php

declare(strict_types=1);

use CocTracker\App;
use Dotenv\Dotenv;
use Slim\Psr7\Factory\ServerRequestFactory;

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit;
}

$root = dirname(__DIR__);
require $root . '/vendor/autoload.php';
Dotenv::createImmutable($root)->safeLoad();

$tags = array_map(static fn(string $tag): string => strtoupper(ltrim($tag, '#')), array_slice($argv, 1));
if (!$tags || array_filter($tags, static fn(string $tag): bool => !preg_match('/^[0289PYLQGRJCUV]{3,15}$/', $tag))) {
    fwrite(STDERR, "Pemakaian: php scripts/prepare-icons.php TAG_PEMAIN [TAG_PEMAIN_LAIN]\n");
    exit(1);
}

$app = App::create();
$requests = new ServerRequestFactory();
$items = [];
foreach ($tags as $tag) {
    $response = $app->handle($requests->createServerRequest('GET', '/api/player/' . $tag . '/profile'));
    $profile = json_decode((string)$response->getBody(), true);
    if ($response->getStatusCode() !== 200 || !is_array($profile)) {
        fwrite(STDERR, $tag . ': ' . ($profile['error'] ?? 'profil tidak dapat dimuat') . "\n");
        exit(1);
    }
    foreach ($profile['army'] ?? [] as $section => $army) {
        foreach ($army as $item) {
            if (!isset($item['name'])) continue;
            $items[$section . ':' . $item['name']] = ['section' => $section, 'name' => $item['name']];
        }
    }
}

$directory = $root . '/public/icons';
if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
    fwrite(STDERR, "Tidak dapat membuat public/icons.\n");
    exit(1);
}
$extensions = ['image/png' => 'png', 'image/webp' => 'webp', 'image/jpeg' => 'jpg', 'image/gif' => 'gif'];
$success = 0;
$failed = [];
$count = 0;
foreach ($items as $key => $item) {
    $hash = hash('sha256', $key);
    if (array_filter($extensions, static fn(string $extension): bool => is_file($directory . '/' . $hash . '.' . $extension))) {
        $success++;
        $count++;
        continue;
    }
    $uri = '/api/player-icon?' . http_build_query($item, '', '&', PHP_QUERY_RFC3986);
    $response = $app->handle($requests->createServerRequest('GET', $uri));
    $type = strtolower(trim(explode(';', $response->getHeaderLine('Content-Type'))[0]));
    $body = (string)$response->getBody();
    if ($response->getStatusCode() !== 200 || !isset($extensions[$type]) || $body === '' || strlen($body) > 400000) {
        $failed[] = $key . ' (HTTP ' . $response->getStatusCode() . ')';
    } else {
        $path = $directory . '/' . $hash . '.' . $extensions[$type];
        if (file_put_contents($path, $body, LOCK_EX) === false) {
            $failed[] = $key . ' (gagal menyimpan file)';
        } else {
            $success++;
        }
    }
    $count++;
    if ($count % 10 === 0 || $count === count($items)) echo $count . '/' . count($items) . " ikon diproses\n";
}

echo $success . ' ikon tersedia di public/icons; ' . count($failed) . " gagal.\n";
if ($failed) {
    echo implode("\n", $failed) . "\n";
    exit(1);
}
