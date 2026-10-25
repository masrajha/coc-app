<?php
declare(strict_types=1);

namespace CocTracker;

/** Symmetric war rosters. Stars on a base represent its best incoming attack. */
final class WarMap
{
    public static function rosters(array $clan, array $opponent, ?int $quota): array
    {
        $sides = [array_values($clan['members'] ?? []), array_values($opponent['members'] ?? [])];
        $lookup = [];
        foreach ($sides as $members) foreach ($members as $member) {
            if (!empty($member['tag'])) $lookup[strtoupper($member['tag'])] = $member;
        }
        $attacks = [[], []];
        foreach ($sides as $side => $members) foreach ($members as $member) foreach ($member['attacks'] ?? [] as $attack) {
            $defender = $lookup[strtoupper($attack['defenderTag'] ?? '')] ?? [];
            $attacks[$side][] = [
                'attackerTag' => $member['tag'] ?? $attack['attackerTag'] ?? null,
                'attackerName' => $member['name'] ?? null, 'attackerPosition' => $member['mapPosition'] ?? null,
                'defenderTag' => $attack['defenderTag'] ?? null, 'defenderName' => $defender['name'] ?? null,
                'defenderPosition' => $defender['mapPosition'] ?? null,
                'stars' => $attack['stars'] ?? null, 'destructionPercentage' => $attack['destructionPercentage'] ?? null,
                'order' => $attack['order'] ?? null, 'duration' => $attack['duration'] ?? null,
            ];
        }
        $result = [];
        foreach ($sides as $side => $members) {
            $rows = [];
            foreach ($members as $member) {
                $tag = strtoupper($member['tag'] ?? '');
                $outgoing = array_values(array_filter($attacks[$side], static fn($a) => $tag !== '' && strtoupper($a['attackerTag'] ?? '') === $tag));
                $incoming = array_values(array_filter($attacks[1 - $side], static fn($a) => $tag !== '' && strtoupper($a['defenderTag'] ?? '') === $tag));
                $bestCandidates = $incoming;
                if (is_array($member['bestOpponentAttack'] ?? null)) {
                    $best = $member['bestOpponentAttack'];
                    $attacker = $lookup[strtoupper($best['attackerTag'] ?? '')] ?? [];
                    $bestCandidates[] = $best + ['attackerName' => $attacker['name'] ?? null];
                }
                usort($bestCandidates, static fn($a, $b) => ($b['stars'] ?? -1) <=> ($a['stars'] ?? -1) ?: ($b['destructionPercentage'] ?? -1) <=> ($a['destructionPercentage'] ?? -1));
                $best = $bestCandidates[0] ?? null;
                $received = max(count($incoming), (int)($member['opponentAttacks'] ?? 0), $best ? 1 : 0);
                $rows[] = [
                    'tag' => $member['tag'] ?? null, 'name' => $member['name'] ?? null,
                    'mapPosition' => $member['mapPosition'] ?? null, 'townhallLevel' => $member['townhallLevel'] ?? null,
                    'attacks' => $outgoing, 'incomingAttacks' => $incoming,
                    'attacksUsed' => count($outgoing), 'attacksRemaining' => $quota === null ? null : max(0, $quota - count($outgoing)),
                    'starsEarned' => array_sum(array_column($outgoing, 'stars')),
                    'destructionAverage' => $outgoing ? round(array_sum(array_column($outgoing, 'destructionPercentage')) / count($outgoing), 2) : 0,
                    'attacksReceived' => $received, 'bestStars' => $best['stars'] ?? ($received ? null : 0),
                    'bestDestruction' => $best['destructionPercentage'] ?? ($received ? null : 0),
                    'bestAttackerName' => $best['attackerName'] ?? null,
                ];
            }
            usort($rows, static fn($a, $b) => ($a['mapPosition'] ?? PHP_INT_MAX) <=> ($b['mapPosition'] ?? PHP_INT_MAX));
            $result[] = $rows;
        }
        return $result;
    }
}
