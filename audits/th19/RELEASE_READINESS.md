# T19-6 / T19-7 — hasil pemeriksaan rilis

Tanggal pemeriksaan: **17 November 2026 (Asia/Jakarta)**.

**Keputusan: siap untuk rilis terbatas sesuai cakupan terverifikasi. Dukungan TH19 penuh belum dinyatakan siap.** Pemeriksaan ini dilakukan di workspace lokal; bukan bukti deployment atau validasi konfigurasi hosting.

## Versi dan sumber

| Komponen | Versi |
|---|---|
| Katalog cap progres | `2026-11-17.2` |
| Dataset Zapquake | `2026-11-17.3` |
| Engine Zapquake | `2.3.0` |
| Profil modifier | `2026-11-17.1` |
| Metadata entitas baru | `2026-11-17.1` |
| Batch artwork | `2026-11-17.2` |
| Cache konteks share | `3` |

Checksum dan sumber statistik: `scripts/game-catalog/source-lock.json`, `scripts/game-catalog/th19-overlay.json`, manifest masing-masing dataset, serta laporan pada folder `audits/th19/catalog` dan `audits/th19/zapquake`.

## Aset dan konten

- Delapan aset WebP lokal: TH19, Spiky Tower 1/2, Firecracker Tower 1/2, Guardian Shrine, Squad Barracks, dan Heroic Spell.
- Total **52.708 byte**, maksimum sisi **144 piksel**, masing-masing di bawah 24 KB. Dimensi, format, ukuran dan SHA-256 diperiksa terhadap manifest.
- Sumber gambar dan checksum sebelum/sesudah kompresi dicatat pada `scripts/th19/artwork-lock.json` dan `public/assets/images/th19/sources.json`. Artwork berasal dari Clash of Clans Wiki; gambar game milik Supercell. Tidak ada hotlink untuk aset baru ini.
- Aset dipakai pada profil, roster, war map, compare, kalkulator, panel referensi, serta ikon lokal Heroic Spell. Gambar TH di kartu share memakai file lokal bila dukungan GD/WebP tersedia; fallback raster tetap menyebut TH19.
- Fitur, FAQ dan panduan Zapquake Indonesia/English menyebut dukungan TH19 parsial. Canonical, hreflang, sitemap dan schema tetap valid; tanggal pembaruan konten Zapquake menjadi 17 November.
- CSV pemain dan CSV/PNG perbandingan menyertakan TH, versi katalog dan cakupan. Skor parsial tidak diekspor seolah-olah lengkap; angka nol tetap angka nol, sedangkan nilai tidak diketahui tetap tidak tersedia.

## Hasil gate

| Pemeriksaan | Hasil |
|---|---|
| Suite PHP aplikasi (`composer test`) | Lulus, termasuk 83 rute smoke dan paket tes fitur |
| Gate TH19 (`composer test:th19`) | Lulus |
| Seluruh tes JavaScript | **72 lulus, 0 gagal** |
| Tes pipeline katalog Python | **3 lulus** |
| Audit baseline dan checksum aktif | Lulus; rilis sebelum TH19 tetap utuh |
| Browser aktual | **96 kasus layout**: player, compare, clan/war map, Zapquake × ID/EN × 1440/390/320 × empat tema |
| Decode delapan WebP dalam browser | Lulus |
| Ekspor CSV dan PNG dalam browser | Lulus; CSV perbandingan tetap berbentuk tabel 18 kolom, PNG 1200×770 memuat versi dan status parsial |
| Share PNG server | Lulus, 1200×630, metadata TH19 dan kedua bahasa |
| Simulasi rollback statistik di browser | Lulus; UI menghapus pilihan TH19 saat memakai paket TH18 lama |

Sembilan tes War lama sebelumnya memakai renderer lama tanpa dependency `ClanWarSummary`. Harness diperbarui untuk memakai renderer aktif dan menangkap hasil kalkulasinya. Pemeriksaan perfect draw, star cap, destruksi, preparation dan sisa serangan tetap dijalankan; tidak ada perubahan perilaku produksi untuk meloloskan tes tersebut.

## Menjalankan ulang

```powershell
composer test
composer test:th19
php scripts/prepare-zapquake-th19.php
python scripts/prepare-game-catalog.py
python scripts/audit-th19.py
```

Tes browser membutuhkan Node yang menyediakan `WebSocket`, PHP CLI, dan Chrome dengan remote debugging. Jalankan instance khusus secara headless; jangan gunakan profil Chrome pribadi.

```powershell
$th19BrowserProfile = Join-Path (Get-Location) '.chrome-icon-test/th19-browser-profile'
Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -WindowStyle Hidden -ArgumentList "--headless=new --disable-gpu --no-first-run --remote-debugging-port=9338 --user-data-dir=`"$th19BrowserProfile`" about:blank"
node tests/th19-browser.cjs --cdp=http://127.0.0.1:9338
```

Gate browser membuat fixture lokal dengan PHP, memblokir request HTTPS eksternal, memeriksa file ekspor tanpa mengunduhnya ke folder pribadi, dan mensimulasikan rollback melalui server fixture. Manifest aplikasi yang sebenarnya tidak diubah oleh tes rollback ini.

Reproduksi gambar menggunakan Pillow hanya saat build:

```powershell
python scripts/prepare-th19-assets.py --download
```

## Batas yang masih terbuka

- Fixture profil TH19 asli yang dianonimkan belum tersedia. Pengujian TH19 memakai fixture sintetis; fixture TH18 berasal dari cache API yang sudah dianonimkan. Kontrak field Squad/Guardian/Town Hall troop yang baru masih perlu dikonfirmasi terhadap respons nyata.
- HP Town Hall 19, HP level hero baru, damage Lightning 14 dan beberapa batas equipment belum cukup terverifikasi untuk simulasi. Tanggal 5–15 November tetap di luar rentang modifier yang ditinjau.
- Pemetaan zona memakai nama/nomor kumulatif API yang sudah dikenal dan tabel pengumuman resmi. Waktu aktivasi intrahari serta perilaku transisi pada sesi yang sudah berjalan tidak diklaim terverifikasi; kebijakan versi memakai tanggal kalender UTC sesi seperti didokumentasikan.
- GD tidak tersedia pada PHP CLI lingkungan pemeriksaan ini. Fallback PNG/no-GD sudah diuji; tampilan ikon WebP dalam renderer GD perlu dikonfirmasi di hosting yang menyediakan ekstensi tersebut.

Kondisi di atas tidak diubah menjadi angka perkiraan atau klaim kepemilikan pemain. Cakupan yang sudah terverifikasi dapat dirilis; dukungan penuh menunggu sumber dan validasi tambahan.

## Deployment dan rollback

Upload kode PHP, HTML/JS/CSS terubah, `public/js/profile-export.js`, seluruh rilis yang dirujuk manifest, metadata game-features, dan delapan aset baru beserta manifest sumbernya. Jangan mengunggah manifest data tanpa isi direktori rilisnya. Request manifest memakai kebijakan cache segar; rilis data lama tetap immutable. Perubahan JS/CSS mengikuti fingerprint aset yang sudah digunakan aplikasi. Cache share memakai versi konteks baru agar tidak mengambil kartu lama sebagai kartu terbaru.

Rollback statistik dan katalog terpisah; tidak menghapus snapshot, histori sesi, atau rilis sebelumnya:

```powershell
php scripts/prepare-zapquake-data.php --activate=2026-11-04.5
python scripts/prepare-game-catalog.py --activate 2026-11-17.2-baseline

# Aktifkan kembali paket terbaru setelah pemeriksaan.
php scripts/prepare-zapquake-data.php --activate=2026-11-17.3
python scripts/prepare-game-catalog.py --activate 2026-11-17.2
```

Rollback data tidak otomatis membatalkan kode aturan bertanggal. Untuk rollback kode, gunakan revisi kode yang sesuai sebagai perubahan tersendiri setelah peninjauan.
