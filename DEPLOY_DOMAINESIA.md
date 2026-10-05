# Deploy ke DomaiNesia (cPanel Node.js App)

Panduan ini untuk paket hosting DomaiNesia yang menyediakan **Setup Node.js App**. Aplikasi ini menjalankan Express dari `server.js`; upload HTML saja ke `public_html` tidak cukup karena halaman memanggil endpoint `/api/*`.

## 1. Siapkan domain dan aplikasi Node.js

1. Arahkan domain ke hosting. Disarankan memakai subdomain tersendiri, misalnya `coc.domainanda.com`.
2. Di cPanel, pastikan fitur **Setup Node.js App** tersedia. Jika perlu, aktifkan **Runtime Manager** dan pasang versi Node.js yang tersedia di menu **Node.js**.
3. Buka **Setup Node.js App → Create Application**. Pilih **Production**, isi **Application root** dengan `coc-app` (di luar `public_html`), pilih **Application URL** subdomain tadi, dan isi **Application startup file** dengan `server.js`. Simpan.

Panduan resmi: [menyiapkan Node.js App](https://www.domainesia.com/panduan/cara-install-nodejs-di-hosting/) dan [mengaktifkan Runtime Manager](https://www.domainesia.com/panduan/cara-aktivasi-service-nodejs-web-hosting/).

## 2. Upload kode

Upload ke **Application root**: `server.js`, `package.json`, `package-lock.json`, dan seluruh folder `public/`. Jangan upload `node_modules/`, `.git/`, `.env` lokal, atau file contoh `.mhtml`. Kode ini tidak memerlukan proses build.

Jalankan **Run NPM Install** di panel. Jika memakai Terminal di dalam direktori aplikasi, alternatifnya `npm ci --omit=dev`. Jangan menjalankan `node server.js` terpisah saat Node.js App sudah aktif; panel menjalankan aplikasinya dan proses manual bisa membuat port bentrok.

## 3. Siapkan data dan token API

1. Buat direktori privat yang dapat ditulis, misalnya `/home/USERNAME/coc-data`, di luar `public_html`.
2. Jika riwayat lokal perlu dipertahankan, salin isi `data/wars/` dan `data/snapshots/` ke `coc-data/wars/` dan `coc-data/snapshots/`. Backup direktori ini secara berkala; arsip perang dan snapshot tersimpan sebagai JSON di sana.
3. Isi environment variables pada Node.js App, atau buat `.env` **hanya di Application root** bila panel tidak menyediakan pengaturan variabel:

   ```dotenv
   NODE_ENV=production
   COC_API_TOKEN=token_api_baru_untuk_ip_server
   DATA_DIR=/home/USERNAME/coc-data
   ```

   Ganti `USERNAME` dengan username cPanel yang sebenarnya. Jangan menetapkan `PORT=3000` di panel; aplikasi mengikuti `PORT` yang diberikan hosting.
4. Cari **IP publik untuk koneksi keluar** dari server, misalnya lewat Terminal cPanel dengan `curl -4 https://api.ipify.org`. Daftarkan IP itu pada API key di [Clash of Clans Developer Portal](https://developer.clashofclans.com/), lalu pasang token key di `COC_API_TOKEN`. IP keluar bisa berbeda dari IP yang terlihat di halaman utama cPanel.

## 4. Jalankan dan periksa

1. Klik **Start** atau **Restart** di Setup Node.js App.
2. Aktifkan SSL/AutoSSL untuk domain, lalu buka `https://coc.domainanda.com/`.
3. Cek pencarian klan `2GPP802UU`, data perang/CWL, tautan profil pemain, dan halaman perbandingan.
4. Jika halaman tampil tetapi API mengembalikan 403, periksa token dan IP keluar yang didaftarkan. Jika data gagal karena timeout, periksa akses keluar HTTPS ke `api.clashofclans.com`. Jika halaman atau aset 404, periksa **Application root**, **Application URL**, dan **startup file**.
5. Setelah mengubah kode atau dependency, upload perubahan dan **Restart** dari panel. Jalankan **Run NPM Install** lagi bila `package.json` atau `package-lock.json` berubah.

## 5. Jika ikon Army gagal muncul di hosting

Halaman profil dan perbandingan mencoba URL gambar Fandom langsung di browser. Endpoint `/api/player-icon` menjadi cadangan dan menyimpan ikon yang berhasil ke `DATA_DIR/icons/` agar tersedia sesudah proses Node.js restart. Permintaan gambar dari server dibatasi supaya satu profil tidak membanjiri proses hosting.

Jika sebagian ikon masih gagal karena server hosting tidak dapat menjangkau Fandom, siapkan cache di komputer lokal yang dapat memuat ikon:

1. Pastikan `.env` lokal berisi `COC_API_TOKEN` yang valid untuk IP komputer tersebut.
2. Jalankan `npm.cmd run icons:prepare -- 92GQCQPLJ9` di PowerShell Windows, atau `npm run icons:prepare -- 92GQCQPLJ9` di terminal lain. Tambahkan tag pemain lain jika ingin mencakup item yang berbeda.
3. Upload **isi** folder lokal `data/icons/` ke direktori `DATA_DIR/icons/` di hosting, misalnya `/home/USERNAME/coc-data/icons/`. Folder itu berisi berkas cache gambar; jangan taruh di Document Root.
4. Upload ulang `server.js`, `public/player.js`, `public/compare.js`, dan `package.json`, lalu **Restart** Node.js App. Lakukan hard refresh halaman profil. Jika ada ikon tertentu yang masih gagal, lihat nama dan kategorinya di keluaran perintah penyiapan cache.

Panduan resmi: [Node.js App DomaiNesia](https://www.domainesia.com/panduan/cara-install-nodejs-di-hosting/) dan [AutoSSL DomaiNesia](https://www.domainesia.com/panduan/cara-install-ssl-otomatis-autossl/).
