# Audit Z1 dan dataset Z2 — Zapquake ClanIntel

Tanggal audit: 4 November 2026. Status: dataset `2026-11-04.5` dan mesin Z3–Z7 tersedia di `/tools/zapquake`. Kontrak aktif serta batas kepastiannya dicatat di [ZAPQUAKE_ADVANCED.md](ZAPQUAKE_ADVANCED.md); catatan fondasi ada di [ZAPQUAKE_CALCULATOR.md](ZAPQUAKE_CALCULATOR.md).

## Keputusan sumber dan cakupan

Sumber utama awal: [chiefpansancolt/clash-of-clans-data](https://github.com/chiefpansancolt/clash-of-clans-data), paket `0.19.1`, revisi tetap `431f8da169ba93b730d182dfec0ca4820998db0d`.

- Importer tidak mengunduh cabang `main` saat dijalankan. Semua URL memakai SHA revisi penuh.
- `scripts/zapquake/source-lock.json` mengunci 44 file beserta SHA-256 dan ukuran: 22 file pertahanan, Town Hall, Clan Castle, enam hero, delapan equipment, Hero Hall, Blacksmith, dua file spell, LICENSE, dan package.json.
- Lisensi repository adalah MIT, copyright Christopher Pezza. Salinan lengkap disertakan pada setiap rilis dataset. Identitas statistik/karakter game tetap merupakan konten Clash of Clans; lisensi repository tidak berarti dukungan resmi Supercell.
- File sumber diperiksa langsung, bukan hanya deskripsi README. Formatnya cocok untuk mengambil statistik per level, tetapi tidak memuat kontrak lengkap semua interaksi pertempuran.
- [Static data ClashKing](https://clashy.clashk.ing/en/latest/models/static.html) dipertahankan sebagai referensi model/alternatif; belum dipakai sebagai pemeriksa silang angka independen.

Rilis aktif: `2026-11-04.5`, memperluas rilis `.2` dengan equipment serta persyaratan Hero Hall/Blacksmith. Rilis `.1` dan `.2` tetap disimpan. Tanggal ini adalah tanggal audit/import, **bukan jaminan tanggal berlakunya seluruh angka di game**. `effectiveAt` tetap `null` karena sumber tidak menyediakan tanggal efektif yang cukup untuk seluruh subset.

## Data yang sudah tersedia

| Bagian | Cakupan | Status |
|---|---|---|
| Pertahanan Home Village | 21 jenis, 204 baris level normal | HP dan persyaratan TH diimpor, struktur dan progresi divalidasi |
| Town Hall | Level 1–18 | HP bangunan diimpor; level TH menjadi syarat TH untuk barisnya sendiri |
| Clan Castle | Level 1–14 | HP bangunan dan persyaratan TH diimpor, terpisah dari pasukan yang berada di dalamnya |
| Hero | Enam hero, total 480 level | HP dasar dan syarat Hero Hall diimpor; bonus preset diterapkan terpisah pada mesin |
| Lightning Spell | Level 1–13 | `damage`, kapasitas spell, TH minimum diimpor |
| Earthquake Spell | Level 1–8 | `buildingDamagePercent`, `troopDamagePercent` jika tersedia, radius, kapasitas, TH minimum diimpor |
| Supercharge | 30 baris dari 15 bangunan | Binding otomatis belum aktif; kalkulator mendukung HP total manual |
| Crafted defense | Crafting Station dikecualikan | HP station bukan representasi seluruh defense/modul crafted |
| Equipment | Delapan item, 180 level | Direct damage, persentase, dan tick aura dinormalisasi; eligibility mengikuti kontrak Z5–Z7 |
| Persyaratan loadout | 12 level Hero Hall, 10 level Blacksmith | Slot hero, TH minimum, serta cap equipment diimpor |
| Storage, wall, bangunan non-defense lainnya | Tidak termasuk subset awal | Tidak boleh dianggap tersedia atau otomatis kebal oleh UI |
| Ranked/CWL/Friendly/Esports | Profil model bertanggal, terpisah dari dataset mentah | Bonus hero dan level equipment sesuai scope; efek musiman melalui Custom bila diketahui |

Contoh statistik pada snapshot sumber, untuk memeriksa pemetaan field:

- Air Defense level 1: `hitpoints = 800`, `townHallRequired = 4`.
- Lightning level 1: `damage = 150`, `housingSpace = 1`, `townHallRequired = 5`.
- Earthquake level 1: `buildingDamagePercent = 14.5`, `radius = 3.5`, `townHallRequired = 8`.
- Earthquake level 1–5 tidak mempunyai field troop damage. Importer menyimpan `null`, bukan mengarang nilai nol.
- Fireball memakai `stats.projectileDamage` numerik; `stats.damageRadius` dapat berupa string dengan unit.
- Earthquake Boots memakai `stats.buildingDamagePercent` dalam bentuk string persen pada sampel. Formatnya tidak sama dengan Earthquake Spell yang numerik.

Contoh angka tersebut membuktikan pemetaan snapshot sumber; belum merupakan hasil verifikasi independen terhadap seluruh mekanik game terkini.

### Cakupan Hero, Town Hall, dan Clan Castle pada rilis .2

| Target | Level | Contoh HP sumber level 1 |
|---|---|---|
| Barbarian King | 1–110 | 1.445 |
| Archer Queen | 1–110 | 580 |
| Grand Warden | 1–85 | 850 |
| Royal Champion | 1–55 | 2.508 |
| Minion Prince | 1–95 | 200 |
| Dragon Duke | 1–25 | 9.100 |
| Town Hall | 1–18 | 400 |
| Clan Castle | 1–14 | 600 |

- Total bangunan kini 23 jenis dan 236 baris level, ditambah enam hero dengan 480 baris level.
- Hero disimpan dalam koleksi `heroes`, bukan `buildings`; aturan spell persentase terhadap bangunan tidak boleh otomatis dipakai terhadap hero.
- Sumber hero mempunyai `heroHallLevelRequired`, tidak mempunyai syarat TH langsung per level. Normalizer mempertahankan syarat Hero Hall dan menyimpan `townHallRequired = null`; pemetaan TH harus berasal dari sumber tambahan yang diaudit.
- HP hero diberi konteks `base-before-defensive-modifiers`. HP tambahan dari lingkungan pertahanan, liga, atau efek musiman tidak diterapkan otomatis.
- `defendingMode = null`: tipe darat/udara dan perilaku Grand Warden saat bertahan tidak disimpulkan dari mode serangan atau teks deskripsi. Eligibility baru diaktifkan setelah diverifikasi.
- Normalisasi Town Hall menggunakan HP bangunan utama. Nested `weapon.levels` tidak dianggap sebagai level TH tambahan dan tidak dijumlahkan sebagai bangunan terpisah.
- Clan Castle yang diimpor adalah bangunannya; HP pasukan/hero di dalam atau di dekatnya merupakan target lain.
- Town Hall dan Clan Castle membutuhkan eligibility/immunity spesifik saat Z3. Keberadaan HP pada dataset tidak berarti semua spell dapat merusaknya.

## Temuan yang memengaruhi desain

### Supercharge tidak boleh digabung berdasarkan nomor level

Pada Air Defense, sumber menyimpan level normal 1–16 lalu memakai kembali `level = 1` dan `level = 2` dengan `supercharge = true`. Bila seluruh baris dibuat dictionary dengan key level, HP level normal dapat tertimpa.

Normalizer memisahkan `levels` dan `supercharges`. Setiap charge menyimpan `step`, `sourceHitpoints`, TH minimum, `baseLevel = null`, dan status `unverified-base-binding`. Tidak ada dugaan bahwa HP tersebut adalah tambahan atau HP akhir yang otomatis diterapkan. Ilustrasi path gambar juga tidak dipakai untuk menyimpulkan binding.

### Damage spell tidak cukup untuk memodelkan interaksi

Snapshot memiliki angka damage, tetapi tidak menyediakan semua immunity, koefisien hit Earthquake berulang, interaksi Earthquake Boots, cara stacking, dan aturan pembulatan internal. Field `rules` untuk mekanik tersebut tetap `null`.

### Modifier membutuhkan sumber dan periode terpisah

Pemetaan Ranked dan CWL pernah berubah. Audit awal menggunakan catatan resmi sebagai bukti kebutuhan versi aturan, bukan sebagai alasan membuat multiplier seragam:

- [Pembaruan Februari 2026](https://supercell.com/en/games/clashofclans/blog/release-notes/the-february-update-has-escaped/) menjelaskan perluasan target Earthquake ke pasukan darat.
- [State of Gameplay Mei 2026](https://supercell.com/en/games/clashofclans/blog/news/state-of-gameplay-part-2/) menjelaskan penyesuaian pemetaan modifier CWL.
- [Pembaruan Agustus 2026](https://supercell.com/en/games/clashofclans/blog/release-notes/august-update-3/) membahas penyesuaian skala modifier dan supercharge.

Pada Z1, angka multiplier, stacking, scope, dan tanggal efektif belum diaktifkan. Z6 kemudian menambahkan subset preset bertanggal yang dijelaskan dalam dokumen advanced.

## Matriks audit awal Z1-Z2 (historis)

Cakupan aktif Z5-Z7, termasuk equipment, modifier bertanggal, serta timeline, dijelaskan di [ZAPQUAKE_ADVANCED.md](ZAPQUAKE_ADVANCED.md). Tabel ini mempertahankan daftar gap saat fondasi data pertama kali dibuat.

| Mekanik | Yang diketahui dari audit | Syarat sebelum aktif |
|---|---|---|
| HP normal defense | Field per level tersedia | Konfirmasi contoh angka dan versi balance untuk rilis kalkulator |
| HP Town Hall/Clan Castle | Seluruh level dalam snapshot tersedia | Verifikasi immunity/eligibility per spell/equipment, terpisah dari defense biasa |
| HP Hero | HP dasar dan syarat Hero Hall tersedia | Verifikasi mode saat bertahan, modifier HP, bonus lingkungan, dan eligibility per sumber |
| Lightning langsung | Field damage per level tersedia | Eligibility/immunity, pembulatan dan kasus batas terverifikasi |
| Earthquake pada bangunan | Persentase dasar tersedia | Basis HP, koefisien berulang, campuran level, urutan, dan interaksi terverifikasi |
| Supercharge | Baris khusus tersedia | Binding ke level dasar dan arti sourceHitpoints terverifikasi |
| Fireball | Kandidat projectile damage tersedia | Target, damage event, modifier, dan loadout diverifikasi |
| Earthquake Boots | Kandidat persen tersedia sebagai string | Parser persen, eligibility dan interaksi dengan spell diverifikasi |
| Equipment lainnya | Ada dalam sumber upstream, belum diaudit lengkap | Audit per item sebelum impor/aktivasi |
| Modifier | Catatan perubahan resmi tersedia | Tabel nilai/periode, scope dan konflik diverifikasi |
| Timing/healing/aura | Tidak dimodelkan | Model event dan input yang memadai pada tahap lanjutan |

Dataset berstatus `reference-data-only`, `calculationReady = false`, `engineVersion = null`, dan `modifiers = []`. Z1 menyelesaikan pemilihan sumber, audit struktur, cakupan minimum termasuk Hero/TH/CC, dan pencatatan gap. Ini tidak menyatakan bahwa semua mekanik atau angka sudah diverifikasi penuh. Gate sebelum Z3 adalah menetapkan aturan perhitungan dasar serta kasus referensinya; gate sebelum publikasi kalkulator adalah verifikasi angka dan batas akurasi yang dinyatakan ke pengguna.

## Format dan validasi Z2

- ID sumber seperti `air-defense` dipertahankan; `dataId` numerik disimpan sebagai identitas tambahan.
- Nama belum diterjemahkan dalam dataset. Nama game dipertahankan; kontrol dan pesan UI kini memakai CocI18n Indonesia/English.
- Setiap rilis menyertakan `schemaVersion`, `dataVersion`, `normalizerVersion`, `engineVersion`, `reviewedAt`, `effectiveAt`, source revision, daftar checksum, cakupan, statistik, dan status aturan.
- Importer menolak checksum/ukuran berbeda, path di luar whitelist, identitas/category/base tidak sesuai, level normal duplikat/lompat, HP/damage nonpositif, TH mundur, progresi statistik turun, serta persentase di atas 100.
- Lisensi dan package version wajib sesuai lock.
- Field yang tidak diperlukan Z2, seperti DPS defense, biaya, dan gambar sumber, tidak dikirim ke browser.
- Impor deterministik: sumber dan lock yang sama menghasilkan byte dataset yang sama. Timestamp runtime tidak disisipkan ke dataset.
- Tanggal efektif tidak ditebak dari tanggal commit atau tanggal unduh.

## File dan perintah

```text
src/ZapquakeDataset.php
scripts/prepare-zapquake-data.php
scripts/zapquake/source-lock.json
public/assets/data/zapquake/manifest.json
public/assets/data/zapquake/2026-11-04.5/dataset.json
public/assets/data/zapquake/2026-11-04.5/LICENSE.txt
tests/zapquake-data.php
```

Cache sumber dan laporan berada di `data/`, diabaikan Git:

```text
data/zapquake-source/      File mentah dengan struktur path upstream
data/zapquake-reports/     Preview dataset, changes.json, audit.json
```

Unduh ulang file terkunci dan buat preview tanpa mengganti versi aktif:

```powershell
php scripts/prepare-zapquake-data.php --download
```

Validasi offline dari cache lokal:

```powershell
php scripts/prepare-zapquake-data.php
```

Setelah laporan ditinjau, terbitkan dataset lokal:

```powershell
php scripts/prepare-zapquake-data.php --publish
```

Direktori rilis bersifat immutable. Isi berbeda dengan `dataVersion` sama ditolak. Dataset dan LICENSE disiapkan di direktori staging, lalu direktori rilis difinalisasi. Pointer `manifest.json` diganti atomik setelah semua file siap. Kegagalan sebelum penggantian pointer mempertahankan versi aktif. Lock publikasi mencegah dua proses mengubah pointer bersamaan.

Mengaktifkan kembali rilis lama yang masih tersimpan:

```powershell
php scripts/prepare-zapquake-data.php --activate=2026-11-04.1
```

Activation memvalidasi data dan membaca ulang byte rilis sebelum mengubah pointer; tidak mengunduh sumber. Versi .1 belum memuat Hero/TH/CC. Untuk kembali ke versi lengkap, gunakan `--activate=2026-11-04.5`. Tidak ada perintah hapus rilis otomatis.

Untuk snapshot upstream baru, ubah revision, packageVersion bila berubah, checksum/ukuran file, dataVersion, reviewedAt, dan keputusan cakupan melalui review. Importer tidak memperbarui source-lock secara otomatis. Bandingkan `changes.json`, periksa penghapusan/perubahan statistik, lalu terbitkan versi baru. Jangan memperbarui checksum hanya agar data yang gagal menjadi lolos tanpa memeriksa perubahannya.

## Deployment dan pengujian

- Unggah seluruh `public/assets/data/zapquake/`, termasuk rilis lama yang masih dibutuhkan, manifest, dan LICENSE. Folder ini tidak berada di direktori runtime privat `data/`.
- Untuk deployment non-atomik, unggah direktori rilis lengkap lebih dahulu, baru manifest. Jangan mengunggah manifest yang menunjuk rilis yang belum selesai diunggah.
- Publisher lokal menjamin urutan/atomisitas di filesystem lokal; proses upload hosting tetap harus mengikuti urutan tersebut.
- URL JSON dilayani sebagai `application/json` oleh aplikasi. Consumer Z4 dan backend merevalidasi manifest; rilis dataset/License diberi cache immutable. Jangan memberi manifest cache immutable pada hosting/CDN.
- Script bersifat CLI-only, tidak membaca `.env`, tidak menggunakan token game, dan tidak terhubung ke akun pemain.
- `php tests/zapquake-data.php` memeriksa download checksum/cache, normalisasi deterministik, supercharge, validasi semantik, diff field, publication immutable, rollback, retensi versi aktif saat gagal, atribusi, dan akses HTTP aset.
- `composer test` menyertakan pemeriksaan tersebut.

## Pekerjaan berikutnya

Z3–Z7 telah menambahkan simulasi dasar, equipment, modifier bertanggal, serta timeline/healing manual. Field aturan sumber tetap null karena model aplikasi tidak membuktikan seluruh perilaku internal game. Cakupan dan pengecualian aktif dicatat di `ZAPQUAKE_ADVANCED.md`; berikutnya Z8 untuk penyimpanan dan berbagi konfigurasi, lalu Z9 pemeliharaan/rilis.


## Defender preset availability audit (release .5)

Normalizer 1.3.0 retains `availablePerTownHall` for all 23 building types. Counts must be nonnegative integers; TH rows must be unique, ordered and contiguous within their recorded range. `countAfterMerges` is optional, cannot exceed the original count, and explicitly preserves zero. Town Hall availability is derived from its own identity (one at each supported level). Existing HP, spell damage, equipment statistics and hero requirements are unchanged; release .4 remains immutable.

Filtering uses post-merge count when present AND eligible normal-level rows. The source records Cannon post-merge count 0 and Eagle Artillery count 0 at TH17/18, while Archer Tower and Wizard Tower retain remaining post-merge counts. Monolith's source count starts at TH14 although its level requirement starts at TH15, so it is hidden at TH14. Clan Castle counts at TH1/2 have no eligible normal level and are likewise hidden. The CLI records these inconsistencies in `availabilityConflicts` in the audit report. It does not invent HP values, levels or building replacements.

TH presets represent post-merge layouts. Manual mode remains available for bases with incomplete merges and all historical target types. Hero caps use the existing Hero Hall-to-TH mapping. UI checks cover all defender TH1-18, target dialog levels, attacker independence, ID/EN and four responsive themes.
