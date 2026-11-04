<?php
declare(strict_types=1);
namespace CocTracker;

/** Offline, pinned-source importer. No damage calculations or inferred combat rules. */
final class ZapquakeDataset
{
    public const SCHEMA = 1;
    public const NORMALIZER = '1.3.0';
    private const EQUIPMENT = ['fireball'=>'projectileDamage','giant-arrow'=>'projectileDamage','spiky-ball'=>'projectileDamagePerTarget',
        'seeking-shield'=>'projectileDamage','rocket-backpack'=>'abilityDamage','flame-blower'=>'abilityDamage','earthquake-boots'=>'percent','electro-boots'=>'auraDamagePerHit'];

    public static function json(array $value): string
    {
        return json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)."\n";
    }

    public static function decode(string $body): array
    {
        $value = json_decode($body, true, 64, JSON_THROW_ON_ERROR);
        if (!is_array($value)) throw new \RuntimeException('Expected a JSON object.');
        return $value;
    }

    public static function lock(string $path): array
    {
        $lock = self::decode((string)file_get_contents($path));
        if (($lock['schemaVersion'] ?? null) !== 1 || !preg_match('/^[a-f0-9]{40}$/', $lock['revision'] ?? '')
            || !preg_match('/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/', $lock['dataVersion'] ?? '')
            || ($lock['repository'] ?? '') !== 'https://github.com/chiefpansancolt/clash-of-clans-data'
            || ($lock['license'] ?? '') !== 'MIT' || empty($lock['files'])) throw new \RuntimeException('Invalid source lock.');
        $seen = [];
        foreach ($lock['files'] as $file) {
            $name = $file['path'] ?? '';
            if (!preg_match('~^(?:LICENSE|package\.json|data/home/(?:defenses|spells|heroes|hero-equipment)/[a-z0-9-]+\.json|data/home/army-buildings/(?:hero-hall|blacksmith)\.json|data/home/town-hall/town-hall\.json|data/home/resource-buildings/clan-castle\.json)$~', $name)
                || isset($seen[$name]) || !preg_match('/^[a-f0-9]{64}$/', $file['sha256'] ?? '')
                || !is_int($file['bytes'] ?? null) || $file['bytes'] < 1 || $file['bytes'] > 2097152) throw new \RuntimeException('Invalid locked file: '.$name);
            $seen[$name] = true;
        }
        foreach (['LICENSE','package.json','data/home/spells/lightning-spell.json','data/home/spells/earthquake-spell.json'] as $required)
            if (!isset($seen[$required])) throw new \RuntimeException('Missing locked source: '.$required);
        return $lock;
    }

    /** Atomic file replacement; a failed write never truncates the existing target. */
    public static function atomic(string $path, string $body): void
    {
        $dir = dirname($path);
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) throw new \RuntimeException('Cannot create '.$dir);
        $tmp = $path.'.'.bin2hex(random_bytes(6)).'.tmp';
        try {
            if (file_put_contents($tmp, $body, LOCK_EX) !== strlen($body) || !rename($tmp, $path)) throw new \RuntimeException('Cannot publish '.$path);
        } finally { if (is_file($tmp)) unlink($tmp); }
    }

    public static function verify(string $body, array $file): void
    {
        if (strlen($body) !== $file['bytes'] || !hash_equals($file['sha256'], hash('sha256', $body))) throw new \RuntimeException('Source checksum mismatch: '.$file['path']);
    }

    /** The injected downloader is also used by the CLI; URLs cannot be selected by source content. */
    public static function download(array $lock, string $directory, \Closure $fetch): int
    {
        $count = 0;
        foreach ($lock['files'] as $file) {
            $path = $directory.'/'.$file['path'];
            if (is_file($path) && hash_file('sha256', $path) === $file['sha256'] && filesize($path) === $file['bytes']) continue;
            $url = 'https://raw.githubusercontent.com/chiefpansancolt/clash-of-clans-data/'.$lock['revision'].'/'.$file['path'];
            $body = $fetch($url);
            if (!is_string($body)) throw new \RuntimeException('Invalid download response.');
            self::verify($body, $file);
            self::atomic($path, $body);
            $count++;
        }
        return $count;
    }

    private static function positive(mixed $value, string $field, bool $integer = false): int|float
    {
        if ((!is_int($value) && !is_float($value)) || !is_finite((float)$value) || $value <= 0 || ($integer && !is_int($value))) throw new \RuntimeException('Invalid positive number: '.$field);
        return $value;
    }

    public static function build(array $lock, string $directory): array
    {
        $buildings = []; $spells = []; $heroes = []; $equipment = []; $requirements = []; $license = ''; $package = null;
        foreach ($lock['files'] as $file) {
            $path = $directory.'/'.$file['path'];
            if (!is_file($path)) throw new \RuntimeException('Missing source file: '.$file['path']);
            $body = (string)file_get_contents($path); self::verify($body, $file);
            if ($file['path'] === 'LICENSE') { $license = $body; continue; }
            $item = self::decode($body);
            if ($file['path'] === 'package.json') { $package = $item; continue; }
            $id = $item['id'] ?? '';
            if (!preg_match('/^[a-z0-9-]+$/', $id) || basename($file['path']) !== $id.'.json' || ($item['base'] ?? '') !== 'home'
                || !is_string($item['name'] ?? null) || trim($item['name']) === '' || empty($item['levels'])) throw new \RuntimeException('Invalid source identity: '.$file['path']);
            if (str_contains($file['path'], '/hero-equipment/')) {
                if (($item['category'] ?? '') !== 'hero-equipment' || !isset(self::EQUIPMENT[$id]) || isset($equipment[$id])
                    || !in_array($item['rarity'] ?? '', ['Common','Epic'], true) || !preg_match('/^[a-z-]+$/', $item['hero'] ?? '')) throw new \RuntimeException('Unsupported equipment source: '.$id);
                $rows = [];
                foreach ($item['levels'] as $index=>$row) {
                    if (($row['level'] ?? null) !== $index + 1 || !is_int($row['blacksmithLevelRequired'] ?? null) || $row['blacksmithLevelRequired'] < 0) throw new \RuntimeException('Invalid equipment level: '.$id);
                    $entry = ['level'=>$row['level'], 'blacksmithLevelRequired'=>$row['blacksmithLevelRequired']];
                    if ($id === 'earthquake-boots') {
                        foreach (['buildingDamagePercent','troopDamagePercent'] as $key) {
                            $value = $row['stats'][$key] ?? '';
                            if (!is_string($value) || !preg_match('/^(\d+(?:\.\d+)?)%$/', $value, $match) || (float)$match[1] <= 0 || (float)$match[1] > 100) throw new \RuntimeException('Invalid equipment percent.');
                            $value = (float)$match[1];
                            $entry[$key] = floor($value) === $value ? (int)$value : $value;
                        }
                    } else $entry['damage'] = self::positive($row['stats'][self::EQUIPMENT[$id]] ?? null, $id.'.damage');
                    $rows[] = $entry;
                }
                $equipment[$id] = ['id'=>$id, 'dataId'=>self::positive($item['dataId'] ?? null, $id.'.dataId', true), 'name'=>$item['name'], 'hero'=>$item['hero'],
                    'rarity'=>strtolower($item['rarity']), 'modelType'=>$id === 'earthquake-boots' ? 'percent' : ($id === 'electro-boots' ? 'periodic' : 'direct'),
                    'sourceFile'=>$file['path'], 'levels'=>$rows];
                if ($id === 'electro-boots') {
                    $speed = $item['ability']['auraAttackSpeed'] ?? '';
                    if (!preg_match('/^(\d+(?:\.\d+)?)s$/', $speed, $match)) throw new \RuntimeException('Missing aura interval.');
                    $equipment[$id]['tickSeconds'] = self::positive((float)$match[1], 'tickSeconds');
                }
                continue;
            }
            if (str_contains($file['path'], '/army-buildings/')) {
                if (($item['category'] ?? '') !== 'army' || !in_array($id, ['hero-hall','blacksmith'], true) || isset($requirements[$id])) throw new \RuntimeException('Unsupported requirement source.');
                $rows = [];
                foreach ($item['levels'] as $index=>$row) {
                    if (($row['level'] ?? null) !== $index + 1) throw new \RuntimeException('Invalid requirement level.');
                    $entry = ['level'=>$row['level'], 'townHallRequired'=>self::positive($row['townHallRequired'] ?? null, 'requirement.th', true)];
                    if ($id === 'hero-hall') $entry['heroSlots'] = self::positive($row['heroSlots'] ?? null, 'heroSlots', true);
                    else foreach (['common','epic'] as $rarity) $entry[$rarity] = self::positive($row['maxEquipmentLevel'][$rarity] ?? null, 'equipmentCap', true);
                    $rows[] = $entry;
                }
                $requirements[$id] = $rows;
                continue;
            }
            $isSpell = str_contains($file['path'], '/spells/');
            $isHero = str_contains($file['path'], '/heroes/');
            $isTownHall = $file['path'] === 'data/home/town-hall/town-hall.json';
            $isCastle = $file['path'] === 'data/home/resource-buildings/clan-castle.json';
            $category = $isSpell ? 'spell' : ($isHero ? 'hero' : ($isTownHall ? 'town-hall' : ($isCastle ? 'resource' : 'defense')));
            if (($item['category'] ?? '') !== $category) throw new \RuntimeException('Unexpected source category: '.$id);
            if (!$isSpell && isset($lock['excludedBuildings'][$id])) continue;
            $levels = []; $supercharges = [];
            foreach ($item['levels'] as $row) {
                $level = self::positive($row['level'] ?? null, $id.'.level', true);
                // Hero rows have Hero Hall requirements, not a direct Town Hall mapping.
                $th = $isHero ? null : self::positive($isTownHall ? $level : ($row['townHallRequired'] ?? null), $id.'.townHallRequired', true);
                $entry = ['level'=>$level, 'townHallRequired'=>$th];
                if ($isTownHall) $entry['weaponAvailable'] = array_key_exists('weapon',$row) ? is_array($row['weapon']) : null;
                if ($isHero) $entry['heroHallLevelRequired'] = self::positive($row['heroHallLevelRequired'] ?? null, $id.'.heroHallLevelRequired', true);
                if (!$isSpell) {
                    $entry['hitpoints'] = self::positive($row['hitpoints'] ?? null, $id.'.hitpoints', true);
                    if (!empty($row['supercharge'])) {
                        if ($isHero || $isTownHall || $isCastle) throw new \RuntimeException('Unexpected supercharge category: '.$id);
                        if (isset($supercharges[$level])) throw new \RuntimeException('Duplicate supercharge: '.$id);
                        // Upstream reuses level 1/2 for charge steps. Base-level binding remains unverified.
                        $supercharges[$level] = ['step'=>$level, 'sourceHitpoints'=>$entry['hitpoints'], 'townHallRequired'=>$th,
                            'baseLevel'=>null, 'status'=>'unverified-base-binding'];
                        continue;
                    }
                } elseif ($id === 'lightning-spell') {
                    $entry['damage'] = self::positive($row['damage'] ?? null, $id.'.damage');
                } elseif ($id === 'earthquake-spell') {
                    $entry['buildingDamagePercent'] = self::positive($row['buildingDamagePercent'] ?? null, $id.'.buildingDamagePercent');
                    $troop = $row['troopDamagePercent'] ?? null;
                    $entry['troopDamagePercent'] = $troop === null ? null : self::positive($troop, $id.'.troopDamagePercent');
                    $entry['radius'] = self::positive($row['radius'] ?? null, $id.'.radius');
                } else throw new \RuntimeException('Unsupported spell: '.$id);
                if (isset($levels[$level])) throw new \RuntimeException('Duplicate normal level: '.$id);
                $levels[$level] = $entry;
            }
            ksort($levels); ksort($supercharges);
            if (array_keys($levels) !== range(1, count($levels))) throw new \RuntimeException('Non-contiguous normal levels: '.$id);
            $record = ['id'=>$id, 'dataId'=>self::positive($item['dataId'] ?? null, $id.'.dataId', true), 'name'=>$item['name'],
                'sourceFile'=>$file['path'], 'levels'=>array_values($levels)];
            if ($isSpell) {
                if (isset($spells[$id])) throw new \RuntimeException('Duplicate spell ID.');
                $record['housingSpace'] = self::positive($item['housingSpace'] ?? null, $id.'.housingSpace', true);
                $spells[$id] = $record;
            } elseif ($isHero) {
                if (isset($heroes[$id])) throw new \RuntimeException('Duplicate hero ID.');
                $record['hitpointContext'] = 'base-before-defensive-modifiers';
                $record['defendingMode'] = null;
                $heroes[$id] = $record;
            } else {
                if (isset($buildings[$id])) throw new \RuntimeException('Duplicate building ID.');
                $record['category'] = $category;
                // Retain counts after merges separately; minimum TH alone cannot describe removals.
                $availability = $isTownHall ? array_map(static fn(array $row): array=>['townHallLevel'=>$row['level'],'count'=>1], array_values($levels)) : ($item['availablePerTownHall'] ?? null);
                self::validateAvailability($availability);
                $record['availablePerTownHall'] = array_map(static function(array $row): array {
                    $entry = ['townHallLevel'=>$row['townHallLevel'],'count'=>$row['count']];
                    if (array_key_exists('countAfterMerges',$row)) $entry['countAfterMerges']=$row['countAfterMerges'];
                    return $entry;
                }, $availability);
                $record['supercharges'] = array_values($supercharges); $buildings[$id] = $record;
            }
        }
        if (($package['name'] ?? '') !== 'clash-of-clans-data' || ($package['version'] ?? '') !== $lock['packageVersion']
            || ($package['license'] ?? '') !== 'MIT' || !str_contains($license, 'MIT License') || !str_contains($license, 'Christopher Pezza')) throw new \RuntimeException('Source license/package mismatch.');
        ksort($buildings); ksort($spells); ksort($heroes); ksort($equipment); ksort($requirements);
        $dataset = ['schemaVersion'=>self::SCHEMA, 'dataVersion'=>$lock['dataVersion'], 'normalizerVersion'=>self::NORMALIZER,
            'engineVersion'=>null, 'effectiveAt'=>$lock['effectiveAt'], 'reviewedAt'=>$lock['reviewedAt'],
            'status'=>'reference-data-only', 'calculationReady'=>false,
            'source'=>['repository'=>$lock['repository'], 'revision'=>$lock['revision'], 'packageVersion'=>$lock['packageVersion'],
                'license'=>'MIT', 'files'=>$lock['files']],
            'coverage'=>['base'=>'home', 'buildingScope'=>'standard-defenses-town-hall-clan-castle', 'heroes'=>'base-hp-before-defensive-modifiers', 'excludedBuildings'=>$lock['excludedBuildings'],
                'equipment'=>'eight-damage-sources', 'modifiers'=>'external-versioned-model-profiles', 'supercharge'=>'manual-hp-only-unverified-base-binding',
                'defenderPresets'=>'source-counts-after-merges-intersected-with-level-requirements'],
            'rules'=>['targetEligibility'=>null, 'earthquakeRepeatedHits'=>null, 'rounding'=>null, 'stacking'=>null],
            'buildings'=>array_values($buildings), 'heroes'=>array_values($heroes), 'spells'=>array_values($spells), 'equipment'=>array_values($equipment), 'requirements'=>$requirements, 'modifiers'=>[]];
        self::validate($dataset);
        return ['dataset'=>$dataset, 'license'=>$license];
    }

    private static function validateAvailability(mixed $rows): void
    {
        if (!is_array($rows) || !array_is_list($rows) || !$rows) throw new \RuntimeException('Missing building availability.');
        $previous = null;
        foreach ($rows as $row) {
            $th=$row['townHallLevel'] ?? null; $count=$row['count'] ?? null;
            if (!is_int($th) || $th<1 || $th>18 || ($previous!==null && $th!==$previous+1)
                || !is_int($count) || $count<0 || $count>100) throw new \RuntimeException('Invalid building availability.');
            if (array_key_exists('countAfterMerges',$row) && (!is_int($row['countAfterMerges']) || $row['countAfterMerges']<0 || $row['countAfterMerges']>$count)) throw new \RuntimeException('Invalid post-merge count.');
            $previous=$th;
        }
    }

    public static function validate(array $data): void
    {
        if (($data['schemaVersion'] ?? null) !== self::SCHEMA || ($data['calculationReady'] ?? null) !== false
            || ($data['status'] ?? '') !== 'reference-data-only' || ($data['engineVersion'] ?? null) !== null
            || !preg_match('/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/', $data['dataVersion'] ?? '')
            || count($data['spells'] ?? []) !== 2 || empty($data['buildings']) || ($data['modifiers'] ?? null) !== []) throw new \RuntimeException('Invalid dataset envelope.');
        if (($data['source']['repository'] ?? '') !== 'https://github.com/chiefpansancolt/clash-of-clans-data'
            || !preg_match('/^[a-f0-9]{40}$/', $data['source']['revision'] ?? '') || ($data['source']['license'] ?? '') !== 'MIT'
            || !is_array($data['source']['files'] ?? null) || empty($data['source']['files'])
            || ($data['rules'] ?? null) !== ['targetEligibility'=>null, 'earthquakeRepeatedHits'=>null, 'rounding'=>null, 'stacking'=>null]) throw new \RuntimeException('Missing provenance or unverified rules enabled.');
        $ids = []; $dataIds = [];
        if (isset($data['heroes']) && !is_array($data['heroes'])) throw new \RuntimeException('Invalid heroes collection.');
        foreach (['buildings','spells','heroes'] as $kind) foreach ($data[$kind] ?? [] as $item) {
            $id = $item['id'] ?? '';
            if (!preg_match('/^[a-z0-9-]+$/', $id) || isset($ids[$id]) || isset($dataIds[$item['dataId'] ?? 0]) || empty($item['levels'])) throw new \RuntimeException('Invalid/duplicate dataset identity.');
            $ids[$id] = true; $dataIds[self::positive($item['dataId'] ?? null, $id.'.dataId', true)] = true;
            if ($kind==='buildings' && (array_key_exists('availablePerTownHall',$item) || ($data['normalizerVersion'] ?? '')==='1.3.0')) self::validateAvailability($item['availablePerTownHall'] ?? null);
            $previousTH = 0; $previousValue = 0;
            foreach ($item['levels'] as $index=>$row) {
                if ($row['level'] !== $index + 1) throw new \RuntimeException('Invalid level sequence.');
                if ($kind === 'heroes' && ($row['townHallRequired'] !== null || $item['hitpointContext'] !== 'base-before-defensive-modifiers'
                    || $item['defendingMode'] !== null)) throw new \RuntimeException('Unverified hero context or TH mapping.');
                $th = self::positive($kind === 'heroes' ? ($row['heroHallLevelRequired'] ?? null) : ($row['townHallRequired'] ?? null), 'level requirement', true);
                if ($th < $previousTH || $th > 100) throw new \RuntimeException('Invalid TH progression.');
                $previousTH = $th;
                if ($kind === 'buildings' && $id === 'town-hall' && $th !== $row['level']) throw new \RuntimeException('Town Hall requirement must match its own level.');
                if ($kind === 'buildings' && $id === 'town-hall' && array_key_exists('weaponAvailable',$row)
                    && $row['weaponAvailable'] !== null && !is_bool($row['weaponAvailable'])) throw new \RuntimeException('Invalid Town Hall weapon flag.');
                $field = $kind !== 'spells' ? 'hitpoints' : ($id === 'lightning-spell' ? 'damage' : 'buildingDamagePercent');
                $value = self::positive($row[$field] ?? null, $field, $kind !== 'spells');
                if ($value < $previousValue || ($field === 'buildingDamagePercent' && $value > 100)) throw new \RuntimeException('Invalid statistic progression.');
                $previousValue = $value;
                if ($kind === 'spells' && $id === 'earthquake-spell') {
                    self::positive($row['radius'] ?? null, 'radius');
                    if (($row['troopDamagePercent'] ?? null) !== null && (self::positive($row['troopDamagePercent'], 'troopDamagePercent') > 100)) throw new \RuntimeException('Invalid troop percent.');
                }
            }
            if ($kind === 'spells') {
                if (!in_array($id, ['lightning-spell','earthquake-spell'], true)) throw new \RuntimeException('Unknown spell.');
                self::positive($item['housingSpace'] ?? null, 'housingSpace', true);
            }
            $steps = [];
            foreach ($item['supercharges'] ?? [] as $charge) {
                self::positive($charge['step'] ?? null, 'charge.step', true);
                self::positive($charge['sourceHitpoints'] ?? null, 'charge.hitpoints', true);
                if (isset($steps[$charge['step']]) || $charge['baseLevel'] !== null || $charge['status'] !== 'unverified-base-binding') throw new \RuntimeException('Unsafe supercharge interpretation.');
                $steps[$charge['step']] = true;
            }
        }
        foreach ($data['equipment'] ?? [] as $item) {
            $id = $item['id'] ?? '';
            if (!isset(self::EQUIPMENT[$id]) || isset($ids[$id]) || isset($dataIds[$item['dataId'] ?? 0]) || empty($item['levels']) || !in_array($item['rarity'] ?? '', ['common','epic'], true)
                || !in_array($item['hero'] ?? '', array_column($data['heroes'] ?? [],'id'), true)) throw new \RuntimeException('Invalid equipment identity/owner.');
            $ids[$id] = true; $dataIds[self::positive($item['dataId'] ?? null, 'equipment.dataId', true)] = true;
            $expected = $id === 'earthquake-boots' ? 'percent' : ($id === 'electro-boots' ? 'periodic' : 'direct');
            if (($item['modelType'] ?? '') !== $expected) throw new \RuntimeException('Invalid equipment mechanic.');
            foreach ($item['levels'] as $index=>$row) {
                if (($row['level'] ?? null) !== $index + 1 || !is_int($row['blacksmithLevelRequired'] ?? null) || $row['blacksmithLevelRequired'] < 0) throw new \RuntimeException('Invalid equipment requirement.');
                if ($expected === 'percent') foreach (['buildingDamagePercent','troopDamagePercent'] as $key) {
                    if (self::positive($row[$key] ?? null, $key) > 100) throw new \RuntimeException('Invalid equipment percentage.');
                } else self::positive($row['damage'] ?? null, 'equipment.damage');
            }
            if ($expected === 'periodic') self::positive($item['tickSeconds'] ?? null, 'tickSeconds');
        }
        foreach ($data['requirements'] ?? [] as $id=>$rows) {
            if (!in_array($id, ['hero-hall','blacksmith'], true) || !$rows) throw new \RuntimeException('Invalid requirement collection.');
            foreach ($rows as $index=>$row) {
                if (($row['level'] ?? null) !== $index + 1) throw new \RuntimeException('Invalid requirement sequence.');
                self::positive($row['townHallRequired'] ?? null, 'requirement.th', true);
                foreach ($id === 'hero-hall' ? ['heroSlots'] : ['common','epic'] as $key) self::positive($row[$key] ?? null, 'requirement.'.$key, true);
            }
        }
    }

    /** Flatten all observable fields: statistics, provenance, coverage, rules, and removals. */
    public static function diff(?array $before, array $after): array
    {
        $flatten = static function(mixed $node, string $path, array &$out) use (&$flatten): void {
            if (!is_array($node) || !$node) { $out[$path] = $node; return; }
            foreach ($node as $key=>$value) {
                $part = is_array($value) && isset($value['id']) ? $value['id'] : (is_array($value) && isset($value['level']) ? 'level-'.$value['level'] : (string)$key);
                $flatten($value, $path.'/'.$part, $out);
            }
        };
        $old = []; $new = []; if ($before !== null) $flatten($before, '', $old); $flatten($after, '', $new);
        $changes = [];
        foreach (array_unique(array_merge(array_keys($old), array_keys($new))) as $path) {
            $hasOld = array_key_exists($path, $old); $hasNew = array_key_exists($path, $new);
            if ($hasOld && $hasNew && $old[$path] === $new[$path]) continue;
            $changes[] = ['path'=>$path, 'type'=>!$hasOld ? 'added' : (!$hasNew ? 'removed' : 'changed'), 'before'=>$old[$path] ?? null, 'after'=>$new[$path] ?? null];
        }
        return ['from'=>$before['dataVersion'] ?? null, 'to'=>$after['dataVersion'], 'changes'=>$changes];
    }

    /** Immutable release directory first; replace the active pointer only when every file is ready. */
    public static function publish(string $directory, array $bundle): array
    {
        self::validate($bundle['dataset']);
        if (!is_string($bundle['license'] ?? null) || !str_contains($bundle['license'], 'MIT License') || !str_contains($bundle['license'], 'Christopher Pezza')) throw new \RuntimeException('Source attribution is required.');
        $body = self::json($bundle['dataset']); $version = $bundle['dataset']['dataVersion'];
        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) throw new \RuntimeException('Cannot create dataset directory.');
        $guard = fopen(sys_get_temp_dir().'/clanintel-zapquake-'.hash('sha256', (string)realpath($directory)).'.lock', 'c');
        if (!$guard || !flock($guard, LOCK_EX | LOCK_NB)) throw new \RuntimeException('Dataset publication already running.');
        $staging = null;
        try {
            $release = $directory.'/'.$version;
            if (is_dir($release)) {
                if (!is_file($release.'/dataset.json') || file_get_contents($release.'/dataset.json') !== $body
                    || !is_file($release.'/LICENSE.txt') || file_get_contents($release.'/LICENSE.txt') !== $bundle['license']) throw new \RuntimeException('Version already exists with different content; choose a new dataVersion.');
            } else {
                $staging = $directory.'/.staging-'.bin2hex(random_bytes(6)); mkdir($staging);
                self::atomic($staging.'/dataset.json', $body); self::atomic($staging.'/LICENSE.txt', $bundle['license']);
                if (!rename($staging, $release)) throw new \RuntimeException('Cannot finalize release.');
                $staging = null;
            }
            $manifest = ['schemaVersion'=>1, 'dataVersion'=>$version, 'dataset'=>$version.'/dataset.json', 'license'=>$version.'/LICENSE.txt',
                'sha256'=>hash('sha256', $body), 'bytes'=>strlen($body), 'calculationReady'=>false];
            self::atomic($directory.'/manifest.json', self::json($manifest));
            return $manifest;
        } finally {
            if ($staging !== null) { foreach (['dataset.json','LICENSE.txt'] as $file) if (is_file($staging.'/'.$file)) unlink($staging.'/'.$file); rmdir($staging); }
            flock($guard, LOCK_UN); fclose($guard);
        }
    }
}
