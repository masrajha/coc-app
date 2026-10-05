<?php

declare(strict_types=1);

namespace CocTracker;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\App as SlimApp;
use Slim\Factory\AppFactory;

final class App
{
    private const API_BASE = 'https://api.clashofclans.com/v1';
    private const CACHE_TTL = 120;
    private const ICON_TTL = 86400;
    private const SECTIONS = ['heroes', 'heroEquipment', 'pets', 'troops', 'superTroops', 'builderBase', 'spells'];
    private const PETS = ['L.A.S.S.I', 'Electro Owl', 'Mighty Yak', 'Unicorn', 'Frosty', 'Diggy', 'Poison Lizard', 'Phoenix', 'Spirit Fox', 'Angry Jelly', 'Sneezy'];
    private const SUPER_TROOPS = ['Super Barbarian', 'Super Archer', 'Super Giant', 'Sneaky Goblin', 'Super Wall Breaker', 'Super Wizard', 'Inferno Dragon', 'Super Minion', 'Super Valkyrie', 'Super Witch', 'Ice Hound', 'Rocket Balloon', 'Super Bowler', 'Super Dragon', 'Super Miner', 'Super Hog Rider', 'Super Yeti'];
    private const WEIGHTS = ['heroes' => 0.4, 'troops' => 0.35, 'spells' => 0.15, 'pets' => 0.1];
    private const EQUIPMENT = [
        'Barbarian King' => ['Barbarian Puppet', 'Rage Vial', 'Earthquake Boots', 'Vampstache', 'Giant Gauntlet', 'Spiky Ball', 'Snake Bracelet', 'Stick Horse'],
        'Archer Queen' => ['Archer Puppet', 'Invisibility Vial', 'Giant Arrow', 'Healer Puppet', 'Frozen Arrow', 'Magic Mirror', 'Action Figure', 'Monolith Arrow'],
        'Minion Prince' => ['Henchmen Puppet', 'Dark Orb', 'Metal Pants', 'Noble Iron', 'Dark Crown', 'Meteor Staff'],
        'Grand Warden' => ['Eternal Tome', 'Life Gem', 'Rage Gem', 'Healing Tome', 'Fireball', 'Lavaloon Puppet', 'Heroic Torch'],
        'Royal Champion' => ['Royal Gem', 'Seeking Shield', 'Hog Rider Puppet', 'Haste Vial', 'Rocket Spear', 'Electro Boots', 'Frost Flake'],
        'Dragon Duke' => ['Fire Heart', 'Flame Blower', 'Stun Blaster', 'Electro Fangs', 'Rocket Backpack', 'Revenge Deck']
    ];
    private const MAX_LEVELS = [
        11 => ['heroes' => ['Barbarian King' => 50, 'Archer Queen' => 50, 'Grand Warden' => 20], 'troops' => ['Barbarian' => 8, 'Archer' => 8, 'Giant' => 8, 'Wizard' => 8, 'Dragon' => 6, 'P.E.K.K.A' => 7, 'Baby Dragon' => 5, 'Miner' => 5, 'Electro Dragon' => 2, 'Bowler' => 3], 'spells' => ['Lightning Spell' => 8, 'Healing Spell' => 7, 'Rage Spell' => 5, 'Jump Spell' => 3, 'Freeze Spell' => 6, 'Poison Spell' => 5, 'Haste Spell' => 5], 'pets' => []],
        12 => ['heroes' => ['Barbarian King' => 65, 'Archer Queen' => 65, 'Grand Warden' => 40], 'troops' => ['Barbarian' => 9, 'Archer' => 9, 'Giant' => 9, 'Wizard' => 9, 'Dragon' => 7, 'P.E.K.K.A' => 8, 'Baby Dragon' => 6, 'Miner' => 6, 'Electro Dragon' => 3, 'Bowler' => 4, 'Yeti' => 2], 'spells' => ['Lightning Spell' => 9, 'Healing Spell' => 7, 'Rage Spell' => 6, 'Jump Spell' => 3, 'Freeze Spell' => 7, 'Poison Spell' => 6, 'Haste Spell' => 5, 'Bat Spell' => 5], 'pets' => []],
        13 => ['heroes' => ['Barbarian King' => 75, 'Archer Queen' => 75, 'Grand Warden' => 50, 'Royal Champion' => 25], 'troops' => ['Barbarian' => 9, 'Archer' => 9, 'Giant' => 10, 'Wizard' => 10, 'Dragon' => 8, 'P.E.K.K.A' => 9, 'Baby Dragon' => 7, 'Miner' => 7, 'Electro Dragon' => 4, 'Bowler' => 5, 'Yeti' => 3, 'Dragon Rider' => 2], 'spells' => ['Lightning Spell' => 9, 'Healing Spell' => 8, 'Rage Spell' => 6, 'Jump Spell' => 4, 'Freeze Spell' => 7, 'Poison Spell' => 7, 'Haste Spell' => 5, 'Bat Spell' => 5], 'pets' => []],
        14 => ['heroes' => ['Barbarian King' => 80, 'Archer Queen' => 80, 'Grand Warden' => 55, 'Royal Champion' => 30], 'troops' => ['Barbarian' => 10, 'Archer' => 10, 'Giant' => 10, 'Wizard' => 10, 'Dragon' => 9, 'P.E.K.K.A' => 9, 'Baby Dragon' => 8, 'Miner' => 8, 'Electro Dragon' => 5, 'Bowler' => 6, 'Yeti' => 4, 'Dragon Rider' => 3], 'spells' => ['Lightning Spell' => 9, 'Healing Spell' => 8, 'Rage Spell' => 6, 'Jump Spell' => 4, 'Freeze Spell' => 7, 'Poison Spell' => 8, 'Haste Spell' => 5, 'Bat Spell' => 5, 'Invisibility Spell' => 4], 'pets' => ['L.A.S.S.I' => 10, 'Electro Owl' => 10, 'Mighty Yak' => 10, 'Unicorn' => 10]],
        15 => ['heroes' => ['Barbarian King' => 90, 'Archer Queen' => 90, 'Grand Warden' => 65, 'Royal Champion' => 40], 'troops' => ['Barbarian' => 11, 'Archer' => 11, 'Giant' => 11, 'Wizard' => 11, 'Dragon' => 10, 'P.E.K.K.A' => 10, 'Baby Dragon' => 9, 'Miner' => 9, 'Electro Dragon' => 6, 'Bowler' => 7, 'Yeti' => 5, 'Dragon Rider' => 4, 'Electro Titan' => 3, 'Root Rider' => 2], 'spells' => ['Lightning Spell' => 10, 'Healing Spell' => 9, 'Rage Spell' => 6, 'Jump Spell' => 4, 'Freeze Spell' => 7, 'Poison Spell' => 9, 'Haste Spell' => 5, 'Bat Spell' => 6, 'Invisibility Spell' => 4, 'Recall Spell' => 4], 'pets' => ['L.A.S.S.I' => 10, 'Electro Owl' => 10, 'Mighty Yak' => 10, 'Unicorn' => 10, 'Frosty' => 10, 'Diggy' => 10, 'Poison Lizard' => 10, 'Phoenix' => 10]],
        16 => ['heroes' => ['Barbarian King' => 95, 'Archer Queen' => 95, 'Grand Warden' => 70, 'Royal Champion' => 45], 'troops' => ['Barbarian' => 12, 'Archer' => 12, 'Giant' => 12, 'Wizard' => 12, 'Dragon' => 11, 'P.E.K.K.A' => 11, 'Baby Dragon' => 10, 'Miner' => 10, 'Electro Dragon' => 7, 'Bowler' => 8, 'Yeti' => 6, 'Dragon Rider' => 5, 'Electro Titan' => 4, 'Root Rider' => 3, 'Druid' => 2], 'spells' => ['Lightning Spell' => 11, 'Healing Spell' => 10, 'Rage Spell' => 6, 'Jump Spell' => 5, 'Freeze Spell' => 7, 'Poison Spell' => 10, 'Haste Spell' => 5, 'Bat Spell' => 6, 'Invisibility Spell' => 4, 'Recall Spell' => 5, 'Overgrowth Spell' => 3], 'pets' => ['L.A.S.S.I' => 15, 'Electro Owl' => 15, 'Mighty Yak' => 15, 'Unicorn' => 15, 'Frosty' => 10, 'Diggy' => 10, 'Poison Lizard' => 10, 'Phoenix' => 10, 'Spirit Fox' => 10, 'Angry Jelly' => 10]],
        17 => ['heroes' => ['Barbarian King' => 100, 'Archer Queen' => 100, 'Grand Warden' => 75, 'Royal Champion' => 50, 'Minion Prince' => 70], 'troops' => ['Barbarian' => 13, 'Archer' => 13, 'Giant' => 13, 'Wizard' => 13, 'Dragon' => 12, 'P.E.K.K.A' => 12, 'Baby Dragon' => 11, 'Miner' => 11, 'Electro Dragon' => 8, 'Bowler' => 9, 'Yeti' => 7, 'Dragon Rider' => 6, 'Electro Titan' => 5, 'Root Rider' => 4, 'Druid' => 3], 'spells' => ['Lightning Spell' => 12, 'Healing Spell' => 11, 'Rage Spell' => 7, 'Jump Spell' => 5, 'Freeze Spell' => 8, 'Poison Spell' => 11, 'Haste Spell' => 6, 'Bat Spell' => 7, 'Invisibility Spell' => 5, 'Recall Spell' => 6, 'Overgrowth Spell' => 4], 'pets' => ['L.A.S.S.I' => 15, 'Electro Owl' => 15, 'Mighty Yak' => 15, 'Unicorn' => 15, 'Frosty' => 15, 'Diggy' => 15, 'Poison Lizard' => 15, 'Phoenix' => 15, 'Spirit Fox' => 10, 'Angry Jelly' => 10]]
    ];

    private string $dataDir;
    private Client $http;
    private array $cache = [];

    private function __construct()
    {
        $this->dataDir = rtrim((string)($this->env('DATA_DIR') ?: __DIR__ . '/../data'), DIRECTORY_SEPARATOR);
        $this->http = new Client(['timeout' => (float)($this->env('COC_API_TIMEOUT_MS') ?: 20000) / 1000, 'http_errors' => false]);
    }

    public static function create(): SlimApp
    {
        $self = new self();
        $app = AppFactory::create();
        $app->addRoutingMiddleware();
        $app->addErrorMiddleware(false, true, true);
        $app->options('/{routes:.*}', fn($request, $response) => $response);
        $app->get('/api/clan/{tag}/war', fn($req, $res, $args) => $self->war($req, $res, $args['tag']));
        $app->get('/api/clan/{tag}/cwl/performance', fn($req, $res, $args) => $self->cwlPerformance($req, $res, $args['tag']));
        $app->get('/api/clan/{tag}/health.csv', fn($req, $res, $args) => $self->healthCsv($res, $args['tag']));
        $app->get('/api/clan/{tag}/health', fn($req, $res, $args) => $self->health($res, $args['tag']));
        $app->get('/api/clan/{tag}', fn($req, $res, $args) => $self->clan($res, $args['tag']));
        $app->get('/api/player-icon', fn($req, $res) => $self->playerIcon($req, $res));
        $app->get('/api/player/{tag}/progress', fn($req, $res, $args) => $self->playerProgress($res, $args['tag']));
        $app->get('/api/player/{tag}/profile', fn($req, $res, $args) => $self->playerProfile($res, $args['tag']));
        $app->get('/api/player/{tag}/performance', fn($req, $res, $args) => $self->playerPerformance($req, $res, $args['tag']));
        $app->get('/', fn($req, $res) => $self->staticFile($res, 'index.html'));
        $app->get('/{path:.*}', fn($req, $res, $args) => $self->staticFile($res, $args['path'] ?? ''));
        return $app;
    }

    private function respond(ResponseInterface $response, mixed $data, int $status = 200): ResponseInterface
    {
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE));
        return $response->withHeader('Content-Type', 'application/json; charset=utf-8')->withStatus($status);
    }

    private function empty(ResponseInterface $response, int $status): ResponseInterface { return $response->withStatus($status); }

    private function env(string $key): string|false
    {
        return $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
    }

    private function normalizeTag(mixed $value): ?string
    {
        $tag = strtoupper(ltrim(trim((string)$value), '#'));
        return preg_match('/^[0289PYLQGRJCUV]{3,15}$/', $tag) ? $tag : null;
    }

    private function tagError(ResponseInterface $res, string $message): ResponseInterface { return $this->respond($res, ['error' => $message], 400); }

    private function upstream(string $path): array
    {
        $now = time();
        if (isset($this->cache[$path]) && $this->cache[$path]['expires'] > $now) return $this->cache[$path]['entry'];
        $cacheFile = 'cache/' . hash('sha256', $path) . '.json';
        $diskCache = $this->readJson($cacheFile, []);
        if (($diskCache['expires'] ?? 0) > $now && isset($diskCache['entry']['data'])) {
            $this->cache[$path] = ['entry' => $diskCache['entry'], 'expires' => $diskCache['expires']];
            return $diskCache['entry'];
        }
        $token = (string)$this->env('COC_API_TOKEN');
        if ($token === '') throw new \RuntimeException('Token API belum diatur.');
        $retries = max(0, (int)($this->env('COC_API_RETRIES') ?: 1));
        $last = null;
        for ($attempt = 0; $attempt <= $retries; $attempt++) {
            try {
                $response = $this->http->get(self::API_BASE . $path, ['headers' => ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json']]);
                $status = $response->getStatusCode();
                $body = (string)$response->getBody();
                if ($status >= 200 && $status < 300) {
                    $data = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
                    $entry = ['data' => $data, 'lastUpdated' => gmdate('c')];
                    $this->cache[$path] = ['entry' => $entry, 'expires' => $now + self::CACHE_TTL];
                    $this->writeJson($cacheFile, ['entry' => $entry, 'expires' => $now + self::CACHE_TTL]);
                    return $entry;
                }
                $last = new UpstreamFailure($status, null, $body);
                if (!in_array($status, [502, 503, 504], true) || $attempt === $retries) throw $last;
            } catch (GuzzleException $e) {
                $last = new UpstreamFailure(0, $e);
                if ($attempt === $retries) throw $last;
            }
        }
        throw $last ?? new \RuntimeException('Upstream request failed');
    }

    private function failure(ResponseInterface $res, \Throwable $e, bool $war = false): ResponseInterface
    {
        if ($e instanceof LocalDataFailure) return $this->respond($res, ['error' => 'Arsip data lokal tidak dapat dibaca. Periksa berkas di folder data/wars.'], 500);
        $status = $e instanceof UpstreamFailure ? ($e->status ?: ($e->getPrevious()?->getMessage() && str_contains(strtolower($e->getPrevious()->getMessage()), 'timed out') ? 504 : 502)) : 502;
        $messages = [
            403 => $war ? 'Data perang tidak tersedia. Periksa akses API dan pengaturan privasi war log klan.' : 'Akses API ditolak. Periksa token dan alamat IP yang didaftarkan.',
            404 => $war ? 'Data perang tidak tersedia untuk klan ini.' : 'Klan tidak ditemukan.',
            429 => 'Batas permintaan API tercapai. Coba lagi sebentar.',
            504 => 'API Clash of Clans tidak merespons tepat waktu. Coba lagi sebentar; jika terus terjadi, periksa koneksi server, token, dan IP yang didaftarkan di developer.clashofclans.com.'
        ];
        return $this->respond($res, ['error' => $messages[$status] ?? 'Gagal mengambil data dari API Clash of Clans.'], $status);
    }

    private function file(string $relative): string { return $this->dataDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative); }
    private function readJson(string $relative, array $default = []): array
    {
        $path = $this->file($relative);
        if (!is_file($path)) return $default;
        $raw = file_get_contents($path);
        if ($raw === false) throw new LocalDataFailure('Unable to read local data');
        try { $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR); }
        catch (\JsonException $e) { throw new LocalDataFailure('Invalid local JSON', 0, $e); }
        return is_array($data) ? $data : $default;
    }
    private function writeJson(string $relative, array $data, bool $atomic = false): void
    {
        $path = $this->file($relative);
        $dir = dirname($path);
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) throw new LocalDataFailure('Unable to create data directory');
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE) . "\n";
        $target = $atomic ? $path . '.' . bin2hex(random_bytes(6)) . '.tmp' : $path;
        if (file_put_contents($target, $json, LOCK_EX) === false) throw new LocalDataFailure('Unable to write local data');
        if ($atomic && !rename($target, $path)) { @unlink($target); throw new LocalDataFailure('Unable to replace archive'); }
    }
    private function snapshots(string $tag): array { $saved = $this->readJson('snapshots/' . $tag . '.json'); return $saved['snapshots'] ?? []; }
    private function saveSnapshot(string $tag, array $clan): array
    {
        $snapshots = $this->snapshots($tag);
        $date = gmdate('Y-m-d');
        $members = array_map(static fn($m) => ['tag' => $m['tag'] ?? null, 'name' => $m['name'] ?? null, 'role' => $m['role'] ?? null, 'expLevel' => $m['expLevel'] ?? null, 'trophies' => $m['trophies'] ?? 0, 'donations' => $m['donations'] ?? 0, 'donationsReceived' => $m['donationsReceived'] ?? 0], $clan['memberList'] ?? []);
        $snapshot = ['date' => $date, 'capturedAt' => gmdate('c'), 'clan' => ['tag' => '#' . $tag, 'name' => $clan['name'] ?? null, 'level' => $clan['clanLevel'] ?? null, 'points' => $clan['clanPoints'] ?? null, 'members' => $clan['members'] ?? null], 'members' => $members];
        $snapshots = array_values(array_filter($snapshots, static fn($s) => ($s['date'] ?? '') !== $date));
        $snapshots[] = $snapshot;
        usort($snapshots, static fn($a, $b) => strcmp($a['date'] ?? '', $b['date'] ?? ''));
        $snapshots = array_slice($snapshots, -120);
        $this->writeJson('snapshots/' . $tag . '.json', ['clanTag' => '#' . $tag, 'snapshots' => $snapshots]);
        return $snapshot;
    }

    private function healthReport(string $tag, array $snapshots): array
    {
        $latest = $snapshots ? end($snapshots) : null;
        if (!$latest) return ['clanTag' => '#' . $tag, 'snapshots' => 0, 'members' => [], 'summary' => ['review' => 0, 'stable' => 0], 'generatedAt' => gmdate('c')];
        $baseline = static function (array $items, string $date): ?array { for ($i = count($items) - 1; $i >= 0; $i--) if (($items[$i]['date'] ?? '') <= $date) return $items[$i]; return null; };
        $sevenDate = gmdate('Y-m-d', strtotime($latest['date'] . ' -7 days'));
        $thirtyDate = gmdate('Y-m-d', strtotime($latest['date'] . ' -30 days'));
        $seven = $baseline($snapshots, $sevenDate); $thirty = $baseline($snapshots, $thirtyDate);
        $map = static fn($snap) => array_column($snap['members'] ?? [], null, 'tag');
        $weekMap = $map($seven ?? []); $monthMap = $map($thirty ?? []);
        $members = [];
        foreach ($latest['members'] ?? [] as $member) {
            $tagKey = $member['tag'] ?? '';
            $week = $weekMap[$tagKey] ?? null; $month = $monthMap[$tagKey] ?? null;
            $received = $member['donationsReceived'] ?? 0; $flags = [];
            $delta7 = $week ? ($member['trophies'] ?? 0) - ($week['trophies'] ?? 0) : null;
            $delta30 = $month ? ($member['trophies'] ?? 0) - ($month['trophies'] ?? 0) : null;
            if (($member['donations'] ?? 0) === 0) $flags[] = 'Donasi nol';
            if ($delta7 === 0) $flags[] = 'Trofi 7 hari tidak berubah';
            if ($week && ($member['donations'] ?? 0) === ($week['donations'] ?? 0) && $received === ($week['donationsReceived'] ?? 0)) $flags[] = 'Donasi 7 hari tidak berubah';
            $members[] = ['tag' => $tagKey, 'name' => $member['name'] ?? '', 'role' => $member['role'] ?? null, 'trophies' => $member['trophies'] ?? 0, 'donations' => $member['donations'] ?? 0, 'donationsReceived' => $received, 'donationRatio' => $received === 0 ? null : round(($member['donations'] ?? 0) / $received, 2), 'trophyDelta7' => $delta7, 'trophyDelta30' => $delta30, 'flags' => $flags, 'status' => $flags ? 'review' : 'stable'];
        }
        usort($members, static fn($a, $b) => count($b['flags']) <=> count($a['flags']) ?: strcasecmp($a['name'], $b['name']));
        return ['clanTag' => '#' . $tag, 'clanName' => $latest['clan']['name'] ?? null, 'generatedAt' => gmdate('c'), 'latestSnapshot' => $latest['date'], 'snapshots' => count($snapshots), 'comparison' => ['sevenDayBaseline' => $seven['date'] ?? null, 'thirtyDayBaseline' => $thirty['date'] ?? null], 'summary' => ['review' => count(array_filter($members, static fn($m) => $m['status'] === 'review')), 'stable' => count(array_filter($members, static fn($m) => $m['status'] === 'stable'))], 'members' => $members];
    }

    private function health(ResponseInterface $res, string $rawTag): ResponseInterface
    {
        $tag = $this->normalizeTag($rawTag); if (!$tag) return $this->tagError($res, 'Tag klan tidak valid.');
        try { return $this->respond($res, $this->healthReport($tag, $this->snapshots($tag))); } catch (\Throwable $e) { return $this->failure($res, $e); }
    }
    private function healthCsv(ResponseInterface $res, string $rawTag): ResponseInterface
    {
        $tag = $this->normalizeTag($rawTag); if (!$tag) { $res->getBody()->write('Tag klan tidak valid.'); return $res->withStatus(400)->withHeader('Content-Type', 'text/plain; charset=utf-8'); }
        try {
            $report = $this->healthReport($tag, $this->snapshots($tag));
            $rows = [['Name','Tag','Role','Trophies','Delta 7d','Delta 30d','Donated','Received','Donation Ratio','Status','Flags']];
            foreach ($report['members'] as $m) $rows[] = [$m['name'],$m['tag'],$m['role'],$m['trophies'],$m['trophyDelta7'],$m['trophyDelta30'],$m['donations'],$m['donationsReceived'],$m['donationRatio'],$m['status'],implode('; ', $m['flags'])];
            $csv = implode("\n", array_map(static fn($row) => implode(',', array_map(static function($value) { $value = (string)($value ?? ''); return preg_match('/[",\n]/', $value) ? '"' . str_replace('"', '""', $value) . '"' : $value; }, $row)), $rows));
            $res->getBody()->write($csv);
            return $res->withHeader('Content-Type', 'text/csv; charset=utf-8')->withHeader('Content-Disposition', 'attachment; filename="clan-health-' . $tag . '-' . gmdate('Y-m-d') . '.csv"');
        } catch (\Throwable) { $res->getBody()->write('Gagal membuat laporan CSV.'); return $res->withStatus(500)->withHeader('Content-Type', 'text/plain; charset=utf-8'); }
    }

    private function staticFile(ResponseInterface $res, string $requested): ResponseInterface
    {
        $safe = str_replace('\\', '/', rawurldecode($requested));
        if ($safe === '' || str_contains($safe, '..') || str_starts_with($safe, '/')) return $res->withStatus(404);
        $path = realpath(__DIR__ . '/../public/' . $safe);
        $root = realpath(__DIR__ . '/../public');
        if (!$path || !$root || !str_starts_with($path, $root . DIRECTORY_SEPARATOR) || !is_file($path)) return $res->withStatus(404);
        $mime = match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'css' => 'text/css; charset=utf-8',
            'js' => 'text/javascript; charset=utf-8',
            'html' => 'text/html; charset=utf-8',
            'json' => 'application/json; charset=utf-8',
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            default => mime_content_type($path) ?: 'application/octet-stream'
        };
        $res->getBody()->write((string)file_get_contents($path));
        return $res->withHeader('Content-Type', $mime)->withHeader('X-Content-Type-Options', 'nosniff');
    }

    private function playerPath(string $tag): ?string { $clean = $this->normalizeTag($tag); return $clean ? '/players/' . rawurlencode('#' . $clean) : null; }

    private function iconFiles(string $name, string $section): array
    {
        $base = preg_replace('/\s+/', '_', $name);
        if ($section === 'heroes' || ($section === 'builderBase' && preg_match('/^Battle (Machine|Copter)$/', $name))) return ['Avatar_Hero_' . $base . '.png', $base . '_Icon.png'];
        if ($section === 'spells') return [$base . '_info.png', 'Avatar_' . $base . '.png', $base . '_Icon.png'];
        if ($section === 'heroEquipment') return [$base . '.png', $base . '_info.png', 'Icon_' . $base . '.png', $base . '_Icon.png', 'Avatar_' . $base . '.png'];
        return ['Avatar_' . $base . '.png', $base . '_Icon.png'];
    }
    private function iconCandidates(string $name, string $section): array
    {
        $files = $this->iconFiles($name, $section); $urls = [];
        $local = $this->localIcon($name, $section);
        if ($local !== null) $urls[] = $local['url'];
        foreach ($files as $file) { $hash = md5($file); $urls[] = 'https://static.wikia.nocookie.net/clashofclans/images/' . $hash[0] . '/' . substr($hash,0,2) . '/' . rawurlencode($file) . '/revision/latest/scale-to-width-down/100'; $urls[] = 'https://clashofclans.fandom.com/wiki/Special:FilePath/' . rawurlencode($file) . '?width=96'; }
        if ($section === 'heroes' && $name === 'Royal Champion') array_splice($urls, $local === null ? 0 : 1, 0, ['https://static.wikia.nocookie.net/clashofclans/images/8/8e/Avatar_Hero_Royal_Champion.png/revision/latest/scale-to-width-down/100?cb=20200913051659']);
        if ($section === 'heroEquipment' && $name === 'Barbarian Puppet') array_splice($urls, $local === null ? 0 : 1, 0, ['https://static.wikia.nocookie.net/clashofclans/images/9/96/Barbarian_Puppet.png/revision/latest/scale-to-width-down/100?cb=20231211153430']);
        return array_values(array_unique($urls));
    }
    private function localIcon(string $name, string $section): ?array
    {
        $base = dirname(__DIR__) . '/public/icons/' . hash('sha256', $section . ':' . $name);
        foreach (['png' => 'image/png', 'webp' => 'image/webp', 'jpg' => 'image/jpeg', 'gif' => 'image/gif'] as $extension => $type) {
            $path = $base . '.' . $extension;
            if (is_file($path) && filesize($path) > 0 && filesize($path) <= 400000) return ['path' => $path, 'type' => $type, 'url' => '/public/icons/' . basename($path)];
        }
        return null;
    }
    private function playerItem(array $item): array
    {
        $equipmentHero = null;
        foreach (self::EQUIPMENT as $hero => $names) if (in_array($item['name'] ?? '', $names, true)) { $equipmentHero = $hero; break; }
        return ['name' => $item['name'] ?? null, 'level' => $item['level'] ?? null, 'maxLevel' => $item['maxLevel'] ?? null, 'village' => $item['village'] ?? 'home', 'equipmentHero' => $equipmentHero];
    }
    private function scoreItems(array $items, array $table, bool $api, string $village = 'home'): array
    {
        $itemMap = [];
        foreach ($items as $item) if (($village === 'builderBase') === (($item['village'] ?? 'home') === 'builderBase')) $itemMap[$item['name']] = $item;
        $limits = $api ? array_filter(array_map(static fn($i) => isset($i['maxLevel']) && (int)$i['maxLevel'] > 0 ? (int)$i['maxLevel'] : null, $itemMap)) : $table;
        $known=[]; $missing=[];
        foreach ($limits as $name => $max) {
            if (!isset($itemMap[$name])) { $missing[]=['name'=>$name,'level'=>0,'maxLevel'=>$max]; continue; }
            $level=(int)($itemMap[$name]['level'] ?? 0); $known[]=['name'=>$name,'level'=>$level,'maxLevel'=>$max,'percent'=>$max ? round(min(100,$level/$max*100),2) : 0];
        }
        $sum=array_sum(array_column($known,'level')); $maxSum=array_sum(array_column($known,'maxLevel')); $lowest=array_values(array_filter($known,static fn($i)=>$i['percent']<100));
        usort($lowest,static fn($a,$b)=>$a['percent']<=>$b['percent']); $unmapped=array_values(array_diff(array_keys($itemMap),array_keys($limits)));
        return ['percent'=>$maxSum ? round($sum/$maxSum*100,2) : null,'knownItems'=>count($known),'expectedItems'=>count($limits),'missingItems'=>count($missing),'unmappedItems'=>$unmapped,'lowest'=>array_slice($lowest,0,5),'items'=>$known,'missing'=>$missing];
    }
    private function progress(array $player): array
    {
        $th=(int)($player['townHallLevel'] ?? $player['townhallLevel'] ?? 0); $table=self::MAX_LEVELS[$th] ?? [];
        if (!$table) { $levels=array_keys(self::MAX_LEVELS); $fallback=max(array_filter($levels,static fn($n)=>$n<=$th) ?: [$levels[0]]); $table=self::MAX_LEVELS[$fallback]; } else $fallback=$th;
        $api=$th===18; $pets=$player['heroPets'] ?? $player['pets'] ?? array_values(array_filter($player['troops'] ?? [],static fn($i)=>in_array($i['name'] ?? '',self::PETS,true)));
        $troops=array_values(array_filter($player['troops'] ?? [],static fn($i)=>!in_array($i['name'] ?? '',self::SUPER_TROOPS,true)&&!in_array($i['name'] ?? '',self::PETS,true)));
        $categories=['heroes'=>$this->scoreItems($player['heroes']??[],$table['heroes']??[],$api),'troops'=>$this->scoreItems($troops,$table['troops']??[],$api),'spells'=>$this->scoreItems($player['spells']??[],$table['spells']??[],$api),'pets'=>$this->scoreItems($pets,$table['pets']??[],$api)];
        $available=array_filter($categories,static fn($c)=>$c['percent']!==null); $weightTotal=0; foreach($available as $key=>$_)$weightTotal+=self::WEIGHTS[$key];
        $overall=null; if($weightTotal){$overall=0;foreach($available as $key=>$cat)$overall+=$cat['percent']*self::WEIGHTS[$key]/$weightTotal;$overall=round($overall,2);}
        $coverage=array_sum(array_column($categories,'knownItems')); $unmapped=0; foreach($categories as $cat)$unmapped+=$cat['missingItems']+count($cat['unmappedItems']);
        $minimum=['heroes'=>5,'troops'=>20,'spells'=>12,'pets'=>10]; $complete=$api&&$coverage>0&&$unmapped===0;foreach($minimum as $key=>$count)$complete=$complete&&$categories[$key]['knownItems']>=$count;
        $weak=[];$very=[];foreach($categories as $key=>$cat)if($cat['percent']!==null){if($cat['percent']<60)$weak[]=$key;if($cat['percent']<50)$very[]=$key;}
        $rushed=$complete&&$overall!==null&&$overall<60&&count($very)>0;$reasons=[];if(!$complete)$reasons[]='Cakupan batas level belum lengkap; status rushed ditahan agar tidak menyesatkan.';else {if($overall<60)$reasons[]='Skor keseluruhan di bawah 60%.';foreach($very as $key)$reasons[]='Kategori ' . $key . ' di bawah 50%.';foreach(array_diff($weak,$very) as $key)$reasons[]='Kategori ' . $key . ' perlu perhatian karena di bawah 60%.';if(!$reasons)$reasons[]='Kategori utama yang tersedia masih berada di ambang aman.';}
        $priorities=[];foreach($categories as $key=>$cat)foreach($cat['lowest'] as $item)$priorities[]=array_merge(['category'=>$key],$item,['levelsRemaining'=>max(0,$item['maxLevel']-$item['level'])]);usort($priorities,static fn($a,$b)=>$a['percent']<=>$b['percent'] ?: $b['levelsRemaining']<=>$a['levelsRemaining']);
        $builder=[];foreach(array_merge($player['heroes']??[],$player['troops']??[],$player['spells']??[]) as $item)if(($item['village']??'')==='builderBase')$builder[]=$item;
        $builderScore=$this->scoreItems($builder,[],(int)($player['builderHallLevel']??0)===10,'builderBase');
        return ['tableVersion'=>'2026-10-api-max-with-partial-th-table','tableTownHallLevel'=>$fallback,'tableExactMatch'=>$api,'complete'=>$complete,'minimumCoverage'=>$minimum,'baselineSource'=>$api?'maxLevel dari API pemain pada TH 18':'tabel lokal TH ' . $fallback . ' (parsial)','player'=>['tag'=>$player['tag']??null,'name'=>$player['name']??null,'townHallLevel'=>$th,'expLevel'=>$player['expLevel']??null,'trophies'=>$player['trophies']??null,'clan'=>isset($player['clan'])?['tag'=>$player['clan']['tag']??null,'name'=>$player['clan']['name']??null]:null],'score'=>['label'=>'Progres pasukan dan hero','overall'=>$overall,'weights'=>self::WEIGHTS,'categories'=>$categories,'builderBase'=>$builderScore],'rushed'=>['rushed'=>$complete?$rushed:null,'label'=>$complete?($rushed?'Terindikasi rushed':'Tidak terindikasi rushed'):'Belum dapat dinilai','reasons'=>$reasons],'priorities'=>array_slice($priorities,0,10),'limitations'=>['API profil pemain tidak menyediakan level bangunan, tembok, dan upgrade berjalan.',$api?'Batas level TH 18 dan BH 10 diambil dari maxLevel API bila tersedia; item tanpa batas tidak masuk skor.':'Tabel lokal TH ' . $fallback . ' belum tervalidasi untuk seluruh item dan update terbaru; status rushed tidak dihitung.','Skor hanya meliputi pasukan, hero, spell, dan pet; bukan persentase maksimal seluruh akun.'],'generatedAt'=>gmdate('c')];
    }
    private function profile(array $p, string $updated): array
    {
        $army=['heroes'=>[],'heroEquipment'=>[],'pets'=>[],'troops'=>[],'superTroops'=>[],'builderBase'=>[],'spells'=>[]];
        foreach($p['heroes']??[] as $i)$army[($i['village']??'')==='builderBase'?'builderBase':'heroes'][]=$this->playerItem($i);
        foreach($p['heroEquipment']??[] as $i)$army['heroEquipment'][]=$this->playerItem($i);
        foreach($p['heroPets']??$p['pets']??[] as $i)$army['pets'][]=$this->playerItem($i);
        $seen=array_column($army['pets'],'name');
        foreach($p['troops']??[] as $i){$item=$this->playerItem($i);if(($i['village']??'')==='builderBase')$army['builderBase'][]=$item;elseif(in_array($i['name']??'',self::PETS,true)){if(!in_array($item['name'],$seen,true))$army['pets'][]=$item;$seen[]=$item['name'];}elseif(in_array($i['name']??'',self::SUPER_TROOPS,true))$army['superTroops'][]=$item;else $army['troops'][]=$item;}
        foreach($p['spells']??[] as $i)$army[($i['village']??'')==='builderBase'?'builderBase':'spells'][]=$this->playerItem($i);
        foreach($army as $section=>&$items)foreach($items as &$item)$item['iconUrls']=$this->iconCandidates($item['name'],$section);unset($items,$item);
        $fields=['tag','name','townHallLevel','builderHallLevel','expLevel','trophies','bestTrophies','builderBaseTrophies','warStars','donations','donationsReceived','role'];$player=[];foreach($fields as $f)$player[$f]=$p[$f]??null;
        $player['league']=isset($p['league'])?['name'=>$p['league']['name']??null,'iconUrls'=>$p['league']['iconUrls']??null]:null;
        $player['clan']=isset($p['clan'])?['tag'=>$p['clan']['tag']??null,'name'=>$p['clan']['name']??null,'badgeUrls'=>$p['clan']['badgeUrls']??null]:null;
        return ['player'=>$player,'army'=>$army,'progress'=>$this->progress($p),'lastUpdated'=>$updated];
    }

    private function clan(ResponseInterface $res,string $raw):ResponseInterface{$tag=$this->normalizeTag($raw);if(!$tag)return $this->tagError($res,'Tag klan tidak valid.');try{$e=$this->upstream('/clans/'.rawurlencode('#'.$tag));$snapshot=$this->saveSnapshot($tag,$e['data']);$data=$e['data'];$data['snapshotDate']=$snapshot['date'];return $this->respond($res,$data);}catch(\Throwable $e){return $this->failure($res,$e);}}
    private function playerProgress(ResponseInterface $res,string $raw):ResponseInterface{$path=$this->playerPath($raw);if(!$path)return $this->tagError($res,'Tag pemain tidak valid.');try{$e=$this->upstream($path);$data=$this->progress($e['data']);$data['lastUpdated']=$e['lastUpdated'];return $this->respond($res,$data);}catch(\Throwable $e){return $this->failure($res,$e);}}
    private function playerProfile(ResponseInterface $res,string $raw):ResponseInterface{$path=$this->playerPath($raw);if(!$path)return $this->tagError($res,'Tag pemain tidak valid.');try{$e=$this->upstream($path);return $this->respond($res,$this->profile($e['data'],$e['lastUpdated']));}catch(\Throwable $e){return $this->failure($res,$e);}}

    private function archivePath(string $tag): string { return 'wars/' . $tag . '.json'; }
    private function wars(string $tag): array { $data=$this->readJson($this->archivePath($tag));return is_array($data['wars']??null)?$data['wars']:[]; }
    private function writeWars(string $tag,array $wars):void{$this->writeJson($this->archivePath($tag),['clanTag'=>'#'.$tag,'wars'=>$wars],true);}
    private function archive(string $tag,array $entry,string $type,?int $round=null):void
    {
        $d=$entry['data'];if(!$d||in_array($d['state']??'', ['notInWar','cwlWaiting'],true))return;$own='#'.$tag;$reversed=strtoupper($d['opponent']['tag']??'')===$own;$clan=$reversed?($d['opponent']??[]):($d['clan']??[]);$opp=$reversed?($d['clan']??[]):($d['opponent']??[]);if(strtoupper($clan['tag']??'')!==$own)return;
        $id=$type.':'.($d['startTime']??$d['endTime']??$entry['warTag']??$round).':'.($opp['tag']??'unknown');$members=[];foreach($clan['members']??[] as $m){$att=[];foreach($m['attacks']??[] as $a)$att[]=['defenderTag'=>$a['defenderTag']??null,'stars'=>$a['stars']??0,'destructionPercentage'=>$a['destructionPercentage']??0];$members[]=['tag'=>$m['tag']??null,'name'=>$m['name']??null,'townhallLevel'=>$m['townhallLevel']??null,'attacks'=>$att];}
        $list=$this->wars($tag);$record=['id'=>$id,'type'=>$type,'round'=>$round,'state'=>$d['state']??null,'startTime'=>$d['startTime']??null,'endTime'=>$d['endTime']??null,'opponent'=>['tag'=>$opp['tag']??null,'name'=>$opp['name']??null],'attacksPerMember'=>$d['attacksPerMember']??($type==='CWL'?1:2),'members'=>$members,'updatedAt'=>$entry['lastUpdated']??gmdate('c')];$found=false;foreach($list as &$old)if(($old['id']??null)===$id){$old=$record;$found=true;break;}unset($old);if(!$found)$list[]=$record;usort($list,static fn($a,$b)=>strcmp($a['startTime']??$a['updatedAt']??'', $b['startTime']??$b['updatedAt']??''));$this->writeWars($tag,array_slice($list,-120));
    }
    private function playerWarReport(string $player,string $clan):array
    {
        $wars=$this->wars($clan);$snapshots=$this->snapshots($clan);$rows=[];foreach($wars as $w){$member=null;foreach($w['members']??[] as $m)if(strtoupper($m['tag']??'')==='#'.$player){$member=$m;break;}if(!$member)continue;$att=$member['attacks']??[];$stars=array_sum(array_column($att,'stars'));$dest=array_sum(array_column($att,'destructionPercentage'));$rows[]=['id'=>$w['id'],'type'=>$w['type'],'round'=>$w['round']??null,'state'=>$w['state'],'startTime'=>$w['startTime']??null,'endTime'=>$w['endTime']??null,'opponent'=>$w['opponent']??null,'quota'=>$w['attacksPerMember'],'attacks'=>$att,'stars'=>$stars,'destructionAverage'=>count($att)?round($dest/count($att),2):0,'missed'=>($w['state']==='warEnded'&&count($att)<$w['attacksPerMember'])];}
        usort($rows,static fn($a,$b)=>strcmp($b['startTime']??$b['endTime']??'', $a['startTime']??$a['endTime']??''));$attacks=[];foreach($rows as $r)$attacks=array_merge($attacks,$r['attacks']);$trend=[];foreach($snapshots as $s)foreach($s['members']??[] as $m)if(strtoupper($m['tag']??'')==='#'.$player){$trend[]=['date'=>$s['date'],'trophies'=>$m['trophies'],'donations'=>$m['donations'],'donationsReceived'=>$m['donationsReceived']];break;}
        $stars=array_sum(array_column($attacks,'stars'));$destruction=array_sum(array_column($attacks,'destructionPercentage'));return ['playerTag'=>'#'.$player,'clanTag'=>'#'.$clan,'wars'=>$rows,'summary'=>['wars'=>count($rows),'attacks'=>count($attacks),'stars'=>$stars,'starsPerAttack'=>count($attacks)?round($stars/count($attacks),2):null,'destructionAverage'=>count($attacks)?round($destruction/count($attacks),2):null,'missed'=>count(array_filter($rows,static fn($r)=>$r['missed']))],'trend'=>count($trend)>=2?$trend:[],'trendAvailable'=>count($trend)>=2,'note'=>'Arsip perang dimulai ketika aplikasi mengambil data perang. Perang lama yang belum pernah diambil tidak tersedia.'];
    }
    private function playerPerformance(ServerRequestInterface $req,ResponseInterface $res,string $raw):ResponseInterface{$player=$this->normalizeTag($raw);$query=$req->getQueryParams();$clan=$this->normalizeTag($query['clan']??'');if(!$player||!$clan)return $this->tagError($res,'Tag pemain dan klan harus valid.');try{return $this->respond($res,$this->playerWarReport($player,$clan));}catch(\Throwable $e){return $this->failure($res,$e);}}

    private function fetchCwlGroup(string $path):?array{try{return $this->upstream($path.'/currentwar/leaguegroup');}catch(UpstreamFailure $e){if($e->status===404)return null;throw $e;}}
    private function roundWars(string $path,array $round,int $number,string $clan):?array
    {
        $tags=array_values(array_filter($round['warTags']??[],static fn($t)=>$t&&$t!=='#0'));$failure=null;
        foreach($tags as $tag){try{$e=$this->upstream('/clanwarleagues/wars/'.rawurlencode($tag));$d=$e['data'];if(strtoupper($d['clan']['tag']??'')==='#'.$clan||strtoupper($d['opponent']['tag']??'')==='#'.$clan){$e['round']=$number;$e['warTag']=$tag;return $e;}}catch(UpstreamFailure $e){if($e->status!==404)$failure=$e;}}
        if($failure)throw $failure;return null;
    }
    private function cwlWar(string $path,string $clan,?int $selected):?array
    {
        $group=$this->fetchCwlGroup($path);if(!$group||($group['data']['state']??'')==='notInWar')return null;$rounds=$group['data']['rounds']??[];if($selected!==null&&$selected>count($rounds))return ['invalidRound'=>true];$available=[];foreach($rounds as $i=>$r)if(array_filter($r['warTags']??[],static fn($t)=>$t&&$t!=='#0'))$available[]=$i+1;
        if($selected!==null){return $this->roundWars($path,$rounds[$selected-1],$selected,$clan)??['data'=>['state'=>'cwlWaiting'],'lastUpdated'=>$group['lastUpdated'],'availableRounds'=>$available,'round'=>$selected];}
        $preparation=null;for($i=count($rounds)-1;$i>=0;$i--){$war=$this->roundWars($path,$rounds[$i],$i+1,$clan);if(!$war)continue;$war['availableRounds']=$available;if(($war['data']['state']??'')==='inWar')return $war;if(($war['data']['state']??'')==='preparation'&&!$preparation)$preparation=$war;if(($war['data']['state']??'')==='warEnded')return $preparation??$war;}return $preparation??['data'=>['state'=>'cwlWaiting'],'lastUpdated'=>$group['lastUpdated'],'availableRounds'=>$available];
    }
    private function side(array $data,string $tag,bool $cwl):array{$own='#'.$tag;$reverse=$cwl&&strtoupper($data['opponent']['tag']??'')===$own;return [$reverse?($data['opponent']??[]):($data['clan']??[]),$reverse?($data['clan']??[]):($data['opponent']??[])];}
    private function war(ServerRequestInterface $req,ResponseInterface $res,string $raw):ResponseInterface
    {
        $tag=$this->normalizeTag($raw);if(!$tag)return $this->tagError($res,'Tag klan tidak valid.');$q=$req->getQueryParams();$selected=null;if(array_key_exists('round',$q)){if(!is_numeric($q['round'])||floor((float)$q['round'])!=(float)$q['round']||(int)$q['round']<1)return $this->tagError($res,'Nomor putaran tidak valid.');$selected=(int)$q['round'];}
        try{$entry=$selected===null?$this->upstream('/clans/'.rawurlencode('#'.$tag).'/currentwar'):null;$isCwl=(bool)($entry['data']['isLeagueEntry']??false);$round=null;$available=[];if($selected!==null||($entry['data']['state']??'')==='notInWar'||$isCwl){$cwl=$this->cwlWar('/clans/'.rawurlencode('#'.$tag),$tag,$selected);if($cwl['invalidRound']??false)return $this->tagError($res,'Putaran CWL tidak tersedia.');if($cwl){$entry=$cwl;$isCwl=true;$round=$cwl['round']??null;$available=$cwl['availableRounds']??[];}}
            if(!$entry){return $this->respond($res,['error'=>'Data CWL tidak tersedia untuk klan ini.'],404);}$d=$entry['data'];$state=$d['state']??'';if($state==='notInWar')return $this->respond($res,['state'=>$state,'lastUpdated'=>$entry['lastUpdated']]);if($state==='cwlWaiting')return $this->respond($res,['state'=>$state,'type'=>'CWL','round'=>$round,'availableRounds'=>$available,'lastUpdated'=>$entry['lastUpdated']]);$this->archive($tag,$entry,$isCwl?'CWL':'War',$round);[$clan,$opp]=$this->side($d,$tag,$isCwl);$quota=$d['attacksPerMember']??($isCwl?1:null);$members=[];foreach($clan['members']??[] as $m){$att=$m['attacks']??[];$stars=array_sum(array_column($att,'stars'));$dest=array_sum(array_column($att,'destructionPercentage'));$members[]=['tag'=>$m['tag']??null,'name'=>$m['name']??null,'mapPosition'=>$m['mapPosition']??null,'townhallLevel'=>$m['townhallLevel']??null,'starsEarned'=>$stars,'destructionAverage'=>count($att)?round($dest/count($att),2):0,'attacksUsed'=>count($att),'attacksRemaining'=>$quota===null?null:max(0,$quota-count($att)),'attacks'=>array_map(static fn($a)=>['defenderTag'=>$a['defenderTag']??null,'stars'=>$a['stars']??null,'destructionPercentage'=>$a['destructionPercentage']??null],$att)];}usort($members,static fn($a,$b)=>($a['mapPosition']??0)<=>($b['mapPosition']??0));$all=[];foreach($members as $m)foreach($m['attacks'] as $a)$all[]=$a+['attackerTag'=>$m['tag'],'attackerName'=>$m['name']];$opponents=[];foreach($opp['members']??[] as $m){$incoming=array_values(array_filter($all,static fn($a)=>($a['defenderTag']??null)===($m['tag']??null)));usort($incoming,static fn($a,$b)=>($b['stars']??0)<=>($a['stars']??0) ?: ($b['destructionPercentage']??0)<=>($a['destructionPercentage']??0));$best=$incoming[0]??null;$opponents[]=['tag'=>$m['tag']??null,'name'=>$m['name']??null,'mapPosition'=>$m['mapPosition']??null,'townhallLevel'=>$m['townhallLevel']??null,'attacksReceived'=>count($incoming),'bestStars'=>$best['stars']??0,'bestDestruction'=>$best['destructionPercentage']??0,'bestAttackerName'=>$best['attackerName']??null];}usort($opponents,static fn($a,$b)=>($a['mapPosition']??0)<=>($b['mapPosition']??0));$used=array_sum(array_column($members,'attacksUsed'));$remaining=$quota===null?null:array_sum(array_column($members,'attacksRemaining'));
            return $this->respond($res,['state'=>$state,'type'=>$isCwl?'CWL':'Perang biasa','round'=>$round,'availableRounds'=>$available,'startTime'=>$d['startTime']??null,'endTime'=>$d['endTime']??null,'teamSize'=>$d['teamSize']??null,'attacksPerMember'=>$quota,'attacksUsed'=>$used,'attacksRemaining'=>$remaining,'clan'=>['name'=>$clan['name']??null,'tag'=>$clan['tag']??null,'stars'=>$clan['stars']??0,'destructionPercentage'=>$clan['destructionPercentage']??0,'attacks'=>$clan['attacks']??$used],'opponent'=>['name'=>$opp['name']??null,'tag'=>$opp['tag']??null,'stars'=>$opp['stars']??0,'destructionPercentage'=>$opp['destructionPercentage']??0,'attacks'=>$opp['attacks']??0],'members'=>$members,'opponentMembers'=>$opponents,'lastUpdated'=>$entry['lastUpdated']]);
        }catch(\Throwable $e){return $this->failure($res,$e,true);}
    }

    private function cwlPerformance(ServerRequestInterface $req,ResponseInterface $res,string $raw):ResponseInterface
    {
        $tag=$this->normalizeTag($raw);if(!$tag)return $this->tagError($res,'Tag klan tidak valid.');$path='/clans/'.rawurlencode('#'.$tag);
        try{$group=$this->fetchCwlGroup($path);$wars=[];$available=[];$updated=$group['lastUpdated']??gmdate('c');if($group&&($group['data']['state']??'')!=='notInWar')foreach($group['data']['rounds']??[] as $i=>$r){if(array_filter($r['warTags']??[],static fn($t)=>$t&&$t!=='#0'))$available[]=$i+1;$entry=$this->roundWars($path,$r,$i+1,$tag);if($entry){$wars[]=$entry;$this->archive($tag,$entry,'CWL',$i+1);}}
            $rounds=[];$players=[];foreach($wars as $entry){$d=$entry['data'];[$clan,$opp]=$this->side($d,$tag,true);$round=['round'=>$entry['round'],'state'=>$d['state'],'opponent'=>$opp['name']??null,'clanStars'=>$clan['stars']??0,'opponentStars'=>$opp['stars']??0,'clanDestruction'=>$clan['destructionPercentage']??0,'opponentDestruction'=>$opp['destructionPercentage']??0,'members'=>[]];foreach($clan['members']??[] as $m){$att=$m['attacks']??[];$stars=array_sum(array_column($att,'stars'));$dest=array_sum(array_column($att,'destructionPercentage'));$member=['tag'=>$m['tag']??null,'name'=>$m['name']??null,'mapPosition'=>$m['mapPosition']??null,'townhallLevel'=>$m['townhallLevel']??null,'attacks'=>count($att),'stars'=>$stars,'destructionAverage'=>count($att)?round($dest/count($att),2):0];$round['members'][]=$member;$key=$member['tag'];if(!isset($players[$key]))$players[$key]=['tag'=>$key,'name'=>$member['name'],'townhallLevel'=>$member['townhallLevel'],'totals'=>['attacks'=>0,'stars'=>0,'destructionSum'=>0,'roundsPlayed'=>0,'missed'=>0],'rounds'=>[]];$players[$key]['name']=$member['name'];$players[$key]['townhallLevel']=$member['townhallLevel'];$players[$key]['totals']['attacks']+=$member['attacks'];$players[$key]['totals']['stars']+=$member['stars'];$players[$key]['totals']['destructionSum']+=$member['destructionAverage']*$member['attacks'];if($member['attacks'])$players[$key]['totals']['roundsPlayed']++;else $players[$key]['totals']['missed']++;$players[$key]['rounds'][]=['round'=>$entry['round'],'opponent'=>$opp['name']??null,'state'=>$d['state'],'attacks'=>$member['attacks'],'stars'=>$member['stars'],'destructionAverage'=>$member['destructionAverage']];}$rounds[]=$round;}
            foreach($players as &$p){$n=$p['totals']['attacks'];$p['totals']['destructionAverage']=$n?round($p['totals']['destructionSum']/$n,2):0;$p['totals']['starsPerAttack']=$n?round($p['totals']['stars']/$n,2):0;}unset($p);usort($players,static fn($a,$b)=>$b['totals']['stars']<=>$a['totals']['stars'] ?: $b['totals']['starsPerAttack']<=>$a['totals']['starsPerAttack'] ?: $b['totals']['destructionAverage']<=>$a['totals']['destructionAverage'] ?: strcasecmp($a['name'],$b['name']));
            return $this->respond($res,['type'=>'CWL','availableRounds'=>$available,'rounds'=>array_map(static fn($r)=>array_intersect_key($r,array_flip(['round','state','opponent','clanStars','opponentStars','clanDestruction','opponentDestruction'])),$rounds),'players'=>array_values($players),'lastUpdated'=>$updated]);
        }catch(\Throwable $e){return $this->failure($res,$e,true);}
    }

    private function playerIcon(ServerRequestInterface $req,ResponseInterface $res):ResponseInterface
    {
        $q=$req->getQueryParams();$name=(string)($q['name']??'');$section=(string)($q['section']??'');if(!preg_match("/^[\\w .&'-]{1,70}$/u",$name)||!in_array($section,self::SECTIONS,true))return $this->empty($res,400);
        $local=$this->localIcon($name,$section);
        if($local!==null){$bytes=file_get_contents($local['path']);if($bytes!==false){$res->getBody()->write($bytes);return $res->withHeader('Content-Type',$local['type'])->withHeader('Cache-Control','public, max-age=86400');}}
        $key=$section.':'.$name;$path='icons/'.hash('sha256',$key).'.json';$saved=$this->readJson($path,[]);$types=['image/png','image/webp','image/jpeg','image/gif'];
        if(isset($saved['type'],$saved['body'])&&in_array($saved['type'],$types,true)){$bytes=base64_decode($saved['body'],true);if($bytes!==false&&strlen($bytes)<=400000){$res->getBody()->write($bytes);return $res->withHeader('Content-Type',$saved['type'])->withHeader('Cache-Control','public, max-age=86400');}}
        // Web requests must not launch several outbound Fandom lookups per icon.
        // Cache warming is done from the CLI; opt in to remote fetches on web requests only if needed.
        if(PHP_SAPI!=='cli'&&$this->env('ICON_REMOTE_FETCH')!=='1')return $this->empty($res,404);
        $files=$this->iconFiles($name,$section);$urls=$this->iconCandidates($name,$section);$body=null;$mime=null;
        foreach($urls as $url){if(!str_starts_with($url,'https://static.wikia.nocookie.net/'))continue;try{$r=$this->http->get($url,['timeout'=>6,'http_errors'=>false,'headers'=>['Accept'=>'image/*']]);$ct=strtolower(trim(explode(';',$r->getHeaderLine('Content-Type'))[0]));$b=(string)$r->getBody();if($r->getStatusCode()===200&&in_array($ct,$types,true)&&strlen($b)<=400000){$body=$b;$mime=$ct;break;}}catch(\Throwable){}}
        if($body===null){try{$r=$this->http->get('https://clashofclans.fandom.com/api.php',['timeout'=>8,'query'=>['action'=>'query','prop'=>'imageinfo','iiprop'=>'url','format'=>'json','formatversion'=>2,'titles'=>implode('|',array_map(static fn($f)=>'File:'.$f,$files))]]);$json=json_decode((string)$r->getBody(),true);foreach($json['query']['pages']??[] as $page)if(isset($page['imageinfo'][0]['url'])&&str_starts_with($page['imageinfo'][0]['url'],'https://static.wikia.nocookie.net/')){$r=$this->http->get($page['imageinfo'][0]['url'],['timeout'=>6,'http_errors'=>false]);$ct=strtolower(trim(explode(';',$r->getHeaderLine('Content-Type'))[0]));$b=(string)$r->getBody();if($r->getStatusCode()===200&&in_array($ct,$types,true)&&strlen($b)<=400000){$body=$b;$mime=$ct;break;}}}catch(\Throwable){}}
        if($body===null)return $this->empty($res,404);$this->writeJson($path,['type'=>$mime,'body'=>base64_encode($body)]);$res->getBody()->write($body);return $res->withHeader('Content-Type',$mime)->withHeader('Cache-Control','public, max-age=86400');
    }
}

final class UpstreamFailure extends \RuntimeException
{
    public function __construct(public readonly int $status, ?\Throwable $previous = null, string $details = '') { parent::__construct('Upstream request failed' . ($details ? ': ' . $details : ''), $status, $previous); }
}
final class LocalDataFailure extends \RuntimeException {}
