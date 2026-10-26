# Aset tambahan — 26 Oktober 2026

Enam ilustrasi baru dibuat menggunakan imagegen dengan aset proyek sebagai referensi. Semua teks halaman tetap dibuat dalam HTML agar bisa diterjemahkan. File lama tidak ditimpa dan aset baru belum dihubungkan ke halaman.

| Berkas | Ukuran | Penggunaan |
|---|---|---|
| `hero/hero-mobile-portrait.png` | 1024×1536 | Hero mobile; area langit bagian atas disisakan untuk judul dan deskripsi. |
| `characters/barbarian-king-large.png` | 1024×1536 | Karakter King transparan, tanpa platform rumput. |
| `characters/archer-queen-large.png` | 1024×1536 | Karakter Queen transparan, tanpa platform rumput. |
| `characters/grand-warden-large.png` | 1024×1536 | Karakter Warden transparan, tanpa platform rumput. |
| `characters/golem-large.png` | 1254×1254 | Ilustrasi Golem transparan untuk kartu War Command. |
| `ornaments/stone-metal-frame.png` | 1536×1024 | Bingkai batu navy dan metal beraksen gold; bagian tengah transparan. |

## Catatan pemasangan

- Hero portrait: gunakan komposisi gambar secara utuh atau tentukan `object-position` untuk tiap breakpoint. Pemotongan menjadi banner yang sangat pendek akan menghilangkan karakter di bagian bawah.
- Karakter: mulai dari tinggi tampil 220–420 px di desktop dan 120–220 px di mobile. Jangan menambahkan semuanya sekaligus pada satu panel kecil.
- Golem: cocok di kanan kartu dengan tinggi sekitar 120–180 px. Detail cyan menyatu dengan palet navy situs.
- Bingkai: gunakan sebagai elemen dekoratif terpisah atau border-image dengan slice yang disesuaikan; hindari meregangkan seluruh gambar karena bentuk sudut akan terdistorsi. Latar panel tetap ditentukan oleh tema halaman.
- Karakter dan bingkai memiliki kanal alpha, termasuk sudut luar transparan. Bukaan tengah bingkai juga telah diperiksa transparan.
- PNG disimpan sebagai master. Siapkan ukuran turunan/format WebP yang lebih kecil saat integrasi agar mobile tidak mengunduh seluruh master.
- Ini adalah ilustrasi dekoratif yang dibuat AI berdasarkan referensi, bukan badge liga resmi atau representasi data pemain.

Daftar ukuran dan byte setiap aset tersedia di `generated-assets-20261026.json`.
