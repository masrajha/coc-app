# Berita resmi Supercell di beranda

Fitur ini **tidak membutuhkan cron**. Saat beranda dibuka, `public/js/news.js` meminta `GET /api/news/latest?lang=id|en` secara terpisah dari pemuatan halaman.

## Penyegaran dan cache

- Cache per bahasa disimpan di `data/news/id.json` dan `data/news/en.json`.
- Tiga berita terbaru disimpan bersama, diurutkan dari tanggal publikasi terbaru. Cache versi lama yang hanya memuat satu berita disegarkan saat kunjungan berikutnya.
- Cache sukses berlaku satu jam. Kunjungan berikutnya setelah kedaluwarsa memicu penyegaran.
- Tanpa pengunjung, berita tidak diperbarui pada jadwal tetap.
- Kegagalan mempertahankan artikel terakhir dan memberi penanda data tersimpan.
- Percobaan gagal mendapat jeda lima menit; lock file mencegah penyegaran bahasa yang sama berjalan bersamaan.
- Jika penyegaran sedang dikerjakan pengunjung lain dan belum ada cache, UI mencoba lagi sekali setelah jeda singkat.
- Pengambilan memiliki batas waktu total 12 detik serta batas ukuran respons.
- Tidak ada API key game yang dikirim ke situs berita.

## Sumber

- Arsip Inggris: `https://supercell.com/en/games/clashofclans/blog/page/1/`.
- Arsip Indonesia: `https://supercell.com/en/games/clashofclans/id/blog/page/1/`.
- Tiga artikel terbaru dibaca dari `pageProps.articles` pada JSON Next.js.
- `buildId` ditemukan dari `__NEXT_DATA__`, bukan ditulis permanen.
- Setelah build diketahui, penyegaran menggunakan endpoint JSON halaman. Bila rutenya berubah, JSON tertanam dalam HTML menjadi fallback.
- Artikel pertama memakai cuplikan pendek paragraf pertama; kartu lainnya memakai ringkasan arsip jika tersedia, sehingga tidak perlu mengambil setiap halaman detail. Tidak ada penyalinan halaman artikel lengkap ke beranda.
- Jika versi Indonesia tidak dapat diambil, versi Inggris dipakai dengan label bahasa sumber yang jelas.
- Endpoint Next.js merupakan struktur internal situs publik dan dapat berubah; bukan API berita dengan kontrak stabil.

## Gambar dan deployment

- Panel berita berada di sidebar, setelah Clan populer. Tiga berita disusun vertikal dengan thumbnail kecil di kiri, judul maksimal dua baris, sumber/bahasa, dan tanggal. Seluruh baris dapat diklik ke Supercell; ringkasan tidak ditampilkan agar ringkas. Pada mobile, panel mengikuti posisi sidebar di bawah konten utama.

- Thumbnail disimpan di `public/assets/images/news/`, maksimal 160 KiB per file.
- CDN diminta mengirim WebP selebar 480 px. Jika GD tersedia, gambar diolah ulang ke WebP berukuran kecil.
- Kegagalan mengunduh/menulis gambar memakai ilustrasi lokal pengganti, tanpa menggagalkan artikel.
- PHP memerlukan izin tulis pada `data/news` dan `public/assets/images/news`; folder dibuat otomatis bila direktori induknya mengizinkan.
- Upload perubahan backend, HTML, JavaScript, dan CSS dalam rilis yang sama. Tidak ada perubahan `.env` yang wajib.

## Pengujian

`php tests/official-news.php` menguji cache, bahasa, perubahan build, fallback, thumbnail, kegagalan, lock, pembatasan URL, dan respons endpoint tanpa mengakses jaringan.
