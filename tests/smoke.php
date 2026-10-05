<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use CocTracker\App;
use Slim\Psr7\Factory\ServerRequestFactory;

$dataDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'coc-php-smoke-' . bin2hex(random_bytes(4));
$_ENV['DATA_DIR'] = $dataDir;
putenv('DATA_DIR=' . $dataDir);
$app = App::create();
$factory = new ServerRequestFactory();
$iconDir = dirname(__DIR__) . '/public/icons';
if (!is_dir($iconDir)) mkdir($iconDir, 0775, true);
$iconPath = $iconDir . '/' . hash('sha256', 'heroes:Test Icon') . '.png';
$iconBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVZkAAAAASUVORK5CYII=', true);
file_put_contents($iconPath, $iconBytes);

$checks = [
    '/' => [200, 'text/html'],
    '/player.html' => [200, 'text/html'],
    '/compare.html' => [200, 'text/html'],
    '/player.css' => [200, 'text/css'],
    '/api/clan/INVALID' => [400, 'application/json'],
    '/api/player/INVALID/profile' => [400, 'application/json'],
    '/api/player-icon?name=Giant%20Arrow&section=invalid' => [400, ''],
    '/api/clan/2GPP802UU/health' => [200, 'application/json'],
    '/api/clan/2GPP802UU/health.csv' => [200, 'text/csv']
];

try {
    foreach ($checks as $uri => [$expectedStatus, $contentType]) {
        $request = $factory->createServerRequest('GET', $uri);
        $response = $app->handle($request);
        $actualStatus = $response->getStatusCode();
        $actualType = $response->getHeaderLine('Content-Type');
        if ($actualStatus !== $expectedStatus || !str_contains($actualType, $contentType)) {
            throw new RuntimeException(sprintf('%s expected %d / %s, got %d / %s', $uri, $expectedStatus, $contentType, $actualStatus, $actualType));
        }
    }
    $icon = $app->handle($factory->createServerRequest('GET', '/api/player-icon?name=Test%20Icon&section=heroes'));
    if ($icon->getStatusCode() !== 200 || $icon->getHeaderLine('Content-Type') !== 'image/png' || (string)$icon->getBody() !== $iconBytes) {
        throw new RuntimeException('Ikon lokal tidak disajikan dengan benar.');
    }
    $cacheDir = $dataDir . '/cache';
    if (!is_dir($cacheDir)) mkdir($cacheDir, 0775, true);
    $playerPath = '/players/%232GPP802UU';
    file_put_contents($cacheDir . '/' . hash('sha256', $playerPath) . '.json', json_encode([
        'expires' => time() + 120,
        'entry' => ['lastUpdated' => gmdate('c'), 'data' => [
            'tag' => '#2GPP802UU', 'name' => 'Test', 'townHallLevel' => 18,
            'heroes' => [['name' => 'Test Icon', 'level' => 1, 'maxLevel' => 1, 'village' => 'home']]
        ]]
    ]));
    $profileResponse = $app->handle($factory->createServerRequest('GET', '/api/player/2GPP802UU/profile'));
    $profile = json_decode((string)$profileResponse->getBody(), true);
    if ($profileResponse->getStatusCode() !== 200 || ($profile['army']['heroes'][0]['iconUrls'][0] ?? null) !== '/public/icons/' . basename($iconPath)) {
        throw new RuntimeException('Profil tidak memprioritaskan ikon lokal.');
    }
    echo 'PHP smoke tests passed (' . (count($checks) + 2) . " routes).\n";
} finally {
    @unlink($iconPath);
    if (is_dir($dataDir)) {
        $items = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dataDir, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
        foreach ($items as $item) $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        rmdir($dataDir);
    }
    putenv('DATA_DIR');
    unset($_ENV['DATA_DIR']);
}
