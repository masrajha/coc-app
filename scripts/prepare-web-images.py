"""Create web-sized WebP derivatives; original artwork remains the master.

Run locally with Python + Pillow: python scripts/prepare-web-images.py
Hosting only needs the generated optimized directory, not Python.
"""
from pathlib import Path
from PIL import Image, ImageOps
import json

ROOT = Path(__file__).resolve().parents[1] / 'public/assets/images'
OUT = ROOT / 'optimized'
JOBS = [
    ('icons/hot-badge.png', 'hot-badge.webp', (120, 74), 85),
    ('hero/hero-dragon-battle.webp', 'hero-desktop.webp', (1600, 900), 78),
    ('hero/hero-dragon-battle.webp', 'hero-tablet.webp', (960, 540), 78),
    ('hero/hero-mobile-portrait.png', 'hero-mobile.webp', (720, 1080), 78),
    ('hero/hero-fortress-blue.webp', 'fortress-backdrop.webp', (960, 540), 76),
    ('characters/barbarian-king-large.png', 'barbarian-king.webp', (420, 630), 82),
    ('characters/archer-queen-large.png', 'archer-queen.webp', (420, 630), 82),
    ('characters/grand-warden-large.png', 'grand-warden.webp', (420, 630), 82),
    ('characters/golem-large.png', 'golem.webp', (480, 480), 82),
    ('characters/fortified-town-hall.png', 'town-hall.webp', (436, 286), 82),
    ('feature-cards/war-command.webp', 'feature-war.webp', (720, 360), 80),
    ('feature-cards/player-progress.webp', 'feature-player.webp', (720, 360), 80),
    ('feature-cards/ranked-league.webp', 'feature-ranked.webp', (720, 360), 80),
    ('ornaments/stone-metal-frame.png', 'panel-frame.webp', (960, 640), 80),
] + [(f'icons/{name}.png', f'icon-{name}.webp', (64, 64), 82)
     for name in ['shield', 'players', 'swords', 'crown', 'trophy', 'statistics']]


def main():
    OUT.mkdir(exist_ok=True)
    manifest = []
    for relative, filename, size, quality in JOBS:
        source, target = ROOT / relative, OUT / filename
        with Image.open(source) as original:
            image = ImageOps.exif_transpose(original)
            image.thumbnail(size, Image.Resampling.LANCZOS)
            image.save(target, 'WEBP', quality=quality, method=6, exact=True)
            with Image.open(target) as check:
                check.load()
                assert check.width <= size[0] and check.height <= size[1]
                if 'A' in original.getbands():
                    assert 'A' in check.getbands(), f'Alpha lost: {filename}'
            entry = dict(file=filename, source=relative, width=image.width,
                         height=image.height, bytes=target.stat().st_size,
                         sourceBytes=source.stat().st_size)
            manifest.append(entry)
            print(f'{filename}: {image.width}x{image.height}, {entry["bytes"] / 1024:.1f} KiB')
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    before, after = (sum(row[key] for row in manifest) for key in ['sourceBytes', 'bytes'])
    print(f'Total: {before / 1024:.0f} -> {after / 1024:.0f} KiB ({(1 - after / before) * 100:.1f}% smaller)')


if __name__ == '__main__':
    main()
