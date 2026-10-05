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

Ikon profil mengambil gambar dari Clash of Clans Wiki/Fandom bila server mengizinkan koneksi keluar HTTPS. Ikon dari sumber eksternal bisa tidak tampil bila layanan tersebut menolak permintaan.
