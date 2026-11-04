# Rancangan Zapquake & Damage Calculator — ClanIntel

Tanggal rancangan: 4 November 2026  
Status: Z1–Z7 sudah diimplementasikan dengan cakupan model yang terdokumentasi: spell, delapan equipment, preset modifier bertanggal, serta timeline/healing manual.  
Cakupan: halaman mandiri dengan input manual, tanpa koneksi ke profil pemain.

Hasil audit, cakupan statistik, mekanik yang masih perlu diverifikasi, serta perintah impor/publikasi tersedia di [ZAPQUAKE_DATA_AUDIT.md](ZAPQUAKE_DATA_AUDIT.md). Rilis data aktif `2026-11-04.5` berstatus `reference-data-only` dan mencakup defense, Town Hall, Clan Castle, enam Hero, serta delapan equipment. Status sumber mentah tidak diubah menjadi klaim replikasi penuh engine game.

Halaman tersedia di `/tools/zapquake`. Kontrak aktif mesin `2.2.1`, equipment, periode modifier, timeline, batas akurasi, dan pengujiannya dijelaskan di [ZAPQUAKE_ADVANCED.md](ZAPQUAKE_ADVANCED.md). Catatan dasar Z3–Z4 tersimpan di [ZAPQUAKE_CALCULATOR.md](ZAPQUAKE_CALCULATOR.md). Tahap berikutnya Z8–Z9.

## 1. Tujuan dan batas fitur

Membantu pengunjung menghitung kombinasi spell dan hero equipment untuk menghancurkan target, sekaligus memahami sisa HP, kapasitas spell, dan asumsi perhitungannya.

Dua cara penggunaan:

1. **Cari kombinasi / Find combinations:** pilih target, level sumber damage, dan batas penggunaan; aplikasi mencari kombinasi yang valid.
2. **Uji kombinasi / Test my combination:** tentukan sumber, jumlah, dan urutan; aplikasi menghitung hasil konfigurasi tersebut.

Ketentuan dasar:

- Seluruh konfigurasi diisi manual. Tidak memerlukan player tag atau panggilan API pemain.
- Preset TH membantu mengisi batas level, tetapi bukan data base pemain sebenarnya.
- Perhitungan awal berfokus pada satu target. Tidak menyimpulkan keberhasilan serangan atau kemungkinan tiga bintang.
- Damage dihitung dengan asumsi sumber yang dipilih benar-benar mengenai target sesuai input.
- Posisi bangunan, lintasan hero, radius, pantulan, timing, dan perbaikan bangunan tidak disimulasikan otomatis.
- Mekanik yang belum diverifikasi ditandai **Belum didukung**, bukan dianggap bernilai nol atau memakai aturan normal secara diam-diam.
- Tidak semua spell atau equipment perlu menjadi sumber damage. Efek pendukung ditangani berdasarkan interaksi yang relevan.

## 2. Halaman dan navigasi

Usulan URL: `/tools/zapquake`.

- Akses melalui menu **Tools / Alat** dan kartu akses pada beranda.
- Menggunakan header, footer, pilihan bahasa, serta empat pilihan tema yang sudah tersedia.
- Halaman dapat digunakan tanpa membuka profil atau klan terlebih dahulu.
- Judul halaman, deskripsi, canonical, dan konten pengantar dibuat dalam Indonesia/English sesuai pola SEO aplikasi.
- Konfigurasi simulasi pada query tidak menghasilkan banyak URL terindeks; gunakan canonical ke halaman kalkulator dalam bahasa terkait.

## 3. Mendapatkan dan memelihara data

### 3.1 Sumber awal

Kandidat sumber dataset:

- [clash-of-clans-data](https://github.com/chiefpansancolt/clash-of-clans-data): kandidat data terstruktur bangunan, spell, hero, dan equipment.
- [Dokumentasi static data ClashKing](https://clashy.clashk.ing/en/latest/models/static.html): referensi model statistik dari file data game.
- [Blog resmi Clash of Clans](https://supercell.com/en/games/clashofclans/blog/page/1/): referensi perubahan balance dan modifier.

Sebelum memilih sumber utama, periksa contoh file sebenarnya, kelengkapan field, pemetaan ID, versi, lisensi/atribusi, dan cakupan level. Nama paket atau keberadaan suatu item belum membuktikan seluruh mekaniknya tersedia.

API profil pemain bukan sumber HP bangunan dan damage untuk fitur ini. Tidak diperlukan scraping setiap pengunjung membuka kalkulator.

### 3.2 Alur pembaruan

```text
Unduh versi sumber tertentu
  → simpan provenance dan identitas versi
  → normalisasi ke format ClanIntel
  → validasi struktur, level, dan nilai
  → buat laporan perubahan terhadap versi aktif
  → jalankan pengujian perhitungan dan interaksi
  → tinjau perubahan aturan
  → terbitkan dataset baru secara atomik
```

- Jalankan melalui script pengelolaan/development; cron tidak diperlukan pada tahap awal.
- Jika kelak ada pemeriksaan otomatis, proses tersebut hanya mendeteksi pembaruan. Penerbitan dataset tetap melewati validasi.
- Pertahankan dataset terakhir yang valid bila unduhan atau validasi gagal.
- Bedakan `schemaVersion`, `dataVersion`, dan `engineVersion`.
- Simpan tanggal berlaku, tanggal pemeriksaan, sumber, serta checksum data impor.
- Gunakan ID stabil; nama tampilan dan terjemahan tidak menjadi kunci perhitungan.
- Riwayat data lama dipertahankan sesuai kebijakan retensi yang ditetapkan. Tautan lama tidak boleh diam-diam dihitung memakai versi baru.

### 3.3 Struktur data yang dibutuhkan

| Kelompok | Field penting |
|---|---|
| Bangunan | ID, level, HP, batas TH, kategori, varian, perubahan HP supercharge |
| Hero target, tahap awal | ID, level, HP dasar, syarat Hero Hall; kategori darat/udara dan tambahan HP hanya bila terverifikasi |
| Spell | ID, level, kapasitas, damage langsung/persentase/berkala, kelayakan target |
| Equipment | ID, hero pemilik, level, komponen damage, jumlah hit, jenis efek, kelayakan target |
| Batas loadout | Kapasitas spell, aturan slot/hero, ketersediaan berdasarkan preset |
| Interaksi | Immunity, diminishing returns, efek gabungan, urutan, pembulatan |
| Modifier | ID, cakupan, nilai, operasi, prioritas, konflik, periode berlaku |
| Metadata | Versi, sumber, tanggal verifikasi, dukungan mekanik, atribusi |

Pisahkan data mentah impor dari JSON publik yang sudah dinormalisasi. Kirim hanya subset yang diperlukan browser, dengan kompresi HTTP dan cache berbasis versi.

## 4. Mesin perhitungan

### 4.1 Pemisahan komponen

Mesin matematika berupa modul JavaScript murni yang tidak bergantung pada DOM atau bahasa tampilan. Pisahkan:

- Lookup statistik sesuai versi.
- Validasi konfigurasi dan legalitas loadout.
- Resolusi modifier serta konflik.
- Penerapan setiap damage event.
- Pencarian kombinasi.
- Penyusunan hasil dan penjelasan.

UI menerima hasil terstruktur dengan kode status dan parameter angka; terjemahan dikerjakan pada lapisan tampilan.

### 4.2 Urutan kalkulasi

1. Validasi target, level, sumber damage, dan versi data.
2. Ambil HP dasar dan varian target.
3. Terapkan modifier HP menurut urutan yang terverifikasi.
4. Periksa eligibility sumber terhadap target.
5. Susun damage event berdasarkan jumlah, hit, durasi, dan urutan input.
6. Terapkan setiap event memakai aturan mekaniknya.
7. Hitung sisa HP, status target, kapasitas, dan margin.
8. Tampilkan rincian sumber, modifier aktif, serta asumsi yang digunakan.

Untuk damage langsung sederhana, sisa HP dapat dijelaskan sebagai `max(0, HP efektif − damage yang berlaku)`. Rumus ini tidak menggantikan aturan khusus damage persentase, immunity, penurunan damage berulang, atau pemulihan HP.

### 4.3 Jenis damage

| Jenis | Pendekatan |
|---|---|
| Langsung | Nilai damage per level dan per hit yang mengenai target |
| Persentase | Aturan eksplisit: berbasis HP maksimum atau sisa HP, sesuai mekanik terverifikasi |
| Berulang | Jumlah event, koefisien tiap event, dan diminishing returns bila berlaku |
| Berkala | Tick/durasi yang ditentukan; bukan damage maksimum tanpa batas waktu |
| Pantulan/proyektil | Jumlah hit pada target yang dipilih, dengan batas valid |
| Pemulihan/perlindungan | Aturan terpisah; dukungan hanya setelah timing dan interaksinya tersedia |

Earthquake Spell dan Earthquake Boots tidak otomatis dianggap mekanik yang sama. Hubungan antar-efek harus diperiksa secara khusus.

Pembulatan internal harus mengikuti aturan yang sudah diverifikasi. Pisahkan pembulatan tampilan dari pembulatan perhitungan; tampilkan batas akurasi apabila perilaku game belum dapat dipastikan.

### 4.4 Hasil

- **Target hancur**, **Tersisa … HP**, **Konfigurasi tidak valid**, atau **Mekanik belum didukung**.
- HP dasar, perubahan HP, dan HP efektif.
- Kontribusi damage per sumber/event.
- Sisa HP atau kelebihan damage, tanpa membesar-besarkan damage setelah target hancur.
- Kapasitas spell yang digunakan dan batasnya.
- Hero serta slot equipment yang diperlukan.
- Penanda **Margin tipis** dengan ambang yang transparan dan dapat disesuaikan.
- Daftar kondisi aktif, asumsi mengenai target, dan versi data.

## 5. Pencarian kombinasi

Pengguna menentukan sumber yang boleh dipakai, level, batas jumlah per spell, kapasitas total, serta equipment yang tersedia.

Prioritas default:

1. Kombinasi valid yang menghancurkan target.
2. Kapasitas spell paling sedikit.
3. Equipment yang diperlukan paling sedikit, sesuai preferensi pengguna.
4. Margin damage terbesar sebagai pembeda untuk biaya yang sama.

Equipment tidak dianggap tanpa biaya karena tidak memakai kapasitas spell; kebutuhan hero/slot ditampilkan. Sediakan opsi mengunci equipment wajib agar pencarian sesuai rencana pengguna.

- Batasi ruang pencarian berdasarkan kapasitas dan aturan legalitas.
- Pangkas kombinasi yang tidak mungkin atau didominasi kombinasi lain.
- Jangan mencoba seluruh permutasi urutan bila aturan yang terverifikasi menunjukkan urutannya ekuivalen.
- Jika urutan berpengaruh, pertimbangkan urutan relevan atau minta input urutan pada mode uji kombinasi.
- Gunakan Web Worker bila pencarian mulai menghambat UI; dukung pembatalan dan abaikan hasil konfigurasi lama.
- Bedakan **Tidak ada kombinasi dalam batas pilihan** dari **Pencarian dihentikan/belum selesai**.
- Tampilkan beberapa alternatif terbaik; rincian lainnya dapat dibuka.

## 6. Modifier dan kondisi pertempuran

Tujuannya adalah struktur yang dapat diperluas. Label **semua modifier didukung** hanya boleh digunakan bila cakupannya benar-benar terverifikasi terhadap versi tertentu.

### 6.1 Preset

| Pilihan | Perilaku |
|---|---|
| Normal | Statistik dasar untuk periode data terkait |
| Ranked League | Pemetaan liga ke aturan pada periode terpilih |
| CWL | Pemetaan liga/musim tersendiri; tidak otomatis menyalin Ranked |
| Friendly/turnamen | Preset terverifikasi; tidak menganggap semua turnamen mempunyai aturan identik |
| Supercharge | Pilihan per target jika data level tersebut tersedia |
| Musiman | Hanya tersedia untuk item/periode yang memang didukung |
| Custom | Override HP/damage yang diberi label simulasi khusus |

### 6.2 Aturan penyimpanan modifier

Setiap modifier mencatat:

- Target field: HP bangunan, HP hero, damage spell, atau komponen damage equipment tertentu.
- Cakupan: kategori, ID item, level, mode, serta periode.
- Operasi: penambahan, perkalian, penggantian, atau handler khusus.
- Urutan dan aturan stacking.
- Grup eksklusif/konflik agar preset tidak dihitung dua kali.
- Sumber dan status verifikasi.
- Nilai yang dipakai sebelum dan sesudah modifier untuk penjelasan hasil.

Modifier yang tidak memengaruhi perhitungan harus dijelaskan sebagai **Tidak memengaruhi target/sumber ini**, bukan tetap mengalikan seluruh statistik.

Saat periode baru belum memiliki aturan tervalidasi, tampilkan versi terakhir beserta keterbatasannya atau nonaktifkan preset terkait. Jangan menganggap aturan musim sebelumnya masih berlaku.

## 7. Spell dan hero equipment

Daftar berikut merupakan kandidat cakupan. Level, target yang valid, jumlah hit, serta kompatibilitas harus diverifikasi sebelum diaktifkan.

| Kelompok | Kandidat | Kebutuhan input/aturan |
|---|---|---|
| Spell langsung | Lightning | Level, jumlah, target immunity |
| Spell persentase | Earthquake | Level, jumlah, kategori target, aturan hit berulang |
| Equipment langsung | Fireball, Giant Arrow | Level dan hit pada target; interaksi khusus bila ada |
| Equipment pantulan | Spiky Ball, Seeking Shield | Hit/pantulan yang benar-benar mengenai target |
| Equipment persentase | Earthquake Boots | Level dan interaksi terverifikasi dengan efek persentase lain |
| Equipment lain pemberi damage | Rocket Backpack, Flame Blower, dan item baru | Komponen damage, hit/tick, eligibility, batas input |
| Damage berkelanjutan | Equipment aura/serangan berulang yang relevan | Durasi/tick dan kondisi target |
| Efek pendukung | Rage, Freeze, Invisibility, Overgrowth, dan sejenisnya | Handler interaksi bila diperlukan; bukan otomatis sumber damage |

Tidak semua equipment memiliki damage yang dapat dihitung secara mandiri. Equipment pemanggil unit atau pengubah serangan hero memerlukan model serangan/unit tersendiri; tidak dimasukkan sebagai angka damage tetap tanpa asumsi tambahan.

Dua mode legalitas:

- **Loadout valid:** mengikuti aturan hero, slot equipment, sumber spell, dan kapasitas untuk versi game yang dipilih.
- **Eksperimen:** kombinasi bebas dengan label simulasi khusus. Hasilnya tidak disebut loadout yang bisa dibawa ke game.

## 8. Rancangan UI/UX

### Desktop

```text
Zapquake & Damage Calculator          [Bahasa] [Tema]
Versi data … · Diverifikasi …

[Cari kombinasi] [Uji kombinasi saya]

Konfigurasi                          Hasil
┌ Target ──────────────────────┐     ┌ Kombinasi terbaik ─────────────┐
│ Pencarian · level · gambar   │     │ Status · spell · equipment    │
│ HP · supercharge            │     │ Kapasitas · margin/sisa HP    │
└─────────────────────────────┘     └───────────────────────────────┘
┌ Sumber damage ───────────────┐     [Alternatif]
│ Spell · level · batas jumlah│     [Rincian damage dan modifier]
│ Equipment · level · hit     │     [Asumsi dan cakupan dukungan]
└─────────────────────────────┘     [Salin tautan] [Reset]
[Kondisi pertempuran ▾]
[Batas loadout ▾]
```

### Mobile

- Urutan: target → sumber damage → preset kondisi → hasil → alternatif/rincian.
- Panel lanjutan dilipat agar konfigurasi umum tetap singkat.
- Kartu sumber menampilkan ikon, level, dan kontrol dengan area sentuh yang memadai.
- Hindari tabel lebar untuk konfigurasi; rincian hasil dapat berbentuk daftar.
- Perubahan konfigurasi membatalkan pencarian sebelumnya; status hasil harus jelas saat menghitung ulang.
- Hasil kosong menjelaskan input yang masih diperlukan.

### Bahasa, tema, dan aksesibilitas

- Seluruh teks memakai mekanisme i18n aplikasi, termasuk error, asumsi, nama kondisi, dan status dukungan.
- Angka/persentase/tanggal mengikuti bahasa aktif; nilai pada model tetap numerik.
- Ikon disimpan lokal dan dioptimalkan. Aset yang belum tersedia menggunakan placeholder yang jelas.
- Status tidak hanya dibedakan dengan warna; sertakan teks dan ikon.
- Kontrol dapat dipakai melalui keyboard, mempunyai label, dan menjaga fokus saat hasil berubah.
- Hormati preferensi reduced motion.

## 9. Penyimpanan dan berbagi

- Simpan konfigurasi terakhir di localStorage dengan versi schema.
- Tautan berbagi memuat ID target, level, sumber, modifier, batas, dan versi data/engine yang diperlukan.
- Validasi panjang, tipe, rentang, jumlah sumber, dan ID dari URL; jangan menerima formula JavaScript dari input.
- Jika versi lama tidak tersedia, tampilkan pesan yang jelas dan opsi migrasi ke versi terbaru. Migrasi tidak dilakukan diam-diam.
- Ekspor gambar tahap lanjutan memuat target, konfigurasi, hasil, asumsi penting, versi data, dan identitas ClanIntel.
- Tidak menyimpan tag atau data profil pemain karena fitur ini sepenuhnya manual.

## 10. Usulan struktur implementasi

Sesuaikan nama akhir dengan routing proyek saat implementasi.

```text
public/
  zapquake.html                       Template halaman kalkulator
  js/zapquake-model.js                Validasi dan mesin perhitungan
  js/zapquake-search.js               Pencarian kombinasi
  js/zapquake.js                      UI dan integrasi bahasa/tema
  css/zapquake.css                    Layout dan komponen
  assets/data/zapquake/<version>/     Dataset publik tervalidasi
  assets/images/zapquake/             Aset tambahan jika diperlukan
scripts/
  prepare-zapquake-data.php           Impor, normalisasi, laporan perubahan
tests/
  zapquake-model.test.js              Perilaku perhitungan dan interaksi
  zapquake-data.php                   Validasi dataset publik
```

Gunakan kembali aset yang sudah ada daripada menggandakan ikon. Dataset dipisahkan dari folder runtime `data/` yang diabaikan Git, sehingga versi publik ikut deployment. Raw unduhan dan laporan sementara dapat disimpan di area development yang diabaikan Git.

## 11. Tahapan implementasi

| Tahap | Pekerjaan | Hasil dan kriteria selesai |
|---|---|---|
| Z1 — Audit sumber dan cakupan | Periksa dataset, sumber resmi, lisensi/atribusi, ID, field, aturan target, pembulatan, dan modifier | Dokumen cakupan terverifikasi, daftar mekanik belum didukung, serta sumber utama terpilih. Jangan lanjut ke klaim akurasi sebelum data minimum tersedia |
| Z2 — Pipeline dataset | Importer, normalisasi, metadata versi, pemeriksaan nilai, diff, dan publikasi atomik; HP defense/TH/CC/Hero sejak awal | Dataset target + Lightning/Earthquake dapat direproduksi dari sumber tertentu; syarat Hero Hall tidak disamakan dengan TH; kegagalan tidak menimpa versi valid |
| Z3 — Mesin dasar | Target defense, Town Hall, Clan Castle, Hero; eligibility/immunity tiap kategori, Lightning/Earthquake, urutan/interaksi tervalidasi, sisa HP | Pengujian batas tepat hancur, kurang damage, target kebal, hit berulang, dan pembulatan lulus; aturan bangunan tidak otomatis diterapkan ke Hero; mekanik belum didukung dinyatakan eksplisit |
| Z4 — Halaman MVP | Kelompok target defense/TH/CC/Hero, input manual, preset TH, dua mode penggunaan, hasil/alternatif, i18n, empat tema, navigasi | Kalkulator berguna tanpa profil; desktop/mobile dan status loading/kosong/error berfungsi. Pencarian dibatasi loadout dan tidak membekukan halaman |
| Z5 — Equipment langsung | Equipment terpilih, eligibility, jumlah hit, aturan slot/hero, preferensi pencarian | Loadout tidak valid ditolak atau dilabeli eksperimen; tidak ada penjumlahan equipment yang tidak kompatibel tanpa penjelasan |
| Z6 — Modifier | Preset normal/Ranked/CWL, periode, supercharge, musiman yang tervalidasi, custom, konflik | Perhitungan HP/damage dapat dijelaskan per langkah; preset tidak berlaku ditolak dan stacking tidak dihitung ganda |
| Z7 — Mekanik lanjutan | Penyempurnaan kondisi hero, damage berkala, efek pendukung, timing khusus sesuai prioritas | Setiap mekanik memiliki input yang cukup dan pengujian interaksi; efek yang belum dimodelkan tetap terlihat sebagai batas dukungan |
| Z8 — Simpan dan bagikan | localStorage, URL berversi, reset, penanganan link lama; ekspor gambar opsional | Konfigurasi dapat dibuka ulang dengan hasil konsisten; versi hilang ditangani eksplisit; gambar mencantumkan konteks dan versi |
| Z9 — Pemeliharaan dan rilis | Panduan pembaruan, changelog, pengukuran performa, SEO, audit aset deployment | Pembaruan balance dapat diproses ulang dan di-rollback; data, script, style, serta aset terbit dalam rilis yang sesuai |

Urutan dependensi: **Z1 → Z2 → Z3 → Z4 → Z5 → Z6 → Z7**, kemudian **Z8–Z9** sesuai kesiapan. Struktur modifier dipersiapkan pada Z2/Z3 meskipun preset baru diaktifkan pada Z6. Dokumentasi dan pemeriksaan regresi dilakukan pada setiap tahap.

## 12. Verifikasi yang diperlukan

### Statistik dan mekanik

- Level minimum/maksimum, item terkunci TH, data tidak tersedia, dan ID tidak dikenal.
- Target tepat hancur, selisih sangat kecil, overkill, serta HP yang telah dimodifikasi.
- Target immune dan sumber yang tidak efektif.
- Earthquake berulang, campuran level bila didukung, serta interaksi dengan equipment persentase.
- Konfigurasi berurutan dan kasus ketika urutan memang tidak berpengaruh.
- Jumlah hit/tick di luar batas, durasi nol, dan durasi yang tidak didukung.
- Aturan equipment/hero/kapasitas, mode eksperimen, dan konflik modifier.
- Batas periode modifier serta tautan yang menggunakan dataset lama.

### Pencarian dan performa

- Bandingkan pencarian teroptimasi dengan enumerasi sederhana pada ruang uji kecil.
- Pastikan hasil tidak melebihi batas spell atau memakai equipment yang tidak dipilih.
- Hasil terbaik mengikuti prioritas yang dinyatakan UI.
- Pencarian dibatalkan saat konfigurasi berubah; hasil lama tidak menimpa hasil baru.
- Bedakan tidak ada solusi dengan batas waktu/pencarian yang belum selesai.

### UI dan deployment

- Indonesia/English, empat tema, desktop, portrait mobile, dan landscape.
- Navigasi keyboard, label kontrol, status yang dapat dibaca pembaca layar, serta tidak ada overflow.
- Dataset gagal dimuat, versi tidak tersedia, aset hilang, localStorage tidak tersedia, dan URL tidak valid.
- Pengujian perhitungan memakai kasus referensi yang diverifikasi, bukan hanya mengulang rumus implementasi dalam tes.
- Klaim hasil untuk mekanik sensitif dikonfirmasi dengan contoh di game atau referensi yang dapat ditelusuri sebelum diaktifkan publik.

## 13. Referensi pembahasan

- [Clashify Zapquake](https://clashify.app/zapquake) — referensi alur konfigurasi dan pilihan sumber damage; bukan kontrak API untuk ClanIntel.
- [clash-of-clans-data](https://github.com/chiefpansancolt/clash-of-clans-data) — kandidat sumber statistik terstruktur.
- [ClashKing static data](https://clashy.clashk.ing/en/latest/models/static.html) — dokumentasi data statis.
- [Pembaruan Februari 2026](https://supercell.com/en/games/clashofclans/blog/release-notes/the-february-update-has-escaped/) — contoh perubahan eligibility Earthquake.
- [State of Gameplay, Mei 2026](https://supercell.com/en/games/clashofclans/blog/news/state-of-gameplay-part-2/) — contoh perubahan pemetaan modifier CWL.
- [Pembaruan Agustus 2026](https://supercell.com/en/games/clashofclans/blog/release-notes/august-update-3/) — contoh penyesuaian modifier dan supercharge.

Referensi tersebut menjadi titik awal pemeriksaan. Nilai statistik dan aturan terkini tetap harus divalidasi kembali pada Z1; dokumen ini tidak menetapkan angka HP, damage, atau koefisien modifier sebagai data produksi.
