# Ide Pengembangan CoC Clan Tracker

## Arah produk

Ubah aplikasi pencarian klan saat ini menjadi dasbor untuk pemimpin klan, dengan tiga modul yang berbagi data klan, pemain, dan perang. Mulai dari **Clan War & CWL Command Center** karena hasilnya langsung berguna selama perang; lanjutkan **Clan Health & Activity Auditor** setelah penyimpanan snapshot tersedia; terakhir bangun **Player Progress Calculator** dengan tabel batas level yang rutin diperbarui.

Data dari API sebaiknya diberi waktu pengambilan (`lastUpdated`). Istilah *real-time* berarti pembaruan berkala, bukan aliran kejadian langsung.

## 1. Clan War & CWL Command Center

### Tampilan dan fitur

- Papan skor perang: fase perang, waktu tersisa, bintang, persentase destruction kedua klan, dan jumlah serangan terpakai.
- Matriks anggota versus basis lawan: posisi peta, Town Hall, serangan yang sudah dilakukan, hasil terbaik pada tiap basis, dan basis yang masih terbuka.
- Sisa serangan dihitung dari kuota serangan per anggota dan jumlah serangan yang tercatat. Perlakukan CWL terpisah karena aturan kuotanya berbeda.
- Rekomendasi target berupa **daftar kandidat**, dengan alasan yang terlihat: selisih Town Hall, posisi peta, bintang yang sudah didapat, dan peluang menambah bintang. Kekuatan hero penyerang dapat diambil dari profil pemain; data hero lawan mungkin tidak tersedia dari data perang, jadi jangan mengklaim rekomendasi berbasis hero lawan bila datanya tidak ada.
- Tab CWL per putaran: lawan, hasil, serangan per anggota, bintang, destruction, dan pemain yang belum menyerang. Simpan hasil tiap putaran agar tetap bisa dianalisis setelah musim berjalan.

### Data dan perhitungan

- Ambil perang aktif dari endpoint current war, grup CWL dari league group, lalu rincian perang CWL dari tag perang tiap putaran.
- Hitung *serangan tersisa* dari kuota dan daftar attack, bukan dari jumlah anggota klan biasa: peserta perang bisa berbeda.
- Gunakan angka agregat bintang/destruction dari respons perang sebagai sumber papan skor; hasil per anggota dihitung dari daftar attack.
- Perbarui tampilan berkala, misalnya setiap 1–5 menit, dengan cache di server dan pembatasan permintaan agar tidak membanjiri API.

**Batasan:** data perang bisa tidak tersedia sesuai pengaturan privasi atau fase perang. Tampilkan keadaan “data perang tidak tersedia” secara jelas. Rekomendasi adalah bantuan keputusan, bukan prediksi pasti hasil serangan.

## 2. Clan Health & Activity Auditor

### Tampilan dan fitur

- Ringkasan aktivitas anggota untuk 7 dan 30 hari: perubahan trofi, donasi diberikan/diterima, partisipasi perang, dan tren keanggotaan.
- Penanda “perlu ditinjau” bila donasi tetap nol, trofi tidak berubah, atau serangan perang terlewat berulang kali. Setiap penanda menyertakan periode dan bukti angka.
- Rasio donasi `donations / max(donationsReceived, 1)` disertai angka mentah. Nol donasi yang diterima harus ditampilkan sebagai kondisi khusus agar rasio tidak menyesatkan.
- Laporan mingguan CSV untuk pemimpin klan: ringkasan tiap anggota, alasan penanda, dan catatan manual. Daftar kandidat promosi atau pembinaan disajikan sebagai saran, bukan keputusan otomatis untuk kick.

### Data dan perhitungan

- Simpan snapshot profil klan dan anggota setidaknya sekali sehari. API memberi kondisi saat ini; **riwayat harian/mingguan tidak dapat dibuat mundur** sebelum aplikasi mulai merekamnya.
- Simpan identitas berdasarkan tag pemain, bukan nama, karena nama bisa berubah. Catat waktu snapshot dan musim donasi untuk menghindari perbandingan lintas reset musim.
- Arsipkan rincian perang saat tersedia untuk menghitung partisipasi dan serangan terlewat. Bedakan anggota yang tidak masuk roster perang dari anggota roster yang tidak menyerang.
- Anggap perubahan trofi nol sebagai **sinyal lemah**; pemain bisa aktif tanpa perubahan trofi. Gabungkan beberapa indikator sebelum memberi penanda.

## 3. Player Progress & Rushed Base Calculator

### Tampilan dan fitur

- Profil pemain berdasarkan tag: Town Hall, level hero, pet, troop, spell, dan equipment jika tersedia.
- Progres per kategori dan ringkasan persentase terhadap batas maksimum yang berlaku untuk Town Hall pemain.
- Penjelasan status *rushed*: kategori mana yang tertinggal, seberapa jauh dari batas TH, dan rekomendasi prioritas upgrade.
- Tampilkan “data belum cukup” bila suatu kategori atau batas level belum terpetakan, alih-alih memberi skor yang tampak pasti.

### Model skor yang disarankan

Untuk setiap item yang relevan pada TH pemain, hitung `level_saat_ini / level_maks_TH`. Rata-ratakan per kategori, lalu gabungkan dengan bobot yang dapat diubah, misalnya hero 40%, troop dan spell 35%, pet 15%, equipment 10%. Kategori yang belum terbuka dikeluarkan dan bobot sisanya dinormalisasi ulang.

Status *rushed* perlu ambang yang terdokumentasi, misalnya skor keseluruhan di bawah 60% **dan** setidaknya satu kategori inti di bawah 50%. Angka ini merupakan aturan produk awal untuk diuji bersama pemimpin klan, bukan definisi resmi game. Skor ini juga **bukan persentase maksimal akun secara menyeluruh**, karena data bangunan, tembok, dan upgrade yang sedang berlangsung tidak tercakup dalam profil pemain API. Label antarmuka yang lebih tepat: **Progres pasukan dan hero**.

Tabel batas level harus diberi versi dan tanggal pembaruan. Ketika update game mengubah batas maksimum, perhitungan lama perlu tetap dapat dijelaskan berdasarkan versi tabel yang dipakai saat itu.

## Rancangan teknis untuk proyek ini

1. Pertahankan Express sebagai backend dan token API hanya di `.env`. Pindahkan panggilan API ke satu modul layanan yang menangani normalisasi tag, cache, timeout, dan kesalahan `403`/`404`/`429`.
2. Tambahkan endpoint khusus seperti `/api/clan/:tag/war`, `/api/clan/:tag/cwl`, `/api/clan/:tag/health`, dan `/api/player/:tag/progress` agar halaman tidak perlu memahami bentuk respons API eksternal.
3. Tambahkan database ringan seperti SQLite untuk snapshot anggota, arsip serangan perang, dan versi tabel batas level. Jadwalkan pengambilan data harian serta pengambilan perang lebih sering saat aktif.
4. Pecah `public/index.html` menjadi tampilan/skrip modular ketika modul kedua mulai dibuat. Gunakan `textContent` atau pembuatan elemen DOM untuk nama pemain dan data eksternal, bukan interpolasi langsung ke `innerHTML`.
5. Sediakan status “terakhir diperbarui”, penanganan data parsial, dan ekspor CSV dari data yang sudah disimpan. Lindungi endpoint laporan jika aplikasi akan dibuka untuk publik.

## Ide redesain layout padat dan informatif

### Prinsip tampilan

- Ubah halaman dari kartu besar vertikal menjadi **dashboard operasi perang** yang rapat, mudah dipindai, dan minim ruang kosong.
- Kurangi padding utama dari pola besar seperti `p-8`, `p-6`, dan `mb-8` menjadi ukuran lebih hemat seperti `p-4`, `p-3`, `gap-3`, dan `mb-4`.
- Gunakan tinggi baris tabel yang lebih pendek: `py-2` untuk tabel utama, `text-xs` atau `text-sm` untuk metadata, dan heading sedang agar informasi perang tidak terlalu turun.
- Tempatkan informasi yang sering dibaca di area atas tanpa perlu scroll: status perang, timer, skor, serangan tersisa, daftar pemain belum menyerang, dan tombol putaran CWL.
- Pakai tab atau segmented control untuk berpindah antara `War Aktif`, `CWL Rounds`, `Roster`, `Performance`, dan `Activity`, bukan menumpuk semua panel secara vertikal.

### Struktur halaman yang disarankan

1. **Top compact bar**
   Berisi input tag clan, nama clan, badge kecil, level clan, jumlah anggota, tombol refresh, dan waktu pembaruan terakhir. Area ini dibuat sticky agar pencarian dan status selalu terlihat.

2. **War command strip**
   Satu baris ringkasan perang: fase, putaran CWL, waktu tersisa, skor bintang kedua clan, destruksi, serangan terpakai, dan sisa serangan. Gunakan angka besar hanya untuk skor utama, sisanya ringkas.

3. **CWL round navigator**
   Tampilkan tombol kecil `Aktif`, `R1`, `R2`, `R3`, dan seterusnya. Setiap tombol diberi indikator warna:
   - Biru: sedang berlangsung.
   - Abu-abu: selesai.
   - Kuning: persiapan.
   - Merah tipis: kalah atau tertinggal.
   - Hijau tipis: menang atau unggul.

4. **Two-column operations view**
   Kolom kiri berisi scoreboard, timer, dan daftar prioritas seperti pemain belum menyerang. Kolom kanan berisi tabel roster perang yang padat. Pada layar kecil, kolom menjadi satu.

5. **Dense war roster table**
   Tabel roster menjadi pusat halaman, dengan kolom:
   `Pos`, `Player`, `TH`, `Atk`, `Sisa`, `Bintang`, `% Destruksi`, `Target`, `Hasil`, dan `Status`.
   Kolom `Status` bisa berisi badge singkat seperti `Belum`, `Done`, `Missed`, atau `Scout`.

6. **Opponent target table**
   Tambahkan tabel basis lawan dengan kolom:
   `Pos`, `TH`, `Defender`, `Best Stars`, `Best %`, `Sudah Diserang`, dan `Rekomendasi`.
   Ini membantu leader melihat target yang masih bisa menghasilkan tambahan bintang.

### Grafik performa pemain

- **Player war efficiency chart**
  Grafik batang horizontal per pemain. Nilai utama bisa berupa gabungan `bintang per serangan` dan `% destruksi rata-rata`. Cocok untuk melihat pemain paling konsisten selama war atau CWL.

- **CWL round performance trend**
  Grafik garis per pemain lintas putaran CWL. Sumbu X adalah putaran, sumbu Y bisa `stars`, `% destruksi`, atau indeks performa. Pemain yang melewatkan serangan diberi titik kosong atau nilai nol dengan warna berbeda.

- **Stars vs destruction scatter plot**
  Scatter plot dengan sumbu X `% destruksi`, sumbu Y `bintang`, dan ukuran titik berdasarkan TH penyerang atau TH target. Grafik ini bagus untuk membedakan serangan 2 bintang 98% dengan 2 bintang 55%.

- **Attack usage heatmap**
  Heatmap roster versus putaran CWL. Baris adalah pemain, kolom adalah round. Warna menunjukkan hasil: hijau untuk 3 bintang, biru untuk 2 bintang tinggi, kuning untuk 1 bintang, merah untuk 0 bintang atau missed.

- **Target difficulty matrix**
  Matriks posisi pemain versus posisi target lawan. Isi sel menampilkan hasil serangan. Ini membantu membaca apakah clan terlalu banyak menyerang terlalu tinggi, terlalu rendah, atau sudah tepat sasaran.

- **Consistency score**
  Skor ringkas per pemain, misalnya:
  `rerata bintang * 40% + rerata destruksi * 40% + ketepatan memakai serangan * 20%`.
  Skor ini harus selalu disertai angka mentah agar tidak terasa seperti penilaian hitam putih.

### Ringkasan metrik pemain

Untuk setiap pemain di war dan CWL, simpan dan tampilkan metrik berikut:

| Metrik | Fungsi |
| --- | --- |
| Serangan terpakai | Melihat kepatuhan memakai jatah serangan. |
| Serangan terlewat | Bahan evaluasi roster war/CWL. |
| Total bintang | Output paling mudah dipahami. |
| Rata-rata bintang | Membandingkan pemain dengan jumlah serangan berbeda. |
| Rata-rata destruksi | Menilai serangan yang hampir menghasilkan bintang tambahan. |
| Best attack | Menampilkan performa terbaik pemain pada periode tersebut. |
| Target TH delta | Membaca apakah pemain sering hit naik, sejajar, atau turun TH. |
| Round contribution | Melihat kontribusi per putaran CWL. |

### Ide tata letak detail

- Gunakan grid 12 kolom di desktop: `3 kolom` untuk ringkasan perang dan daftar belum menyerang, `9 kolom` untuk tabel roster atau grafik.
- Buat tabel tetap rapat dengan header sticky saat scroll.
- Letakkan filter kecil di atas tabel: `Semua`, `Belum menyerang`, `Sudah menyerang`, `TH 18`, `TH 17`, dan `Butuh follow up`.
- Tampilkan angka kecil dengan format konsisten: `98,6%`, bukan angka panjang.
- Pakai warna secukupnya untuk status dan hasil, bukan sebagai dekorasi utama.
- Hindari kartu bertumpuk. Gunakan panel datar, garis pembatas tipis, dan tabel yang kuat.

### Prioritas implementasi redesain

| Tahap | Hasil yang bisa dipakai |
| --- | --- |
| R1 | Padatkan spacing global, header clan, scoreboard perang, dan tabel roster. |
| R2 | Tambahkan tab/segmented control untuk `War`, `CWL`, `Roster`, dan `Performance`. |
| R3 | Tambahkan tabel pemain belum menyerang dan tabel target lawan. |
| R4 | Tambahkan grafik batang performa pemain dari data war aktif. |
| R5 | Simpan arsip CWL ke database agar grafik tren lintas putaran bisa stabil. |
| R6 | Tambahkan heatmap CWL dan scatter plot bintang versus destruksi. |

## Urutan pengerjaan

| Tahap | Hasil yang bisa dipakai |
| --- | --- |
| 1 | Papan skor perang aktif, roster, serangan tersisa, status pembaruan, dan cache. |
| 2 | Putaran CWL serta arsip hasil/serangan setiap putaran. |
| 3 | Snapshot anggota harian, tren aktivitas, dan laporan CSV mingguan. |
| 4 | Profil pemain, tabel batas level, skor progres, dan penjelasan *rushed*. |

## Sumber API

- [Portal resmi Clash of Clans API](https://developer.clashofclans.com/) untuk kredensial dan dokumentasi endpoint.
- Endpoint yang perlu diperiksa saat implementasi: `GET /clans/{tag}/currentwar`, `GET /clans/{tag}/currentwar/leaguegroup`, `GET /clanwarleagues/wars/{warTag}`, `GET /clans/{tag}/members`, dan `GET /players/{tag}`. Bentuk respons dan ketersediaan data harus diuji dengan token aplikasi sebelum fitur dipublikasikan.
