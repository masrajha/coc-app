<?php

declare(strict_types=1);

namespace CocTracker;

final class ClanCapitalReport
{
    public static function progress(array $capital, array $snapshots, string $today): array
    {
        $baseline = null;
        foreach ($snapshots as $snapshot) {
            if (($snapshot['date'] ?? '') < $today && is_array($snapshot['clanCapital'] ?? null)
                && ($baseline === null || $snapshot['date'] > $baseline['date'])) $baseline = $snapshot;
        }
        $previous = [];
        foreach ($baseline['clanCapital']['districts'] ?? [] as $district) {
            if (isset($district['id'])) $previous[$district['id']] = $district['districtHallLevel'] ?? null;
        }
        $rows = [];
        foreach ($capital['districts'] ?? [] as $district) {
            $level = $district['districtHallLevel'] ?? null;
            $before = $previous[$district['id'] ?? ''] ?? null;
            $rows[] = ['id' => $district['id'] ?? null, 'name' => $district['name'] ?? null,
                'level' => $level, 'previousLevel' => $before,
                'delta' => is_numeric($level) && is_numeric($before) ? $level - $before : null];
        }
        return ['capitalHallLevel' => $capital['capitalHallLevel'] ?? null,
            'baselineDate' => $baseline['date'] ?? null, 'districts' => $rows];
    }
}
