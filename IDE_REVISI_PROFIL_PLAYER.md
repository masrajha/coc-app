# Rancangan halaman profil pemain lengkap

## Keputusan produk

Profil pemain menjadi **halaman tersendiri**, misalnya `/player.html?tag=LYYGYQYLU`. Halaman utama tetap menjadi dasbor klan, perang, dan aktivitas. Setiap nama pemain yang memiliki tag menjadi tautan ke halaman profil; tombol kembali membawa pengguna ke dasbor klan. URL profil dapat disalin, dibuka langsung, dan di-*bookmark*. Profil tidak lagi dirender sebagai panel panjang di bagian bawah halaman utama.

Target tampilan adalah kelengkapan informasi **Army seperti gambar contoh**: ikon dan level tiap hero, seluruh hero equipment dikelompokkan menurut hero, pets, troops, super troops, Builder Base, dan spells. Ringkasan progres dan analisis rushed ditempatkan setelah informasi dasar agar level aktual pemain tetap menjadi fokus.

## Apa yang ada dalam contoh

`contoh-profile-player.mhtml` adalah arsip halaman **Army** untuk pemain `hiroya⭐️` (`#LYYGYQYLU`) dari Clash of Stats, bukan respons API Clash of Clans. Arsip terdiri dari HTML, CSS, dan gambar tertanam. Contoh menampilkan identitas pemain, TH 18, BH 10, klan dan peran, level pengalaman, trofi, rekor pribadi, serta navigasi ke Summary, History, Rankings, Army, dan Achievements. Bagian Army berurutan: **Heroes, Hero Equipment, Pets, Troops, Super Troops, Builder Base, Spells**. Setiap item ditampilkan sebagai ikon dan angka level; sebagian tooltip mencantumkan batas level untuk TH pemain dan batas global.

Angka dan batas level dalam arsip adalah **contoh pada waktu halaman disimpan**. Jangan memakainya sebagai tabel batas level aplikasi tanpa verifikasi dan versi data.

## Temuan aset gambar

| Sumber dalam MHTML | Peran | Saran penggunaan |
| --- | --- | --- |
| `api-assets.clashofclans.com` | Badge klan dan ikon liga pada contoh. | Gunakan URL gambar yang memang dikirim API untuk badge/league, dengan fallback bila gagal dimuat. |
| `www.clashofstats.com/_nuxt/img/...` | Ilustrasi, ikon statistik, TH/BH, latar profil, dan ikon UI milik situs contoh. | Jadikan referensi visual. Jangan menyalin aset situs lain langsung ke produk tanpa izin/lisensi yang sesuai. Nama file berhash juga tidak stabil. |
| `http://clashofclans.wikia.com/wiki/...` | **Tautan artikel** hero, equipment, pet, troop, dan spell. | Boleh dipakai sebagai referensi nama/item setelah memeriksa tujuan tautan; ubah ke HTTPS. Ini bukan URL gambar. |
| Domain iklan/pelacakan | Gambar piksel dan sumber pihak ketiga dalam snapshot. | Abaikan untuk aplikasi. |

Arsip memiliki sekitar 80 bagian MIME dan 134 tautan artikel wiki. Ada indikasi beberapa pasangan label dan tujuan tautan equipment tidak cocok, sehingga pemetaan item harus dibuat berdasarkan **nama item yang tervalidasi**, bukan menyalin tautan berurutan dari HTML contoh. Pengecekan halaman web langsung tidak berhasil saat analisis; seluruh rincian contoh di atas berasal dari MHTML lokal.

Untuk implementasi P2, ikon unit dicoba dari Clash of Clans Wiki melalui URL `Special:FilePath` berdasarkan nama item, sesuai pilihan sumber aset proyek ini. Sediakan placeholder huruf bila nama berkas berbeda atau wiki tidak dapat diakses. Halaman mencantumkan sumber wiki dan pemberitahuan fan content. Pemetaan file yang tepat masih perlu diverifikasi per item; jangan menggunakan aset Clash of Stats sebagai pengganti diam-diam.

## Masalah pada halaman saat ini

Panel **Player Progress & Rushed Check** saat ini menyatu dengan halaman utama dan hanya memperlihatkan empat agregat (hero, troop, spell, pet), skor, status rushed, cakupan, dan beberapa prioritas. Pengguna belum bisa melihat **level setiap item** atau membedakan pasukan Home Village dan Builder Base. Equipment dan Super Troops pada contoh belum terlihat. Respons backend sekarang juga hanya mengembalikan ringkasan kategori; data mentah unit belum dikirim ke UI. Tabel batas level lokal baru mencakup TH 11–17; TH 18 memakai baseline TH 17 sementara, sehingga skor tidak layak diperlakukan sebagai persentase maksimal TH 18.

## Alur dan struktur halaman terpisah

- Buat `public/player.html` dan skrip halaman profil. Parameter `tag` menentukan pemain; validasi dan normalisasi tag sebelum memanggil API. Bila URL tidak punya tag, tampilkan formulir pencarian pemain di halaman profil.
- Nama pemain di roster war, rekap CWL, grafik performa, dan auditor anggota menjadi tautan biasa ke `/player.html?tag=...`. Pertahankan konteks klan melalui parameter `clan=...` bila ada agar tombol **Kembali ke klan** menuju hasil pencarian sebelumnya.
- Pencarian player tag pada halaman utama, bila tetap ada, mengarahkan ke URL profil. Pindahkan panel profil lama dari `public/index.html` setelah halaman baru siap dan tautan teruji.
- Saat URL profil dibuka langsung atau di-*refresh*, halaman mengambil ulang profil dari API melalui backend. Tampilkan status memuat, data terakhir diperbarui, keadaan kosong, dan pesan gagal yang jelas.

## Rancangan konten profil

1. **Header profil padat:** nama, tag yang bisa disalin, klan/peran, TH/BH, XP, trofi, liga, dan waktu data terakhir diambil. Badge klan/liga hanya bila tersedia. Tampilkan status API yang gagal tanpa menghapus profil terakhir yang valid.
2. **Ringkasan progres:** empat angka yang dapat dipercaya: skor pasukan dan hero, cakupan data, jumlah item yang perlu upgrade, dan status rushed beserta alasan singkat. Beri label jelas jika baseline TH masih sementara.
3. **Navigasi `Army` / `Progres` / `Performa War` / `Riwayat`:** Army berisi level aktual dari profil API; Progres berisi skor dan prioritas; performa war memakai arsip CWL/war aplikasi; riwayat memakai snapshot yang terkumpul sejak aplikasi merekam. Tab Army dibuka pertama kali. Jangan menyiratkan bahwa API menyediakan riwayat lama.
4. **Army sebagai grid rapat seperti gambar:** urutan bagian **Heroes, Hero Equipment, Pets, Troops, Super Troops, Builder Base, Spells**. Hero Equipment dikelompokkan dalam kartu Barbarian King, Archer Queen, Grand Warden, Royal Champion, Minion Prince, dan hero lain bila API menambahkannya. Tiap item memiliki ikon, nama saat *hover*/fokus, dan angka level di atas lencana yang terbaca. Tampilkan seluruh item dalam respons, bukan hanya 10 teratas atau item yang masuk tabel skor. Pisahkan siege dari pasukan biasa secara visual bila klasifikasi tersedia, tanpa menghilangkannya dari kelompok Army.
5. **Detail level:** saat item diklik, tampilkan level pemain, `maxLevel` dari API bila ada, batas khusus TH/BH dari katalog lokal yang tervalidasi, selisih level, versi tabel, dan tautan referensi item. Jika batas TH belum diketahui, angka level aktual tetap tampil tanpa label `maks`.
6. **Prioritas upgrade:** urutkan item tertinggal berdasarkan selisih terhadap batas TH dan bobot kategori; tampilkan alasan angka, bukan klaim otomatis tentang strategi terbaik. Berikan pilihan fokus `War`, `CWL`, atau `Pemerataan` setelah metrik war tersedia.

Di layar kecil, ringkasan menjadi dua kolom dan grid item menyesuaikan lebar. Jarak antarbaris dibuat rapat; hindari panel kosong tinggi seperti tabel agregat saat ini.

## Model data dan aturan skor

- Sediakan endpoint profil lengkap, misalnya `/api/player/:tag/profile`, yang mengembalikan identitas pemain, metrik ringkas, `army` terkelompok, dan hasil audit progres. Endpoint `/api/player/:tag/progress` lama dapat dipakai ulang secara internal agar perhitungan tidak ganda.
- Untuk setiap item Army kirim `name`, `village`, `level`, `maxLevel` dari respons API bila ada, `maxLevelForTownHall`/`maxLevelForBuilderHall` dari katalog lokal bila tervalidasi, `status`, dan `iconKey`. Simpan tag dan waktu pengambilan. URL wiki hanya referensi item, bukan sumber level.
- Pisahkan `troops` menurut Home Village, Builder Base, siege, dan Super Troops; klasifikasi berdasarkan `village`/nama dari profil API. Daftar Super Troops pada contoh dapat menjadi katalog tampilan, tetapi status aktif perlu ditampilkan hanya bila memang tersedia dari data yang dipakai.
- Baca daftar `heroEquipment` dari profil pemain dan tampilkan level tiap item. Gunakan katalog nama-ke-hero untuk pengelompokan; item yang belum dikenal masuk bagian **Equipment lainnya**, tidak hilang. Masukkan equipment ke skor hanya saat batas level dan cakupannya sudah tervalidasi.
- Perbarui tabel maksimum TH 18 dengan sumber dan tanggal yang bisa diaudit. Jika TH belum terpetakan, tampilkan level item yang ada tetapi **jangan tampilkan skor rushed pasti** dari baseline TH yang lebih rendah.
- Hitung cakupan sebagai `item terpetakan / item yang relevan dan seharusnya tersedia pada TH tersebut`. Bedakan `belum terbuka`, `tidak ada dalam respons`, dan `tidak dikenal katalog`; ketiganya tidak boleh diam-diam dianggap maksimum.
- Pertahankan pernyataan bahwa skor hanya mencakup data pasukan/hero yang tersedia. API profil tidak memberi level semua bangunan, tembok, dan upgrade berjalan, jadi label `Max Percentage akun` akan menyesatkan.

## Urutan implementasi yang disarankan

| Tahap | Hasil |
| --- | --- |
| P1 — selesai | Halaman `/player.html?tag=...`, tautan nama pemain dari dasbor, endpoint `/api/player/:tag/profile`, dan pemindahan panel profil dari halaman utama. |
| P2 — selesai dengan batasan aset | Grid Army tujuh kelompok, equipment per hero, detail item, dan ikon yang dicoba dari Clash of Clans Wiki melalui `Special:FilePath`; placeholder tampil bila nama berkas wiki tidak cocok atau server wiki tidak merespons. |
| P3 | Lengkapi tabel maksimum TH/BH yang tervalidasi, skor per kategori, prioritas upgrade, dan status rushed yang menghormati data parsial. |
| P4 | Tambahkan tab performa war/CWL per pemain dari arsip perang, lalu tren snapshot bila sejarah sudah cukup. |

**Status implementasi P3/P4 (4 Oktober 2026):** Halaman pemain sekarang memiliki tab progres dan performa. Skor per kategori, prioritas upgrade, dan skor Builder Base memakai `maxLevel` yang benar-benar dikirim API pada TH 18/BH 10. Tabel lokal TH 11–17 masih bersifat parsial dan dapat tertinggal setelah pembaruan game; status rushed ditahan sampai cakupan batas level memadai. API tidak menyediakan level bangunan dan tembok, jadi skor yang tampil bukan persentase maksimal seluruh akun. Arsip perang tersimpan saat aplikasi mengambil perang klasik/CWL; riwayat sebelumnya tidak dapat dipulihkan dari profil pemain. Tren aktivitas muncul setelah dua snapshot harian pemain tersedia. Batas TH/BH lengkap untuk level lainnya masih memerlukan sumber per item yang tervalidasi.

Rancangan fitur berikutnya: [Player Comparison](IDE_PLAYER_COMPARISON.md).

**Kriteria selesai untuk P1:** klik nama pemain membuka URL profil sendiri dengan tag yang benar; URL langsung dan refresh bekerja; semua level dari respons profil sampai ke halaman baru; tombol kembali menuju klan asal; halaman utama tidak lagi memuat panel profil; kesalahan API tampil jelas; TH yang belum punya tabel maksimum tidak diberi status rushed yang pasti.

**Catatan P2:** URL avatar Royal Champion yang diberikan pengguna sudah dipetakan langsung. Penelusuran wiki menunjukkan pola nama `Avatar Hero ...` untuk hero dan `Avatar ...` untuk pasukan. Ikon kini diminta melalui `/api/player-icon`, yang memeriksa metadata berkas wiki, mengambil gambar dari domain gambar Fandom, dan menyimpan hasilnya sementara; browser masih punya jalur gambar langsung sebagai fallback. Pemuatan ikon dengan `loading="lazy"` tidak lagi disembunyikan sebelum acara `load`. Berkas lain belum dapat diverifikasi satu per satu karena sebagian halaman wiki menolak akses dari lingkungan pengembangan.

**Penyempurnaan equipment:** katalog nama-ke-hero mengikuti daftar Hero Equipment di wiki, termasuk Dragon Duke. Revenge Deck dikelompokkan pada Dragon Duke berdasarkan pengumuman resmi Supercell yang lebih baru daripada salinan halaman wiki terindeks. Ikon Barbarian Puppet memakai URL yang diberikan pengguna. Bila API metadata wiki gagal, server mencoba jalur gambar statis Fandom yang dihitung dari nama berkas; item yang belum ada di wiki tetap memakai placeholder.
