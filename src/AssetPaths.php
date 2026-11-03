<?php

declare(strict_types=1);
namespace CocTracker;

/** Compatibility paths for bookmarked assets and HTML cached before the folder migration. */
final class AssetPaths
{
    public static function relocated(string $path): ?string
    {
        foreach ([
            'assets/brand/' => 'assets/images/brand/',
            'assets/profile/' => 'assets/images/profile/',
            'assets/capital/' => 'assets/images/capital/',
            'assets/donation/' => 'assets/images/donation/',
            'public/icons/' => 'assets/images/army/',
            'icons/' => 'assets/images/army/',
            'assets/libs/html-to-image/' => 'js/vendor/html-to-image/',
        ] as $old => $new) {
            if (str_starts_with($path, $old)) return $new . substr($path, strlen($old));
        }
        if ($path === 'assets/trophy.png') return 'assets/images/battle-log/trophy.png';
        if (in_array($path, ['battle-log-style/coc_pixel_match.css','battle-log-style/demo.css'], true)) return 'css/battle-log/' . basename($path);
        if ($path === 'battle-log-style/demo.js') return 'js/battle-log/demo.js';
        if (str_contains($path, '/')) return null;
        if (str_ends_with($path, '.js')) return 'js/' . $path;
        if (str_ends_with($path, '.css')) return 'css/' . $path;
        if (preg_match('/^th-[0-9]+\.webp$/', $path)) return 'assets/images/town-hall/' . $path;
        if (preg_match('/^bh-[0-9]+\.webp$/', $path)) return 'assets/images/builder-hall/' . $path;
        if (preg_match('/^cwl-[a-z0-9-]+\.png$/', $path)) return 'assets/images/leagues/cwl/' . $path;
        if (preg_match('/^league-[a-z-]+\.png$/', $path)) return 'assets/images/leagues/player/' . $path;
        if (in_array($path, ['favicon.svg','favicon.ico'], true)) return 'assets/images/brand/' . $path;
        return null;
    }
}
