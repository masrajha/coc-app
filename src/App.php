<?php

declare(strict_types=1);

namespace CocTracker;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Pool;
use GuzzleHttp\Psr7\Request as GuzzleRequest;
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
    private const RANKED_RULES = [
        'Skeleton League 1' => ['battles' => 6, 'promoted' => 50, 'demoted' => null],
        'Skeleton League 2' => ['battles' => 6, 'promoted' => 50, 'demoted' => 5],
        'Skeleton League 3' => ['battles' => 6, 'promoted' => 50, 'demoted' => 5],
        'Barbarian League 4' => ['battles' => 6, 'promoted' => 50, 'demoted' => 5],
        'Barbarian League 5' => ['battles' => 6, 'promoted' => 50, 'demoted' => 5],
        'Barbarian League 6' => ['battles' => 6, 'promoted' => 50, 'demoted' => 5],
        'Archer League 7' => ['battles' => 8, 'promoted' => 50, 'demoted' => 5],
        'Archer League 8' => ['battles' => 8, 'promoted' => 50, 'demoted' => 5],
        'Archer League 9' => ['battles' => 8, 'promoted' => 40, 'demoted' => 5],
        'Wizard League 10' => ['battles' => 8, 'promoted' => 35, 'demoted' => 10],
        'Wizard League 11' => ['battles' => 8, 'promoted' => 50, 'demoted' => 10],
        'Wizard League 12' => ['battles' => 8, 'promoted' => 40, 'demoted' => 10],
        'Valkyrie League 13' => ['battles' => 10, 'promoted' => 35, 'demoted' => 10],
        'Valkyrie League 14' => ['battles' => 10, 'promoted' => 50, 'demoted' => 10],
        'Valkyrie League 15' => ['battles' => 10, 'promoted' => 40, 'demoted' => 10],
        'Witch League 16' => ['battles' => 10, 'promoted' => 35, 'demoted' => 10],
        'Witch League 17' => ['battles' => 10, 'promoted' => 50, 'demoted' => 10],
        'Witch League 18' => ['battles' => 10, 'promoted' => 40, 'demoted' => 10],
        'Golem League 19' => ['battles' => 12, 'promoted' => 35, 'demoted' => 10],
        'Golem League 20' => ['battles' => 12, 'promoted' => 50, 'demoted' => 10],
        'Golem League 21' => ['battles' => 12, 'promoted' => 40, 'demoted' => 10],
        'P.E.K.K.A League 22' => ['battles' => 12, 'promoted' => 30, 'demoted' => 15],
        'P.E.K.K.A League 23' => ['battles' => 12, 'promoted' => 50, 'demoted' => 15],
        'P.E.K.K.A League 24' => ['battles' => 12, 'promoted' => 40, 'demoted' => 15],
        'Titan League 25' => ['battles' => 12, 'promoted' => 30, 'demoted' => 15],
        'Titan League 26' => ['battles' => 12, 'promoted' => 50, 'demoted' => 15],
        'Titan League 27' => ['battles' => 12, 'promoted' => 40, 'demoted' => 15],
        'Dragon League 28' => ['battles' => 14, 'promoted' => 30, 'demoted' => 15],
        'Dragon League 29' => ['battles' => 14, 'promoted' => 25, 'demoted' => 15],
        'Dragon League 30' => ['battles' => 14, 'promoted' => 25, 'demoted' => 15],
        'Electro League 31' => ['battles' => 18, 'promoted' => 20, 'demoted' => 15],
        'Electro League 32' => ['battles' => 18, 'promoted' => 20, 'demoted' => 15],
        'Electro League 33' => ['battles' => 18, 'promoted' => 15, 'demoted' => 15],
        'Legend III' => ['battles' => 24, 'promoted' => 5, 'demoted' => 15],
        'Legend II' => ['battles' => 30, 'promoted' => 3, 'demoted' => 15]
    ];
    // Equipment names must match the player API. Add new items here with their hero and, when needed, a verified icon URL.
    private const EQUIPMENT = [
        'Barbarian Puppet' => ['hero' => 'Barbarian King', 'iconUrl' => 'https://static.wikia.nocookie.net/clashofclans/images/9/96/Barbarian_Puppet.png/revision/latest/scale-to-width-down/100?cb=20231211153430'],
        'Rage Vial' => ['hero' => 'Barbarian King'], 'Earthquake Boots' => ['hero' => 'Barbarian King'], 'Vampstache' => ['hero' => 'Barbarian King'],
        'Giant Gauntlet' => ['hero' => 'Barbarian King'], 'Spiky Ball' => ['hero' => 'Barbarian King'], 'Snake Bracelet' => ['hero' => 'Barbarian King'], 'Stick Horse' => ['hero' => 'Barbarian King'],
        'Archer Puppet' => ['hero' => 'Archer Queen'], 'Invisibility Vial' => ['hero' => 'Archer Queen'], 'Giant Arrow' => ['hero' => 'Archer Queen'],
        'Healer Puppet' => ['hero' => 'Archer Queen'], 'Frozen Arrow' => ['hero' => 'Archer Queen'], 'Magic Mirror' => ['hero' => 'Archer Queen'],
        'Action Figure' => ['hero' => 'Archer Queen'], 'Monolith Arrow' => ['hero' => 'Archer Queen'],
        'Henchmen Puppet' => ['hero' => 'Minion Prince'], 'Dark Orb' => ['hero' => 'Minion Prince'], 'Metal Pants' => ['hero' => 'Minion Prince'],
        'Noble Iron' => ['hero' => 'Minion Prince'], 'Dark Crown' => ['hero' => 'Minion Prince'], 'Meteor Staff' => ['hero' => 'Minion Prince'],
        'Portal Pendant' => ['hero' => 'Minion Prince', 'iconUrl' => 'https://static.wikia.nocookie.net/clashofclans/images/c/cc/Portal_Pendant.png/revision/latest/scale-to-width-down/200?cb=20260906171322'],
        'Eternal Tome' => ['hero' => 'Grand Warden'], 'Life Gem' => ['hero' => 'Grand Warden'], 'Rage Gem' => ['hero' => 'Grand Warden'],
        'Healing Tome' => ['hero' => 'Grand Warden'], 'Fireball' => ['hero' => 'Grand Warden'], 'Lavaloon Puppet' => ['hero' => 'Grand Warden'], 'Heroic Torch' => ['hero' => 'Grand Warden'],
        'Royal Gem' => ['hero' => 'Royal Champion'], 'Seeking Shield' => ['hero' => 'Royal Champion'], 'Hog Rider Puppet' => ['hero' => 'Royal Champion'],
        'Haste Vial' => ['hero' => 'Royal Champion'], 'Rocket Spear' => ['hero' => 'Royal Champion'], 'Electro Boots' => ['hero' => 'Royal Champion'], 'Frost Flake' => ['hero' => 'Royal Champion'],
        'Fire Heart' => ['hero' => 'Dragon Duke'], 'Flame Blower' => ['hero' => 'Dragon Duke'], 'Stun Blaster' => ['hero' => 'Dragon Duke'],
        'Electro Fangs' => ['hero' => 'Dragon Duke'], 'Rocket Backpack' => ['hero' => 'Dragon Duke'], 'Revenge Deck' => ['hero' => 'Dragon Duke']
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
    private string $locale = 'id';

    private const ENGLISH_ERRORS = [
        'Arsip data lokal tidak dapat dibaca. Periksa berkas di folder data/wars.' => 'The local archive could not be read. Check the files in data/wars.',
        'Data perang tidak tersedia untuk klan ini.' => 'War data is unavailable for this clan.',
        'Akses API ditolak. Periksa token dan alamat IP yang didaftarkan.' => 'API access was denied. Check the token and registered IP address.',
        'Klan tidak ditemukan.' => 'Clan not found.',
        'Batas permintaan API tercapai. Coba lagi sebentar.' => 'The API request limit has been reached. Please try again shortly.',
        'API Clash of Clans tidak merespons tepat waktu. Coba lagi sebentar; jika terus terjadi, periksa koneksi server, token, dan IP yang didaftarkan di developer.clashofclans.com.' => 'The Clash of Clans API timed out. Please try again shortly; if this continues, check the server connection, token, and registered IP address at developer.clashofclans.com.',
        'Gagal mengambil data dari API Clash of Clans.' => 'Could not fetch data from the Clash of Clans API.',
        'Tag klan tidak valid.' => 'Invalid clan tag.',
        'Tag pemain tidak valid.' => 'Invalid player tag.',
        'Tag pemain dan klan harus valid.' => 'Player and clan tags must be valid.',
        'Tag anggota tidak valid.' => 'Invalid member tag.',
        'Jenis ranking tidak valid.' => 'Invalid ranking type.',
        'Lokasi ranking tidak valid.' => 'Invalid ranking location.',
        'Jumlah ranking tidak valid.' => 'Invalid ranking limit.',
        'Sesi liga tidak valid.' => 'Invalid league session.',
        'Pemain tidak memiliki grup pada sesi liga ini.' => 'The player has no group in this league session.',
        'Pemain tidak ada dalam grup liga ini.' => 'The player is not in this league group.',
        'Data grup liga untuk sesi ini tidak tersedia.' => 'League group data is unavailable for this session.',
        'API Clash of Clans tidak merespons untuk grup liga sesi ini. Profil pemain tersedia; coba lagi nanti.' => 'The Clash of Clans API did not respond for this league group. The player profile is available; please try again later.',
        'Nomor putaran tidak valid.' => 'Invalid round number.',
        'Putaran CWL tidak tersedia.' => 'CWL round unavailable.',
        'Data CWL tidak tersedia untuk klan ini.' => 'CWL data is unavailable for this clan.',
        'Nama klan harus berisi 3 sampai 80 karakter.' => 'Clan name must contain 3 to 80 characters.',
        'Filter pencarian klan tidak valid.' => 'Invalid clan search filter.',
        'Jumlah anggota minimal tidak boleh melebihi maksimal.' => 'Minimum members cannot exceed maximum members.',
        'Gunakan hanya salah satu cursor after atau before.' => 'Use either the after or before cursor, not both.',
        'Parameter riwayat perang tidak valid.' => 'Invalid war log parameter.',
        'Parameter Raid Weekend tidak valid.' => 'Invalid Raid Weekend parameter.',
    ];

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
        $app->add(function (ServerRequestInterface $request, $handler) use ($self): ResponseInterface {
            $requested = $request->getQueryParams()['lang'] ?? null;
            if (!is_string($requested) || !in_array($requested, ['id', 'en'], true)) {
                $requested = preg_match('/^en(?:-|$)/i', $request->getHeaderLine('Accept-Language')) ? 'en' : 'id';
            }
            $self->locale = $requested;
            return $handler->handle($request);
        });
        $app->options('/{routes:.*}', fn($request, $response) => $response);
        $app->get('/api/rankings/locations', fn($req, $res) => $self->rankingLocations($res));
        $app->get('/api/rankings/{type}', fn($req, $res, $args) => $self->rankings($req, $res, $args['type']));
        $app->get('/api/clans/search', fn($req, $res) => $self->searchClans($req, $res));
        $app->get('/api/clans/labels', fn($req, $res) => $self->clanLabels($res));
        $app->get('/api/clans/popular', fn($req, $res) => $self->popularClans($res));
        $app->get('/api/clan/{tag}/war', fn($req, $res, $args) => $self->war($req, $res, $args['tag']));
        $app->get('/api/clan/{tag}/war-log', fn($req, $res, $args) => $self->clanWarLog($req, $res, $args['tag']));
        $app->get('/api/clan/{tag}/raids', fn($req, $res, $args) => $self->clanRaids($req, $res, $args['tag']));
        $app->get('/api/clan/{tag}/cwl/standings', fn($req, $res, $args) => $self->cwlStandings($res, $args['tag']));
        $app->get('/api/clan/{tag}/cwl/performance', fn($req, $res, $args) => $self->cwlPerformance($req, $res, $args['tag']));
        $app->get('/api/clan/{tag}/health.csv', fn($req, $res, $args) => $self->healthCsv($res, $args['tag']));
        $app->get('/api/clan/{tag}/health', fn($req, $res, $args) => $self->health($res, $args['tag']));
        $app->get('/api/clan/{tag}/summary', fn($req, $res, $args) => $self->clanSummary($res, $args['tag']));
        $app->get('/api/clan/{tag}', fn($req, $res, $args) => $self->clan($res, $args['tag']));
        $app->get('/api/player-icon', fn($req, $res) => $self->playerIcon($req, $res));
        $app->get('/api/player/{tag}/progress', fn($req, $res, $args) => $self->playerProgress($res, $args['tag']));
        $app->get('/api/player/{tag}/war-preference', fn($req, $res, $args) => $self->warPreference($res, $args['tag']));
        $app->get('/api/player/{tag}/profile', fn($req, $res, $args) => $self->playerProfile($res, $args['tag']));
        $app->get('/api/player/{tag}/war-history', fn($req, $res, $args) => $self->playerWarHistory($res, $args['tag']));
        $app->get('/api/player/{tag}/raids', fn($req, $res, $args) => $self->playerRaids($req, $res, $args['tag']));
        $app->get('/api/player/{tag}/league-group', fn($req, $res, $args) => $self->playerLeagueGroup($req, $res, $args['tag']));
        $app->get('/api/player/{tag}/performance', fn($req, $res, $args) => $self->playerPerformance($req, $res, $args['tag']));
        $app->get('/share/image/{hash}.png', fn($req, $res, $args) => $self->shareImage($req, $res, $args['hash']));
        $app->get('/', fn($req, $res) => $self->staticFile($res, 'index.html', $req));
        $app->get('/clan.html', fn($req, $res) => $self->staticFile($res, 'index.html', $req));
        $app->get('/{path:.*}', fn($req, $res, $args) => $self->staticFile($res, $args['path'] ?? '', $req));
        return $app;
    }

    private function respond(ResponseInterface $response, mixed $data, int $status = 200): ResponseInterface
    {
        if (is_array($data) && is_string($data['error'] ?? null) && $this->locale === 'en') {
            $data['error'] = self::ENGLISH_ERRORS[$data['error']] ?? $data['error'];
        }
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE));
        return $response->withHeader('Content-Type', 'application/json; charset=utf-8')->withHeader('Content-Language', $this->locale)->withHeader('Vary', 'Accept-Language')->withStatus($status);
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

    private function upstream(string $path, ?int $timeoutMs = null, ?int $retriesOverride = null, ?int $ttlSeconds = null, bool $staleOnFailure = false): array
    {
        $now = time();
        $ttl = $ttlSeconds ?? self::CACHE_TTL;
        if (isset($this->cache[$path]) && $this->cache[$path]['expires'] > $now) return $this->cache[$path]['entry'];
        $cacheFile = 'cache/' . hash('sha256', $path) . '.json';
        $diskCache = $this->readJson($cacheFile, []);
        $staleEntry = isset($diskCache['entry']['data']) ? $diskCache['entry'] : null;
        if (($diskCache['expires'] ?? 0) > $now && isset($diskCache['entry']['data'])) {
            $this->cache[$path] = ['entry' => $diskCache['entry'], 'expires' => $diskCache['expires']];
            return $diskCache['entry'];
        }
        $token = (string)$this->env('COC_API_TOKEN');
        if ($token === '') throw new \RuntimeException('Token API belum diatur.');
        $retries = $retriesOverride ?? max(0, (int)($this->env('COC_API_RETRIES') ?: 1));
        $last = null;
        try { for ($attempt = 0; $attempt <= $retries; $attempt++) {
            try {
                $options = ['headers' => ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json']];
                if ($timeoutMs !== null) $options['timeout'] = $timeoutMs / 1000;
                $response = $this->http->get(self::API_BASE . $path, $options);
                $status = $response->getStatusCode();
                $body = (string)$response->getBody();
                if ($status >= 200 && $status < 300) {
                    $data = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
                    $entry = ['data' => $data, 'lastUpdated' => gmdate('c')];
                    $this->cache[$path] = ['entry' => $entry, 'expires' => $now + $ttl];
                    $this->writeJson($cacheFile, ['entry' => $entry, 'expires' => $now + $ttl]);
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
        } catch (UpstreamFailure $e) {
            if ($staleOnFailure && $staleEntry !== null && ($e->status === 0 || in_array($e->status, [502, 503, 504], true))) {
                $staleEntry['stale'] = true;
                return $staleEntry;
            }
            throw $e;
        }
    }

    private function failure(ResponseInterface $res, \Throwable $e, bool $war = false): ResponseInterface
    {
        if ($e instanceof LocalDataFailure) return $this->respond($res, ['error' => 'Arsip data lokal tidak dapat dibaca. Periksa berkas di folder data/wars.'], 500);
        $status = $e instanceof UpstreamFailure ? ($e->status ?: ($e->getPrevious()?->getMessage() && str_contains(strtolower($e->getPrevious()->getMessage()), 'timed out') ? 504 : 502)) : 502;
        $messages = [
            403 => $war ? 'Data perang tidak tersedia untuk klan ini.' : 'Akses API ditolak. Periksa token dan alamat IP yang didaftarkan.',
            404 => $war ? 'Data perang tidak tersedia untuk klan ini.' : 'Klan tidak ditemukan.',
            429 => 'Batas permintaan API tercapai. Coba lagi sebentar.',
            504 => 'API Clash of Clans tidak merespons tepat waktu. Coba lagi sebentar; jika terus terjadi, periksa koneksi server, token, dan IP yang didaftarkan di developer.clashofclans.com.'
        ];
        $message = $messages[$status] ?? 'Gagal mengambil data dari API Clash of Clans.';
        if ($this->locale === 'en') $message = self::ENGLISH_ERRORS[$message] ?? $message;
        $data = ['error' => $message];
        if ($e instanceof UpstreamFailure) {
            if ($e->apiReason !== null) $data['reason'] = $e->apiReason;
            if ($e->apiMessage !== null) {
                $data['message'] = $e->apiMessage;
                $data['error'] .= ' ' . $e->apiMessage;
            }
        }
        return $this->respond($res, $data, $status);
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

    private function popularClans(ResponseInterface $res): ResponseInterface
    {
        try {
            $rows = [];
            foreach (glob($this->file('snapshots/*.json')) ?: [] as $path) {
                $tag = $this->normalizeTag(pathinfo($path, PATHINFO_FILENAME));
                if (!$tag) continue;
                $snapshots = $this->snapshots($tag);
                if (!$snapshots) continue;

                usort($snapshots, static fn(array $a, array $b): int => strcmp((string)($b['capturedAt'] ?? $b['date'] ?? ''), (string)($a['capturedAt'] ?? $a['date'] ?? '')));
                $latest = $snapshots[0];
                $clan = is_array($latest['clan'] ?? null) ? $latest['clan'] : [];
                $rows[] = [
                    'tag' => '#' . $tag,
                    'name' => $clan['name'] ?? ('#' . $tag),
                    'level' => $clan['level'] ?? null,
                    'points' => $clan['points'] ?? null,
                    'members' => $clan['members'] ?? null,
                    'snapshotCount' => count($snapshots),
                    'lastCapturedAt' => $latest['capturedAt'] ?? null,
                ];
            }
            usort($rows, static fn(array $a, array $b): int => $b['snapshotCount'] <=> $a['snapshotCount']
                ?: strcmp((string)($b['lastCapturedAt'] ?? ''), (string)($a['lastCapturedAt'] ?? ''))
                ?: strcasecmp((string)$a['name'], (string)$b['name']));
            return $this->respond($res, ['items' => array_slice($rows, 0, 3), 'generatedAt' => gmdate('c')]);
        } catch (\Throwable $e) {
            return $this->failure($res, $e);
        }
    }

    private function saveSnapshot(string $tag, array $clan): array
    {
        $snapshots = $this->snapshots($tag);
        $date = gmdate('Y-m-d');
        $members = array_map(static fn($m) => ['tag' => $m['tag'] ?? null, 'name' => $m['name'] ?? null, 'role' => $m['role'] ?? null, 'warPreference' => $m['warPreference'] ?? null, 'expLevel' => $m['expLevel'] ?? null, 'trophies' => $m['trophies'] ?? 0, 'donations' => $m['donations'] ?? 0, 'donationsReceived' => $m['donationsReceived'] ?? 0, 'leagueTier' => isset($m['leagueTier']) ? ['name' => $m['leagueTier']['name'] ?? null] : null], $clan['memberList'] ?? []);
        $snapshot = ['date' => $date, 'capturedAt' => gmdate('c'), 'clan' => ['tag' => '#' . $tag, 'name' => $clan['name'] ?? null, 'level' => $clan['clanLevel'] ?? null, 'points' => $clan['clanPoints'] ?? null, 'members' => $clan['members'] ?? null], 'members' => $members];
        if (is_array($clan['clanCapital'] ?? null)) $snapshot['clanCapital'] = $clan['clanCapital'];
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
            $members[] = ['tag' => $tagKey, 'name' => $member['name'] ?? '', 'role' => $member['role'] ?? null, 'warPreference' => $member['warPreference'] ?? null, 'leagueTier' => $member['leagueTier'] ?? null, 'trophies' => $member['trophies'] ?? 0, 'donations' => $member['donations'] ?? 0, 'donationsReceived' => $received, 'donationRatio' => $received === 0 ? null : round(($member['donations'] ?? 0) / $received, 2), 'trophyDelta7' => $delta7, 'trophyDelta30' => $delta30, 'flags' => $flags, 'status' => $flags ? 'review' : 'stable'];
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
        $tag = $this->normalizeTag($rawTag); if (!$tag) { $res->getBody()->write($this->locale === 'en' ? 'Invalid clan tag.' : 'Tag klan tidak valid.'); return $res->withStatus(400)->withHeader('Content-Type', 'text/plain; charset=utf-8')->withHeader('Content-Language', $this->locale)->withHeader('Vary', 'Accept-Language'); }
        try {
            $report = $this->healthReport($tag, $this->snapshots($tag));
            $rows = [$this->locale === 'en'
                ? ['Name','Tag','Role','Trophies','Delta 7d','Delta 30d','Donated','Received','Donation Ratio','Status','Flags']
                : ['Nama','Tag','Peran','Trofi','Delta 7h','Delta 30h','Donasi','Diterima','Rasio Donasi','Status','Catatan']];
            foreach ($report['members'] as $m) $rows[] = [$m['name'],$m['tag'],$m['role'],$m['trophies'],$m['trophyDelta7'],$m['trophyDelta30'],$m['donations'],$m['donationsReceived'],$m['donationRatio'],$this->locale === 'en' ? $m['status'] : ($m['status'] === 'review' ? 'perlu ditinjau' : 'stabil'),implode('; ', $this->locale === 'en' ? array_map(static fn($flag) => match ($flag) {
                'Donasi nol' => 'No donations',
                'Trofi 7 hari tidak berubah' => 'Trophies unchanged for 7 days',
                'Donasi 7 hari tidak berubah' => 'Donations unchanged for 7 days',
                default => $flag,
            }, $m['flags']) : $m['flags'])];
            $csv = implode("\n", array_map(static fn($row) => implode(',', array_map(static function($value) { $value = (string)($value ?? ''); return preg_match('/[",\n]/', $value) ? '"' . str_replace('"', '""', $value) . '"' : $value; }, $row)), $rows));
            $res->getBody()->write($csv);
            return $res->withHeader('Content-Type', 'text/csv; charset=utf-8')->withHeader('Content-Language', $this->locale)->withHeader('Vary', 'Accept-Language')->withHeader('Content-Disposition', 'attachment; filename="clan-health-' . $tag . '-' . gmdate('Y-m-d') . '.csv"');
        } catch (\Throwable) { $res->getBody()->write($this->locale === 'en' ? 'Could not create the CSV report.' : 'Gagal membuat laporan CSV.'); return $res->withStatus(500)->withHeader('Content-Type', 'text/plain; charset=utf-8')->withHeader('Content-Language', $this->locale)->withHeader('Vary', 'Accept-Language'); }
    }

    private function staticFile(ResponseInterface $res, string $requested, ?ServerRequestInterface $req = null): ResponseInterface
    {
        $safe = str_replace('\\', '/', rawurldecode($requested));
        if ($safe === '' || str_contains($safe, '..') || str_starts_with($safe, '/')) return $res->withStatus(404);
        $path = realpath(__DIR__ . '/../public/' . $safe);
        $root = realpath(__DIR__ . '/../public');
        if (!$path || !$root || !str_starts_with($path, $root . DIRECTORY_SEPARATOR) || !is_file($path)) return $res->withStatus(404);
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $content = (string)file_get_contents($path);
        $mime = match ($extension) {
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
        if ($extension === 'html') {
            if ($req && in_array($req->getUri()->getPath(), ['/', '/index.html', '/clan.html', '/player.html', '/compare.html', '/compare-clan.html'], true)) {
                try {
                    $share = $this->shareService($req);
                    $context = $share->context($req->getUri()->getPath(), $req->getQueryParams());
                    $content = $share->html($content, $share->metadata($context));
                    $content = preg_replace('/<html lang="[^"]*"/', '<html lang="' . $this->locale . '"', $content, 1);
                } catch (\Throwable $error) {
                    error_log('Share preview unavailable: ' . get_class($error));
                }
            }
            $content = $this->versionHtmlAssets($content, $root);
        }
        if (str_starts_with($safe, 'assets/images/optimized/') && $extension === 'webp') {
            $etag = '"' . hash('sha256', $content) . '"';
            $res = $res->withHeader('Cache-Control', 'public, max-age=86400')->withHeader('ETag', $etag)
                ->withHeader('Last-Modified', gmdate('D, d M Y H:i:s', filemtime($path)) . ' GMT');
            if ($req?->getHeaderLine('If-None-Match') === $etag) return $res->withStatus(304);
        }
        $res->getBody()->write($content);
        $response = $res->withHeader('Content-Type', $mime)->withHeader('X-Content-Type-Options', 'nosniff');
        if ($extension === 'html') {
            return $response->withHeader('Cache-Control', 'no-cache, must-revalidate')->withHeader('Content-Language', $this->locale)->withHeader('Vary', 'Accept-Language');
        }
        if (in_array($extension, ['css', 'js'], true)) {
            $etag = '"' . hash('sha256', $content) . '"';
            return $response->withHeader('Cache-Control', 'public, max-age=31536000, immutable')
                ->withHeader('ETag', $etag)
                ->withHeader('Last-Modified', gmdate('D, d M Y H:i:s', filemtime($path)) . ' GMT');
        }
        return $response;
    }

    private function shareService(ServerRequestInterface $req): SharePreview
    {
        $configured = (string)($this->env('APP_URL') ?: '');
        $parts = $configured !== '' ? parse_url($configured) : false;
        if ($parts && in_array($parts['scheme'] ?? '', ['https', 'http'], true) && !empty($parts['host']) && !isset($parts['user']) && !isset($parts['query']) && !isset($parts['fragment'])) {
            $base = rtrim($configured, '/');
        } else {
            $uri = $req->getUri();
            $scheme = $uri->getScheme() === 'https' ? 'https' : 'http';
            $host = $uri->getHost() ?: 'localhost';
            $base = $scheme . '://' . $host . ($uri->getPort() ? ':' . $uri->getPort() : '');
        }
        return new SharePreview($this->file('share'), fn(string $path, int $timeout) => $this->upstream($path, $timeout, 0, null, true), $base, $this->locale);
    }

    private function shareImage(ServerRequestInterface $req, ResponseInterface $res, string $hash): ResponseInterface
    {
        try {
            $bytes = $this->shareService($req)->image($hash);
            if ($bytes === null) return $res->withStatus(404);
            $etag = '"' . hash('sha256', $bytes) . '"';
            if ($req->getHeaderLine('If-None-Match') === $etag) return $res->withStatus(304)->withHeader('ETag', $etag)->withHeader('Cache-Control', 'public, max-age=31536000, immutable');
            $res->getBody()->write($bytes);
            return $res->withHeader('Content-Type', 'image/png')->withHeader('X-Content-Type-Options', 'nosniff')
                ->withHeader('Cache-Control', 'public, max-age=31536000, immutable')->withHeader('ETag', $etag);
        } catch (\Throwable $error) {
            error_log('Share image unavailable: ' . get_class($error));
            return $res->withStatus(503)->withHeader('Cache-Control', 'no-store');
        }
    }

    private function versionHtmlAssets(string $html, string $publicRoot): string
    {
        return preg_replace_callback("~\\b(src|href)(\\s*=\\s*)([\"'])(.*?)\\3~i", function (array $match) use ($publicRoot): string {
            $url = $match[4];
            if (preg_match('/^(?:[a-z][a-z0-9+.-]*:|\\/\\/|#)/i', $url)) return $match[0];
            $parts = parse_url($url);
            $assetPath = $parts['path'] ?? '';
            $extension = strtolower(pathinfo($assetPath, PATHINFO_EXTENSION));
            if (!in_array($extension, ['css', 'js'], true)) return $match[0];
            $relativePath = ltrim(rawurldecode($assetPath), '/');
            if ($relativePath === '' || str_contains($relativePath, '..')) return $match[0];
            $file = realpath($publicRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath));
            if (!$file || !str_starts_with($file, $publicRoot . DIRECTORY_SEPARATOR) || !is_file($file)) return $match[0];
            $version = substr(hash_file('sha256', $file), 0, 16);
            $query = $parts['query'] ?? '';
            $query = preg_replace('/(?:^|&)v=[^&]*/', '', $query);
            $query = trim($query, '&');
            $query .= ($query === '' ? '' : '&') . 'v=' . $version;
            $newUrl = $assetPath . '?' . $query . (isset($parts['fragment']) ? '#' . $parts['fragment'] : '');
            return $match[1] . $match[2] . $match[3] . $newUrl . $match[3];
        }, $html) ?? $html;
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
        if ($section === 'heroEquipment' && isset(self::EQUIPMENT[$name]['iconUrl'])) array_splice($urls, $local === null ? 0 : 1, 0, [self::EQUIPMENT[$name]['iconUrl']]);
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
        $equipmentHero = self::EQUIPMENT[$item['name'] ?? '']['hero'] ?? null;
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
        $progress=$this->progress($p);
        $army=['heroes'=>[],'heroEquipment'=>[],'pets'=>[],'troops'=>[],'superTroops'=>[],'builderBase'=>[],'spells'=>[]];
        foreach($p['heroes']??[] as $i)$army[($i['village']??'')==='builderBase'?'builderBase':'heroes'][]=$this->playerItem($i);
        foreach($p['heroEquipment']??[] as $i)$army['heroEquipment'][]=$this->playerItem($i);
        foreach($p['heroPets']??$p['pets']??[] as $i)$army['pets'][]=$this->playerItem($i);
        $seen=array_column($army['pets'],'name');
        foreach($p['troops']??[] as $i){$item=$this->playerItem($i);if(($i['village']??'')==='builderBase')$army['builderBase'][]=$item;elseif(in_array($i['name']??'',self::PETS,true)){if(!in_array($item['name'],$seen,true))$army['pets'][]=$item;$seen[]=$item['name'];}elseif(in_array($i['name']??'',self::SUPER_TROOPS,true))$army['superTroops'][]=$item;else $army['troops'][]=$item;}
        foreach($p['spells']??[] as $i)$army[($i['village']??'')==='builderBase'?'builderBase':'spells'][]=$this->playerItem($i);
        $progressSections=['heroes'=>'heroes','pets'=>'pets','troops'=>'troops','spells'=>'spells'];
        foreach($progressSections as $section=>$category){
            $limits=[];
            foreach($progress['score']['categories'][$category]['items']??[] as $scoredItem)$limits[$scoredItem['name']]=(int)$scoredItem['maxLevel'];
            foreach($army[$section] as &$item)if(isset($limits[$item['name']])){
                $item['progressMaxLevel']=$limits[$item['name']];
                $item['progressMaxSource']='TH '.($p['townHallLevel']??'—');
            }
            unset($item);
        }
        $builderLimits=[];
        foreach($progress['score']['builderBase']['items']??[] as $scoredItem)$builderLimits[$scoredItem['name']]=(int)$scoredItem['maxLevel'];
        foreach($army['builderBase'] as &$item)if(isset($builderLimits[$item['name']])){
            $item['progressMaxLevel']=$builderLimits[$item['name']];
            $item['progressMaxSource']='BH '.($p['builderHallLevel']??'—');
        }
        unset($item);
        foreach($army as $section=>&$items)foreach($items as &$item)$item['iconUrls']=$this->iconCandidates($item['name'],$section);unset($items,$item);
        $fields=['tag','name','townHallLevel','builderHallLevel','expLevel','trophies','bestTrophies','builderBaseTrophies','warStars','donations','donationsReceived','role','warPreference'];$player=[];foreach($fields as $f)$player[$f]=$p[$f]??null;
        $player['league']=isset($p['league'])?['name'=>$p['league']['name']??null,'iconUrls'=>$p['league']['iconUrls']??null]:null;
        $player['leagueTier']=isset($p['leagueTier'])?['id'=>$p['leagueTier']['id']??null,'name'=>$p['leagueTier']['name']??null]:null;
        $player['leagueSessions']=$this->leagueSessions($p);
        $player['clan']=isset($p['clan'])?['tag'=>$p['clan']['tag']??null,'name'=>$p['clan']['name']??null,'badgeUrls'=>$p['clan']['badgeUrls']??null]:null;
        return ['player'=>$player,'army'=>$army,'progress'=>$progress,'achievements'=>is_array($p['achievements']??null)?$p['achievements']:null,'lastUpdated'=>$updated];
    }

    private function clan(ResponseInterface $res,string $raw):ResponseInterface{$tag=$this->normalizeTag($raw);if(!$tag)return $this->tagError($res,'Tag klan tidak valid.');try{$e=$this->upstream('/clans/'.rawurlencode('#'.$tag));$capitalProgress=ClanCapitalReport::progress($e['data']['clanCapital']??[],$this->snapshots($tag),gmdate('Y-m-d'));$snapshot=$this->saveSnapshot($tag,$e['data']);$data=$e['data'];$data['capitalProgress']=$capitalProgress;$data['snapshotDate']=$snapshot['date'];return $this->respond($res,$data);}catch(\Throwable $e){return $this->failure($res,$e);}}

    private function warPreference(ResponseInterface $res, string $raw): ResponseInterface
    {
        $tag = $this->normalizeTag($raw);
        if (!$tag) return $this->tagError($res, 'Tag pemain tidak valid.');
        try {
            $entry = $this->upstream('/players/' . rawurlencode('#' . $tag));
            $preference = $entry['data']['warPreference'] ?? null;
            return $this->respond($res, ['tag' => '#' . $tag, 'warPreference' => in_array($preference, ['in', 'out'], true) ? $preference : null, 'lastUpdated' => $entry['lastUpdated']]);
        } catch (\Throwable $e) {
            return $this->failure($res, $e);
        }
    }

    private function clanWarLog(ServerRequestInterface $req, ResponseInterface $res, string $raw): ResponseInterface
    {
        $tag = $this->normalizeTag($raw);
        if (!$tag) return $this->tagError($res, 'Tag klan tidak valid.');
        $query = $req->getQueryParams();
        $limit = $query['limit'] ?? '10';
        if (!is_string($limit) || !ctype_digit($limit) || (int)$limit < 1 || (int)$limit > 50) {
            return $this->tagError($res, 'Parameter riwayat perang tidak valid.');
        }
        if (isset($query['after'], $query['before'])) return $this->tagError($res, 'Gunakan hanya salah satu cursor after atau before.');
        $params = ['limit' => (int)$limit];
        foreach (['after', 'before'] as $key) {
            if (!isset($query[$key])) continue;
            $cursor = $query[$key];
            if (!is_string($cursor) || !preg_match('/^[^\x00-\x1F\x7F]{1,512}$/', $cursor)) {
                return $this->tagError($res, 'Parameter riwayat perang tidak valid.');
            }
            $params[$key] = $cursor;
        }
        try {
            $entry = $this->upstream('/clans/' . rawurlencode('#' . $tag) . '/warlog?' . http_build_query($params, '', '&', PHP_QUERY_RFC3986));
            return $this->respond($res, [
                'items' => $entry['data']['items'] ?? [],
                'paging' => $entry['data']['paging'] ?? null,
                'lastUpdated' => $entry['lastUpdated']
            ]);
        } catch (\Throwable $e) {
            return $this->failure($res, $e);
        }
    }

    private function clanLabels(ResponseInterface $res): ResponseInterface
    {
        try {
            $entry = $this->upstream('/labels/clans?limit=100', null, null, 86400);
            return $this->respond($res, ['items' => $entry['data']['items'] ?? [], 'lastUpdated' => $entry['lastUpdated']]);
        } catch (\Throwable $e) {
            return $this->failure($res, $e);
        }
    }

    private function searchClans(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $query = $req->getQueryParams();
        $name = $query['name'] ?? '';
        if (!is_string($name)) return $this->tagError($res, 'Nama klan harus berisi 3 sampai 80 karakter.');
        $name = trim($name);
        if (!preg_match('/^.{3,80}$/us', $name) || preg_match('/[\x00-\x1F\x7F]/', $name)) {
            return $this->tagError($res, 'Nama klan harus berisi 3 sampai 80 karakter.');
        }

        $params = ['name' => $name];
        foreach (['minMembers' => [1, 50], 'maxMembers' => [1, 50], 'minClanPoints' => [0, 1000000], 'minClanLevel' => [1, 1000]] as $field => [$min, $max]) {
            if (!isset($query[$field]) || $query[$field] === '') continue;
            $value = $query[$field];
            if (!is_string($value) || !ctype_digit($value) || (int)$value < $min || (int)$value > $max) {
                return $this->tagError($res, 'Filter pencarian klan tidak valid.');
            }
            $params[$field] = (int)$value;
        }
        if (isset($params['minMembers'], $params['maxMembers']) && $params['minMembers'] > $params['maxMembers']) {
            return $this->tagError($res, 'Jumlah anggota minimal tidak boleh melebihi maksimal.');
        }
        if (isset($query['warFrequency']) && $query['warFrequency'] !== '') {
            if (!is_string($query['warFrequency']) || !in_array($query['warFrequency'], ['always', 'moreThanOncePerWeek', 'oncePerWeek', 'lessThanOncePerWeek', 'never'], true)) {
                return $this->tagError($res, 'Filter pencarian klan tidak valid.');
            }
            $params['warFrequency'] = $query['warFrequency'];
        }
        if (isset($query['locationId']) && $query['locationId'] !== '') {
            if (!is_string($query['locationId']) || !preg_match('/^[0-9]{1,12}$/', $query['locationId'])) return $this->tagError($res, 'Filter pencarian klan tidak valid.');
            $params['locationId'] = $query['locationId'];
        }
        if (isset($query['labelIds']) && $query['labelIds'] !== '') {
            if (!is_string($query['labelIds']) || !preg_match('/^[0-9]{1,12}(?:,[0-9]{1,12}){0,2}$/', $query['labelIds'])) return $this->tagError($res, 'Filter pencarian klan tidak valid.');
            $params['labelIds'] = $query['labelIds'];
        }
        $limit = $query['limit'] ?? '20';
        if (!is_string($limit) || !ctype_digit($limit) || (int)$limit < 1 || (int)$limit > 50) return $this->tagError($res, 'Filter pencarian klan tidak valid.');
        $params['limit'] = (int)$limit;
        if (isset($query['after'], $query['before'])) return $this->tagError($res, 'Gunakan hanya salah satu cursor after atau before.');
        foreach (['after', 'before'] as $cursorKey) {
            if (!isset($query[$cursorKey])) continue;
            $cursor = $query[$cursorKey];
            if (!is_string($cursor) || !preg_match('/^[^\x00-\x1F\x7F]{1,512}$/', $cursor)) return $this->tagError($res, 'Filter pencarian klan tidak valid.');
            $params[$cursorKey] = $cursor;
        }
        try {
            $entry = $this->upstream('/clans?' . http_build_query($params, '', '&', PHP_QUERY_RFC3986));
            return $this->respond($res, [
                'items' => $entry['data']['items'] ?? [],
                'paging' => $entry['data']['paging'] ?? null,
                'lastUpdated' => $entry['lastUpdated']
            ]);
        } catch (\Throwable $e) {
            return $this->failure($res, $e);
        }
    }

    private function clanSummary(ResponseInterface $res, string $raw): ResponseInterface
    {
        $tag = $this->normalizeTag($raw);
        if (!$tag) return $this->tagError($res, 'Tag klan tidak valid.');
        try {
            $entry = $this->upstream('/clans/' . rawurlencode('#' . $tag));
            $clan = $entry['data'];
            return $this->respond($res, [
                'tag' => $clan['tag'] ?? '#' . $tag,
                'name' => $clan['name'] ?? null,
                'location' => $clan['location'] ?? null,
                'lastUpdated' => $entry['lastUpdated']
            ]);
        } catch (\Throwable $e) {
            return $this->failure($res, $e);
        }
    }

    private function raidParams(array $query): ?array
    {
        $limit = $query['limit'] ?? '10';
        if (!is_string($limit) || !ctype_digit($limit) || (int)$limit < 1 || (int)$limit > 50) return null;
        if (isset($query['after'], $query['before'])) return null;
        $params = ['limit' => (int)$limit];
        foreach (['after', 'before'] as $key) {
            if (!isset($query[$key])) continue;
            if (!is_string($query[$key]) || !preg_match('/^[^\x00-\x1F\x7F]{1,512}$/', $query[$key])) return null;
            $params[$key] = $query[$key];
        }
        return $params;
    }

    private function raidPage(string $tag, array $params, ?string $clanName = null): array
    {
        $archivePath = 'raids/' . $tag . '.json';
        $saved = $this->readJson($archivePath, []);
        $archived = $saved['items'] ?? [];
        $clanName ??= $saved['clanName'] ?? null;
        if (!$clanName) {
            $snapshots = $this->snapshots($tag);
            $clanName = $snapshots ? ($snapshots[array_key_last($snapshots)]['clan']['name'] ?? null) : null;
        }
        try {
            $entry = $this->upstream('/clans/' . rawurlencode('#' . $tag) . '/capitalraidseasons?' . http_build_query($params, '', '&', PHP_QUERY_RFC3986), null, null, self::CACHE_TTL, true);
        } catch (UpstreamFailure $e) {
            if (!$archived || ($e->status !== 0 && !in_array($e->status, [502, 503, 504], true))) throw $e;
            return ['clanTag' => '#' . $tag, 'items' => array_slice($archived, 0, $params['limit']),
                'paging' => null, 'lastUpdated' => $archived[0]['lastUpdated'] ?? null,
                'stale' => true, 'refreshError' => $e->apiMessage];
        }
        $items = [];
        foreach ($entry['data']['items'] ?? [] as $raw) {
            if (!is_array($raw) || !preg_match('/^\d{8}T\d{6}\.\d{3}Z$/', (string)($raw['startTime'] ?? ''))) continue;
            $items[] = RaidReport::season($raw, '#' . $tag, $clanName, $entry['lastUpdated']);
        }
        if (!($entry['stale'] ?? false) && $items) {
            $byId = [];
            foreach (array_merge($archived, $items) as $item) {
                $previous = $byId[$item['id']] ?? null;
                if ($previous && strcmp((string)$previous['lastUpdated'], (string)$item['lastUpdated']) > 0) continue;
                if ($previous && $previous['membersAvailable'] && !$item['membersAvailable']) continue;
                $byId[$item['id']] = $item;
            }
            $all = array_values($byId);
            usort($all, static fn($a, $b) => strcmp($b['startTime'], $a['startTime']));
            $this->writeJson($archivePath, ['clanTag' => '#' . $tag, 'clanName' => $clanName, 'items' => array_slice($all, 0, 104)], true);
        }
        return ['clanTag' => '#' . $tag, 'items' => $items, 'paging' => $entry['data']['paging'] ?? null,
            'lastUpdated' => $entry['lastUpdated'], 'stale' => $entry['stale'] ?? false];
    }

    private function clanRaids(ServerRequestInterface $req, ResponseInterface $res, string $raw): ResponseInterface
    {
        $tag = $this->normalizeTag($raw);
        if (!$tag) return $this->tagError($res, 'Tag klan tidak valid.');
        $params = $this->raidParams($req->getQueryParams());
        if ($params === null) return $this->tagError($res, 'Parameter Raid Weekend tidak valid.');
        try { return $this->respond($res, $this->raidPage($tag, $params)); }
        catch (\Throwable $e) { return $this->failure($res, $e); }
    }

    private function playerRaids(ServerRequestInterface $req, ResponseInterface $res, string $raw): ResponseInterface
    {
        $tag = $this->normalizeTag($raw);
        if (!$tag) return $this->tagError($res, 'Tag pemain tidak valid.');
        $query = $req->getQueryParams();
        $params = $this->raidParams($query);
        if ($params === null) return $this->tagError($res, 'Parameter Raid Weekend tidak valid.');
        $clan = isset($query['clan']) && is_string($query['clan']) ? $this->normalizeTag($query['clan']) : null;
        if (isset($query['clan']) && !$clan) return $this->tagError($res, 'Tag klan tidak valid.');
        $page = null; $refreshFailure = null;
        try {
            try {
                $name = null;
                if (!$clan) {
                    $profile = $this->upstream('/players/' . rawurlencode('#' . $tag));
                    $clan = $this->normalizeTag($profile['data']['clan']['tag'] ?? '');
                    $name = $profile['data']['clan']['name'] ?? null;
                }
                if ($clan) $page = $this->raidPage($clan, $params, $name);
            } catch (UpstreamFailure $e) {
                if ($e->status !== 0 && !in_array($e->status, [502, 503, 504], true)) throw $e;
                $refreshFailure = $e;
            }
            $seasons = [];
            foreach (glob($this->file('raids/*.json')) ?: [] as $path) {
                $archiveClan = $this->normalizeTag(pathinfo($path, PATHINFO_FILENAME));
                if (!$archiveClan) continue;
                foreach ($this->readJson('raids/' . $archiveClan . '.json', [])['items'] ?? [] as $item) $seasons[$item['id']] = $item;
            }
            $olderMemberData = false;
            foreach ($page['items'] ?? [] as $item) {
                $previous = $seasons[$item['id']] ?? null;
                if ($previous && $previous['membersAvailable'] && !$item['membersAvailable']) { $olderMemberData = true; continue; }
                if ($previous && strcmp((string)$previous['lastUpdated'], (string)$item['lastUpdated']) > 0) continue;
                $seasons[$item['id']] = $item;
            }
            $report = RaidReport::player(array_values($seasons), '#' . $tag);
            if ($refreshFailure && !$report['items']) throw $refreshFailure;
            return $this->respond($res, array_merge($report, [
                'playerTag' => '#' . $tag, 'contextClanTag' => $clan ? '#' . $clan : null,
                'paging' => $page['paging'] ?? null, 'stale' => $refreshFailure !== null || $olderMemberData || ($page['stale'] ?? false),
                'refreshError' => $refreshFailure?->apiMessage ?? ($page['refreshError'] ?? null),
                'lastUpdated' => $page['lastUpdated'] ?? ($report['items'][0]['lastUpdated'] ?? null)
            ]));
        } catch (\Throwable $e) { return $this->failure($res, $e); }
    }

    private function rankingLocations(ResponseInterface $res): ResponseInterface
    {
        try {
            $items = [];
            $cursor = null;
            $lastUpdated = gmdate('c');
            $seenCursors = [];
            for ($page = 0; $page < 20; $page++) {
                $path = '/locations?limit=100' . ($cursor ? '&after=' . rawurlencode($cursor) : '');
                $entry = $this->upstream($path);
                if ($page === 0) $lastUpdated = $entry['lastUpdated'];
                foreach ($entry['data']['items'] ?? [] as $location) {
                    if (isset($location['id'])) $items[(string)$location['id']] = $location;
                }
                $next = $entry['data']['paging']['cursors']['after'] ?? null;
                if (!is_string($next) || $next === '' || isset($seenCursors[$next])) break;
                $seenCursors[$next] = true;
                $cursor = $next;
            }
            return $this->respond($res, ['items' => array_values($items), 'paging' => null, 'lastUpdated' => $lastUpdated]);
        } catch (\Throwable $e) {
            return $this->failure($res, $e);
        }
    }

    private function rankings(ServerRequestInterface $req, ResponseInterface $res, string $type): ResponseInterface
    {
        if (!in_array($type, ['players', 'clans', 'players-builder-base', 'clans-builder-base', 'capitals'], true)) return $this->tagError($res, 'Jenis ranking tidak valid.');
        $query = $req->getQueryParams();
        $location = $query['location'] ?? 'global';
        if (!is_string($location) || !preg_match('/^(?:global|[A-Za-z0-9_-]{1,32})$/', $location)) {
            return $this->tagError($res, 'Lokasi ranking tidak valid.');
        }
        $limitInput = $query['limit'] ?? '25';
        if (!is_string($limitInput) || !ctype_digit($limitInput)) return $this->tagError($res, 'Jumlah ranking tidak valid.');
        $limit = min(50, max(1, (int)$limitInput));
        $endpoint = '/locations/' . rawurlencode($location) . '/rankings/' . $type . '?limit=' . $limit;
        try {
            $entry = $this->upstream($endpoint);
            return $this->respond($res, [
                'type' => $type,
                'location' => $location,
                'items' => $entry['data']['items'] ?? [],
                'paging' => $entry['data']['paging'] ?? null,
                'lastUpdated' => $entry['lastUpdated']
            ]);
        } catch (\Throwable $e) {
            return $this->failure($res, $e);
        }
    }

    private function playerProgress(ResponseInterface $res,string $raw):ResponseInterface{$path=$this->playerPath($raw);if(!$path)return $this->tagError($res,'Tag pemain tidak valid.');try{$e=$this->upstream($path);$data=$this->progress($e['data']);$data['lastUpdated']=$e['lastUpdated'];return $this->respond($res,$data);}catch(\Throwable $e){return $this->failure($res,$e);}}
    private function playerProfile(ResponseInterface $res,string $raw):ResponseInterface{$path=$this->playerPath($raw);if(!$path)return $this->tagError($res,'Tag pemain tidak valid.');try{$e=$this->upstream($path);return $this->respond($res,$this->profile($e['data'],$e['lastUpdated']));}catch(\Throwable $e){return $this->failure($res,$e);}}

    private function leagueSessions(array $player): array
    {
        $sessions = [];
        foreach (['current' => 'Saat ini', 'previous' => 'Sesi terakhir'] as $key => $label) {
            $group = $player[$key . 'LeagueGroupTag'] ?? null;
            $season = $player[$key . 'LeagueSeasonId'] ?? null;
            if (!is_string($group) || $group === '#0' || $this->normalizeTag($group) === null || !is_numeric($season) || (int)$season <= 0) continue;
            $sessions[] = ['id' => $key, 'label' => $label, 'groupTag' => $group, 'seasonId' => (int)$season];
        }
        return $sessions;
    }

    private function rankedRule(?string $tier): ?array
    {
        if ($tier === null || trim($tier) === '') return null;
        if (isset(self::RANKED_RULES[$tier])) return self::RANKED_RULES[$tier];

        $normalize = static function (string $name): string {
            $withoutLeague = preg_replace('/\bleague\b/i', ' ', trim($name)) ?? $name;
            return strtoupper(preg_replace('/[^a-z0-9]+/i', '', $withoutLeague) ?? '');
        };
        $normalizedTier = $normalize($tier);
        foreach (self::RANKED_RULES as $name => $rule) {
            if ($normalize($name) === $normalizedTier) return $rule;
        }
        return null;
    }

    private function rankedLeagueStatistics(array $session, array $members, bool $previous): array
    {
        $cachePath = 'ranked-stats/' . hash('sha256', (string)$session['groupTag'] . ':' . (string)$session['seasonId']) . '.json';
        $cached = $this->readJson($cachePath, []);
        if (($cached['expires'] ?? 0) > time() && is_array($cached['data'] ?? null)) return $cached['data'];

        $token = (string)$this->env('COC_API_TOKEN');
        if ($token === '') throw new \RuntimeException('Token API belum diatur.');
        $memberMap = [];
        foreach ($members as $member) {
            $tag = $this->normalizeTag($member['playerTag'] ?? '');
            if ($tag) $memberMap[$tag] = $member;
        }
        $rows = [];
        $requests = function () use ($memberMap, $session, $token): \Generator {
            foreach ($memberMap as $tag => $_member) {
                $path = '/leaguegroup/' . rawurlencode((string)$session['groupTag']) . '/' . (int)$session['seasonId'] . '?playerTag=' . rawurlencode('#' . $tag);
                yield $tag => new GuzzleRequest('GET', self::API_BASE . $path, ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json']);
            }
        };
        $pool = new Pool($this->http, $requests(), [
            'concurrency' => 10,
            'fulfilled' => function (ResponseInterface $response, string $tag) use (&$rows, $memberMap): void {
                if ($response->getStatusCode() !== 200) return;
                try { $data = json_decode((string)$response->getBody(), true, 512, JSON_THROW_ON_ERROR); }
                catch (\JsonException) { return; }
                $attackLogs = is_array($data['attackLogs'] ?? null) ? $data['attackLogs'] : [];
                $defenseLogs = is_array($data['defenseLogs'] ?? null) ? $data['defenseLogs'] : [];
                $points = static fn(array $logs): int => array_sum(array_map(static fn(array $log): int => is_numeric($log['trophies'] ?? $log['leagueTrophies'] ?? $log['trophyChange'] ?? null) ? (int)($log['trophies'] ?? $log['leagueTrophies'] ?? $log['trophyChange']) : 0, $logs));
                $member = $memberMap[$tag];
                $rows[] = [
                    'tag' => '#' . $tag,
                    'name' => $member['playerName'] ?? ('#' . $tag),
                    'clanTag' => $member['clanTag'] ?? null,
                    'clanName' => $member['clanName'] ?? null,
                    'trophies' => $member['leagueTrophies'] ?? null,
                    'attackPoints' => $points($attackLogs),
                    'attackTriples' => count(array_filter($attackLogs, static fn(array $log): bool => is_numeric($log['stars'] ?? null) && (int)$log['stars'] === 3)),
                    'attackCount' => count($attackLogs),
                    'defensePoints' => $points($defenseLogs),
                    'defenseStops' => count(array_filter($defenseLogs, static fn(array $log): bool => is_numeric($log['stars'] ?? null) && (int)$log['stars'] < 3)),
                    'defenseCount' => count($defenseLogs)
                ];
            },
            'rejected' => static function (): void {}
        ]);
        $pool->promise()->wait();
        $data = ['members' => $rows, 'coverage' => count($rows), 'totalMembers' => count($memberMap), 'generatedAt' => gmdate('c')];
        $ttl = $previous ? 30 * 86400 : 600;
        $this->writeJson($cachePath, ['expires' => time() + $ttl, 'data' => $data], true);
        return $data;
    }

    private function playerLeagueGroup(ServerRequestInterface $req, ResponseInterface $res, string $raw): ResponseInterface
    {
        $tag = $this->normalizeTag($raw);
        if (!$tag) return $this->tagError($res, 'Tag pemain tidak valid.');
        $sessionId = $req->getQueryParams()['session'] ?? 'current';
        if (!in_array($sessionId, ['current', 'previous'], true)) return $this->tagError($res, 'Sesi liga tidak valid.');
        try {
            $profile = $this->upstream('/players/' . rawurlencode('#' . $tag), 6000, 0);
            $sessions = $this->leagueSessions($profile['data']);
            $session = null;
            foreach ($sessions as $candidate) if ($candidate['id'] === $sessionId) { $session = $candidate; break; }
            if ($session === null) return $this->respond($res, ['error' => 'Pemain tidak memiliki grup pada sesi liga ini.'], 404);
            $hasCurrentSession = (bool)array_filter($sessions, static fn(array $candidate): bool => $candidate['id'] === 'current');
            $leagueTierName = ($sessionId === 'current' || !$hasCurrentSession) ? ($profile['data']['leagueTier']['name'] ?? null) : null;
            $rankedRule = $this->rankedRule($leagueTierName);
            $path = '/leaguegroup/' . rawurlencode($session['groupTag']) . '/' . $session['seasonId'] . '?playerTag=' . rawurlencode('#' . $tag);
            $previous = $sessionId === 'previous';
            $group = $this->upstream($path, 18000, 0, $previous ? 30 * 86400 : null, $previous);
            if (($req->getQueryParams()['detail'] ?? null) === 'statistics') {
                $statistics = $this->rankedLeagueStatistics($session, $group['data']['members'] ?? [], $previous);
                return $this->respond($res, ['playerTag' => '#' . $tag, 'session' => $session] + $statistics);
            }
            if (($req->getQueryParams()['detail'] ?? null) === 'battle') {
                $memberTag = $this->normalizeTag((string)($req->getQueryParams()['memberTag'] ?? ''));
                if (!$memberTag) return $this->tagError($res, 'Tag anggota tidak valid.');
                $battleMember = null;
                foreach ($group['data']['members'] ?? [] as $member) {
                    if (strtoupper((string)($member['playerTag'] ?? '')) === '#' . $memberTag) { $battleMember = $member; break; }
                }
                if (!$battleMember) return $this->respond($res, ['error' => 'Pemain tidak ada dalam grup liga ini.'], 404);
                if ($memberTag !== $tag) {
                    $detailPath = '/leaguegroup/' . rawurlencode($session['groupTag']) . '/' . $session['seasonId'] . '?playerTag=' . rawurlencode('#' . $memberTag);
                    $group = $this->upstream($detailPath, 18000, 0, $previous ? 30 * 86400 : null, $previous);
                }
                $averages = [];
                foreach (['attack' => 'attackLogs', 'defense' => 'defenseLogs'] as $side => $key) {
                    $logs = is_array($group['data'][$key] ?? null) ? array_values(array_filter($group['data'][$key], 'is_array')) : [];
                    $stars = array_values(array_filter($logs, static fn($log) => is_numeric($log['stars'] ?? null)));
                    $destruction = array_values(array_filter($logs, static fn($log) => is_numeric($log['destructionPercentage'] ?? null)));
                    $averages[$side] = [
                        'sampleSize' => count($logs),
                        'starsAverage' => $stars ? round(array_sum(array_column($stars, 'stars')) / count($stars), 2) : null,
                        'destructionAverage' => $destruction ? round(array_sum(array_column($destruction, 'destructionPercentage')) / count($destruction), 2) : null,
                        'logs' => array_map(static fn(array $log): array => [
                            'stars' => is_numeric($log['stars'] ?? null) ? (int)$log['stars'] : null,
                            'destructionPercentage' => is_numeric($log['destructionPercentage'] ?? null) ? round((float)$log['destructionPercentage'], 2) : null,
                            'trophies' => is_numeric($log['trophies'] ?? $log['leagueTrophies'] ?? $log['trophyChange'] ?? null)
                                ? (int)($log['trophies'] ?? $log['leagueTrophies'] ?? $log['trophyChange']) : null,
                            'timestamp' => $log['timestamp'] ?? $log['creationTime'] ?? $log['battleTime'] ?? $log['attackTime'] ?? null,
                            'opponentName' => $log['opponentName'] ?? ($log['opponent']['name'] ?? null),
                            'opponentTag' => $log['opponentTag'] ?? ($log['opponent']['tag'] ?? null)
                        ], $logs)
                    ];
                }
                $rankedMembers = $group['data']['members'] ?? [];
                usort($rankedMembers, static fn($a, $b) => (int)($b['leagueTrophies'] ?? 0) <=> (int)($a['leagueTrophies'] ?? 0));
                $memberRank = null;
                foreach ($rankedMembers as $index => $member) {
                    if (strtoupper((string)($member['playerTag'] ?? '')) === '#' . $memberTag) { $memberRank = $index + 1; $battleMember = $member; break; }
                }
                $attackWins = isset($battleMember['attackWinCount']) ? (int)$battleMember['attackWinCount'] : null;
                $attackLosses = isset($battleMember['attackLoseCount']) ? (int)$battleMember['attackLoseCount'] : null;
                $defenseWins = isset($battleMember['defenseWinCount']) ? (int)$battleMember['defenseWinCount'] : null;
                $defenseLosses = isset($battleMember['defenseLoseCount']) ? (int)$battleMember['defenseLoseCount'] : null;
                $pointValue = static fn(array $log): mixed => $log['trophies'] ?? $log['leagueTrophies'] ?? $log['trophyChange'] ?? null;
                $rawAttackLogs = is_array($group['data']['attackLogs'] ?? null) ? array_values(array_filter($group['data']['attackLogs'], 'is_array')) : [];
                $rawDefenseLogs = is_array($group['data']['defenseLogs'] ?? null) ? array_values(array_filter($group['data']['defenseLogs'], 'is_array')) : [];
                $allPointLogs = array_merge($rawAttackLogs, $rawDefenseLogs);
                $hasCompletePointData = $allPointLogs !== [] && count(array_filter($allPointLogs, static fn(array $log): bool => is_numeric($pointValue($log)))) === count($allPointLogs);
                $attackPoints = array_sum(array_map(static fn(array $log): int => (int)$pointValue($log), $rawAttackLogs));
                $defenseBattlePoints = array_sum(array_map(static fn(array $log): int => (int)$pointValue($log), $rawDefenseLogs));
                $battleQuota = is_numeric($rankedRule['battles'] ?? null) ? (int)$rankedRule['battles'] : null;
                $missingDefenseSlots = $battleQuota !== null ? max(0, $battleQuota - count($rawDefenseLogs)) : 0;
                $leaguePoints = is_numeric($battleMember['leagueTrophies'] ?? null) ? (int)$battleMember['leagueTrophies'] : null;
                $defenseBonusPoints = $previous && $hasCompletePointData && $leaguePoints !== null && $missingDefenseSlots > 0
                    ? max(0, $leaguePoints - $attackPoints - $defenseBattlePoints) : 0;
                $defenseBonusLogs = [];
                if ($defenseBonusPoints > 0) {
                    $baseBonus = intdiv($defenseBonusPoints, $missingDefenseSlots);
                    $bonusRemainder = $defenseBonusPoints % $missingDefenseSlots;
                    for ($slot = 0; $slot < $missingDefenseSlots; $slot++) {
                        $defenseBonusLogs[] = [
                            'kind' => 'defenseBonus',
                            'trophies' => $baseBonus + ($slot < $bonusRemainder ? 1 : 0),
                            'stars' => null,
                            'destructionPercentage' => null,
                            'timestamp' => null,
                            'opponentName' => null,
                            'opponentTag' => null
                        ];
                    }
                }
                $averages['attack']['points'] = $attackPoints;
                $averages['defense']['battleQuota'] = $battleQuota;
                $averages['defense']['remainingSlots'] = $missingDefenseSlots;
                $averages['defense']['battlePoints'] = $defenseBattlePoints;
                $averages['defense']['bonusPoints'] = $defenseBonusPoints;
                $averages['defense']['bonusPerSlot'] = $missingDefenseSlots > 0 ? round($defenseBonusPoints / $missingDefenseSlots, 2) : 0;
                $averages['defense']['bonusLogs'] = $defenseBonusLogs;
                $averages['defense']['points'] = $defenseBattlePoints + $defenseBonusPoints;
                return $this->respond($res, [
                    'playerTag' => '#' . $memberTag,
                    'session' => $session,
                    'leagueTier' => $leagueTierName,
                    'leagueRule' => $rankedRule,
                    'playerRank' => $memberRank,
                    'totalMembers' => count($rankedMembers),
                    'player' => [
                        'trophies' => $battleMember['leagueTrophies'] ?? null,
                        'attackWins' => $attackWins,
                        'attackLosses' => $attackLosses,
                        'attackCount' => $attackWins !== null && $attackLosses !== null ? $attackWins + $attackLosses : null,
                        'defenseWins' => $defenseWins,
                        'defenseLosses' => $defenseLosses,
                        'defenseCount' => $defenseWins !== null && $defenseLosses !== null ? $defenseWins + $defenseLosses : null
                    ],
                    'attack' => $averages['attack'],
                    'defense' => $averages['defense'],
                    'lastUpdated' => $group['lastUpdated'],
                    'stale' => $group['stale'] ?? false
                ]);
            }
            $members = [];
            foreach ($group['data']['members'] ?? [] as $member) {
                $members[] = [
                    'tag' => $member['playerTag'] ?? null,
                    'name' => $member['playerName'] ?? null,
                    'clanTag' => $member['clanTag'] ?? null,
                    'clanName' => $member['clanName'] ?? null,
                    'trophies' => $member['leagueTrophies'] ?? null,
                    'attackWins' => $member['attackWinCount'] ?? null,
                    'attackLosses' => $member['attackLoseCount'] ?? null,
                    'defenseWins' => $member['defenseWinCount'] ?? null,
                    'defenseLosses' => $member['defenseLoseCount'] ?? null,
                    'attackCount' => isset($member['attackWinCount'], $member['attackLoseCount']) ? (int)$member['attackWinCount'] + (int)$member['attackLoseCount'] : null,
                    'defenseCount' => isset($member['defenseWinCount'], $member['defenseLoseCount']) ? (int)$member['defenseWinCount'] + (int)$member['defenseLoseCount'] : null
                ];
            }
            usort($members, static fn($a, $b) => (int)$b['trophies'] <=> (int)$a['trophies']);
            foreach ($members as $index => &$member) $member['rank'] = $index + 1;
            unset($member);
            $playerRank = null;
            foreach ($members as $member) if (strtoupper((string)$member['tag']) === '#' . $tag) { $playerRank = $member['rank']; break; }
            return $this->respond($res, [
                'playerTag' => '#' . $tag,
                'session' => $session,
                'leagueTier' => $leagueTierName,
                'leagueRule' => $rankedRule,
                'playerRank' => $playerRank,
                'totalMembers' => count($members),
                'members' => $members,
                'lastUpdated' => $group['lastUpdated'],
                'stale' => $group['stale'] ?? false
            ]);
        } catch (UpstreamFailure $e) {
            if ($e->status === 404) return $this->respond($res, ['error' => 'Data grup liga untuk sesi ini tidak tersedia.'], 404);
            if ($e->status === 504 || ($e->status === 0 && str_contains(strtolower($e->getPrevious()?->getMessage() ?? ''), 'timed out'))) {
                return $this->respond($res, ['error' => 'API Clash of Clans tidak merespons untuk grup liga sesi ini. Profil pemain tersedia; coba lagi nanti.'], 504);
            }
            return $this->failure($res, $e);
        } catch (\Throwable $e) {
            return $this->failure($res, $e);
        }
    }

    private function archivePath(string $tag): string { return 'wars/' . $tag . '.json'; }
    private function wars(string $tag): array { $data=$this->readJson($this->archivePath($tag));return is_array($data['wars']??null)?$data['wars']:[]; }
    private function writeWars(string $tag,array $wars):void{$this->writeJson($this->archivePath($tag),['clanTag'=>'#'.$tag,'wars'=>$wars],true);}
    private function archive(string $tag,array $entry,string $type,?int $round=null):void
    {
        $d=$entry['data'];if(!$d||in_array($d['state']??'', ['notInWar','cwlWaiting'],true))return;$own='#'.$tag;$reversed=strtoupper($d['opponent']['tag']??'')===$own;$clan=$reversed?($d['opponent']??[]):($d['clan']??[]);$opp=$reversed?($d['clan']??[]):($d['opponent']??[]);if(strtoupper($clan['tag']??'')!==$own)return;
        $id=$type.':'.($d['startTime']??$d['endTime']??$entry['warTag']??$round).':'.($opp['tag']??'unknown');$members=[];foreach($clan['members']??[] as $m){$att=[];foreach($m['attacks']??[] as $a)$att[]=['defenderTag'=>$a['defenderTag']??null,'stars'=>$a['stars']??0,'destructionPercentage'=>$a['destructionPercentage']??0];$members[]=['tag'=>$m['tag']??null,'name'=>$m['name']??null,'townhallLevel'=>$m['townhallLevel']??null,'attacks'=>$att];}
        $list=$this->wars($tag);$record=['id'=>$id,'clanTag'=>$clan['tag']??'#'.$tag,'clanName'=>$clan['name']??null,'type'=>$type,'round'=>$round,'state'=>$d['state']??null,'startTime'=>$d['startTime']??null,'endTime'=>$d['endTime']??null,'opponent'=>['tag'=>$opp['tag']??null,'name'=>$opp['name']??null],'attacksPerMember'=>$d['attacksPerMember']??($type==='CWL'?1:2),'members'=>$members,'updatedAt'=>$entry['lastUpdated']??gmdate('c')];$found=false;foreach($list as &$old)if(($old['id']??null)===$id){$old=$record;$found=true;break;}unset($old);if(!$found)$list[]=$record;usort($list,static fn($a,$b)=>strcmp($a['startTime']??$a['updatedAt']??'', $b['startTime']??$b['updatedAt']??''));$this->writeWars($tag,array_slice($list,-120));
    }
    private function playerWarReport(string $player,string $clan,?array $allWars=null,?array $allSnapshots=null):array
    {
        $wars=$allWars??$this->wars($clan);$snapshots=$allSnapshots??$this->snapshots($clan);$rows=[];foreach($wars as $w){$member=null;foreach($w['members']??[] as $m)if(strtoupper($m['tag']??'')==='#'.$player){$member=$m;break;}if(!$member)continue;$att=$member['attacks']??[];$stars=array_sum(array_column($att,'stars'));$dest=array_sum(array_column($att,'destructionPercentage'));$rows[]=['id'=>$w['id'],'type'=>$w['type'],'round'=>$w['round']??null,'state'=>$w['state'],'startTime'=>$w['startTime']??null,'endTime'=>$w['endTime']??null,'opponent'=>$w['opponent']??null,'clanTag'=>$w['clanTag']??'#'.$clan,'clanName'=>$w['clanName']??null,'quota'=>$w['attacksPerMember'],'rostered'=>true,'attacks'=>$att,'stars'=>$stars,'destructionAverage'=>count($att)?round($dest/count($att),2):0,'missed'=>($w['state']==='warEnded'&&count($att)<$w['attacksPerMember'])];}
        usort($rows,static fn($a,$b)=>strcmp($b['startTime']??$b['endTime']??'', $a['startTime']??$a['endTime']??''));$attacks=[];foreach($rows as $r)$attacks=array_merge($attacks,$r['attacks']);$trend=[];foreach($snapshots as $s)foreach($s['members']??[] as $m)if(strtoupper($m['tag']??'')==='#'.$player){$trend[]=['date'=>$s['date'],'trophies'=>$m['trophies'],'donations'=>$m['donations'],'donationsReceived'=>$m['donationsReceived']];break;}
        $stars=array_sum(array_column($attacks,'stars'));$destruction=array_sum(array_column($attacks,'destructionPercentage'));return ['playerTag'=>'#'.$player,'clanTag'=>'#'.$clan,'wars'=>$rows,'summary'=>['wars'=>count($rows),'attacks'=>count($attacks),'stars'=>$stars,'starsPerAttack'=>count($attacks)?round($stars/count($attacks),2):null,'destructionAverage'=>count($attacks)?round($destruction/count($attacks),2):null,'missed'=>count(array_filter($rows,static fn($r)=>$r['missed']))],'trend'=>count($trend)>=2?$trend:[],'trendAvailable'=>count($trend)>=2,'note'=>'Arsip perang dimulai ketika aplikasi mengambil data perang. Perang lama yang belum pernah diambil tidak tersedia.'];
    }
    private function playerPerformance(ServerRequestInterface $req,ResponseInterface $res,string $raw):ResponseInterface{$player=$this->normalizeTag($raw);$query=$req->getQueryParams();$clan=$this->normalizeTag($query['clan']??'');if(!$player||!$clan)return $this->tagError($res,'Tag pemain dan klan harus valid.');try{return $this->respond($res,$this->playerWarReport($player,$clan));}catch(\Throwable $e){return $this->failure($res,$e);}}

    private function playerWarHistory(ResponseInterface $res, string $raw): ResponseInterface
    {
        $player = $this->normalizeTag($raw);
        if (!$player) return $this->tagError($res, 'Tag pemain tidak valid.');
        try {
            $wars = [];
            foreach (glob($this->file('wars/*.json')) ?: [] as $archivePath) {
                $clan = $this->normalizeTag(pathinfo($archivePath, PATHINFO_FILENAME));
                if (!$clan) continue;
                foreach ($this->wars($clan) as $war) {
                    $memberFound = false;
                    foreach ($war['members'] ?? [] as $member) {
                        if (strtoupper((string)($member['tag'] ?? '')) === '#' . $player) { $memberFound = true; break; }
                    }
                    if (!$memberFound) continue;
                    $war['id'] = $clan . ':' . ($war['id'] ?? 'unknown');
                    $war['clanTag'] = $war['clanTag'] ?? '#' . $clan;
                    $wars[] = $war;
                }
            }

            $snapshotsByDate = [];
            foreach (glob($this->file('snapshots/*.json')) ?: [] as $snapshotPath) {
                $clan = $this->normalizeTag(pathinfo($snapshotPath, PATHINFO_FILENAME));
                if (!$clan) continue;
                foreach ($this->snapshots($clan) as $snapshot) {
                    foreach ($snapshot['members'] ?? [] as $member) {
                        if (strtoupper((string)($member['tag'] ?? '')) !== '#' . $player) continue;
                        $date = $snapshot['date'] ?? null;
                        if (!$date) continue;
                        if (!isset($snapshotsByDate[$date]) || strcmp((string)($snapshot['capturedAt'] ?? ''), (string)($snapshotsByDate[$date]['capturedAt'] ?? '')) > 0) {
                            $snapshotsByDate[$date] = ['date' => $date, 'trophies' => $member['trophies'] ?? null,
                                'donations' => $member['donations'] ?? null, 'donationsReceived' => $member['donationsReceived'] ?? null,
                                'capturedAt' => $snapshot['capturedAt'] ?? null];
                        }
                        break;
                    }
                }
            }
            ksort($snapshotsByDate);
            $report = $this->playerWarReport($player, 'unknown', $wars, ['trend' => array_values($snapshotsByDate)]);
            $report['archiveClans'] = array_values(array_unique(array_filter(array_column($report['wars'], 'clanTag'))));
            $report['note'] = 'Riwayat digabungkan dari arsip clan yang pernah direkam aplikasi. Perang yang belum pernah diambil tidak tersedia; ketiadaan arsip bukan berarti pemain tidak masuk roster atau melewatkan serangan.';
            return $this->respond($res, $report);
        } catch (\Throwable $e) {
            return $this->failure($res, $e);
        }
    }

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
        if($selected!==null){$war=$this->roundWars($path,$rounds[$selected-1],$selected,$clan);if($war){$war['availableRounds']=$available;return $war;}return ['data'=>['state'=>'cwlWaiting'],'lastUpdated'=>$group['lastUpdated'],'availableRounds'=>$available,'round'=>$selected];}
        $preparation=null;for($i=count($rounds)-1;$i>=0;$i--){$war=$this->roundWars($path,$rounds[$i],$i+1,$clan);if(!$war)continue;$war['availableRounds']=$available;if(($war['data']['state']??'')==='inWar')return $war;if(($war['data']['state']??'')==='preparation'&&!$preparation)$preparation=$war;if(($war['data']['state']??'')==='warEnded')return $preparation??$war;}return $preparation??['data'=>['state'=>'cwlWaiting'],'lastUpdated'=>$group['lastUpdated'],'availableRounds'=>$available];
    }
    private function side(array $data,string $tag,bool $cwl):array{$own='#'.$tag;$reverse=$cwl&&strtoupper($data['opponent']['tag']??'')===$own;return [$reverse?($data['opponent']??[]):($data['clan']??[]),$reverse?($data['clan']??[]):($data['opponent']??[])];}
    private function cwlStandings(ResponseInterface $res, string $raw): ResponseInterface
    {
        $tag = $this->normalizeTag($raw);
        if (!$tag) return $this->tagError($res, 'Tag klan tidak valid.');
        $path = '/clans/' . rawurlencode('#' . $tag);
        try {
            $group = $this->fetchCwlGroup($path);
            if (!$group || ($group['data']['state'] ?? '') === 'notInWar') {
                return $this->respond($res, ['type' => 'CWL', 'available' => false, 'standings' => [], 'lastUpdated' => $group['lastUpdated'] ?? gmdate('c')]);
            }
            $clanProfile = $this->upstream($path);
            $standings = [];
            foreach ($group['data']['clans'] ?? [] as $clan) {
                $clanTag = strtoupper((string)($clan['tag'] ?? ''));
                if ($clanTag === '') continue;
                $standings[$clanTag] = ['tag' => $clan['tag'], 'name' => $clan['name'] ?? $clan['tag'], 'badgeUrls' => $clan['badgeUrls'] ?? null, 'stars' => 0, 'destruction' => 0, 'wars' => 0];
            }
            $loadedRounds = []; $seenWars = [];
            foreach ($group['data']['rounds'] ?? [] as $roundIndex => $round) {
                $roundHasWar = false;
                foreach ($round['warTags'] ?? [] as $warTag) {
                    if (!is_string($warTag) || $warTag === '' || $warTag === '#0' || isset($seenWars[$warTag])) continue;
                    $seenWars[$warTag] = true;
                    try { $entry = $this->upstream('/clanwarleagues/wars/' . rawurlencode($warTag)); }
                    catch (UpstreamFailure $e) { if ($e->status === 404) continue; throw $e; }
                    $data = $entry['data'];
                    if (!isset($data['clan'], $data['opponent'])) continue;
                    if (!in_array($data['state'] ?? '', ['inWar', 'warEnded'], true)) continue;
                    $roundHasWar = true;
                    $clanStars = (int)($data['clan']['stars'] ?? 0);
                    $opponentStars = (int)($data['opponent']['stars'] ?? 0);
                    $clanDestruction = (float)($data['clan']['destructionPercentage'] ?? 0);
                    $opponentDestruction = (float)($data['opponent']['destructionPercentage'] ?? 0);
                    foreach (['clan', 'opponent'] as $side) {
                        $warClan = $data[$side];
                        $clanTag = strtoupper((string)($warClan['tag'] ?? ''));
                        if ($clanTag === '') continue;
                        if (!isset($standings[$clanTag])) $standings[$clanTag] = ['tag' => $warClan['tag'], 'name' => $warClan['name'] ?? $warClan['tag'], 'badgeUrls' => $warClan['badgeUrls'] ?? null, 'stars' => 0, 'destruction' => 0, 'wars' => 0];
                        $standings[$clanTag]['name'] = $warClan['name'] ?? $standings[$clanTag]['name'];
                        $standings[$clanTag]['badgeUrls'] = $warClan['badgeUrls'] ?? $standings[$clanTag]['badgeUrls'];
                        $standings[$clanTag]['stars'] += (int)($warClan['stars'] ?? 0);
                        $attackDestruction = 0;
                        foreach ($warClan['members'] ?? [] as $member) foreach ($member['attacks'] ?? [] as $attack) $attackDestruction += (float)($attack['destructionPercentage'] ?? 0);
                        $standings[$clanTag]['destruction'] += $attackDestruction;
                        if (($data['state'] ?? '') === 'warEnded') {
                            $won = $side === 'clan'
                                ? ($clanStars > $opponentStars || ($clanStars === $opponentStars && $clanDestruction > $opponentDestruction))
                                : ($opponentStars > $clanStars || ($opponentStars === $clanStars && $opponentDestruction > $clanDestruction));
                            if ($won) $standings[$clanTag]['stars'] += 10;
                        }
                        $standings[$clanTag]['wars']++;
                    }
                }
                if ($roundHasWar) $loadedRounds[] = $roundIndex + 1;
            }
            $rows = array_values($standings);
            usort($rows, static fn($a, $b) => $b['stars'] <=> $a['stars'] ?: $b['destruction'] <=> $a['destruction'] ?: strcasecmp($a['name'], $b['name']));
            $lastScore = null; $rank = 0;
            foreach ($rows as $index => &$row) {
                $row['destruction'] = round($row['destruction'], 2);
                $score = $row['stars'] . ':' . $row['destruction'];
                if ($score !== $lastScore) $rank = $index + 1;
                $row['rank'] = $rank;
                $row['isCurrentClan'] = strtoupper((string)$row['tag']) === '#' . $tag;
                $lastScore = $score;
            }
            unset($row);
            return $this->respond($res, ['type' => 'CWL', 'available' => true, 'season' => $group['data']['season'] ?? null, 'league' => $clanProfile['data']['warLeague']['name'] ?? null, 'state' => $group['data']['state'] ?? null, 'loadedRounds' => $loadedRounds, 'roundCount' => count($group['data']['rounds'] ?? []), 'standings' => $rows, 'lastUpdated' => $group['lastUpdated']]);
        } catch (\Throwable $e) { return $this->failure($res, $e, true); }
    }
    private function war(ServerRequestInterface $req,ResponseInterface $res,string $raw):ResponseInterface
    {
        $tag=$this->normalizeTag($raw);if(!$tag)return $this->tagError($res,'Tag klan tidak valid.');$q=$req->getQueryParams();$selected=null;if(array_key_exists('round',$q)){if(!is_numeric($q['round'])||floor((float)$q['round'])!=(float)$q['round']||(int)$q['round']<1)return $this->tagError($res,'Nomor putaran tidak valid.');$selected=(int)$q['round'];}
        try{$entry=$selected===null?$this->upstream('/clans/'.rawurlencode('#'.$tag).'/currentwar'):null;$isCwl=(bool)($entry['data']['isLeagueEntry']??false);$round=null;$available=[];if($selected!==null||($entry['data']['state']??'')==='notInWar'||$isCwl){$cwl=$this->cwlWar('/clans/'.rawurlencode('#'.$tag),$tag,$selected);if($cwl['invalidRound']??false)return $this->tagError($res,'Putaran CWL tidak tersedia.');if($cwl){$entry=$cwl;$isCwl=true;$round=$cwl['round']??null;$available=$cwl['availableRounds']??[];}}
            if(!$entry){return $this->respond($res,['error'=>'Data CWL tidak tersedia untuk klan ini.'],404);}$d=$entry['data'];$state=$d['state']??'';if($state==='notInWar')return $this->respond($res,['state'=>$state,'lastUpdated'=>$entry['lastUpdated']]);if($state==='cwlWaiting')return $this->respond($res,['state'=>$state,'type'=>'CWL','round'=>$round,'availableRounds'=>$available,'lastUpdated'=>$entry['lastUpdated']]);$this->archive($tag,$entry,$isCwl?'CWL':'War',$round);[$clan,$opp]=$this->side($d,$tag,$isCwl);$quota=$d['attacksPerMember']??($isCwl?1:null);[$members,$opponents]=WarMap::rosters($clan,$opp,$quota===null?null:(int)$quota);$used=array_sum(array_column($members,'attacksUsed'));$remaining=$quota===null?null:array_sum(array_column($members,'attacksRemaining'));
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
    public readonly ?string $apiMessage;
    public readonly ?string $apiReason;

    public function __construct(public readonly int $status, ?\Throwable $previous = null, string $details = '')
    {
        $body = json_decode($details, true);
        $message = is_array($body) ? ($body['message'] ?? null) : null;
        $reason = is_array($body) ? ($body['reason'] ?? null) : null;
        $this->apiMessage = is_string($message) && trim($message) !== '' ? trim($message) : null;
        $this->apiReason = is_string($reason) && trim($reason) !== '' ? trim($reason) : null;
        parent::__construct('Upstream request failed' . ($details ? ': ' . $details : ''), $status, $previous);
    }
}
final class LocalDataFailure extends \RuntimeException {}
