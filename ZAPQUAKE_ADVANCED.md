# Zapquake Z5–Z7 — equipment, modifier, dan timeline

Status: diimplementasikan pada halaman `/tools/zapquake`. Mesin `2.2.1`, profil modifier `2026-11-04.1`, dataset aktif `2026-11-04.5`. Semua konfigurasi tetap manual, tanpa API profil pemain.

## 1. Equipment yang didukung

Delapan equipment, total 180 level statistik, diimpor dari revisi sumber yang sama dengan dataset awal. Source lock kini berisi 44 file dengan SHA-256 dan ukuran tetap. Normalizer `1.3.0` mempertahankan dataset lama sebagai rilis immutable.

| Equipment | Level sumber | Model satu target |
|---|---|---|
| Fireball | 1–27 | Projectile damage; target diasumsikan terkena ledakan |
| Giant Arrow | 1–18 | Projectile damage; multiplier 2 hanya untuk Air Defense |
| Spiky Ball | 1–27 | Damage per target, bukan jumlah semua pantulan |
| Seeking Shield | 1–18 | Satu hit pada defense; Town Hall dengan senjata dalam dataset harus dikonfirmasi aktif |
| Rocket Backpack | 1–27 | Satu ability damage yang mengenai bangunan |
| Flame Blower | 1–18 | Satu ability damage yang mengenai bangunan |
| Earthquake Boots | 1–18 | Persentase HP maksimum bangunan/hero darat; tidak mengenai hero udara |
| Electro Boots | 1–27 | Damage per tick setiap 0,4 detik selama durasi kontak manual |

Aturan scope:

- Fireball/Giant Arrow dapat digunakan untuk hero yang dikonfirmasi terkena. Spiky Ball, Seeking Shield, Rocket Backpack, dan Flame Blower belum diaktifkan terhadap hero karena kelayakan target belum cukup diverifikasi untuk model ini.
- Seeking Shield tidak dipakai untuk Clan Castle, hero, atau Town Hall yang belum memenuhi konfirmasi senjata aktif. Target lain harus berupa defense dalam cakupan dataset; Builder Hut level 1 yang belum bersenjata tidak memenuhi syarat. Flag `weaponAvailable` diambil dari struktur weapon sumber: pada snapshot ini TH12-17 mempunyai senjata, sedangkan TH18 tidak. Checkbox aktif tidak dapat membuat TH tanpa senjata menjadi eligible.
- Giant Arrow menyimpan damage dasar pada dataset; multiplier Air Defense diterapkan di mesin, sehingga tidak dihitung dua kali.
- Earthquake Boots dan Earthquake Spell memakai satu penghitung gempa per target. Hit pertama memakai pembagi 1, berikutnya 3, 5, dan seterusnya; setiap sumber tetap memakai persentase pada levelnya sendiri. Urutan event dari waktu aktivasi dan prioritas menentukan sumber yang menerima pembagi tersebut. Kombinasi ini diperbolehkan pada mode uji dan pencarian.
- Aturan shared counter diadopsi sesuai koreksi pengguna dan [rujukan komunitas yang diberikan](https://www.reddit.com/r/ClashOfClans/comments/18lxqd7/does_earthquake_boots_have_the_same_penaltydamage/). [Earthquake Spell](https://clashofclans.fandom.com/wiki/Earthquake_Spell) dan [Earthquake Boots](https://clashofclans.fandom.com/wiki/Earthquake_Boots) juga merupakan rujukan yang diberikan pengguna. Ini bukan klaim bahwa seluruh pembulatan internal game telah diuji langsung.
- Penghitung hanya bertambah untuk gempa yang dapat memberi damage pada target. Earthquake level 1–5 terhadap hero tidak mengurangi damage Boots berikutnya dalam model; hero udara tetap tidak menerima damage dari keduanya. Healing tidak mereset penghitung gempa.
- Jumlah target pantulan, radius, lintasan, buff DPS hero, dan unit hasil summon tidak dijumlahkan sebagai damage tambahan pada target tunggal. Self-healing Electro Boots adalah milik penyerang dan tidak otomatis menjadi healing target.

Pemilihan checkbox berarti pengguna mengonfirmasi equipment mengenai target. Equipment terpilih dianggap wajib dalam pencarian; mesin mengoptimasi spell, bukan seluruh subset equipment. Tidak ada biaya spell untuk equipment, tetapi hero pemilik, jumlah equipment, serta level efektif ditampilkan.

## 2. Validasi loadout

Mode valid memeriksa:

1. Tidak ada equipment ID duplikat.
2. Maksimal dua equipment per hero.
3. Jumlah hero pemilik tidak melebihi slot Hero Hall pada preset TH; tanpa preset, memakai batas Hero Hall tertinggi dalam snapshot (empat slot).
4. Hero sudah tersedia menurut syarat Hero Hall dari dataset hero.
5. Level equipment memenuhi syarat Blacksmith dan cap common/epic pada preset TH.

Source Hero Hall dan Blacksmith ikut dikunci dan dinormalisasi dalam `requirements`. Hero level caps pada file Hero Hall tidak digunakan untuk menghitung HP target karena cakupan angkanya tidak selalu sejalan dengan tabel level hero; batas ini tidak ditebak atau disamakan dengan syarat TH langsung.

Mode eksperimen mengabaikan batas jumlah hero/equipment dan TH. Mode ini tetap memeriksa ID, level, target yang didukung, konfirmasi hit, serta interaksi yang belum didukung. Hasil diberi label eksperimen dan bukan army yang telah diverifikasi legal. Kepemilikan equipment, preset seluruh army, dan level hero penyerang tidak diperiksa.

## 3. Preset modifier bertanggal

Resolver berada di `public/js/zapquake-modifiers.js`, terpisah dari angka sumber mentah. Snapshot aturan ditinjau sampai **4 November 2026**; tanggal lebih baru ditolak, bukan otomatis memakai aturan lama.

| Profil | HP hero target | Level equipment |
|---|---|---|
| Normal / di bawah Legend pada Ranked | Tidak berubah | Tidak berubah |
| Legend III | +10% | Tidak berubah |
| Legend II | +15% | Tidak berubah |
| Legend I | +20% | Tidak berubah |
| Esports | +25% | Common −3; Epic −6, minimum level 1 sebagai batas model |

- Ranked/Friendly/Esports didukung untuk 27 April–4 November 2026.
- Bonus HP preset hanya diterapkan ke **hero target**. Tidak ada pengali HP bangunan, pengali damage spell, atau pengali projectile equipment dari bonus DPS defense/hero.
- Pengurangan level Esports memakai lookup statistik pada level efektif, bukan mengurangi damage dengan persentase perkiraan.
- Friendly Challenge dapat memilih Normal, Legend III/II/I, atau Esports secara eksplisit.
- Guardian dan serangan normal hero penyerang belum dimodelkan; bonus/penalti untuk statistik tersebut tidak ikut mengubah damage spell/equipment secara sembarang.

### Pemetaan CWL

| Periode aturan | Titan III / Titan II | Titan I | Legend |
|---|---|---|---|
| 1 Juni–29 Agustus 2026 | Legend II | Legend I | Legend I |
| 30 Agustus–4 November 2026 | Legend III | Legend II | Legend I |

Pilihan di bawah Titan III memakai profil Normal dalam cakupan ini. Tanggal CWL sebelum Juni belum tersedia karena pemetaan yang diperlukan belum cukup diaudit. Metadata resolver menyertakan periode berlaku serta sumber, termasuk batas akhir periode yang berbeda untuk pemetaan lama.

Referensi primer:

- [Supercell, The Sound of Clash, 27 April 2026](https://supercell.com/en/games/clashofclans/blog/release-notes/the-sound-of-clash-update/): tabel profil baru serta penghapusan modifier Electro 32/33.
- [Supercell, Friendly Challenges](https://sc-clashofclans.zendesk.com/hc/en-us/articles/49529122407835-Friendly-Challenges): profil challenge dan pengurangan level equipment.
- [Supercell, State of Gameplay Part 2, 22 Mei 2026](https://supercell.com/en/games/clashofclans/blog/news/state-of-gameplay-part-2/): pemetaan CWL untuk musim berikutnya dan perubahan Giant Arrow.
- [Supercell, August Update, 30 Agustus 2026](https://supercell.com/en/games/clashofclans/blog/release-notes/august-update-3/): perubahan pemetaan Titan pada CWL.

Nilai tersebut adalah subset yang memengaruhi model saat ini. Ini bukan klaim bahwa seluruh modifier game, periode lama, atau perubahan setelah tanggal audit sudah didukung.

## 4. Custom, supercharge, dan bonus musiman

Custom menggantikan preset liga; nilai custom nonzero bersama preset ditolak oleh resolver.

- Tambahan HP absolut: 0–1.000.000.
- Perubahan HP target: −90% sampai +300%, satu angka desimal.
- Perubahan damage equipment langsung/aura: −90% sampai +300%, satu angka desimal.
- Pengali damage custom tidak memengaruhi Lightning, Earthquake Spell, atau persentase Earthquake Boots.
- HP simulasi dihitung dari `(HP dasar/override + tambahan HP) × faktor HP`, lalu dibulatkan ke integer terdekat dengan konvensi half-up pada model.

Supercharge memakai checkbox dan HP total manual dari game. Tidak ada auto-binding nomor charge ke level bangunan atau asumsi bahwa `sourceHitpoints` merupakan tambahan HP. Opsi tersedia hanya untuk bangunan yang mempunyai baris supercharge dalam snapshot; target hero tidak menerima override ini.

Hero Bell diperiksa pada audit sumber: file memiliki flag `isCurrent = false` dan statistik berbasis modul. Karena periode serta stacking aktifnya belum dipastikan untuk seluruh skenario, tidak ada preset Hero Bell otomatis. Pengguna dapat mensimulasikan HP total/bonus yang diketahui melalui Custom. Hal yang sama berlaku untuk efek musiman yang belum mempunyai tabel dan periode tervalidasi. Nilai manual tersebut bukan klaim statistik game terkini.

## 5. Timeline dan damage berkala

- Spell pertama pada t=0, berikutnya mengikuti jeda manual 0–5 detik. Urutan kelompok Earthquake/Lightning tetap dipilih melalui kontrol yang sudah ada.
- Setiap equipment mempunyai waktu aktivasi 0–30 detik.
- Jika timestamp sama, pengguna menentukan equipment atau spell lebih dahulu; urutan stabil mempertahankan urutan input di dalam kelompok.
- Aura Electro Boots mempunyai durasi kontak 0,4–30 detik. Jumlah tick adalah floor(durasi / 0,4); maksimal 75 tick. Tick pertama terjadi pada waktu aktivasi +0,4, bukan tick gratis pada t=0.
- Healing manual 0–10.000 HP/detik berjalan hanya di antara event, dibatasi HP maksimum, dan berhenti setelah target hancur. Tidak ada resurrection.
- Healing dengan seluruh hit pada t=0 ditolak karena tidak ada timeline untuk menerapkannya.
- Detail event menampilkan waktu, sumber, damage, HP pulih, sisa HP, dan level efektif equipment.
- Semua operasi damage, waktu, serta selisih HP menggunakan pecahan rasional. Pembulatan tampilan tidak menentukan apakah target hancur.

Model ini tidak menentukan AI Builder, radius aura, gerakan hero, flight time projectile, fase immunity, mana target yang dipilih equipment, atau interaksi healing yang kompleks. Rate healing dan waktu hit adalah skenario yang diberikan pengguna, bukan prediksi engine pertempuran game.

## 6. Kinerja dan UI

Pencarian tetap dibatasi maksimal 256 kombinasi jumlah spell. Timeline equipment tetap sama untuk semua kandidat. Urutan prioritas tetap kapasitas paling sedikit, kemudian margin lebih besar. Loadout tidak dipangkas otomatis menjadi subset lain.

- Pencarian berjalan di Web Worker dengan modul dan versi mesin yang sama dengan UI.
- Input baru membatalkan worker sebelumnya; hasil lama tidak menimpa konfigurasi baru.
- Fallback tanpa Worker memakai ruang pencarian terbatas yang sama, misalnya bila hosting memblokir worker.
- Panel hasil diberi `aria-busy` dan spinner ketika menghitung ulang.
- Equipment, modifier, dan timing menggunakan panel yang dapat dibuka agar halaman tidak penuh sejak awal.
- Tampilan tetap mendukung Indonesia/English, empat tema, keyboard, serta lebar mobile.

File tambahan yang wajib diunggah bersama rilis:

```text
public/js/zapquake-modifiers.js
public/js/zapquake-worker.js
public/js/zapquake-model.js
public/js/zapquake.js
public/css/zapquake.css
public/zapquake.html
public/js/i18n.js
public/assets/data/zapquake/2026-11-04.5/dataset.json
public/assets/data/zapquake/2026-11-04.5/LICENSE.txt
public/assets/data/zapquake/manifest.json
```

Ikon memakai file army lokal yang sudah ada; tidak ada hotlink gambar atau library tambahan. Seluruh versi dataset lama tetap disimpan. Unggah direktori versi baru lengkap sebelum manifest. Saat memperbarui profil aturan atau perilaku worker setelah rilis, naikkan versi terkait dan versi mesin untuk invalidasi import script worker.

## 7. Verifikasi

```powershell
composer test:zapquake
node tests/i18n.test.js
composer test
```

Kasus pembanding meliputi:

- Equipment-only dengan nol spell, Giant Arrow vs Air Defense, dan level efektif Esports.
- Maksimum hero aktif, owner equipment, level Blacksmith, konfirmasi hit, serta mode eksperimen.
- Immunity Seeking Shield/CC dan konfirmasi senjata Town Hall.
- Earthquake Boots tunggal, shared counter Boots + Spell dalam dua urutan, event selang-seling, target hero, serta pencarian kombinasi yang bergantung pada urutan tersebut.
- Bonus hero tidak mengubah HP bangunan, perbedaan pemetaan CWL antarperiode, serta penolakan tanggal tidak didukung.
- Custom menggantikan preset; pengali custom tidak diterapkan ke sumber yang salah.
- Lima tick Electro Boots dalam dua detik, pemulihan HP antar-tick, tidak ada healing setelah target hancur, dan override supercharge manual.
- Dataset/checksum, validasi statistik equipment, serta backward validation rilis lama.
- Browser: desktop/mobile, dua bahasa, empat tema, panel lanjutan yang dibuka, worker, error/retry, dan tidak ada request profil pemain/klan.

Tahap berikutnya adalah Z8 untuk konfigurasi tersimpan, URL berbagi berversi, dan ekspor gambar. Kemampuan tersebut belum disertakan pada Z5–Z7.


## Target catalog layout

The calculator now opens with shared spell/equipment controls, collapsible battle conditions, and a searchable target catalog. Desktop shows four columns, tablet two, and phones one. Each target has its own level selector, estimated effective HP, lowest-slot combination, and a simulation-details dialog. The initial target level is the highest level in the active dataset; attacker TH does not set target levels.

Hero ground/air mode, supercharge HP, activated Town Hall weapon, and healing are target-specific and stored in memory for the current page only. Only Grand Warden requires an explicit ground/air choice. Archer Queen, Barbarian King and Royal Champion always defend on the ground; Dragon Duke and Minion Prince always defend in the air. The UI displays their fixed type and the model rejects incompatible manual overrides. These five heroes calculate automatically without opening the dialog. All selected equipment must hit each evaluated target; incompatible equipment produces an explanation rather than being silently removed. Test mode and the full event timeline are available inside the target dialog.

Catalog searches run in a cancellable batch worker with compact responses. A yielding main-thread fallback is used if workers are unavailable. Filters and shared inputs cancel older batches; stale results cannot replace newer ones. Search always optimizes spell combinations, while test mode affects the open detail simulation only. This layout adds no player API requests or persistent configuration.


### Attacker TH controls

Attacker TH is placed above spell levels with loadout validation. Spell options follow each spell row's Town Hall requirement. Equipment availability follows the owning hero's first Hero Hall requirement and the highest Hero Hall/Blacksmith available at the selected TH. Equipment level choices must satisfy both the row's Blacksmith requirement and the Blacksmith common/epic level cap. Unavailable equipment is hidden and deselected; an out-of-range selected level is clamped to the highest allowed level. Valid lower selections are preserved. TH 0 (manual) restores all supported choices. The UI keeps these TH limits even in experiment mode; select manual TH for an unrestricted TH simulation.

The pinned data unlocks Dragon Duke at Hero Hall 9 / TH15, Grand Warden at Hero Hall 5 / TH11, and Royal Champion at Hero Hall 7 / TH13. Giant Arrow needs Blacksmith 2 / TH9 even though Archer Queen unlocks earlier. Equipment/spell availability is based on the current dataset, not ownership or a live player profile. UI verification covers TH1-18, both languages, all themes, downgrade cleanup and manual mode.


### Defender TH preset

The target toolbar includes an independent Defender Town Hall preset (0 = manual). Engine 2.2.0 exposes `targetLevels(kind, id, defenderTH)` and checks the selected target against the same rules during both search and calculation. Building counts use the exact TH row and prefer `countAfterMerges` when present, including zero. The result is intersected with normal-level TH requirements. Town Hall targets match the selected TH exactly; hero limits follow the highest Hero Hall available at that TH. No base-level binding is inferred for supercharges.

Switching defender presets sets available target levels to their allowed maximum and clears level-specific manual supercharge/weapon flags. Details and cards use the same allowed levels. Manual mode restores all target types and levels. A prior dataset without availability tables disables the defender selector and retains manual mode. This field does not change attacker spell/equipment limits.

Presets describe a base after all merges represented in the source, not an individual player's construction or merge progress. Cannon and Eagle Artillery are absent in TH17/18 presets; manually select legacy targets for transitional scenarios. Source counts and post-merge counts remain separately traceable. Level requirements win when count data conflicts: Monolith's TH14 count is positive, but its first level needs TH15; similarly Clan Castle has counts at TH1/2 but its first eligible level needs TH3. These conflicts are listed in the importer audit report, not silently rewritten into the source.
