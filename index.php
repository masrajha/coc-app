<?php

declare(strict_types=1);

use CocTracker\App;
use Dotenv\Dotenv;

require __DIR__ . '/vendor/autoload.php';
Dotenv::createImmutable(__DIR__)->safeLoad();

App::create()->run();
