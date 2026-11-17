# Katalog level bersama — T19-2 dan T19-3

Tanggal pemeriksaan: **17 November 2026**. Paket aktif: **2026-11-17.2**.

## Perubahan aplikasi

`src/GameCatalog.php` menjadi resolver maksimum Home Village untuk progres, Army, compare dan pemilihan gambar hero berdasarkan rasio progres. Tabel parsial `MAX_LEVELS` lama telah diganti. Maksimum global API tetap tersedia sebagai informasi terpisah, tetapi tidak menjadi fallback maksimum sesuai TH.

Resolver mengembalikan maksimum sesuai TH, sumber, versi data, status kecocokan, dan status item dikenal/tidak dikenal. Level yang melampaui katalog menghasilkan batas tidak tersedia, bukan skor lebih dari 100%. Equipment mengikuti persyaratan hero dan Blacksmith; hero mengikuti baris persyaratan Hero Hall; troop/spell mengikuti TH dan Laboratory. Metadata pet baru seperti Greedy Raven ikut digunakan untuk klasifikasi.

Skor parsial hanya mencakup item dengan cap terverifikasi. Jumlah item diamati, terpetakan, belum terpetakan, dan item katalog yang tidak ada dalam respons tetap dipisahkan. Item tidak ada dalam API **tidak diasumsikan level nol**. Status rushed hanya dinilai pada TH11 ke atas jika katalog dan respons memiliki cakupan lengkap.

## Sumber dan cakupan

- Sumber komunitas: [clash-of-clans-data](https://github.com/chiefpansancolt/clash-of-clans-data/tree/7afaa0375e5865c04021836a3a4192ffcfea092d), revisi `7afaa0375e5865c04021836a3a4192ffcfea092d`, MIT. Revisi dan isi utama diperiksa ulang pada 17 November; data upstream masih berhenti pada TH18.
- Source lock mencakup **189 file** (termasuk LICENSE dan package.json). File helper tidak diperlukan dan tidak diimpor. Setiap file dikunci dengan SHA-256 dan ukuran.
- Overlay terbatas berasal dari [patch notes resmi Supercell](https://supercell.com/en/games/clashofclans/blog/release-notes/the-clash-of-titans-update-is-rolling-out/). Tersimpan di `scripts/game-catalog/th19-overlay.json`, terpisah dari data upstream.
- Paket akhir berisi **192 entitas**, dengan 70 entitas berubah/ditambahkan dibanding baseline. Laporan mencatat konflik ringkasan Hero Hall terhadap baris level hero; baris persyaratan level menjadi acuan resolver.

| Kategori | Cap TH18 tersedia | Cap TH19 tersedia |
|---|---:|---:|
| Hero | 6 | 6 |
| Pasukan + mesin pengepungan | 41 | 30 |
| Spell | 19 | 7 |
| Pet | 12 | 1 |
| Equipment | 43 | 0 |

Jumlah ini adalah jumlah item yang cap-nya diketahui, bukan klaim jumlah maksimum semua item TH19. Batas TH19 yang tidak diumumkan tidak diwariskan dari TH18. Equipment TH19 belum dikonfirmasi oleh sumber yang dipakai sehingga tetap tidak tersedia untuk penilaian sesuai TH19.

Pembaruan juga mencakup perubahan pada TH lebih rendah: Angry Jelly maksimum 15 pada TH18, Heroic Spell maksimum 2/3/4 pada TH17/18/19, dan bangunan sumber daya TH18. Pada bagian referensi, HP Air Defense 16 diperbarui menjadi 2050, HP dua defense baru disimpan, dan supercharge yang dihapus diberi status tersendiri. HP/damage level baru lain tetap `null` jika belum diketahui.

**Katalog cap ini tidak langsung menjadi dataset simulasi Zapquake.** Semua entitas di katalog tetap mencantumkan `simulationReady: false`. Pada T19-4, paket Zapquake terpisah `2026-11-17.3` menambahkan dua target TH19 yang sudah memenuhi syarat. Lihat [TH19_SIMULATION_AND_ENTITIES.md](TH19_SIMULATION_AND_ENTITIES.md) untuk cakupan terbaru, modifier bertanggal dan entitas baru.

## Build dan publikasi

Python hanya diperlukan pada saat build. Hosting PHP membaca paket JSON yang sudah dipublikasikan.

```powershell
# Unduh sumber publik yang sudah dikunci checksum, lalu buat preview.
python scripts/prepare-game-catalog.py --download

# Build offline dari sumber yang sudah diunduh; tidak mengaktifkan data.
python scripts/prepare-game-catalog.py

# Publikasikan rilis immutable dan pindahkan manifest aktif secara atomik.
python scripts/prepare-game-catalog.py --publish
```

Build memverifikasi identitas sumber, checksum, ukuran, lisensi dan cap. Laporan serta preview ada di `audits/th19/catalog/`. Rilis yang sudah ada ditolak jika isinya berbeda; perubahan berikutnya harus memakai versi baru pada source lock.

File yang dibutuhkan hosting: `src/GameCatalog.php`, perubahan `src/App.php`, JS terubah, dan **seluruh folder `public/assets/data/game-catalog`**, termasuk manifest. Jangan hanya mengunggah manifest tanpa rilis yang dirujuknya.

Katalog hilang atau checksum tidak cocok menghasilkan cap tidak tersedia; aplikasi tidak kembali memakai maksimum API. Respons profil/progres dihitung dengan versi katalog aktif sehingga cache API mentah tidak perlu dihapus massal. Snapshot mentah dan rilis sebelumnya tidak ditimpa.

## Rollback

Baseline sebelum overlay disimpan sebagai rilis terpisah. Ini mengembalikan katalog cap sumber TH18, bukan tabel parsial lama.

```powershell
python scripts/prepare-game-catalog.py --activate 2026-11-17.2-baseline
python scripts/prepare-game-catalog.py --activate 2026-11-17.2
```

Aktivasi memeriksa checksum rilis dan lisensi sebelum mengganti manifest. Tanggal artikel tidak dianggap tanggal efektif aturan historis.

## Pengujian dan batas verifikasi

```powershell
composer test
composer test:catalog
node --test tests/player-overview.test.js tests/compare-overview.test.js tests/i18n.test.js tests/theme.test.js
python scripts/audit-th19.py
```

Tes mencakup cap per TH, Hero Hall/Lab/Blacksmith, cap API yang sengaja salah, TH19 parsial, item baru, klasifikasi pet, data di atas katalog, build deterministik, checksum gagal, publikasi immutable dan rollback.

Fixture TH18 asli telah dianonimkan. Fixture TH19 masih sintetis; respons API TH19 aktual belum tersedia pada cache yang diperiksa. Hal ini tidak menghalangi penggunaan cap resmi, tetapi belum membuktikan field baru guardian/squad pada API pemain. Tidak ada kredensial API dibaca untuk build ini.
