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
    echo 'PHP smoke tests passed (' . count($checks) . " routes).\n";
} finally {
    if (is_dir($dataDir)) {
        $items = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dataDir, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
        foreach ($items as $item) $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        rmdir($dataDir);
    }
    putenv('DATA_DIR');
    unset($_ENV['DATA_DIR']);
}
