<?php
declare(strict_types=1);

namespace CocTracker;

/** Shared, versioned Home Village caps. API global maxima are never a fallback. */
final class GameCatalog
{
    private array $byName = [];
    private array $byId = [];

    private function __construct(private readonly array $data)
    {
        foreach ($data['items'] as $item) {
            $this->byName[$item['category']][$item['apiName']] = $item;
            $this->byId[$item['id']] = $item;
        }
    }

    public static function load(string $directory): ?self
    {
        try {
            $manifest = json_decode((string)@file_get_contents($directory.'/manifest.json'), true, 32, JSON_THROW_ON_ERROR);
            $version = $manifest['dataVersion'] ?? '';
            if (($manifest['schemaVersion'] ?? null) !== 1 || !is_string($version) || !preg_match('/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/', $version)
                || ($manifest['catalog'] ?? null) !== $version.'/catalog.json' || ($manifest['simulationReady'] ?? null) !== false) return null;
            $path = $directory.'/'.$manifest['catalog'];
            $size = @filesize($path);
            if (!$size || $size > 4194304 || $size !== ($manifest['bytes'] ?? null)) return null;
            $body = (string)file_get_contents($path);
            if (!is_string($manifest['sha256'] ?? null) || !hash_equals($manifest['sha256'], hash('sha256', $body))) return null;
            $data = json_decode($body, true, 64, JSON_THROW_ON_ERROR);
            self::validate($data, $version);
            return new self($data);
        } catch (\Throwable) {
            // A missing/corrupt release must yield unknown caps, never a guessed table.
            return null;
        }
    }

    public static function validate(array $data, string $version): void
    {
        if (($data['schemaVersion'] ?? null) !== 1 || ($data['dataVersion'] ?? null) !== $version
            || !is_int($data['maxTownHall'] ?? null) || $data['maxTownHall'] < 1 || $data['maxTownHall'] > 99
            || !is_array($data['items'] ?? null) || !is_array($data['sources'] ?? null)) throw new \RuntimeException('Invalid game catalog.');
        $ids = []; $names = [];
        foreach ($data['items'] as $item) {
            $id = $item['id'] ?? ''; $category = $item['category'] ?? ''; $name = $item['apiName'] ?? '';
            if (!is_string($id) || !preg_match('/^[a-z0-9-]+$/', $id) || isset($ids[$id]) || !is_string($category)
                || !is_string($name) || $name === '' || isset($names[$category][$name]) || ($item['village'] ?? null) !== 'home'
                || !is_array($item['caps'] ?? null) || ($item['simulationReady'] ?? null) !== false) throw new \RuntimeException('Invalid catalog item.');
            $ids[$id] = true; $names[$category][$name] = true;
            foreach ($item['caps'] as $th => $cap) {
                if (!ctype_digit((string)$th) || (int)$th < 1 || (int)$th > $data['maxTownHall'] || !is_int($cap['maxLevel'] ?? null)
                    || $cap['maxLevel'] < 1 || $cap['maxLevel'] > 300 || ($cap['exactMatch'] ?? null) !== true
                    || !isset($data['sources'][$cap['sourceId'] ?? ''])) throw new \RuntimeException('Invalid catalog cap.');
            }
        }
    }

    public function version(): string { return $this->data['dataVersion']; }

    public function completeAt(int $th): bool
    {
        return in_array($th, $this->data['coverage']['completeTownHalls'] ?? [], true);
    }

    public function item(string $category, string $name): ?array { return $this->byName[$category][$name] ?? null; }

    public function equipmentHero(string $name): ?string
    {
        $id = $this->item('heroEquipment', $name)['hero'] ?? null;
        return $id ? ($this->byId[$id]['apiName'] ?? null) : null;
    }

    public function resolve(string $category, string $name, int $th, ?int $level = null): array
    {
        $item = $this->item($category, $name);
        $cap = $item['caps'][(string)$th] ?? null;
        $valid = $cap !== null && ($level === null || ($level >= 0 && $level <= $cap['maxLevel']));
        return ['maxAtTownHall'=>$valid ? $cap['maxLevel'] : null,
                'source'=>$valid ? $cap['sourceId'] : null, 'exactMatch'=>$valid,
                'status'=>$valid ? 'verified' : ($cap !== null ? 'level-exceeds-catalog' : 'unavailable'),
                'dataVersion'=>$this->version(), 'itemKnown'=>$item !== null];
    }

    public function limits(string $category, int $th): array
    {
        $limits = [];
        foreach ($this->byName[$category] ?? [] as $name => $item) {
            $cap = $item['caps'][(string)$th] ?? null;
            if ($cap !== null) $limits[$name] = $cap['maxLevel'];
        }
        return $limits;
    }
}
