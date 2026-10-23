<?php

declare(strict_types=1);

namespace CocTracker;

final class RaidReport
{
    private static function number(mixed $value): int|float|null
    {
        return is_numeric($value) && (float)$value >= 0 ? $value + 0 : null;
    }

    public static function member(array $raw): array
    {
        $attacks = self::number($raw['attacks'] ?? null);
        $limit = self::number($raw['attackLimit'] ?? null);
        $bonus = self::number($raw['bonusAttackLimit'] ?? null);
        $quota = $limit !== null && $bonus !== null ? $limit + $bonus : null;
        $loot = self::number($raw['capitalResourcesLooted'] ?? null);
        return [
            'tag' => strtoupper((string)($raw['tag'] ?? '')), 'name' => $raw['name'] ?? null,
            'attacks' => $attacks, 'attackLimit' => $limit, 'bonusAttackLimit' => $bonus,
            'quota' => $quota, 'remaining' => $attacks !== null && $quota !== null ? max(0, $quota - $attacks) : null,
            'loot' => $loot, 'lootPerAttack' => $attacks !== null && $attacks > 0 && $loot !== null ? round($loot / $attacks, 2) : null
        ];
    }

    public static function season(array $raw, string $clanTag, ?string $clanName, string $updatedAt): array
    {
        $membersAvailable = is_array($raw['members'] ?? null);
        $members = array_map(self::member(...), array_values(array_filter($membersAvailable ? $raw['members'] : [], 'is_array')));
        usort($members, static fn($a, $b) => ($b['loot'] ?? -1) <=> ($a['loot'] ?? -1) ?: strcmp((string)$a['name'], (string)$b['name']));
        $logs = [];
        foreach (['attackLog' => 'defender', 'defenseLog' => 'attacker'] as $side => $opponent) {
            $logs[$side] = [];
            foreach ($raw[$side] ?? [] as $entry) {
                if (!is_array($entry)) continue;
                $districts = [];
                foreach ($entry['districts'] ?? [] as $district) {
                    if (!is_array($district)) continue;
                    $districts[] = ['id' => $district['id'] ?? null, 'name' => $district['name'] ?? null,
                        'hallLevel' => self::number($district['districtHallLevel'] ?? null),
                        'destruction' => self::number($district['destructionPercent'] ?? null),
                        'attacks' => self::number($district['attackCount'] ?? null), 'loot' => self::number($district['totalLooted'] ?? null)];
                }
                $logs[$side][] = [
                    'opponent' => ['tag' => $entry[$opponent]['tag'] ?? null, 'name' => $entry[$opponent]['name'] ?? null],
                    'attacks' => self::number($entry['attackCount'] ?? null),
                    'districtCount' => self::number($entry['districtCount'] ?? null),
                    'districtsDestroyed' => self::number($entry['districtsDestroyed'] ?? null), 'districts' => $districts
                ];
            }
        }
        $start = (string)($raw['startTime'] ?? '');
        return [
            'id' => $clanTag . ':' . $start, 'clanTag' => $clanTag, 'clanName' => $clanName,
            'state' => $raw['state'] ?? null, 'startTime' => $start, 'endTime' => $raw['endTime'] ?? null,
            'loot' => self::number($raw['capitalTotalLoot'] ?? null),
            'raidsCompleted' => self::number($raw['raidsCompleted'] ?? null),
            'totalAttacks' => self::number($raw['totalAttacks'] ?? null),
            'districtsDestroyed' => self::number($raw['enemyDistrictsDestroyed'] ?? null),
            'offensiveReward' => self::number($raw['offensiveReward'] ?? null),
            'defensiveReward' => self::number($raw['defensiveReward'] ?? null),
            'participants' => $membersAvailable ? count($members) : null,
            'membersAvailable' => $membersAvailable, 'members' => $members,
            'attackLog' => $logs['attackLog'], 'defenseLog' => $logs['defenseLog'],
            'attackLogAvailable' => is_array($raw['attackLog'] ?? null),
            'defenseLogAvailable' => is_array($raw['defenseLog'] ?? null), 'lastUpdated' => $updatedAt
        ];
    }

    public static function player(array $seasons, string $playerTag): array
    {
        $records = [];
        foreach ($seasons as $season) {
            foreach ($season['members'] ?? [] as $member) {
                if (strtoupper((string)($member['tag'] ?? '')) !== $playerTag) continue;
                $records[$season['id']] = array_merge($member, array_intersect_key($season, array_flip([
                    'id', 'clanTag', 'clanName', 'state', 'startTime', 'endTime', 'lastUpdated'
                ])));
                break;
            }
        }
        $records = array_values($records);
        usort($records, static fn($a, $b) => strcmp($b['startTime'], $a['startTime']) ?: strcmp($a['clanTag'], $b['clanTag']));
        $sum = static function (string $field) use ($records): int|float|null {
            $known = array_filter(array_column($records, $field), static fn($value) => $value !== null);
            return $known ? array_sum($known) : null;
        };
        $paired = array_filter($records, static fn($r) => $r['loot'] !== null && $r['attacks'] !== null && $r['attacks'] > 0);
        $pairedAttacks = array_sum(array_column($paired, 'attacks'));
        return ['items' => $records, 'summary' => [
            'weekends' => count(array_unique(array_column($records, 'startTime'))),
            'attacks' => $sum('attacks'), 'loot' => $sum('loot'),
            'lootPerAttack' => $pairedAttacks > 0 ? round(array_sum(array_column($paired, 'loot')) / $pairedAttacks, 2) : null,
            'averageSample' => count($paired),
            'complete' => count(array_filter($records, static fn($r) => $r['attacks'] !== null && $r['loot'] !== null)) === count($records)
        ]];
    }
}
