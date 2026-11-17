# Implementasi T19-4 dan T19-5

Tanggal: **17 November 2026**. Data Zapquake aktif `2026-11-17.3`, normalizer overlay `1.4.0`, engine `2.3.0`, profil modifier `2026-11-17.1`. Katalog cap progres tetap memakai paket `2026-11-17.2`.

## Simulasi yang sudah tersedia

- Preset penyerang dan defender menerima TH19.
- Preset defender TH19 hanya menampilkan Spiky Tower dan Firecracker Tower, masing-masing dua level dengan HP dari sumber resmi.
- HP Air Defense level 16 diperbarui menjadi 2050. Angka 2000 disimpan untuk konfigurasi bertanggal sebelum 16 November.
- Supercharge yang dihapus tidak dapat dipakai pada konfigurasi terbaru. Data lama dipertahankan sebagai histori; konfigurasi lama yang secara eksplisit memilih tanggal lama tetap dapat memakai HP manual.
- Lightning level 14 belum ditambahkan karena damage belum tersedia pada sumber terverifikasi yang dipakai. Level Lightning yang sudah memiliki data tetap bisa digunakan untuk menyerang dua target TH19 baru.
- HP Town Hall 19, HP level hero baru, dan target lain dengan persyaratan/statistik TH19 belum terverifikasi tidak ditampilkan sebagai maksimum TH19. Jumlah bangunan TH19 yang belum diketahui bernilai `null`, bukan disalin dari TH18 atau ditulis 0.
- Batas equipment untuk preset penyerang TH19 belum dikonfirmasi. Mode valid menonaktifkannya; mode Eksperimen memungkinkan pengujian eksplisit terhadap equipment dengan statistik yang sudah ada. Hasil eksperimen tidak mengklaim loadout legal.
- Guardian Shrine, Squad dan Heroic Spell tidak dimasukkan sebagai sumber damage atau target Zapquake tanpa mekanik yang sesuai.

T19-6 sudah memasang artwork WebP lokal untuk dua level kedua defense, TH19 dan entitas baru. Hasil gate T19-7 serta batas integrasi tercatat di [RELEASE_READINESS.md](audits/th19/RELEASE_READINESS.md).

## Aturan bertanggal dan riwayat

Referensi: [patch notes resmi Supercell](https://supercell.com/en/games/clashofclans/blog/release-notes/the-clash-of-titans-update-is-rolling-out/).

Resolver modifier memisahkan profil sebelum update dan profil sejak tanggal rollout yang diumumkan, **16 November 2026**. Ini adalah tanggal kalender rollout dari isi pengumuman, bukan hasil menebak waktu efektif dari metadata publikasi artikel.

| Profil target hero | Sebelum update | Sejak update |
|---|---:|---:|
| Legend III | +10% HP | +15% HP |
| Legend II | +15% HP | +20% HP |
| Legend I | +20% HP | +25% HP |
| Esports | +25% HP | +30% HP |

Pemetaan CWL Titan II/III ke Legend III, Titan I ke Legend II, dan Legend ke Legend I dipertahankan sesuai periode. Modifier damage defense/Guardian dan damage serangan hero bukan pengali otomatis bagi HP bangunan atau damage equipment. Engine tetap menghitung ruang lingkup yang sudah didukung saja.

Profil terakhir ditinjau sampai 17 November. Rentang lama sampai 4 November tetap didukung; tanggal 5–15 November belum diverifikasi dan ditolak untuk preset liga. Tanggal setelah 17 November juga ditolak sampai peninjauan berikutnya. Normal/Custom tetap merupakan konfigurasi terhadap versi statistik yang dipilih, bukan janji mengikuti perubahan game mendatang.

`src/RankedRules.php` menyimpan perubahan zona untuk 24 tier yang diumumkan. Nama tier lokal pada pengumuman dipetakan ke nomor kumulatif API, misalnya Archer II menjadi `Archer League 8` dan Electro Dragon II menjadi `Electro League 32`. Battle quota dan tier yang tidak berubah dipertahankan.

Pemilihan aturan endpoint grup menggunakan tanggal UTC dari `seasonId`, bukan tanggal hari ini atau liga pemain saat ini. Sesi dengan tanggal mulai sebelum 16 November memakai versi lama; sesi mulai 16 November dan setelahnya memakai versi baru. Respons menyertakan versi, tanggal acuan, seasonId, dan sumber agar keputusan dapat diperiksa. Kebijakan ini memakai batas tanggal kalender sesi; waktu aktivasi intrahari tidak diklaim sudah diverifikasi.

## Entitas baru pada profil pemain

Panel yang dapat dibuka/tutup ditambahkan di tab Army, dengan teks Indonesia/English dan warna sesuai tema.

- **Squads:** 12 definisi referensi, TH unlock, komposisi, kapasitas dan kemampuan level 2/3. Referensi difilter menurut TH. Level troop anggota hanya ditampilkan jika memang dilaporkan pada profil.
- **Guardians:** daftar personal hanya ditampilkan jika ada data pada respons API. Guardian yang dikenal dalam array `troops` dipisahkan dari pasukan biasa.
- **Guardian Shrine:** menampilkan informasi fitur TH19; tidak mengarang level atau status penempatan bangunan pemain.
- **Town Hall troops:** informasi tiga pilihan troop dan persyaratannya. Pilihan aktif tidak disimpulkan dari level Archer/Wizard; hanya pilihan yang dilaporkan secara eksplisit ditampilkan.
- **Heroic Spell:** informasi empat level, persyaratan TH, durasi dan pengurangan damage. Diposisikan sebagai buff, bukan sumber damage Zapquake.

Data tersedia pada `newEntities` di respons profil, terpisah dari `army` dan skor. Squad dan Guardian yang dikenali tidak menaikkan skor maupun jumlah cakupan troop. Daftar kosong dari API dibedakan dari field tidak tersedia; entri dengan bentuk yang belum dikenali menghasilkan status parsial.

Adapter untuk field opsional `squads`, `guardians`, dan `townHallTroop` hanya memakai entri bertipe valid jika field tersebut benar-benar muncul. Kontrak API TH19 secara menyeluruh **belum diverifikasi dengan fixture nyata**; adapter ini bukan klaim bahwa semua field tersebut sudah disediakan API publik. Metadata referensi juga bukan bukti kepemilikan atau unlock aktual pemain.

## Reproduksi, deployment dan rollback

```powershell
# Validasi overlay dan tulis diff tanpa mengaktifkan data.
php scripts/prepare-zapquake-th19.php

# Publikasikan rilis immutable dan ganti manifest secara atomik.
php scripts/prepare-zapquake-th19.php --publish

# Rollback statistik ke paket sebelum update.
php scripts/prepare-zapquake-data.php --activate=2026-11-04.5
```

Upload perubahan kode, script/style, **rilis Zapquake baru beserta manifest**, serta folder `public/assets/data/game-features`. Jangan mengganti manifest tanpa menyertakan rilis yang dirujuk. Rilis lama dan snapshot mentah tidak ditimpa. Profil modifier dan pemilihan aturan sesi tetap merupakan kode berversi; rollback data statistik saja tidak membatalkan perubahan kode aturan.

Laporan diff dan cakupan ada di `audits/th19/zapquake/`. Audit baseline lama tetap memeriksa paket sebelum TH19 secara immutable, dan memeriksa checksum manifest aktif secara terpisah.

Validasi: `composer test`, `composer test:zapquake`, tes JavaScript terkait, serta browser pada Indonesia/English, empat tema dan lebar desktop/mobile. Regresi khusus meliputi target TH19, penolakan level tanpa statistik, histori HP/aturan, isolasi Squad/Guardian dari skor, dan pemisahan data personal dari referensi.
