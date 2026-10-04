# Ide Player Comparison

## Tujuan

Bandingkan dua pemain untuk menjawab pertanyaan yang konkret: siapa lebih siap untuk war, kategori upgrade apa yang tertinggal, dan bagaimana performa mereka pada periode perang yang sama. Hasil perbandingan harus menunjukkan **data yang tersedia dan cakupannya**, bukan menetapkan satu pemain sebagai pemenang berdasarkan angka yang tidak sebanding.

## Alur halaman

- Buka `/compare.html?player1=TAG_A&player2=TAG_B&clan=TAG_KLAN`. Tautan **Bandingkan** dapat ditempatkan di profil pemain dan tabel anggota/performa klan; pemain pertama langsung terisi. Pengguna memilih pemain kedua dari daftar anggota atau mengetik tag.
- Dua kartu profil dipasang berdampingan di desktop dan bertumpuk di ponsel. Tampilkan nama, tag, klan, TH/BH, trofi, waktu pembaruan, serta tombol tukar posisi.
- Di bawahnya, tampilkan tab **Progres**, **Army**, **War/CWL**, dan **Aktivitas**. Baris perbandingan memakai nama item yang sama pada kedua sisi; item yang tidak ada diberi label `Tidak tersedia`, bukan level 0.
- Sediakan pilihan periode war: CWL saat ini, 30 hari, 90 hari, atau semua arsip. Tampilkan jumlah perang/serangan yang menjadi sampel di samping setiap metrik.

## Isi perbandingan

| Bagian | Metrik dan tampilan | Aturan pembacaan |
| --- | --- | --- |
| Ringkasan | TH/BH, skor progres pasukan dan hero, cakupan item, status rushed, jumlah serangan terarsip | Status rushed hanya muncul bila kedua profil memenuhi aturan kelengkapan data masing-masing. |
| Progres | Batang berdampingan untuk hero, troop, spell, pet, dan Builder Base; daftar lima selisih upgrade terbesar | Skor persentase TH hanya dibandingkan langsung jika TH sama dan baseline keduanya setara/tervalidasi. Untuk TH berbeda, tampilkan progres terhadap batas TH masing-masing tanpa label “lebih baik”. |
| Army | Matriks item: ikon, level A/B, `maxLevel` yang diketahui, dan selisih level | Filter Heroes, Equipment, Pets, Troops, Spells, Builder Base. Equipment dibandingkan menurut hero pemiliknya. Selisih level tidak otomatis berarti selisih kekuatan. |
| War/CWL | Bintang per serangan, destruksi rata-rata, partisipasi, kuota terlewat, serta grafik per putaran/tanggal | Hitung dari serangan terarsip. Pisahkan CWL dan war klasik; jangan gabungkan tanpa penjelasan karena kuota serangannya berbeda. Tampilkan `n` serangan dan periode. |
| Aktivitas | Tren trofi dan donasi dari snapshot pada tanggal yang beririsan | Tampilkan tren hanya bila masing-masing punya sedikitnya dua snapshot. Jangan menyimpulkan tidak aktif hanya dari trofi yang tetap atau donasi nol. Donasi lintas reset musim tidak dihitung sebagai delta negatif. |

## Visual yang paling berguna

1. **Grafik putaran CWL berpasangan:** satu baris per putaran, dua batang bintang dan titik persentase destruksi. Putaran yang tidak diikuti diberi `Tidak masuk roster`; masuk roster tetapi belum menyerang diberi `0 serangan` dengan status perang. Ini membedakan absen, belum giliran, dan serangan gagal.
2. **Peta selisih Army:** daftar item yang sama, dikelompokkan per hero/kategori. Warna menandai jarak ke batas level yang valid, bukan semata level absolut.
3. **Grafik tren aktivitas:** dua garis trofi pada tanggal snapshot yang sama, dengan penanda reset musim untuk donasi.

## Aturan agar hasil adil

- **TH berbeda:** tampilkan nilai mentah dan skor relatif terhadap batas TH masing-masing; hindari peringkat tunggal. Tambahkan filter “bandingkan pemain TH sama” untuk pemilihan dari klan.
- **Data parsial:** setiap skor mempunyai `known/expected`, sumber batas level, dan status `lengkap/parsial`. Jika salah satu belum memenuhi cakupan, label pemenang kategori disembunyikan.
- **Sampel war kecil:** tampilkan metrik tetapi beri label `Sampel terbatas` untuk kurang dari lima serangan; jangan buat rekomendasi promosi dari sampel itu.
- **Arsip historis:** data perang baru tersedia sejak aplikasi merekamnya. War lama yang tidak pernah diambil tidak dianggap sebagai nol serangan.
- **Privasi dan kegagalan API:** jika satu profil gagal dimuat, profil lain tetap tampil. Informasi pemain diambil berdasarkan tag, bukan nama yang bisa berubah.

## Rancangan data dan implementasi

Gunakan endpoint profil dan performa yang sudah ada: `/api/player/:tag/profile` dan `/api/player/:tag/performance?clan=...`. Halaman dapat mengambil kedua pemain secara paralel. Untuk perbandingan yang konsisten, backend sebaiknya menyediakan `/api/players/compare?player1=...&player2=...&clan=...&period=...` yang mengembalikan dua profil yang dinormalisasi, periode, cakupan, dan alasan mengapa suatu metrik tidak bisa dibandingkan. Endpoint tersebut memakai cache profil saat ini dan arsip perang/snapshot yang sama dengan halaman profil.

| Tahap | Pekerjaan | Kriteria selesai |
| --- | --- | --- |
| C1 | Halaman terpisah, pemilih dua pemain, tautan dari profil dan tabel klan, URL yang bisa dibagikan | Kedua tag dapat dibuka langsung; satu kegagalan tidak menghapus sisi lain. |
| C2 | Ringkasan dan matriks Army/Progres dengan penanda data parsial | Item sejajar berdasarkan kategori dan nama; perbandingan TH berbeda tidak menghasilkan pemenang palsu. |
| C3 | Grafik War/CWL dengan filter periode dan jumlah sampel | CWL/war klasik terpisah, status roster dan kuota terlewat akurat. |
| C4 | Tren snapshot dan ekspor ringkasan PNG/CSV bila data cukup | Tanggal beririsan jelas; reset musim donasi tidak dibaca sebagai penurunan aktivitas. |

**Rekomendasi urutan:** mulai dari C1–C2. Nilai langsungnya tinggi karena profil dan level Army sudah tersedia. C3–C4 mengikuti setelah arsip perang dan snapshot untuk pemain yang ingin dibandingkan cukup banyak.

**Status implementasi C1–C4:** Halaman `/compare.html` tersedia dengan dua tag dalam URL, pemilih dari anggota klan, tombol tukar, dan tautan dari profil serta tabel klan. Ringkasan progres dan matriks Army menampilkan data masing-masing pemain walau profil lainnya gagal. Setiap item Army memberi ★ pada level mentah yang lebih tinggi dan = pada level setara; item yang tidak tersedia tidak diberi penanda. Selisih skor keseluruhan hanya muncul jika TH, versi baseline, dan cakupan keduanya sebanding. Tab War/CWL memisahkan jenis perang, menyediakan filter CWL bulan ini/30 hari/90 hari/semua arsip, dan memperlihatkan jumlah serangan, destruksi, partisipasi roster, serta kuota terlewat hanya pada perang selesai. Tab Aktivitas memakai tanggal snapshot bersama, menandai reset/perubahan counter donasi, dan menyediakan ekspor CSV serta PNG ketika datanya cukup. Kartu resume di bawah halaman merangkum hasil dan batas pembacaannya.
