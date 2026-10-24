<?php
declare(strict_types=1);

namespace CocTracker;

/** A 1200x630 Royal Gold card. The built-in raster fallback needs only zlib. */
final class ShareCard
{
    private mixed $image = null;
    private array $rows = [];
    private string $font;
    private const WIDTH = 1200;
    private const HEIGHT = 630;
    private const FONT = [
        'A'=>'01110/10001/10001/11111/10001/10001/10001','B'=>'11110/10001/10001/11110/10001/10001/11110',
        'C'=>'01111/10000/10000/10000/10000/10000/01111','D'=>'11110/10001/10001/10001/10001/10001/11110',
        'E'=>'11111/10000/10000/11110/10000/10000/11111','F'=>'11111/10000/10000/11110/10000/10000/10000',
        'G'=>'01111/10000/10000/10111/10001/10001/01111','H'=>'10001/10001/10001/11111/10001/10001/10001',
        'I'=>'11111/00100/00100/00100/00100/00100/11111','J'=>'00111/00010/00010/00010/10010/10010/01100',
        'K'=>'10001/10010/10100/11000/10100/10010/10001','L'=>'10000/10000/10000/10000/10000/10000/11111',
        'M'=>'10001/11011/10101/10101/10001/10001/10001','N'=>'10001/11001/10101/10011/10001/10001/10001',
        'O'=>'01110/10001/10001/10001/10001/10001/01110','P'=>'11110/10001/10001/11110/10000/10000/10000',
        'Q'=>'01110/10001/10001/10001/10101/10010/01101','R'=>'11110/10001/10001/11110/10100/10010/10001',
        'S'=>'01111/10000/10000/01110/00001/00001/11110','T'=>'11111/00100/00100/00100/00100/00100/00100',
        'U'=>'10001/10001/10001/10001/10001/10001/01110','V'=>'10001/10001/10001/10001/10001/01010/00100',
        'W'=>'10001/10001/10001/10101/10101/10101/01010','X'=>'10001/10001/01010/00100/01010/10001/10001',
        'Y'=>'10001/10001/01010/00100/00100/00100/00100','Z'=>'11111/00001/00010/00100/01000/10000/11111',
        '0'=>'01110/10001/10011/10101/11001/10001/01110','1'=>'00100/01100/00100/00100/00100/00100/01110',
        '2'=>'01110/10001/00001/00010/00100/01000/11111','3'=>'11110/00001/00001/01110/00001/00001/11110',
        '4'=>'00010/00110/01010/10010/11111/00010/00010','5'=>'11111/10000/10000/11110/00001/00001/11110',
        '6'=>'01110/10000/10000/11110/10001/10001/01110','7'=>'11111/00001/00010/00100/01000/01000/01000',
        '8'=>'01110/10001/10001/01110/10001/10001/01110','9'=>'01110/10001/10001/01111/00001/00001/01110',
        '#'=>'01010/01010/11111/01010/11111/01010/01010','-'=>'00000/00000/00000/11111/00000/00000/00000',
        '.'=>'00000/00000/00000/00000/00000/00110/00110',','=>'00000/00000/00000/00000/00110/00110/00100',
        ':'=>'00000/00110/00110/00000/00110/00110/00000','/'=>'00001/00010/00010/00100/01000/01000/10000',
        '+'=>'00000/00100/00100/11111/00100/00100/00000','%'=>'11001/11010/00100/01000/10110/00110/00000',
        '('=>'00010/00100/01000/01000/01000/00100/00010',')'=>'01000/00100/00010/00010/00010/00100/01000',
        "'"=>'00100/00100/00000/00000/00000/00000/00000','?'=>'01110/10001/00001/00010/00100/00000/00100',
        '&'=>'01100/10010/10100/01000/10101/10010/01101',' '=>'00000/00000/00000/00000/00000/00000/00000',
    ];

    public function __construct(bool $forceFallback = false)
    {
        $this->font = __DIR__ . '/../public/fonts/NotoSans-Regular.ttf';
        if (!$forceFallback && function_exists('imagecreatetruecolor')) {
            $this->image = imagecreatetruecolor(self::WIDTH, self::HEIGHT);
            imagealphablending($this->image, true);
        } else {
            $this->rows = array_fill(0, self::HEIGHT, str_repeat("\x10\x17\x25", self::WIDTH));
        }
    }

    private function color(string $hex): int { return (int)hexdec(ltrim($hex, '#')); }

    private function rectangle(int $x, int $y, int $width, int $height, string $hex): void
    {
        $right = min(self::WIDTH, $x + $width); $bottom = min(self::HEIGHT, $y + $height);
        $x = max(0, $x); $y = max(0, $y);
        if ($right <= $x || $bottom <= $y) return;
        if ($this->image !== null) {
            imagefilledrectangle($this->image, $x, $y, $right - 1, $bottom - 1, $this->color($hex)); return;
        }
        $color = $this->color($hex);
        $segment = str_repeat(chr(($color >> 16) & 255) . chr(($color >> 8) & 255) . chr($color & 255), $right - $x);
        for ($row = $y; $row < $bottom; $row++) $this->rows[$row] = substr_replace($this->rows[$row], $segment, $x * 3, strlen($segment));
    }

    private function text(string $value, int $x, int $y, int $size, string $hex, int $width): void
    {
        $value = preg_replace('/\s+/u', ' ', $value) ?? '';
        if ($this->image !== null && function_exists('imagettftext') && is_file($this->font)) {
            $size *= 0.75;
            while (mb_strlen($value) > 1) {
                $box = imagettfbbox($size, 0, $this->font, $value);
                if ($box[2] - $box[0] <= $width) break;
                $value = mb_substr(rtrim($value, '.'), 0, -1) . '...';
            }
            imagettftext($this->image, $size, 0, $x, $y + (int)ceil($size * 1.25), $this->color($hex), $this->font, $value); return;
        }
        // Keep the fallback operational even on shared hosting without GD/FreeType.
        $value = strtoupper((string)iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value));
        $scale = max(1, (int)floor($size / 7)); $advance = 6 * $scale;
        $limit = max(1, (int)floor($width / $advance));
        if (strlen($value) > $limit) $value = substr($value, 0, max(0, $limit - 3)) . '...';
        foreach (str_split($value) as $letter) {
            foreach (explode('/', self::FONT[$letter] ?? self::FONT['?']) as $row => $pixels) {
                foreach (str_split($pixels) as $column => $pixel) if ($pixel === '1') $this->rectangle($x + $column * $scale, $y + $row * $scale, $scale, $scale, $hex);
            }
            $x += $advance;
        }
    }

    private function image(?string $bytes, int $x, int $y, int $size): bool
    {
        if ($this->image === null || !$bytes) return false;
        $info = @getimagesizefromstring($bytes);
        if (!$info || $info[0] > 2048 || $info[1] > 2048) return false;
        $icon = @imagecreatefromstring($bytes); if (!$icon) return false;
        $ratio = min($size / imagesx($icon), $size / imagesy($icon));
        $width = (int)round(imagesx($icon) * $ratio); $height = (int)round(imagesy($icon) * $ratio);
        imagecopyresampled($this->image, $icon, $x + (int)(($size - $width) / 2), $y + (int)(($size - $height) / 2), 0, 0, $width, $height, imagesx($icon), imagesy($icon));
        imagedestroy($icon); return true;
    }

    private function emblem(array $entity, int $x, int $y, ?callable $asset): void
    {
        $bytes = null;
        if ($this->image !== null) {
            if (is_string($entity['icon'] ?? null) && preg_match('/^league-[a-z-]+\.png$/', $entity['icon'])) {
                $file = __DIR__ . '/../public/' . $entity['icon']; if (is_file($file)) $bytes = file_get_contents($file);
            }
            if (!$bytes && $asset && !empty($entity['badgeUrl'])) $bytes = $asset($entity['badgeUrl']);
        }
        if ($this->image($bytes, $x, $y, 76)) return;
        $this->rectangle($x + 7, $y, 62, 62, '#957531');
        $this->rectangle($x + 13, $y + 6, 50, 50, '#27364c');
        $this->rectangle($x + 20, $y + 62, 36, 7, '#957531');
        $this->text((string)($entity['badgeText'] ?? 'COC'), $x + 17, $y + 23, 18, '#ffd166', 46);
    }

    public function render(array $card, ?callable $asset = null): string
    {
        $this->rectangle(0, 0, 1200, 630, '#101725');
        $this->rectangle(0, 0, 1200, 8, '#e3af35');
        $this->text('COC CLAN COMMAND CENTER', 46, 32, 25, '#ffd166', 1100);
        $this->text((string)$card['heading'], 46, 82, 40, '#fff5dd', 1100);
        $this->text((string)$card['context'], 46, 137, 23, '#d6c5a6', 1100);
        $entities = array_slice($card['entities'] ?? [], 0, 2); $count = max(1, count($entities));
        $width = $count === 2 ? 540 : 1108;
        foreach ($entities as $index => $entity) {
            $x = 46 + $index * 568;
            $this->rectangle($x, 190, $width, 327, '#40516a');
            $this->rectangle($x + 1, 191, $width - 2, 325, '#1b2639');
            $this->emblem($entity, $x + 20, 211, $asset);
            $this->text((string)$entity['name'], $x + 110, 214, $count === 2 ? 32 : 43, '#fff5dd', $width - 128);
            $this->text((string)$entity['tag'], $x + 110, 261, 21, '#a99c89', $width - 128);
            $this->text((string)($entity['subtitle'] ?? ''), $x + 23, 302, 22, '#ffd166', $width - 46);
            foreach (array_slice($entity['metrics'] ?? [], 0, 3) as $metricIndex => $metric) {
                $y = 348 + $metricIndex * 49;
                $this->text((string)$metric[0], $x + 23, $y, 21, '#d6c5a6', (int)($width * .60) - 30);
                $this->text((string)$metric[1], $x + (int)($width * .60), $y - 2, 25, '#fff5dd', (int)($width * .40) - 23);
            }
        }
        $this->text((string)($card['notice'] ?? ''), 46, 536, 19, '#ffba55', 1100);
        $this->text((string)$card['footer'], 46, 583, 17, '#a99c89', 1100);
        if ($this->image !== null) {
            ob_start(); imagepng($this->image, null, 6); $png = (string)ob_get_clean(); imagedestroy($this->image); $this->image = null; return $png;
        }
        $raw = ''; foreach ($this->rows as $row) $raw .= "\0" . $row;
        $chunk = static fn(string $name, string $data): string => pack('N', strlen($data)) . $name . $data . pack('N', crc32($name . $data));
        return "\x89PNG\r\n\x1a\n" . $chunk('IHDR', pack('NNCCCCC', 1200, 630, 8, 2, 0, 0, 0)) . $chunk('IDAT', gzcompress($raw, 6)) . $chunk('IEND', '');
    }
}
