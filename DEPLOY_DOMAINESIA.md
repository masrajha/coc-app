# Deploy ke DomaiNesia (PHP + Composer)

Aplikasi ini memakai PHP 8.2+, Composer, Slim, dan Guzzle. Frontend tetap di `public/`; jangan buat Node.js App untuk backend PHP. Jika pernah membuat Node.js App yang memakai subdomain yang sama, hentikan/hapus aplikasi itu agar Passenger tidak mengambil alih request PHP. Pastikan paket hosting menyediakan PHP 8.2+, Composer/Terminal SSH, Apache `mod_rewrite`, ekstensi cURL/OpenSSL, dan izin menulis ke direktori data.

## 1. Arahkan domain dan atur PHP

Siapkan subdomain, misalnya `coc.domainanda.com`, arahkan ke hosting dan aktifkan SSL/AutoSSL. Pilih PHP 8.2 atau yang lebih baru pada PHP Selector. Berkas `.htaccess` memakai `mod_rewrite` untuk meneruskan request halaman dan `/api/*` ke `index.php`, sambil mengecualikan `index.php` dan file/folder fisik untuk mencegah rewrite loop (HTTP 508).

## 2. Unggah source project

Unggah `index.php`, `.htaccess`, `composer.json`, `composer.lock`, folder `src/`, dan folder `public/` ke document root subdomain. Jangan unggah `.git/`, `.env` lokal, `node_modules/`, atau file contoh MHTML. Aplikasi tidak memakai `npm build` atau folder frontend hasil build.

Di Terminal/SSH, dari root aplikasi jalankan:

```sh
composer install --no-dev --prefer-dist --optimize-autoloader
```

Composer memasang paket sesuai `composer.lock` ke folder `vendor/`. Jika Composer tidak tersedia di hosting, jalankan Composer di komputer dengan versi PHP yang sesuai lalu unggah `vendor/` bersama project.

## 3. Atur token dan penyimpanan persisten

Atur `COC_API_TOKEN` melalui environment variables hosting. Jika panel tidak menyediakan environment variables, buat `.env` di root aplikasi (akses langsungnya diblokir oleh `.htaccess`). Jangan simpan token di JavaScript/frontend.

Buat direktori privat yang dapat ditulisi di luar document root, misalnya `/home/USERNAME/coc-data`, lalu set `DATA_DIR` ke lokasi itu. Arsip perang, snapshot anggota, cache API, dan cache ikon disimpan di sana; backup berkala. Untuk mempertahankan riwayat lama, salin folder `wars/` dan `snapshots/` ke direktori data baru.

Daftarkan **IP koneksi keluar server** pada API key di [Clash of Clans Developer Portal](https://developer.clashofclans.com/). IP keluar bisa berbeda dari alamat hosting di dashboard. Isi `COC_API_TOKEN` dengan token tersebut.

## 4. Periksa aplikasi

Buka `https://coc.domainanda.com/`, lalu uji pencarian klan, perang/CWL, halaman profil dan perbandingan, serta laporan aktivitas. Jika API mengembalikan 403, periksa token dan IP keluar yang didaftarkan; jika terjadi 500, periksa error log PHP dan izin tulis `DATA_DIR`. Setelah mengubah kode atau `composer.json`/`composer.lock`, unggah perubahan dan jalankan Composer kembali bila dependensi berubah.

## 5. Siapkan ikon profil untuk hosting

Pergantian backend ke PHP saja tidak menyelesaikan ikon yang gagal jika IP hosting tidak dapat mengambil gambar Fandom. Endpoint ikon sekarang mengutamakan file lokal dan cache; permintaan web tidak mencoba banyak unduhan Fandom secara serentak. Untuk menyediakan ikon secara stabil:

1. Pada komputer lokal yang dapat memuat ikon, pastikan `.env` memiliki `COC_API_TOKEN` yang valid untuk IP lokal.
2. Jalankan `php scripts/prepare-icons.php 2R92VJG0U`. Tag pemain lain dapat ditambahkan untuk mengisi ikon item yang berbeda. Proses ini membaca profil pemain, lalu menyimpan gambar yang berhasil ke `public/icons/`.
3. Unggah **seluruh isi** `public/icons/` ke folder `public/icons/` di document root hosting. Unggah juga `src/App.php`, lalu refresh halaman profil dengan cache browser dibersihkan. Ikon tersedia lewat URL `/public/icons/<hash>.webp` (atau ekstensi gambar lain) sebagai file statis.
4. Jika keluaran perintah masih mencatat ikon gagal, cek nama item dan jaringan komputer lokal. Ulangi perintah setelah koneksi pulih; file yang berhasil sebelumnya akan dilewati.

`ICON_REMOTE_FETCH` tidak perlu diaktifkan di hosting. Bila disetel ke `1`, backend PHP kembali mencoba mengunduh ikon yang belum tersimpan saat menerima permintaan web; hal ini dapat membebani shared hosting.

### Jika ada Hero Equipment baru

Profil pemain menampilkan setiap equipment yang dikirim API, termasuk nama yang belum dikenal aplikasi. Item tanpa pemetaan akan masuk ke grup "Equipment lainnya". Untuk mengelompokkannya dengan benar, tambahkan nama persis dari API dan hero pemilik ke katalog `EQUIPMENT` di `src/App.php`. Jika URL ikon yang benar sudah diketahui, tambahkan sebagai `iconUrl` di entri yang sama. Level dan `maxLevel` tetap diambil dari API; jangan menuliskannya di katalog.

Siapkan gambar di `public/icons/` dengan nama `<sha256 dari heroEquipment:Nama Equipment>.<ekstensi gambar sebenarnya>`. Contoh Portal Pendant: `6670fe7511b1b140b321380d46c64f4194bb820a8cbe7b370ad33d5cbdf1135d.webp` karena URL sumber mengirim berkas WebP. Alternatifnya, jalankan `prepare-icons.php` dengan tag pemain yang sudah memiliki item tersebut. Unggah gambar lokal bersama perubahan `src/App.php`, lalu periksa bahwa `/api/player/{tag}/profile` menempatkan ikon lokal di urutan pertama `iconUrls`.

## 6. Clan Capital dan Raid Weekend

Unggah `src/RaidReport.php`, perubahan `src/App.php`, `public/raids.js`, `public/raids.css`, `public/index.html`, `public/player.html`, `public/player.js`, dan `public/i18n.js`. Pastikan direktori data aplikasi dapat ditulis; subfolder `data/raids/` dibuat otomatis.

Pada halaman clan, buka navigasi **Clan Capital** atau panel **Raid Weekend** untuk mengambil 10 weekend pertama. Tombol muat sebelumnya meneruskan cursor API. Setiap pengambilan menyimpan atau memperbarui arsip berdasarkan clan dan waktu mulai weekend, hingga 104 weekend per clan. Cache API menggunakan durasi yang sama dengan data lain; data tersimpan dapat ditampilkan dengan label khusus saat API maintenance atau timeout.

Tab **Raid Weekend** pada halaman player mengambil data clan pemain saat ini, atau clan konteks jika pemain tidak memiliki clan, lalu menggabungkannya dengan partisipasi yang sudah tersimpan di arsip clan lain. Riwayat tidak diambil otomatis dari semua clan dan pencatatan tidak berjalan terjadwal. Data yang belum pernah diambil serta weekend di luar batas arsip tidak dijanjikan tersedia. Peserta yang tidak tercantum di respons API tidak otomatis dianggap tidak ikut.

Jalankan `composer test` untuk smoke test dan pengujian raid. Pemeriksaan terjemahan: `node tests/i18n.test.js`.

## 7. Compare Clan dan label pencarian

Unggah `public/compare-clan.html`, `public/clan-compare.js`, `public/clan-compare-model.js`, `public/clan-compare.css`, dan `public/clan-labels.js`, bersama perubahan `public/index.html`, `public/i18n.js`, serta `src/App.php`. Buka **Bandingkan clan** dari header halaman utama atau profil clan. Tautan mendukung parameter `clan1`, `clan2`, `days`, dan `weekend`.

Perbandingan menggunakan profil saat diakses, maksimal 50 entri war log terbaru dalam periode 30/90 hari, dan weekend bersama dari 10 weekend raid yang tersedia. War log privat hanya memengaruhi bagian terkait. TH dan donasi yang tidak tersedia tidak dianggap nol. Label pencarian diambil dari `/api/clans/labels` dengan cache satu hari dan maksimal tiga pilihan. Pencarian tetap bisa digunakan jika daftar label gagal dimuat.

## 8. Leaderboard Builder Base, distrik Capital, dan pencapaian

Unggah `src/ClanCapitalReport.php`, `public/account-features.js`, `public/account-features.css`, serta perubahan `src/App.php`, `public/rankings.js`, `public/index.html`, `public/player.html`, `public/player.js`, dan `public/i18n.js`.

Leaderboard memakai filter negara yang sama untuk Home Village, Builder Base, dan Capital. Pada halaman clan, bagian Clan Capital menampilkan level distrik dan selisih terhadap snapshot harian sebelumnya yang memiliki data Capital. Snapshot lama tetap dapat dibaca; perubahan level baru tersedia setelah aplikasi menyimpan data Capital pada hari yang berbeda.

Tab Pencapaian di profil pemain memakai data achievement dari API; nama dan deskripsi mengikuti teks API. Badge preferensi war membedakan ikut, tidak ikut, dan belum diketahui. Preferensi ini bukan status pemilihan roster. Daftar anggota memuat preferensi pemain yang terlihat melalui endpoint ringan `/api/player/{tag}/war-preference`, dengan maksimal empat permintaan bersamaan dan menggunakan cache profil API.

## 9. Tab dashboard clan

Unggah `public/clan-tabs.js`, `public/clan-tabs.css`, serta perubahan `public/index.html` dan `public/i18n.js`. Halaman `/clan.html` menggunakan dokumen dashboard yang sama. Urutan tab: Ringkasan, Anggota, War & CWL, Clan Capital, Riwayat & Laporan.

Tautan tab mendukung `#overview`, `#members`, `#war-cwl`, `#capital`, dan `#history`; anchor lama seperti `#war-roster`, `#cwl-standings`, dan `#clan-capital` tetap membuka tab yang sesuai. Deskripsi/profil lengkap, roster, target, dan analisis dapat dilipat. Daftar anggota dipaginasi 25 baris dengan pencarian, filter, dan pengurutan untuk seluruh hasil.

Data profil, ringkasan war, dan snapshot anggota tetap dimuat untuk mengisi Ringkasan. Detail standings/performa CWL dimuat saat tab War & CWL dibuka, riwayat perang saat tab Riwayat & Laporan dibuka, dan Raid Weekend saat tab Capital dibuka. Preferensi war anggota tetap dimuat hanya untuk baris yang terlihat.

## 10. Tema Gelap, Terang, dan Sistem

Unggah `public/theme.js`, `public/theme.css`, seluruh stylesheet di `public/` yang diperbarui, `public/index.html`, `public/player.html`, `public/compare.html`, `public/compare-clan.html`, `public/compare.js`, dan `public/i18n.js`. Bersihkan cache browser setelah upload agar HTML, CSS, dan JavaScript menggunakan versi yang sama.

Pemilih tema tersedia di samping bahasa pada semua halaman. Default awal tetap Gelap. Pilihan disimpan pada `localStorage` dengan key `coc-theme`; mode Sistem mengikuti `prefers-color-scheme` dan perubahan perangkat tanpa reload. Inisialisasi tema berjalan sebelum stylesheet dimuat. Jika penyimpanan browser diblokir, tema tetap dapat diganti untuk halaman aktif.

Warna memakai variabel `--theme-*` dengan warna gelap sebelumnya sebagai fallback. Tambahan komponen sebaiknya mengikuti pola variabel tersebut. Grafik SVG berubah melalui variabel CSS, sedangkan ekspor gambar perbandingan membaca palet tema saat ekspor. Jalankan `node tests/theme.test.js`, `node tests/i18n.test.js`, dan `composer test` untuk memeriksa perilaku dasar serta integrasinya.

### Aksen warna per bagian

Unggah ulang `public/theme.css` bersama `public/index.html`, `public/player.html`, `public/compare.html`, dan `public/compare-clan.html`. Bagian halaman memakai atribut `data-section-tone`: `blue` untuk ringkasan/progres, `teal` untuk anggota/aktivitas, `amber` untuk perang, `purple` untuk Capital, serta `slate` untuk laporan. Palet mengikuti tema aktif, termasuk mode Sistem. Isi tabel memakai warna netral; warna status dan battle log tetap memiliki maknanya sendiri.

Aksen dibatasi pada label kecil dan garis tab aktif. Header, judul utama, kartu statistik, dan tabel memakai permukaan netral untuk menjaga fokus pada isi. Unggah ulang `public/theme.css` untuk penyempurnaan ini.

### Percobaan palet pasir/navy (24 Oktober 2026)

Palet terbaru hanya mengubah `public/theme.css`: light memakai pasir/krem, dark memakai navy dengan teks krem, aksi/link memakai gold, dan grafik memakai gold/ungu. Label pendukung tetap netral. Backup sebelum percobaan ada di `backups/theme-20261024-before-sand-navy.css`; untuk mengembalikan tampilan sebelumnya, salin isi backup ke `public/theme.css`. Preferensi Gelap/Terang/Sistem tetap berlaku.

### Palet terpilih: Sandstone Light + Royal Gold

Tema Light memakai Sandstone Light dan Dark memakai Royal Gold sesuai token di `coc_theme_palette_preview.html`. Token tambahan untuk status, border, grafik, dan aksen bagian telah dilengkapi. Grafik Royal Gold memakai gold dan teal; label pendukung tetap netral. Pilihan Sistem mengikuti pasangan ini sesuai perangkat. Cukup unggah ulang `public/theme.css` dan refresh cache browser. Backup awal di `backups/theme-20261024-before-sand-navy.css` tetap tersedia.

### Pilihan tambahan Dark Simple / Light Simple

Unggah `public/theme-simple.css` beserta perubahan `public/theme.css`, `public/theme.js`, `public/i18n.js`, dan keempat HTML halaman (`index.html`, `player.html`, `compare.html`, `compare-clan.html`). Stylesheet Simple disalin dari `backups/theme-20261024-before-sand-navy.css` dengan pembatas selector agar tidak bercampur dengan Royal Gold/Sandstone. File backup asli tidak diubah.

Kelima opsi disimpan melalui key `coc-theme`: `dark`, `light`, `dark-simple`, `light-simple`, dan `system`. Atribut `data-theme` tetap memakai `dark`/`light` agar komponen dan kontrol native bekerja; `data-theme-variant` membedakan `simple`/`default`. Mode Sistem mengikuti Royal Gold atau Sandstone sesuai perangkat.

## Redesign Command Center dan gambar terkompresi

Unggah perubahan keempat HTML (`public/index.html`, `public/player.html`, `public/compare.html`, `public/compare-clan.html`), `public/site.js`, `public/site.css`, `public/i18n.js`, `src/App.php`, serta seluruh folder `public/assets/images/optimized/`. Halaman clan tetap memakai template index yang sama. Unggah HTML, stylesheet, script, dan gambar bersamaan agar tidak terjadi aset hilang.

Halaman utama memakai hero responsif, panel pencarian, akses cepat bergambar, tiga kartu fitur, dan sidebar riwayat. Halaman clan/player/perbandingan memakai header bersama serta banner ringkas di atas konten data. Bahasa Indonesia/English, tema Dark/Light/Sistem, dan varian Simple tetap tersedia. Semua varian tema, termasuk Simple, memakai gambar dan tata letak yang sama; palet warnanya mengikuti tema aktif.

Gambar halaman hanya memakai turunan WebP dari folder `optimized`, bukan PNG master. Paket berisi 19 file, total sekitar 803 KiB; bukan seluruh paket yang diunduh pada setiap halaman. Hero desktop sekitar 146 KiB, hero mobile 114 KiB, ilustrasi karakter 50–66 KiB, dan kartu fitur 12–21 KiB. Elemen gambar memiliki dimensi untuk menjaga layout; gambar di bawah area awal memakai lazy loading. Hero memakai `picture` sehingga browser memilih satu sumber sesuai viewport.

Saat dilayani melalui PHP, gambar WebP teroptimasi memakai cache satu hari dan ETag; permintaan validasi gambar yang belum berubah mengembalikan HTTP 304 tanpa body. Jika gambar dilayani langsung oleh CDN atau konfigurasi document root lain, terapkan header cache yang setara pada server tersebut.

Untuk membuat ulang turunan gambar di komputer pengembangan: instal Pillow lalu jalankan `python scripts/prepare-web-images.py`. Python tidak diperlukan pada hosting. File master di folder `hero`, `characters`, `feature-cards`, `icons`, dan `ornaments` tetap dapat disimpan sebagai sumber kerja; file master tersebut tidak diperlukan untuk layout baru di hosting. Daftar dimensi dan ukuran file ada di `public/assets/images/optimized/manifest.json`.

Verifikasi: `composer test`, `node tests/i18n.test.js`, dan `node tests/theme.test.js`. Pengujian aset memeriksa ukuran file, format WebP, referensi halaman, dan cache HTTP.

## Peta perang pada roster War & CWL

Unggah `src/WarMap.php`, perubahan `src/App.php`, `public/war-map.js`, `public/war-map.css`, `public/index.html`, dan `public/i18n.js` bersamaan. Pada bagian Roster perang tersedia pilihan Tabel/Peta. Default tetap tabel; peta mendukung clan sendiri, lawan, serta kedua sisi berdampingan pada desktop. Mobile menampilkan satu sisi dengan detail base di bawah peta.

Peta memakai ikon lokal `/th-{level}.webp`, latar dekoratif CSS, posisi zig-zag berdasarkan urutan war, pencarian pemain/posisi, filter TH, dan filter status pertahanan. Bintang dan persentase pada setiap base adalah hasil **serangan terbaik yang diterima**, bukan total bintang serangannya. Detail base memisahkan serangan diterima dan dilakukan, menampilkan sisa kuota, serta menyediakan tautan profil. Memilih satu serangan menyorot penyerang dan target; garis berarah muncul bila kedua base terlihat pada tampilan dua sisi. Detail log parsial ditandai dan kuota tidak diketahui ditampilkan sebagai tanda pisah.

Data memakai endpoint perang yang sama dengan tabel dan mendukung ronde CWL terpilih. Tidak memerlukan endpoint tambahan, unduhan aset baru, atau API key baru. Ini adalah visualisasi ringkasan perang, bukan layout base atau replay serangan. Pilihan base direset saat pasangan clan/ronde berubah. Ikon yang gagal dimuat digantikan label TH. Jalankan `composer test` dan `node tests/i18n.test.js` untuk pengujian data serta terjemahan.

## Pratinjau tautan WhatsApp / Open Graph

Unggah `src/SharePreview.php`, `src/ShareCard.php`, `src/App.php`, `.htaccess`, `public/share.js`, `public/fonts/`, dan perubahan HTML/JavaScript terkait. Halaman HTML harus melewati front controller PHP agar metadata dinamis tersedia tanpa JavaScript.

Empat penyesuaian yang diterapkan:

1. **Metadata dari server:** judul, deskripsi, canonical, Open Graph, dan Twitter Card tersedia pada HTML awal untuk home, clan, player, perbandingan player, dan perbandingan clan.
2. **Gambar dan cache:** kartu Royal Gold PNG 1200×630 disediakan melalui `/share/image/{hash}.png`. Snapshot metadata disimpan 15 menit di `data/share/`; kegagalan API menghasilkan kartu parsial dan dicoba ulang setelah satu menit. URL gambar lama mempertahankan isi yang sama. Folder cache harus dapat ditulis PHP; tidak perlu mengunggah cache lokal.
3. **URL publik HTTPS:** tambahkan `APP_URL=https://domainanda.com` pada `.env` hosting, tanpa slash akhir atau path, terutama di balik proxy HTTPS. Halaman dan gambar harus dapat dibuka publik tanpa login. `localhost` tidak dapat diakses WhatsApp. Jika konfigurasi belum diisi, origin diambil dari request.
4. **Konteks tautan:** tombol salin tautan/ringkasan membawa `lang=id|en` dan `view=...`; battle log player juga membawa `session=current|previous`. Penerima membuka bahasa dan tab yang sesuai. Fragment `#...` diubah menjadi query karena fragment tidak dikirim ke server.

Untuk hasil gambar terbaik, aktifkan ekstensi PHP **GD dengan FreeType**. Font Noto Sans dan lisensi OFL disertakan di `public/fonts/`. Tanpa GD, PNG tetap dibuat memakai renderer bitmap bawaan; ikon dan dukungan karakter nama lebih terbatas. Tidak diperlukan Chrome atau layanan screenshot di hosting. Gambar berupa kartu ringkasan, bukan tangkapan layar seluruh halaman, dengan palet Royal Gold tetap.

Pengujian: `composer test`, `node tests/share.test.js`, dan `node tests/i18n.test.js`. Pengujian GD di XAMPP: `php -d extension=gd tests/share.php`. Setelah deployment, buka sumber HTML misalnya `https://domainanda.com/player.html?tag=28P08PG0G&lang=id&view=ranked-battles&session=previous`, kemudian buka URL `og:image` yang tercantum. WhatsApp memiliki cache pratinjau sendiri sehingga perubahan mungkin tidak langsung terlihat. Pengujian lokal tidak memverifikasi tampilan di aplikasi WhatsApp.

### Judul tab browser sesuai konteks

Unggah perubahan `public/i18n.js`, `public/index.html`, `public/player.js`, `public/compare.js`, `public/clan-compare.js`, dan `public/compare-clan.html`. Judul profil memakai nama pemain/clan, sedangkan perbandingan memakai kedua nama dengan pemisah `vs` dan suffix `- CoC Clan Command Center`. Saat data belum tersedia, tag atau judul umum digunakan. Teks judul mengikuti bahasa aktif dan tetap mempertahankan nama setelah terjemahan diterapkan ulang.

### Level Ranked League per sesi

Unggah perubahan `src/App.php`. Level liga kini diarsipkan berdasarkan pasangan group tag dan season ID di `data/ranked-sessions/` saat profil atau grup sesi aktif dibaca. Pastikan folder `data/` dapat ditulis PHP dan sertakan arsip ini saat memindahkan server. Sesi previous menggunakan arsip tersebut, atau snapshot anggota dalam rentang minggu sesi yang sama (termasuk snapshot dari klan lama). Snapshot bertanggal saja pada hari pergantian sesi tidak digunakan karena waktunya ambigu. Jika bukti level sesi tidak tersedia, tier/rule dikembalikan `null`; liga profil terbaru tidak digunakan untuk menebak riwayat. Rule yang sama berlaku untuk badge, zona promosi/demosi, kuota battle, serta bonus defense.

### Legend I dan perubahan level liga pemain

Unggah juga `src/RankedLeagueHistory.php`, `public/player.html`, `public/player-league.js`, `public/player-league.css`, dan `public/i18n.js`. Riwayat per pemain disimpan di `data/ranked-players/` (52 minggu pengamatan), termasuk Legend I yang tidak memiliki group tag. Folder ini harus dapat ditulis PHP dan disertakan saat memindahkan data server. Minggu liga berganti Senin 05:00 UTC; status Promosi/Demosi/Tetap hanya membandingkan minggu berurutan dengan bukti arsip/snapshot. Jika bukti tidak ada, UI menampilkan keterangan riwayat belum tersedia.

Legend I menampilkan trofi dan statistik musim dari profil serta tautan ke leaderboard global. Peringkat hanya ditampilkan jika dikirim API; nilai yang tidak tersedia tidak dianggap nol. Battle log, kuota, bonus pertahanan, serta statistik grup disembunyikan dalam tampilan global. Grup previous tetap dapat dipilih jika API menyediakan tag grup yang valid. Tidak ada permintaan battle log ke grup `#0`, dan aplikasi tidak menambahkan sumber API pihak ketiga.

### Peringkat global Legend I dan batas bertahan

Unggah `src/GlobalRankings.php` bersama perubahan `src/App.php`, `public/player-league.js`, `public/player-league.css`, dan `public/i18n.js`. Endpoint `/api/player/{tag}/global-ranking` mencari tag pada leaderboard global dan menggunakan cache indeks bersama selama 5 menit di `data/cache/global-rankings-index.json`. Pengambilan mengikuti cursor bila tersedia, dua halaman per request, dengan batas 20.000 entri. Lock mencegah beberapa profil mengunduh halaman yang sama secara bersamaan.

Pada pemeriksaan API tanggal 27 Oktober 2026 (WIB), permintaan `limit=1000` hanya mengembalikan peringkat 1-200 tanpa cursor lanjutan. Tag yang tidak ditemukan tetap berstatus unknown, bukan dianggap di luar 10.000 besar. UI menampilkan cakupan aktual hasil API. Posisi sampai 10.000 diberi label dalam batas bertahan sementara; posisi lebih rendah diberi label zona demosi sementara, hanya bila rank diketahui. Penentuan akhir minggu adalah Senin 05:00 UTC / 12:00 WIB. Hasil berjalan tidak mengubah riwayat promosi/demosi yang dikonfirmasi lewat level liga. Endpoint ini tidak mengklaim menyediakan arsip peringkat akhir minggu.

### Perbandingan Legend I

Unggah perubahan `public/compare.html`, `public/compare.js`, `public/compare-model.js`, `public/compare.css`, dan `public/i18n.js`. Tab Ranked League menambahkan ringkasan Legend I saat ini jika salah satu pemain berada di Legend I, dengan lookup peringkat dari endpoint global-ranking yang sama seperti profil. Perbandingan trofi diberi tanda hanya jika kedua pemain Legend I memiliki periode terkonfirmasi dan pengamatan berdekatan (maksimal 10 menit). Perbandingan rank juga mensyaratkan waktu data peringkat pada minggu yang sesuai. Pasangan lintas sistem tidak mendapat tanda keunggulan pada ringkasan saat ini; rekor historis ditampilkan terpisah tanpa tanda keunggulan.

Bagian League performance tetap memakai endpoint battle grup dan rule sesi masing-masing. Pemain Legend I memilih previous secara default jika tersedia, sementara pemain lain tetap memilih current bila tersedia. Sesi previous Legend I tidak diganti dengan data leaderboard global. Bila kedua pemain tidak memiliki sesi grup, tabel metrik grup kosong disembunyikan dan keterangan riwayat tidak tersedia ditampilkan. Statistik Army/War/CWL tetap menggunakan alur semula.

### Pemulihan tier grup lama tanpa snapshot

`src/App.php` juga memulihkan tier dari jumlah battle yang sudah tercatat jika hanya ada satu tier grup dalam `RANKED_RULES` yang memungkinkan jumlah tersebut. Contoh: 25-30 serangan/pertahanan hanya cocok dengan Legend II pada rule yang digunakan aplikasi. Bukti dapat berasal dari log atau counter win/loss anggota grup. Jumlah 24 tidak membuktikan Legend III karena bisa merupakan sesi Legend II yang belum lengkap; kasus ambigu tetap unknown. Tier yang dipulihkan disimpan di `data/ranked-sessions/` dengan sumber `groupBattleCounts`. Arsip/snapshot yang diketahui tetap lebih diprioritaskan daripada pemulihan ini.

### Panel battle log di compare player

Unggah file baru `public/compare-battles.js` beserta perubahan `public/compare.html`, `public/compare.js`, `public/compare-model.js`, `public/compare.css`, dan `public/i18n.js`. Tombol Lihat battle log muncul saat data sesi League performance tersedia, termasuk previous untuk Legend I. Panel menggunakan data battle yang sudah dimuat dan tidak meminta ulang endpoint tersebut.

Panel memakai dialog native dengan lebar maksimal 580 px di desktop dan memenuhi layar mobile. Tersedia pergantian pemain, Attacks/Defenses, filter hasil, urutan Terlama/Terbaru/bintang/destruksi, dan kartu enam kolom yang ringkas. Total poin mencakup seluruh log yang tersedia, bukan hanya hasil filter. Bonus defense ditampilkan hanya pada sesi previous. Data parsial ditandai, dan nilai tidak tersedia tidak diubah menjadi nol. Dialog dapat ditutup dengan tombol, Escape, atau klik backdrop; fokus kembali ke tombol pembuka.

### Tombol salin tautan berlabel

Unggah `public/share.js`, `public/player.js`, `public/player.html`, `public/player.css`, `public/compare.js`, `public/compare.html`, `public/compare.css`, dan `public/i18n.js`. Tombol pada toolbar tab compare kini memakai ikon tautan dan label Salin tautan; pada mobile berada di baris bawah tab, rata kanan. Tombol player berada pada toolbar tab bagian atas, terpisah dari area tab yang dapat digeser. Pada mobile tombol berada di baris bawah tab, rata kanan. Toolbar tetap terlihat saat menggulir; tindakan salin ringkasan dan ekspor tetap berada di Player summary. Tooltip dan URL mengikuti tab aktif. Konfirmasi berhasil/gagal tampil pada tombol dan diumumkan lewat status aksesibel; Clipboard API memiliki fallback untuk browser yang menolak akses clipboard.

### Peringkat negara untuk profil Legend I

Unggah perubahan `src/App.php`, `src/GlobalRankings.php`, `public/player-league.js`, `public/player-league.css`, dan `public/i18n.js`. Endpoint `/api/player/{tag}/country-ranking` membaca klan dari profil pemain, lalu memakai lokasi klan hanya jika `isCountry=true`. Tag pemain dicari pada `/locations/{countryId}/rankings/players`. Hasil ditemukan ditampilkan sebagai Peringkat {negara}; jika tidak ditemukan, UI menjelaskan cakupan hasil tanpa menganggapnya sebagai peringkat global atau bukti negara akun.

Pencarian negara memakai indeks cache bersama per negara selama 5 menit di `data/cache/country-rankings-{id}.json` dan lock per negara, terpisah dari indeks global. Pagination diikuti bila disediakan. Pemain tanpa klan atau klan berlokasi International/tanpa lokasi negara mendapat keterangan dan tidak memicu pencarian leaderboard negara. Peringkat negara tidak digunakan untuk menilai demosi Legend I dan tidak menggantikan peringkat global.

### Lokasi leaderboard dan lokasi klan

Unggah perubahan `public/rankings.js`, `public/index.html`, dan `public/i18n.js`. Pilihan negara memakai endpoint leaderboard negara pemain. Kolom lokasi pemain yang diambil melalui clan summary kini diberi label Lokasi klan, dengan penjelasan bahwa lokasi klan bisa berbeda dari lokasi leaderboard pemain. Judul dan caption menampilkan negara leaderboard yang dipilih. Pemain tidak disaring ulang berdasarkan lokasi klannya karena itu akan mengubah daftar peringkat resmi yang diterima dari API.

### Mode Game pada Battle Log player

Unggah perubahan `public/player.html`, `public/player-league.js`, `public/player-league.css`, dan `public/i18n.js`, serta file baru `public/ranked-game.js`, `public/ranked-game-model.js`, `public/ranked-game-view.js`, `public/ranked-game-view.css`, dan seluruh `public/battle-log-style/` (termasuk `player-view.html`, CSS sumber/demo, font lokal Lilita One, dan lisensinya).

Toolbar Ranked League menyediakan Tampilan Standar/Game. Game membuka dialog layar penuh dengan frame terisolasi agar CSS game tidak mengubah dashboard. Frame dan font baru dimuat ketika Game pertama kali dibuka. Data berasal dari respons battle sesi yang sudah dimuat, bukan data contoh atau fetch API tambahan. Seluruh log sesi ditampilkan; filter mode Standar tidak diterapkan ke Game. Pengguna dapat mengganti sesi, urutan Terlama/Terbaru, ukuran Pas layar/100%/125%, dan kotak/daftar. Daftar menampilkan nama lawan, persen destruksi, bintang, serta trofi. Empat tab game dipertahankan sebagai tampilan visual; kontennya tetap Battle Log.

Total memakai nilai resmi API bila tersedia. Poin tidak tersedia tetap berupa tanda kosong, data parsial diberi keterangan, dan bonus defense hanya ditampilkan dari data sesi previous. Kotak kosong mengikuti kuota rule bila diketahui dan tidak dianggap battle nol. Mode Game dinonaktifkan ketika log belum tersedia, termasuk tampilan global Legend I; grup previous Legend I yang valid tetap didukung. Pergantian pemain/sesi membersihkan data lama. Tombol Gambar / Bagikan membuka pratinjau PNG dari tampilan kotak/daftar aktif dengan lebar 1440 px, terlepas dari zoom layar. Unduh PNG tersedia dari pratinjau; Bagikan gambar memakai native file sharing jika browser mendukungnya (HTTPS/localhost), dengan petunjuk unduh sebagai alternatif. Pembatalan share tidak dianggap error. Blob pratinjau dibersihkan saat ditutup. Rendering berjalan lokal tanpa mengirim data atau gambar ke layanan lain.

Unggah juga `public/vendor/html-to-image/` (library html-to-image 1.11.13 beserta lisensi MIT). Library hanya dimuat di frame mode Game dan tidak bergantung CDN saat aplikasi dipakai.

Pengujian: `node tests/ranked-game.test.js`, `node tests/i18n.test.js`, dan `composer test`.
