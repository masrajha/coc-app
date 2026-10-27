# Demo Battle Log

Open `/battle-log-style/demo.html` through the existing PHP server.

The demo loads the original `coc_pixel_match.css` unchanged. `demo.css` adds
two independent six-column grids, a canvas that grows with the number of rows,
local trophy images, and an optional refined game-like typography/color preset.
The original `coc_bold_preview.html` remains available for comparison.

The default illustrative sample has 24 attacks, 22 defenses and two +11 defense
bonuses. Header totals are calculated from those records: 844 + 266 = 1110.
The 30/56-cell scenarios are synthetic layout stress cases, not API claims.

Controls: original/refined style, fit/100%/125% zoom, player name, grid/list,
individual card details, close/reopen preview.

List mode uses two side-by-side lists with the reference column order:
opponent name, destruction percentage, stars, trophy points. Sample names and
the first percentages follow the supplied list reference. Open
`/battle-log-style/demo.html?view=list` to start directly in list mode.

No API data, application theme changes, or image-sharing integration is included.
The demo uses local `fonts/LilitaOne-Regular.ttf`, downloaded unmodified from
https://github.com/google/fonts/tree/main/ofl/lilitaone with its bundled OFL.txt.
Lilita One is not the official Clash of Clans game font. Trophy artwork comes
from the application's existing `/assets/trophy.png`.

## Integrated player view

`player-view.html` is the application frame for Player Ranked League Game mode.
It receives real session data from its same-origin parent using postMessage;
`/ranked-game-view.js` renders it without demo fixtures or API requests.
The standalone `demo.html` remains available for visual reference.

Mode Game terintegrasi menyediakan Gambar / Bagikan, pratinjau PNG 1440 px, unduh, dan native file sharing bila didukung. Ekspor mengikuti mode kotak/daftar serta urutan aktif. Library html-to-image 1.11.13 disimpan lokal di `public/assets/libs/html-to-image/` dengan lisensi MIT.
