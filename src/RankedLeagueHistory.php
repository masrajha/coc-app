<?php
declare(strict_types=1);

namespace CocTracker;

final class RankedLeagueHistory
{
    public static function weekStart(int $timestamp): int
    {
        $date = (new \DateTimeImmutable('@' . $timestamp))->setTimezone(new \DateTimeZone('UTC'));
        $start = $date->modify('monday this week')->setTime(5, 0)->getTimestamp();
        return $timestamp < $start ? $start - 7 * 86400 : $start;
    }

    private static function rank(?string $name): ?int
    {
        $name = strtoupper(trim(preg_replace('/\bLEAGUE\b/i', '', $name ?? '') ?? ''));
        if (preg_match('/^LEGEND\s+(III|II|I)$/', $name, $m)) return ['III' => 34, 'II' => 35, 'I' => 36][$m[1]];
        $families = ['SKELETON', 'BARBARIAN', 'ARCHER', 'WIZARD', 'VALKYRIE', 'WITCH', 'GOLEM', 'PEKKA', 'TITAN', 'DRAGON', 'ELECTRO'];
        if (!preg_match('/^([A-Z.\s]+?)\s+(\d+)$/', $name, $m)) return null;
        $family = array_search(str_replace(['.', ' '], '', $m[1]), $families, true);
        $level = (int)$m[2];
        return $family !== false && $level >= $family * 3 + 1 && $level <= $family * 3 + 3 ? $level : null;
    }

    public static function report(array $player, string $updated, array $history, array $snapshots, ?string $sessionTier): array
    {
        $observed = strtotime($updated);
        if ($observed === false) throw new \InvalidArgumentException('Invalid profile observation time');
        $week = self::weekStart($observed);
        $previousWeek = $week - 7 * 86400;
        $tier = $player['leagueTier']['name'] ?? null;
        $weeks = $history['weeks'] ?? [];
        $previous = $weeks[(string)$previousWeek]['tier'] ?? null;
        $source = $previous !== null ? 'playerHistory' : null;
        if ($sessionTier !== null) { $previous = $sessionTier; $source = 'groupHistory'; }
        if ($previous === null) {
            $latest = 0;
            foreach ($snapshots as $snapshot) {
                $captured = isset($snapshot['capturedAt']) ? strtotime($snapshot['capturedAt']) : false;
                if ($captured === false) {
                    $date = $snapshot['date'] ?? '';
                    if ($date <= gmdate('Y-m-d', $previousWeek) || $date >= gmdate('Y-m-d', $week)) continue;
                    $captured = strtotime($date . 'T00:00:00Z');
                }
                if ($captured === false || $captured < $previousWeek || $captured >= $week || $captured <= $latest) continue;
                foreach ($snapshot['members'] ?? [] as $member) {
                    if (($member['tag'] ?? null) !== ($player['tag'] ?? null) || !is_string($member['leagueTier']['name'] ?? null)) continue;
                    $previous = $member['leagueTier']['name']; $latest = $captured; $source = 'clanSnapshot';
                }
            }
        }
        if ($previous !== null) $weeks[(string)$previousWeek] = ['tier' => $previous, 'source' => $source];
        if (is_string($tier) && $tier !== '') {
            $stored = $weeks[(string)$week] ?? [];
            if (strtotime($stored['observedAt'] ?? '') <= $observed) $weeks[(string)$week] = ['tier' => $tier, 'source' => 'playerProfile', 'observedAt' => $updated];
        }
        ksort($weeks, SORT_NUMERIC);
        $weeks = array_slice($weeks, -52, null, true);
        $before = self::rank($previous); $after = self::rank($tier);
        $status = $before === null || $after === null ? 'unknown' : ($after > $before ? 'promoted' : ($after < $before ? 'demoted' : 'unchanged'));
        return ['history' => ['playerTag' => $player['tag'] ?? null, 'weeks' => $weeks],
            'transition' => ['status' => $status, 'previousTier' => $previous, 'currentTier' => $tier,
                'seasonId' => $week, 'previousSeasonId' => $previousWeek, 'source' => $source]];
    }
}
