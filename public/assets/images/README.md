# CoC Clan Command Center — aset homepage

Paket ini berisi berkas PNG transparan (untuk karakter dan ikon) serta WebP (untuk latar dan feature cards). Tidak ada teks di dalam gambar feature cards, sehingga judul bisa diatur dengan HTML/CSS, dan dapat diterjemahkan.

## Rekomendasi penempatan
- `hero/hero-banner-characters.webp`: banner dekoratif penuh, di bawah navbar atau di area hero. Agar teks terbaca, tambahkan gradient dark-overlay.
- `hero/hero-fortress-blue.webp`: alternatif background hero dengan istana fantasi.
- `hero/hero-dragon-battle.webp`: alternatif hero besar; sisakan area kosong di kanan untuk judul atau CTA.
- `hero/dragon-duke-cutout.png`: dekorasi Dragon Duke transparan di kiri hero atau floating overlay.
- `characters/barbarian-king.png`, `archer-queen.png`, `grand-warden.png`: overlay hero/quick access dengan ukuran asli yang terbatas; jangan dibesarkan berlebihan karena resolusi sumber hanya ~250px.
- `characters/fortified-town-hall.png`: gambar kastil untuk fitur war.
- `emblems/*.png`: ranked-league dan decoration. Beberapa bagian berpendar, butuh latar gelap.
- `icons/*.png`: ikon shortcut fitur, crop dari asset sheet; dekoratif dan lebih baik di 40–72px.
- `feature-cards/*.webp`: gambar untuk 3 feature card, tempatkan sebagai background dengan teks HTML di sisi kiri.
- `backgrounds/*.webp`: background sekunder, pilih untuk section showcase atau dekorasi.

## Contoh penggunaan CSS
```css
.home-hero { background: linear-gradient(90deg, rgba(8,15,29,.7),rgba(8,15,29,.15)), url('/assets/hero/hero-banner-characters.webp') center/cover no-repeat; }
.feature--war { background: url('/assets/feature-cards/war-command.webp') center/cover no-repeat; }
.feature--player { background: url('/assets/feature-cards/player-progress.webp') center/cover no-repeat; }
.feature--league { background: url('/assets/feature-cards/ranked-league.webp') center/cover no-repeat; }
```

## Catatan
Aset adalah ilustrasi berbasis referensi Clash of Clans, beberapa dihasilkan AI, beberapa berasal dari gambar yang diunggah pengguna. Untuk situs publik, periksa hak penggunaan visual/game art, merek, dan kebijakan fan content Supercell.
