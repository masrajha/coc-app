# Ide Pengembangan CWL Clan Analysis — ClanIntel

Tanggal rancangan: 1 November 2026  
Status: usulan pengembangan; belum merupakan fitur yang telah diimplementasikan.

## 1. Tujuan

Membantu pengunjung memahami kekuatan relatif klan dalam satu grup CWL, sebelum maupun setelah pertandingan dimulai.

Analisis dibagi menjadi dua lapisan:

1. **Potensi serangan roster:** komposisi TH, level hero, kesiapan equipment, dan konteks liga pemain.
2. **Performa pertandingan:** efektivitas serangan, ketahanan berdasarkan hasil bertahan, penggunaan serangan, serta konsistensi R1–R7.

Potensi menggambarkan materi yang tersedia. Performa menggambarkan hasil yang benar-benar tercatat. Keduanya ditampilkan berdampingan, bukan dianggap sebagai ukuran yang sama.

Fitur awal tidak memberikan probabilitas menang atau mengklaim mengetahui level seluruh bangunan defense.

## 2. Lokasi dan rancangan navigasi

Letakkan di halaman klan, tab **War & CWL**, pada bagian standings yang sudah ada:

```text
CWL · Master League I · Musim terpilih

[Standings] [Analisis kekuatan]

Cakupan: [Roster R1 ▼]   Ronde: [R1–R3 selesai ▼]

[Potensi roster] [Serangan] [Ketahanan] [Disiplin]

Klan       Komposisi TH   Hero   Equipment   Triple   Base kena 3★
Klan Anda  10 TH18/5 TH17  92%    12/15       62%      38%
Klan B     12 TH18/3 TH17  94%    13/15       55%      46%

Cakupan profil 14/15 · 3 ronde selesai · 44 serangan tercatat
```

Angka di atas hanya contoh tampilan, bukan data klan sebenarnya.

- Gunakan subtab agar halaman tidak memanjang dengan seluruh panel terbuka sekaligus.
- Baris klan dapat dibuka untuk melihat rincian R1–R7 dan membandingkannya dengan klan pengguna.
- Desktop: tabel perbandingan, kolom identitas klan tetap mudah ditemukan.
- Mobile: kartu ringkas per klan; metrik tambahan melalui detail yang dapat dibuka.
- Sorot klan pengguna memakai aksen tema, dengan penanda teks yang tetap jelas tanpa warna.
- Tampilkan definisi metrik dan sumber pengamatan melalui tombol bantuan kecil.
- Pilihan musim, ronde, dan subtab dipertahankan dalam tautan bagikan.

## 3. Cakupan roster

| Cakupan | Penggunaan | Label UI |
|---|---|---|
| Peserta ronde aktual | Roster yang tercantum pada war ronde terpilih | Roster R1, Roster R2, dan seterusnya |
| Peserta sepanjang musim | Pemain unik yang sudah diturunkan | Peserta yang telah bermain |
| Peserta terdaftar | Seluruh pemain terdaftar pada grup musim | Peserta terdaftar |
| Simulasi roster | N pemain menurut kriteria simulasi yang dipilih | Simulasi roster, bukan susunan aktual |

Aturan:

- Utamakan roster ronde aktual jika tersedia.
- Ukuran roster mengikuti `teamSize` war yang tersedia; jangan mengunci ukuran pada satu format.
- Jangan memasukkan seluruh anggota klan sebagai peserta CWL secara otomatis.
- Keanggotaan klan saat ini tidak menggantikan daftar peserta historis ronde.
- Untuk ringkasan musim, tampilkan metrik per ronde terlebih dahulu. Jika merangkum potensi roster, jelaskan apakah setiap pemain dihitung sekali atau berbobot jumlah ronde bermain.
- Sebelum susunan ronde diketahui, peserta terdaftar tidak boleh diberi label sebagai roster pasti.
- Simulasi roster merupakan fitur lanjutan, bukan kebutuhan versi pertama.

## 4. Sumber data dan batasannya

| Sumber | Data yang digunakan | Batasan |
|---|---|---|
| `GET /clans/{tag}/currentwar/leaguegroup` | Grup, peserta terdaftar, ronde, war tags | Ronde mendatang dapat belum memiliki war tag yang dapat diambil |
| `GET /clanwarleagues/wars/{warTag}` | Roster kedua sisi, TH, serangan, skor, status dan waktu war | Data yang belum tersedia tidak berarti nol |
| `GET /players/{playerTag}` | TH, hero, equipment, troops, spells, pets, tier liga | Profil merupakan pengamatan saat diambil, bukan jaminan kondisi historis saat menyerang |
| Arsip dan cache ClanIntel | Hasil yang telah diamati serta pengamatan profil | Tidak dapat merekonstruksi data sebelum mulai dicatat |
| Tabel batas level ClanIntel | Progres item terhadap batas TH | Cakupan dan versi tabel harus diketahui; item baru bisa belum didukung |

Catatan penting:

- Data war untuk grup dapat memberikan perbandingan kedua sisi, bukan hanya klan pengguna.
- Level hero dan equipment memerlukan profil pemain tambahan; jangan menganggap keduanya sudah lengkap di respons roster war.
- API publik belum menyediakan daftar level seluruh bangunan pertahanan pemain.
- Data level tidak membuktikan pemain memakai konfigurasi tertentu, mahir dengan strategi tersebut, atau membawa hero tertentu pada serangan CWL historis.
- Achievement seperti Supercharger dapat menjadi informasi pendukung, tetapi bukan pengganti level defense dan tidak masuk skor ketahanan versi awal.

## 5. Analisis sebelum R1 atau sebelum ada serangan

Nama bagian: **Potensi serangan roster**.

### 5.1 Komposisi Town Hall

Tampilkan:

- Jumlah pemain per TH, misalnya `10 TH18 · 5 TH17`.
- Median, rata-rata, dan rentang TH.
- Jumlah profil/anggota yang memiliki data TH.
- Perbandingan distribusi TH dengan klan lain dalam grup.

Utamakan distribusi daripada satu angka rata-rata. Nilai TH adalah indikator materi, bukan hasil serangan.

### 5.2 Level hero

Gunakan dua sudut pandang:

1. **Level aktual per hero**, untuk melihat perbedaan materi.
2. **Progres terhadap batas TH**, untuk melihat kesiapan pembangunan relatif.

Rumus progres item dengan baseline valid:

```text
Progres hero = min(level aktual / batas level pada TH pemain, 1) × 100%
```

- Rata-rata hero dihitung per pemain terlebih dahulu, lalu dirangkum pada roster agar jumlah hero tercatat tidak menjadi bobot tersembunyi.
- Sertakan jumlah item dan pemain yang tercakup.
- Baseline tidak diketahui berarti `belum diketahui`, bukan 0% atau 100%.
- TH rendah dengan hero maksimal tidak otomatis lebih kuat daripada TH tinggi dengan progres hero lebih rendah.
- Jangan menjumlahkan semua hero seolah semuanya dibawa bersamaan. Penilaian konfigurasi tempur harus mengikuti aturan slot dan kompatibilitas yang tervalidasi.
- Versi awal dapat menampilkan level per hero dan progres koleksi tanpa mengklaim konfigurasi tempur terbaik.

### 5.3 Equipment

Hindari rata-rata seluruh equipment sebagai satu-satunya ukuran. Equipment cadangan atau yang baru dirilis dapat menurunkan rata-rata tanpa menggambarkan pilihan utama pemain.

Rancangan:

- Tampilkan level/progres equipment per hero.
- Bedakan koleksi equipment dan kesiapan konfigurasi tempur.
- Penilaian konfigurasi memakai pilihan yang kompatibel dengan hero dan aturan slot.
- Jika konfigurasi aktif tidak dapat dipastikan, gunakan label **pilihan tersedia**, bukan **dipakai dalam CWL**.
- Mode pilihan terbaik merupakan simulasi; aturan pemilihannya harus terlihat dan dapat diperbarui.
- Threshold seperti progres ≥90% adalah definisi analisis ClanIntel, bukan ketentuan resmi game.
- Tampilkan `12/15 pemain memenuhi kriteria`, dengan penjelasan kriteria dan cakupan data.
- Equipment baru dengan baseline belum tersedia tetap ditampilkan tanpa dipaksakan masuk persentase.

### 5.4 Liga roster

Tampilkan sebagai konteks pengalaman kompetitif:

- Distribusi tier Ranked League.
- Median tier, memakai tabel urutan tier yang eksplisit dan berversi.
- Jumlah pemain dengan tier diketahui dan belum diketahui.
- Statistik sesi selesai dapat ditambahkan jika tersedia dan periodenya sebanding.

Jangan menggunakan posisi grup sebagai perbandingan lintas tier. Jarak antar-tier juga tidak otomatis memiliki selisih kekuatan yang linear.

Liga CWL klan menjadi konteks kompetisi. Pada grup CWL yang sama, liga tersebut tidak membedakan kekuatan antarklan.

### 5.5 Pilihan tipe army — tahap lanjutan

Daripada menjumlahkan level Yeti, Thrower, Dragon, Hog Rider, dan Root Rider, tampilkan **kesiapan pilihan army**:

| Tipe | Contoh keluaran |
|---|---|
| Udara | 11/15 pemain memenuhi kriteria level |
| Darat | 13/15 pemain memenuhi kriteria level |
| Hybrid | 8/15 pemain memenuhi kriteria level |

Template harus mencakup pasukan inti dan spell pendukung, disesuaikan TH. Pets, equipment, dan hero dapat ditambahkan setelah definisi konfigurasi tervalidasi.

- Setiap template memiliki ID, versi, TH yang didukung, item wajib, serta threshold yang dapat dijelaskan.
- Pemain dihitung sekali per tipe walaupun memenuhi beberapa template.
- Template yang belum didukung tidak membuat pemain otomatis gagal.
- Nama indikator: **Memenuhi kriteria level army**, bukan **Menguasai strategi**.
- Jangan mengklaim template sebagai strategi meta terbaik tanpa proses pembaruan dan evaluasi yang jelas.

## 6. Metrik pertandingan R1–R7

### 6.1 Serangan

| Metrik | Rumus atau definisi |
|---|---|
| Bintang per serangan | Total bintang setiap serangan / serangan dengan bintang tercatat |
| Destruksi per serangan | Total persentase destruksi / serangan dengan destruksi tercatat |
| Triple rate | Serangan 3★ / serangan dengan bintang tercatat |
| Base lawan diratakan | Base unik per ronde yang menerima setidaknya satu serangan 3★ |
| Persentase base diratakan | Base unik diratakan / jumlah base lawan pada ronde yang dihitung |
| Serangan 0–1★ | Jumlah serangan 0–1★ / serangan dengan bintang tercatat |
| Bintang pertandingan per ronde | Total skor bintang final tiap ronde / ronde selesai yang memiliki skor |
| Bonus kemenangan | Ditampilkan terpisah dari efisiensi serangan |
| Total bintang klasemen | Mengikuti aturan standings; bukan jumlah bintang semua log serangan |

Serangan ulang ke base yang sama dapat menambah jumlah triple attack, tetapi tidak menambah jumlah base unik diratakan pada ronde tersebut.

### 6.2 Ketahanan berdasarkan hasil perang

| Metrik | Arah lebih baik |
|---|---|
| Bintang lawan per serangan masuk | Lebih rendah |
| Destruksi lawan per serangan masuk | Lebih rendah |
| Persentase serangan masuk yang mendapat 3★ | Lebih rendah |
| Persentase base sendiri yang terkena triple | Lebih rendah |
| Base yang sudah diserang tetapi belum diratakan | Lebih tinggi, dengan konteks TH penyerang |

Tampilkan dua denominator untuk base terkena triple bila berguna: seluruh base roster dan hanya base yang sudah diserang. Keduanya harus memiliki label berbeda.

Base yang belum diserang tidak dianggap berhasil bertahan. Jumlah serangan masuk dan kelengkapan detail log harus terlihat.

### 6.3 Disiplin

- Persentase kuota serangan terpakai.
- Serangan yang terlewat pada ronde selesai.
- Jumlah pemain yang masih memiliki serangan pada ronde berlangsung.
- Pergantian roster per ronde sebagai konteks, bukan penalti otomatis.

Sisa serangan pada ronde berlangsung belum boleh disebut serangan terlewat.

### 6.4 Konteks matchup

- Pisahkan menyerang TH lebih rendah, setara, dan lebih tinggi.
- Tampilkan triple rate pada target TH setara.
- Gunakan TH roster war terkait, bukan TH profil terbaru, untuk analisis pertandingan historis.
- Ringkasan gabungan memakai total kejadian dan denominator yang sesuai; jangan merata-ratakan persentase dengan sampel berbeda tanpa bobot.
- Identitas base unik adalah kombinasi ronde/war dan tag pemain, bukan tag saja sepanjang musim.

## 7. Status data dan kecukupan sampel

| Kondisi | Perilaku UI |
|---|---|
| Belum ada war/serangan | Potensi dapat tampil jika tersedia; performa belum tersedia |
| Ronde persiapan | Tampilkan roster dan potensi; jangan tampilkan nol sebagai performa |
| Ronde berlangsung | Statistik sementara, terpisah dari agregat ronde selesai |
| Sebagian profil gagal dimuat | Nilai dari data diketahui dengan cakupan eksplisit |
| Log war tidak lengkap | Label parsial; jangan menyimpulkan base tidak diserang dari log yang hilang |
| Tidak ada profil/baseline valid | `—` atau `Belum tersedia` |
| Data privat/tidak dapat diakses | Jelaskan keterbatasan; tidak terus menampilkan loading |
| Data lama | Waktu pengamatan dan penanda data tersimpan |

Contoh: `3 ronde selesai · 44/45 serangan memiliki detail · 14/15 profil tersedia`.

Ambang kecukupan sampel harus menjadi aturan produk yang eksplisit. Versi awal cukup menampilkan jumlah ronde, serangan, serta cakupan; hindari persentase keyakinan yang tidak memiliki model statistik.

## 8. Indeks gabungan dan resume

Versi awal menampilkan indikator terpisah. Tidak ada peringkat kekuatan tunggal hanya karena semua klan masih memiliki nol serangan.

Jika indeks 0–100 dikembangkan kemudian:

- Pisahkan indeks potensi dan indeks performa.
- Publikasikan komponen, bobot, baseline, dan versi rumus.
- Uji pada beberapa musim sebelum mengubahnya menjadi interpretasi prediktif.
- Periksa penghitungan ganda: bintang, triple rate, dan destruksi saling berkaitan.
- Jangan menormalisasi ulang bobot yang hilang secara diam-diam sehingga dua skor berbeda cakupan tampak setara.
- Jangan memasukkan TH dan progres hero tanpa menjelaskan peran keduanya.
- Indeks deskriptif bukan persentase peluang menang.

Resume awal menggunakan aturan berbasis fakta, misalnya:

> Roster ISTIMEWA memiliki rata-rata TH lebih rendah, tetapi triple rate melawan TH setara lebih tinggi. Hasil pertahanan masih parsial karena detail sebagian serangan masuk belum tersedia.

Setiap klaim perbandingan harus memiliki periode, cakupan roster, dan sampel yang sesuai.

## 9. Pengambilan data dan penyimpanan

- Gunakan kembali hasil league group, war, profil, dan cache yang sudah tersedia.
- Hitung statistik seluruh grup dari war terkait, dengan deduplikasi war tag.
- Profil tambahan dimuat bertahap saat pengguna membuka analisis, bukan sekaligus dalam request halaman klan pertama.
- Batasi konkurensi, lakukan deduplikasi permintaan per tag, dan gunakan cache dengan batas kesegaran yang eksplisit.
- Prioritaskan roster klan pengguna serta lawan ronde terpilih; sediakan perluasan ke seluruh grup.
- Analisis tidak boleh memicu ratusan request profil setiap refresh otomatis atau ketika halaman SEO dirayapi.
- Pergantian tag, musim, atau ronde membatalkan penerapan hasil request yang sudah tidak relevan.
- Jangan menampilkan loading tanpa akhir jika sebagian request gagal.

Usulan arsip terpisah:

```text
data/assets/images/leagues/cwl/cwl-analysis/{seasonId}/{clanTag}.json
```

Isi ringkas yang disarankan:

- ID musim/grup/war, cakupan roster, dan daftar tag peserta.
- `observedAt`, waktu pengamatan sumber, versi model, versi baseline, serta versi template army.
- Status setiap sumber: tersedia, parsial, gagal, atau belum diambil.
- Ringkasan potensi per pemain dan agregat roster.
- Ringkasan pertandingan per ronde dan denominator setiap metrik.

Pengamatan profil awal musim dapat disimpan agar perubahan berikutnya tidak diam-diam menulis ulang analisis lama. Sebut sebagai **pengamatan pada waktu tertentu**; jangan mengklaimnya sebagai kondisi persis saat serangan berlangsung.

Arsip analisis ini berbeda dari snapshot harian klan yang sudah ada. Tetapkan retensi dan invalidasi berdasarkan versi model serta kebutuhan penyimpanan.

## 10. Tema, bahasa, dan aksesibilitas

- Mendukung Indonesia dan English, termasuk pesan kosong, pemuatan, parsial, serta kegagalan.
- Gunakan pola terjemahan yang sudah dipakai halaman klan.
- Angka dan tanggal mengikuti bahasa aktif; zona waktu pengamatan diberi keterangan.
- Gunakan token tema untuk Dark, Light, Dark Simple, dan Light Simple.
- Warna keunggulan selalu disertai angka, label, atau simbol yang dapat dipahami tanpa warna.
- Header sortable memiliki `aria-sort`; navigasi subtab mendukung keyboard.
- Mobile tidak memadatkan seluruh metrik menjadi font yang sulit dibaca; detail tersedia melalui pembukaan kartu atau scroll tabel yang dibatasi pada panel.

## 11. Tahapan implementasi

| Tahap | Cakupan | Kriteria selesai |
|---|---|---|
| CA1 | Model data grup/ronde, roster, cakupan sumber | Roster terdaftar dan roster aktual tidak tertukar; data hilang tetap unknown |
| CA2 | Serangan, ketahanan, disiplin | Rumus dan denominator teruji untuk seluruh klan; ronde berjalan dan selesai terpisah |
| CA3 | UI subtab analisis | Desktop/mobile, detail R1–R7, tema, ID/EN, empty/loading/error state |
| CA4 | Potensi TH dan distribusi Ranked League | Berguna sebelum R1; ordinal tier benar dan cakupan profil terlihat |
| CA5 | Progres hero dan equipment | Pengambilan profil bertahap, baseline/versioning, konfigurasi atau simulasi berlabel jelas |
| CA6 | Template kesiapan army | Template berversi, sesuai TH, item tidak dikenal tidak dipaksakan masuk penilaian |
| CA7 | Arsip pengamatan, resume, bagikan/ekspor | Periode dan keterbatasan ikut dalam tautan, gambar, atau ekspor |
| CA8 | Evaluasi indeks gabungan | Bobot transparan dan dievaluasi memakai data historis; bukan probabilitas tanpa kalibrasi |

Urutan yang disarankan: CA1–CA3 untuk hasil pertandingan terlebih dahulu, lalu CA4–CA5 untuk potensi sebelum R1. CA6–CA8 menyusul setelah fondasi data stabil.

## 12. Skenario pengujian utama

1. R1 belum tersedia, roster terdaftar ada, dan profil sebagian tersedia.
2. R1 persiapan dengan roster aktual; belum ada serangan.
3. R1 berjalan dengan jumlah serangan antar klan berbeda.
4. R1–R3 selesai, R4 berjalan; agregat utama hanya memakai ronde selesai.
5. Dua serangan triple ke base yang sama; base unik hanya dihitung satu pada ronde tersebut.
6. Ronde berbeda memakai pemain yang sama; base dihitung per ronde.
7. Base belum diserang dibanding base diserang 0★; keduanya tidak tertukar.
8. Roster berubah, pemain pindah klan, atau TH profil naik setelah ronde selesai.
9. Profil gagal, equipment baru, baseline hilang, atau log pertahanan parsial.
10. Skor pertandingan, bintang seluruh serangan, dan bonus klasemen tidak tercampur.
11. Tidak ada kuota/ukuran war yang valid; persentase terkait ditandai belum tersedia.
12. Pergantian musim/klan saat request berjalan; hasil lama tidak menimpa pilihan baru.
13. Indonesia/English, empat tema, mobile, keyboard, dan tautan tab aktif.
14. Cache dipakai ulang, konkurensi dibatasi, dan pembukaan halaman biasa tidak mengambil seluruh profil grup.

## 13. Keputusan yang perlu ditetapkan sebelum tahap lanjutan

- Definisi konfigurasi hero/equipment yang dinilai dan data yang bisa membuktikannya.
- Threshold kesiapan serta cakupan baseline untuk tiap TH.
- Template army dan proses pembaruannya.
- Interval kesegaran profil, retensi arsip, dan batas konkurensi.
- Kriteria sampel cukup untuk resume komparatif.
- Perlakuan terhadap indeks yang komponennya belum lengkap.

## Referensi

- API resmi Clash of Clans: https://developer.clashofclans.com/
- Rancangan disesuaikan dengan alur standings, roster war, profil pemain, dan tabel progres yang sudah digunakan ClanIntel.
