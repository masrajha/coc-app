<?php
declare(strict_types=1);

namespace CocTracker;

final class GlobalRankings
{
    public const MAX_PLAYERS = 20000;

    public static function advance(array $index, string $tag, callable $fetch, string $location = 'global'): array
    {
        $index += ['players' => [], 'scanned' => 0, 'after' => null, 'done' => false, 'seenCursors' => []];
        // Incremental requests keep the player profile responsive. The shared
        // index is reused when another player needs a rank from the same pages.
        for ($page = 0; $page < 2 && !$index['done'] && !isset($index['players'][$tag]); $page++) {
            $path = '/locations/' . rawurlencode($location) . '/rankings/players?limit=1000';
            if ($index['after'] !== null) $path .= '&after=' . rawurlencode($index['after']);
            $entry = $fetch($path);
            $items = $entry['data']['items'] ?? [];
            foreach ($items as $item) {
                if (!is_string($item['tag'] ?? null) || !is_numeric($item['rank'] ?? null) || (int)$item['rank'] < 1) continue;
                $index['players'][strtoupper($item['tag'])] = ['rank' => (int)$item['rank'],
                    'trophies' => $item['trophies'] ?? null, 'lastUpdated' => $entry['lastUpdated']];
            }
            $index['scanned'] += count($items);
            $index['lastUpdated'] = $entry['lastUpdated'];
            $after = $entry['data']['paging']['cursors']['after'] ?? null;
            $repeated = is_string($after) && in_array($after, $index['seenCursors'], true);
            $index['done'] = !$items || !is_string($after) || $after === '' || $repeated || $index['scanned'] >= self::MAX_PLAYERS;
            if (!$index['done']) $index['seenCursors'][] = $after;
            $index['after'] = $index['done'] ? null : $after;
        }
        return $index;
    }

    public static function result(array $index, string $tag): array
    {
        $match = $index['players'][$tag] ?? null;
        $rank = $match['rank'] ?? null;
        return ['playerTag' => $tag, 'rank' => $rank, 'trophies' => $match['trophies'] ?? null,
            'standing' => $rank === null ? 'unknown' : ($rank <= 10000 ? 'withinCutoff' : 'demotionZone'),
            'scanned' => $index['scanned'] ?? 0, 'scanLimit' => self::MAX_PLAYERS,
            'canContinue' => $rank === null && !($index['done'] ?? false),
            'lastUpdated' => $match['lastUpdated'] ?? $index['lastUpdated'] ?? null,
            'provisional' => true];
    }
}
