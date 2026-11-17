# Rencana pembaruan ClanIntel untuk Town Hall 19

Tanggal pemeriksaan: **16 November 2026 (Asia/Jakarta)**. Status: **rencana implementasi berdasarkan audit sumber dan kode**, bukan perubahan aplikasi yang sudah diaktifkan.

Pembaruan implementasi T19-0/T19-1: baseline dan laporan audit tersedia di [audits/th19/README.md](audits/th19/README.md). Kompatibilitas aman telah diterapkan: TH tanpa cap sesuai TH tidak memakai maksimum global API atau tabel TH lain. Skor TH18/19 sementara ditahan hingga katalog per-TH tersedia. Dataset simulasi belum diaktifkan. Fixture TH18 sudah dianonimkan; fixture TH19 masih sintetis karena respons TH19 aktual belum ditemukan pada cache yang diperiksa.

**Pembaruan 17 November — T19-2/T19-3:** katalog bersama versi `2026-11-17.2` sudah aktif untuk progres, Army dan compare. Cap TH18 yang terverifikasi kembali dipakai; TH19 memakai cap resmi dengan cakupan parsial. Paket referensi, overlay, laporan diff, checksum dan rilis rollback telah disiapkan. Lihat [GAME_CATALOG.md](GAME_CATALOG.md). Ini menggantikan penahanan seluruh skor TH18/19 pada tahap sebelumnya; item tanpa cap tetap tidak dinilai. Simulasi TH19 dan aturan historis masih menunggu T19-4.

**T19-4/T19-5 diimplementasikan:** preset TH19 mendukung dua defense dengan statistik terverifikasi, modifier/zona Ranked memakai versi sesuai tanggal/sesi, dan profil Army memiliki panel referensi entitas baru. Data yang belum lengkap tetap dibatasi. Rincian, batas kontrak API, dan rollback ada di [TH19_SIMULATION_AND_ENTITIES.md](TH19_SIMULATION_AND_ENTITIES.md).

**T19-6/T19-7:** delapan aset lokal terkompres, konten/FAQ/guide dua bahasa, share dan ekspor dengan cakupan, serta gate regresi telah diselesaikan untuk rilis terbatas. Lihat [laporan kesiapan rilis](audits/th19/RELEASE_READINESS.md). Dukungan TH19 penuh dan fixture API TH19 nyata tetap belum diklaim.

## 1. Kesimpulan

**Informasi TH19 sudah tersedia untuk memulai pembaruan, tetapi dataset lengkap yang dipakai ClanIntel belum siap untuk langsung diimpor.**

- Patch notes resmi sudah memuat batas level, entitas baru, serta beberapa statistik bangunan. Ini cukup untuk merencanakan katalog dan menyiapkan dukungan tampilan.
- Sumber JSON utama aplikasi masih memiliki TH maksimum 18 pada revisi terbaru yang diperiksa. Mengganti revisi ke `main` saja belum memberikan data TH19.
- Batas level saja tidak cukup untuk Zapquake: setiap target/spell baru membutuhkan HP, damage, persyaratan level, ketersediaan, dan konteks modifier yang tervalidasi.
- Perlu audit ulang TH18 juga. Setelah ada TH19, `maxLevel` dari API tidak boleh otomatis dianggap sebagai maksimum TH18.
- Data API profil/grup TH19 secara langsung **belum diuji dalam audit ini**. Tidak ada pembacaan token `.env` atau permintaan API dengan kredensial aplikasi.

Dokumen ini membedakan fakta sumber, hasil pemeriksaan repository, dan keputusan desain yang diusulkan. Tidak ada angka HP/damage yang akan ditebak untuk mengisi kekosongan.

## 2. Sumber dan bukti pemeriksaan

### S1 - Patch notes resmi Supercell

[The Clash of Titans Update Is Rolling Out](https://supercell.com/en/games/clashofclans/blog/release-notes/the-clash-of-titans-update-is-rolling-out/).

HTML resmi berhasil diambil dan diperiksa, termasuk metadata `__NEXT_DATA__`. Field `publishDate` bernilai `2026-11-16T08:00:13.789Z` (15.00.13 WIB). Hasil indeks pencarian sempat menampilkan 22 November; tanggal indeks tersebut tidak digunakan sebagai tanggal efektif perubahan aturan.

`publishDate`, waktu rollout, dan waktu efektif modifier/season adalah tiga hal berbeda. Sebelum menerapkan aturan historis, konfirmasikan kapan perilaku baru mulai berlaku.

### S2 - Dataset komunitas yang digunakan aplikasi

Repository: [chiefpansancolt/clash-of-clans-data](https://github.com/chiefpansancolt/clash-of-clans-data).

Revisi terkini yang diperiksa: [`7afaa0375e5865c04021836a3a4192ffcfea092d`](https://github.com/chiefpansancolt/clash-of-clans-data/commit/7afaa0375e5865c04021836a3a4192ffcfea092d), bertanggal `2026-11-06T02:47:39Z`; versi paket `0.19.1`.

Pemeriksaan dilakukan pada isi JSON dan tree repository, bukan hanya README:

| File pada revisi tersebut | Maksimum normal yang ditemukan | Kesimpulan |
|---|---:|---|
| [Town Hall](https://github.com/chiefpansancolt/clash-of-clans-data/blob/7afaa0375e5865c04021836a3a4192ffcfea092d/data/home/town-hall/town-hall.json) | 18 | Belum menyediakan baris TH19 |
| [Archer Queen](https://github.com/chiefpansancolt/clash-of-clans-data/blob/7afaa0375e5865c04021836a3a4192ffcfea092d/data/home/heroes/archer-queen.json) | 110 | Belum menyediakan level hero TH19 |
| [Barbarian](https://github.com/chiefpansancolt/clash-of-clans-data/blob/7afaa0375e5865c04021836a3a4192ffcfea092d/data/home/troops/barbarian.json) | 13 | Data troop belum mengikuti patch |
| [Lightning](https://github.com/chiefpansancolt/clash-of-clans-data/blob/7afaa0375e5865c04021836a3a4192ffcfea092d/data/home/spells/lightning-spell.json) | 13 | Damage level baru belum dapat diambil dari sumber ini |
| [Air Defense](https://github.com/chiefpansancolt/clash-of-clans-data/blob/7afaa0375e5865c04021836a3a4192ffcfea092d/data/home/defenses/air-defense.json) | 16 | Belum menyediakan level baru |

Tree yang diperiksa belum memiliki path untuk Spiky Tower, Firecracker Tower, Guardian Shrine, Squad Barracks, atau Heroic Spell. Ini adalah hasil pemeriksaan sumber tersebut pada tanggal audit, **bukan kesimpulan bahwa data TH19 tidak tersedia di seluruh internet**.

### S3 - Kandidat pemeriksa silang

- [Dokumentasi static game data clashy.py](https://clashy.clashk.ing/en/latest/advanced/game_data.html).
- [Changelog clashy.py](https://clashy.clashk.ing/en/stable/miscellaneous/changelog.html).

Dokumentasi menjelaskan metadata game dan pemisahannya dari data pemain. Namun, halaman yang diperiksa belum membuktikan kelengkapan TH19. Jangan mengaktifkan sumber alternatif sebelum file aktual, versi, tanggal, cakupan, dan lisensinya diperiksa. Tidak perlu memasang SDK Python pada aplikasi PHP hanya untuk mengimpor JSON.

## 3. Angka acuan yang sudah diumumkan

Sumber tabel pada bagian ini: **S1**. Ini adalah checklist awal, bukan katalog seluruh statistik atau seluruh troop. Angka yang tidak dicantumkan tidak diasumsikan berubah atau tetap tanpa pemeriksaan.

### Hero - maksimum TH19

| Hero | Maksimum |
|---|---:|
| Barbarian King | 115 |
| Archer Queen | 115 |
| Minion Prince | 100 |
| Grand Warden | 90 |
| Royal Champion | 60 |
| Dragon Duke | 30 |

### Contoh troop dan spell yang relevan

| Troop | Maksimum diumumkan |
|---|---:|
| Dragon | 14 |
| Electro Dragon | 10 |
| Yeti | 9 |
| Root Rider | 5 |
| Thrower | 5 |
| Hog Rider | 16 |
| Meteor Golem | 4 |
| Ruin Witch | 5 |

| Spell | Maksimum diumumkan |
|---|---:|
| Lightning | 14 |
| Healing | 13 |
| Poison | 13 |
| Totem | 5 |
| Haste | 8 |
| Bat | 9 |

Daftar perubahan lengkap perlu ditranskripsikan/dinormalisasi dari S1 dan dicocokkan dengan dataset kandidat. Jangan membatasi importer hanya pada contoh di atas.

### Bangunan dan entitas baru

| Item | Acuan diumumkan |
|---|---|
| Air Defense | Level 17 |
| Hidden Tesla | Level 18 |
| X-Bow | Level 14 |
| Multi-Archer Tower | Level 5 |
| Multi-Gear Tower | Level 4 |
| Ricochet Cannon | Level 5 |
| Builder's Hut | Level 9 |
| Clan Castle | Level 15 |
| Laboratory / Hero Hall | Level 17 / 13 |
| Spiky Tower | Baru, 2 level; HP 5.959 / 6.363 |
| Firecracker Tower | Baru, 2 level; HP 6.500 / 6.700 |
| Guardian Shrine / Squad Barracks | Entitas baru |
| Heroic Spell | Baru, 4 level; mulai TH17 |
| Angry Jelly | Level 15 tersedia pada TH18 |

Squads dan Town Hall troops juga perlu diinventarisasi sebagai konsep baru, bukan langsung dicampurkan ke daftar upgrade troop biasa. Ada perbedaan representasi level Super Troop dalam sumber dan API: pertahankan pemisahan level API, level pasukan asal, serta level tampilan sampai pemetaannya diverifikasi.

### Perubahan aturan yang berdampak langsung

| Profil | Bonus HP hero bertahan baru |
|---|---:|
| Legend I | +25% |
| Legend II | +20% |
| Legend III | +15% |
| Esports / Hard Mode | +30% |

S1 juga mencantumkan perubahan promosi/demosi, balance pada level lama, dan penghapusan sebagian supercharge. **Jangan hanya menambahkan baris TH19 di atas data lama.** Baca diff seluruh item yang berubah dan seluruh konteks aturan terkait.

## 4. Matriks kesiapan data

| Kebutuhan | Status audit | Boleh dilakukan setelah validasi | Belum boleh diasumsikan |
|---|---|---|---|
| Identitas TH19 dan batas hero | Ada pengumuman resmi | Metadata, label, rencana katalog | Semua statistik per level lengkap |
| Maksimum troop/spell baru | Ada daftar resmi | Overlay batas level dengan provenance | API `maxLevel` adalah batas per TH |
| HP dua defense baru | Ada di S1 | Kandidat data Zapquake | Semua interaksi target/equipment sudah teruji |
| HP TH19 dan kenaikan HP seluruh level baru | Belum lengkap dari JSON utama | Tampilan "data belum tersedia" | Memakai HP TH18 untuk TH19 |
| Damage Lightning level 14 | Belum tersedia dari JSON utama yang diperiksa | Pertahankan level baru sebagai belum didukung dalam simulasi | Menebak kenaikan damage |
| Equipment/Blacksmith baru | Belum dikonfirmasi lengkap | Tetap tampilkan batas terverifikasi dengan label cakupan | Common/Epic mendapat tambahan level hanya karena TH naik |
| Guardian/Squad metadata dalam API | Belum diuji langsung | Simpan field tak dikenal secara aman dalam fixture audit | Field otomatis ada di endpoint profil |
| Gambar/icon per level baru | Perlu inventarisasi terpisah | Fallback lokal dan pipeline WebP | Sumber gambar TH18 sudah cukup |
| Modifier dan promosi/demosi baru | Ada pengumuman | Resolver aturan berversi | Aturan baru berlaku pada semua sesi sebelumnya |
| Sumber JSON utama | Belum TH19 | Tunggu revisi data atau overlay resmi yang terbatas | Upgrade dependency saja menyelesaikan migrasi |

Kesimpulan kesiapan: **UI kompatibilitas dapat diprioritaskan sekarang; pengaktifan angka simulasi lengkap harus menunggu coverage yang memadai.**

## 5. Audit dampak pada kode saat ini

| Area | Lokasi utama | Masalah / pekerjaan |
|---|---|---|
| Progress dan rushed | `src/App.php`: `progress()`, `scoreItems()`, `MAX_LEVELS` | Ada `$api = $th === 18`; TH19 jatuh ke tabel fallback. TH18 juga berisiko memakai maksimum global baru. Pisahkan cap API global dari cap yang benar-benar berlaku pada TH pemain. |
| Army dan compare | `src/App.php`: `playerItem()`, `playerArmy()`; `public/js/compare.js`, `compare-model.js` | `progressMaxLevel` mengikuti hasil progress. Perbaiki sumber cap bersama, bukan label compare saja. Jangan menyatakan TH19 maksimum berdasarkan tabel TH17/18. |
| Profil dan snapshot ringkasan | `public/js/player-overview.js` | Pemilihan hero berdasarkan rasio max, jumlah item maksimum, dan status ringkasan perlu membaca sumber cap yang benar. |
| Kategori item | `src/App.php`: `PETS`, `EQUIPMENT`, `SUPER_TROOPS`, normalisasi Army | Kenali item baru tanpa salah menggolongkannya sebagai troop/pet/equipment. Metadata baru boleh parsial; data lama tetap terbaca. |
| Zapquake importer | `src/ZapquakeDataset.php`, `scripts/prepare-zapquake-data.php` | Validasi availability membatasi TH18; whitelist entitas/field perlu diperluas secara terkendali. Audit perubahan HP lama, supercharge, dan ketersediaan setelah merge. |
| Zapquake UI/model | `public/js/zapquake.js`, `zapquake-model.js`, `zapquake-modifiers.js` | Selector dan validasi berhenti di 18; profil modifier bertanggal juga perlu diperbarui. Unknown target tidak boleh diam-diam memakai data TH18. |
| Data/assets lock | `scripts/zapquake/source-lock.json`, `scripts/prepare-zapquake-images.py` | Lock statistik dan gambar memakai revisi tertentu. Ganti melalui audit/checksum, bukan URL `main` saat runtime. |
| Ranked dan CWL | `src/App.php`: `RANKED_RULES`, `rankedRule()`, `rankedSessionTier()`; `public/js/player-league.js` | Perubahan zona harus berversi per periode. Petakan nama resmi ke ID/nama liga API; jangan menyalin label patch langsung ke konstanta. |
| Visualisasi TH | `public/assets/images/town-hall/`, `public/js/war-map.js`, profil, compare dan share | Lengkapi TH19 dan fallback jika file belum tersedia. Audit semua consumer path `th-{level}.webp`. |
| SEO dan panduan | `src/SeoZapquake.php`, `SeoFeatures.php`, `SeoGuides.php` | Tampilkan cakupan aktual. Jangan mengiklankan kalkulasi TH19 lengkap sebelum data dan pengujiannya siap. |
| Analisis CWL yang direncanakan | `IDE_CWL_CLAN_ANALYSIS.md` | Kekuatan roster harus memakai cap sesuai TH serta aturan musim; item belum dikenal mengurangi coverage, bukan otomatis memperburuk skor. |

Contoh risiko utama: skor 100% terhadap fallback TH lama **bukan** bukti akun TH19 sudah maksimum. Saat cap belum diketahui, tampilkan status belum dapat dinilai atau cakupan parsial.

## 6. Desain data yang disarankan

### 6.1 Katalog level bersama

Gunakan satu katalog acuan untuk progress, Army, compare dan Zapquake; masing-masing fitur dapat memakai subset berbeda.

Field minimal yang diusulkan:

```text
stableId, apiName, category, village
levels[]: level, townHallRequired, laboratoryRequired?, heroHallRequired?, blacksmithRequired?
          hitpoints?, damage?, sourceId, verificationStatus
availability[]: townHall, count, countAfterMerges?, mergeInputs?, replacementId?
release: dataVersion, sourceRevision, reviewedAt, effectiveFrom?, effectiveUntil?
capResolution: maxAtTownHall, source, exactMatch, coverage
```

- `maxAtTownHall` harus berasal dari persyaratan level yang tervalidasi. Maksimum API global tetap disimpan sebagai field terpisah.
- HP/damage yang belum tersedia bernilai `null`, bukan 0, hasil interpolasi, atau salinan level sebelumnya.
- Pertahankan hubungan Hero Hall, Laboratory, Pet House, Spell Factory, dan Blacksmith; tidak semua kenaikan level bergantung pada TH saja.
- Squads merupakan koleksi terpisah. Keanggotaan squad dan level squad tidak identik dengan upgrade troop penyusunnya.
- Guardian Shrine bukan target defense biasa sampai kelayakan hit-nya diketahui. Bangunan non-targetable tidak otomatis masuk Zapquake.
- Pisahkan syarat TH unlock, baris level upgrade, dan jumlah setelah merge. Bangunan hasil merge dapat mempunyai syarat level input tersendiri.
- Pisahkan level visual Super Troop dari level mentah API dan cap pasukan asal. Jangan merusak pemetaan yang saat ini sudah digunakan aplikasi.

### 6.2 Sumber parsial sebagai overlay

Jika JSON upstream belum diperbarui, buat kandidat overlay lokal dari angka resmi yang sudah diverifikasi, dengan sumber per item/field. Overlay boleh mengaktifkan **cap yang diketahui**, tetapi tidak boleh membuat seluruh dataset dianggap lengkap.

Aktivasi kandidat dipisahkan:

- `displayReady`: identitas/icon/fallback siap.
- `progressReady`: maksimum per TH dan daftar expected items cukup lengkap.
- `simulationReady`: HP, damage, target eligibility, dan aturan yang dibutuhkan sudah lengkap.

Jangan memakai satu boolean `TH19 ready` untuk tiga kebutuhan berbeda tersebut. Katalog harus mampu melaporkan coverage per kategori dan per fitur.

### 6.3 Riwayat dan cache

- Dataset baru immutable; manifest dipindahkan atomik setelah validasi.
- Simpan sumber, checksum, dan tanggal pemeriksaan. Versi data referensi berbeda dari tanggal efektif balance.
- Snapshot mentah lama tetap dipertahankan. Jangan mengganti isi snapshot historis menjadi angka patch baru.
- Skor turunan dan cache perlu menyertakan versi data/model. Skor lama tidak dibandingkan langsung dengan skor baru tanpa penjelasan perubahan baseline.
- Alias nama item dan ID harus diuji sebelum menggabungkan kategori baru.
- Cache statistik Ranked yang tidak bergantung pada cap tidak perlu dibuang massal; invalidasi harus sesuai perubahan data yang digunakan.

## 7. Tahapan implementasi

| Tahap | Prioritas | Pekerjaan | Kriteria selesai |
|---|---|---|---|
| T19-0 - Baseline audit | P0 | Bekukan manifest saat ini; buat matriks sumber, diff seluruh kategori dan fixture API TH18/19 yang dianonimkan. | Semua field punya status tersedia / belum tersedia / konflik dan provenance. |
| T19-1 - Kompatibilitas aman | P0 | Hilangkan asumsi TH18 selalu tertinggi; pertahankan rendering item tidak dikenal, fallback gambar, dan label cap belum diketahui. | TH19 dapat dibuka tanpa crash atau klaim max/rushed yang keliru; TH18 tidak terukur memakai cap global TH19. |
| T19-2 - Katalog cap | P1 | Bangun resolver maksimum per TH dan persyaratan bangunan; tambahkan batas resmi yang sudah terkonfirmasi. | Progress, Army, compare, ringkasan, dan pemilihan hero memakai hasil resolver yang sama. |
| T19-3 - Paket data baru | P1 | Impor snapshot upstream yang sudah mendukung TH19 atau overlay terbatas; audit delta pada level lama dan supercharge. | Semua perubahan divalidasi, laporan coverage tersedia, rilis lama dapat diaktifkan kembali. |
| T19-4 - Zapquake dan aturan | P1 | Tambah target/spell yang memiliki data cukup; perluas preset TH; versioning modifier dan zona Ranked/CWL. | Kombinasi terhitung hanya bila datanya lengkap; hasil sesi lama tetap memakai aturan lama. |
| T19-5 - Entitas baru | P2 | Tambah metadata Squads, Shrine, Town Hall troops dan Heroic Spell sesuai data aktual/API. | Tidak tercampur ke skor troop biasa, tidak ada fitur yang mengklaim data yang belum tersedia. |
| T19-6 - Aset dan konten | P2 | TH19/icon baru WebP lokal, gambar tiap level, fallback, Indonesia/English, share card, SEO dan panduan. | Tidak ada gambar rusak; halaman tidak berat; teks menyebut cakupan yang benar. |
| T19-7 - Regresi dan rilis | P1 sebelum publish | Uji lintas TH, kategori, riwayat aturan, ekspor dan cache; rilis bertahap dengan manifest rollback. | Checklist bagian 8 lulus, migration report ditinjau, versi dapat ditelusuri. |

Urutan praktis: **T19-0 - T19-1 - T19-2 - T19-3 - T19-4**, kemudian perluasan entitas/aset; T19-7 menjadi gerbang setiap rilis. Tidak perlu menahan perbaikan kompatibilitas hanya karena HP satu target baru belum tersedia.

## 8. Checklist pengujian

### Data dan progress

- [x] Hero TH19 memakai cap masing-masing yang tervalidasi; TH18 mempertahankan cap sesuai TH18.
- [x] Maksimum global dari API tidak otomatis dipakai sebagai maksimum TH lebih rendah.
- [x] Item dengan level lebih tinggi daripada dataset tetap ditampilkan; tidak di-clamp turun atau dinyatakan maksimum tanpa bukti.
- [x] Coverage menghitung item baru/unknown secara eksplisit; status rushed ditahan jika prasyarat belum lengkap.
- [x] Item yang belum dibuka dan item yang hilang dari respons API dibedakan.
- [x] Pet yang mendapat peningkatan pada TH18 ikut diperiksa, bukan hanya baris TH19.
- [x] Metadata troop, spell, equipment, pet, Guardian dan Squad tidak saling tercampur.

### Zapquake dan aturan

- [x] Preset penyerang serta bertahan TH19 independen dan mengikuti persyaratan data.
- [x] Kenaikan HP pada level lama diperhitungkan hanya pada versi data yang sesuai.
- [x] Damage Lightning baru tidak diaktifkan sebelum ada sumber angka yang dapat diperiksa.
- [x] Perubahan jumlah bangunan/merge tidak dilakukan dengan menyalin availability TH18.
- [x] Penghapusan supercharge tidak merusak pemilihan target atau mengubah snapshot lama.
- [x] Interaksi Spiky/Firecracker, shield eligibility dan target type diuji sebelum simulationReady.
- [x] Modifier baru tidak diterapkan ke sesi sebelumnya; waktu efektif yang belum diketahui tidak ditebak dari tanggal artikel.
- [ ] Konfirmasi pemetaan zona pada respons API pasca-update yang nyata. Pemetaan nama/nomor API yang sudah dikenal dan tabel resmi sudah diuji; fixture TH19 aktual masih pending.

### UI, ekspor dan rilis

- [x] Player, compare, roster klan, war map, snapshot dan share tidak kehilangan gambar TH19.
- [x] Empat tema, Indonesia/English, desktop dan mobile tetap terbaca.
- [x] Ekspor CSV/PNG menyebut level, baseline dan coverage dengan benar jika relevan.
- [x] Canonical/hreflang/sitemap serta konten Zapquake tidak menjanjikan cakupan yang belum siap.
- [x] Cache lama aman dibaca atau di-invalidasi secara terarah.
- [x] `composer test` serta pengujian JS progress/compare/Zapquake dan pemeriksaan browser yang relevan lulus.
- [x] Rilis data baru dapat di-rollback melalui mekanisme manifest tanpa menghapus rilis lama.

## 9. Status rilis dan tindak lanjut

T19-0 sampai T19-7 sudah diimplementasikan untuk cakupan TH19 yang dapat diverifikasi. Gate lokal lulus; keputusan rilis adalah **terbatas**, bukan klaim dukungan TH19 penuh.

Tindak lanjut: tambahkan fixture TH19 nyata yang dianonimkan, verifikasi field baru serta transisi aturan di API, dan lengkapi statistik yang masih kosong sebelum menambah target/level simulasi. Langkah deployment dan rollback ada di [RELEASE_READINESS.md](audits/th19/RELEASE_READINESS.md).
