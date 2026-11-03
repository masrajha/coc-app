# Struktur aset publik

```text
public/
  index.html, player.html, compare.html, compare-clan.html
  css/                         Stylesheet aplikasi
    battle-log/                Style demo dan tampilan game
  js/                          JavaScript aplikasi
    battle-log/                Script demo
    vendor/html-to-image/      Library ekspor gambar dan LICENSE
  assets/images/
    army/                      Ikon item army, nama file berupa hash
    town-hall/                 Ikon TH
    builder-hall/              Ikon BH
    leagues/cwl/               Badge liga CWL
    leagues/player/            Badge liga pemain
    brand/                     Logo, favicon, dan apple-touch-icon
    profile/                   Ikon ringkasan profil
    capital/                   Ikon Capital/District Hall
    donation/                  Ikon Saweria dan PayPal
    news/                      Thumbnail berita yang dibuat saat runtime
    battle-log/                Trofi untuk battle log
    optimized/                 Gambar turunan untuk tampilan web
    backgrounds/, hero/, ...   Artwork yang sudah dikelompokkan
  fonts/                       Font kartu share server
  battle-log-style/            Halaman demo/iframe dan font game
```

- URL JavaScript memakai `/js/...`, stylesheet `/css/...`, dan gambar `/assets/images/...`.
- Referensi di CSS sebaiknya memakai URL absolut dari root, terutama font dan gambar yang dipakai beberapa halaman.
- File HTML game tetap berada di `/battle-log-style/`; stylesheet dan script-nya sudah dipisahkan.
- Ikon army disiapkan lewat `php scripts/prepare-icons.php TAG_PEMAIN`. Backend dan script tersebut memakai `assets/images/army`.
- Aset asli yang sudah tersedia tetap dipertahankan; migrasi tidak menghapus gambar hanya karena tidak muncul pada suatu halaman.
- `src/AssetPaths.php` mengarahkan URL aset lama ke lokasi baru jika target tersedia, termasuk favicon dan URL ikon army lama. Query string dipertahankan.
- Kartu share yang tersimpan dengan nama badge liga lama tetap didukung oleh renderer server.

## Deployment

Unggah direktori `public` beserta perubahan backend di `src` dalam rilis yang sama. Sertakan library lokal ekspor gambar beserta lisensinya.

Library ekspor wajib tersedia di `/js/vendor/html-to-image/html-to-image.js` (file lokal: `public/js/vendor/html-to-image/html-to-image.js`). Jika muncul pesan library tidak tersedia, periksa URL tersebut: respons harus JavaScript dengan status 200. Sertakan juga `LICENSE` dari folder yang sama. Aturan Git `/vendor/` hanya mengabaikan dependensi PHP di root; jangan mengubahnya menjadi `vendor/` karena akan ikut mengabaikan library publik ini.

Jika deployment sebelumnya menyalin berkas aset langsung ke document root hosting, hapus salinan lama tersebut setelah rilis baru lengkap. Berkas nyata yang masih tertinggal bisa dilayani Apache/LiteSpeed sebelum pengalihan PHP dijalankan.

Tidak diperlukan perubahan `.env` atau migrasi data klan/pemain. Pembersihan cache aset/CDN diperlukan jika hosting masih menyajikan salinan lama; halaman aplikasi memberi versi pada referensi JS/CSS.

## Verifikasi

- `composer test` mencakup audit struktur aset, referensi HTML/CSS, MIME, dan pengalihan URL lama.
- `node tests/i18n.test.js` memeriksa terjemahan dan sintaks inline halaman.
- Saat menambah aset, pastikan lokasi dan referensinya sesuai struktur ini; jangan menaruh JS, CSS, atau gambar baru langsung di root `public`.
