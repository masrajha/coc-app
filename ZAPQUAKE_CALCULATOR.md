# Zapquake Calculator — implementasi Z3–Z4

> Catatan ini mendokumentasikan fondasi Z3-Z4. Cakupan aktif kini memakai mesin 2.0.0 dengan equipment, modifier, dan timeline Z5-Z7; lihat [ZAPQUAKE_ADVANCED.md](ZAPQUAKE_ADVANCED.md). Pernyataan batas fitur Z3-Z4 di bawah adalah riwayat cakupan tahap awal.

Halaman mandiri tersedia di `/tools/zapquake`, dengan akses dari navigasi beranda. Tidak ada permintaan API pemain/klan dan tidak memerlukan tag akun.

Status: mesin simulasi dasar `1.0.0` dan UI MVP sudah dibuat. Equipment (Z5), modifier (Z6), timing/healing (Z7), dan penyimpanan/berbagi konfigurasi (Z8) belum diimplementasikan.

## Penggunaan

1. Pilih kelompok Bangunan atau Hero, nama target, dan levelnya.
2. Untuk hero, pilih tipe target saat bertahan secara manual: darat atau udara. Sistem tidak menyimpulkan tipe bertahan dari mode serangan hero.
3. Pilih level Lightning/Earthquake. Level `Tidak digunakan` mengecualikan sumber tersebut.
4. Opsional: pilih TH penyerang untuk membatasi level spell. Preset tidak mengubah level target dan tidak memvalidasi spell donasi atau kapasitas seluruh army.
5. Tentukan kapasitas simulasi, maksimum 15 ruang spell.
6. Gunakan **Cari kombinasi** untuk rekomendasi dalam batas pilihan, atau **Uji kombinasi saya** untuk mengisi jumlah spell sendiri.
7. Buka alternatif atau rincian hit untuk melihat penggunaan kapasitas, damage tiap hit, sisa HP, dan asumsi.

Hasil diperbarui ketika input berubah. Input yang tidak valid menghasilkan penjelasan, bukan hasil lama yang tetap ditampilkan sebagai konfigurasi terbaru.

## Kontrak mesin dasar

Implementasi berada di `public/js/zapquake-model.js`. Modul dapat dipakai langsung di browser dan melalui CommonJS untuk pengujian. Fungsi `create(dataset)` menghasilkan `calculate(config)` dan `search(config)`.

### Sumber statistik

- Membaca manifest dan dataset dari `public/assets/data/zapquake/`.
- Consumer MVP mendukung schema 1, normalizer `1.1.0`, dan statistik berstatus `reference-data-only` tanpa modifier aktif. Format yang belum didukung ditolak.
- Identitas versi, path manifest, ukuran berkas, dan struktur dasar diperiksa. SHA-256 juga diperiksa jika Web Crypto tersedia, termasuk localhost/HTTPS.
- Dataset mentah tidak diubah menjadi `calculationReady = true` karena field aturan sumbernya memang belum lengkap. Kontrak simulasi berada pada modul mesin berversi tersendiri.
- Tidak ada klaim bahwa tanggal audit dataset adalah tanggal efektif semua nilai game.

### Aturan yang dipakai

| Target | Lightning | Earthquake |
|---|---|---|
| Defense normal | Damage langsung per level | Persentase HP maksimum bangunan |
| Town Hall | Tidak memberi damage | Persentase HP maksimum bangunan |
| Clan Castle | Tidak memberi damage | Persentase HP maksimum bangunan |
| Hero darat | Damage langsung per level | Persentase troop damage terpisah; level 1–5 tidak memberi damage |
| Hero udara, sesuai input pengguna | Damage langsung per level | Tidak memberi damage |

- Setiap Earthquake berikutnya pada target yang sama memakai pembagi ganjil: 1, 3, 5, 7, dan seterusnya.
- Basis persentase selalu HP maksimum yang dipakai simulasi, bukan sisa HP.
- Semua Earthquake memakai level yang sama; campuran level dalam satu sumber belum didukung.
- Urutan yang didukung: seluruh Earthquake dahulu, atau seluruh Lightning dahulu. Timeline campuran bebas belum didukung.
- Damage setelah target sudah hancur tidak ditambahkan. Spell berlebih tetap dihitung sebagai kapasitas yang dibawa dan ditandai tidak menambah damage pada rincian.
- Status hancur ditentukan dengan aritmetika rasional `BigInt`, tanpa epsilon atau pembulatan HP per hit. Konversi ke angka desimal dilakukan untuk tampilan, bukan penentuan ambang hancur.
- Tampilan memakai maksimal dua desimal. Nilai positif sangat kecil ditampilkan sebagai kurang dari 0,01 HP agar tidak tampak sebagai nol.
- Penanda margin tipis muncul ketika overkill kurang dari 1% HP target.
- Keberadaan HP hero bukan penerapan bonus pertahanan: HP tetap base HP. Hero Hall requirement tetap dipisahkan dari TH.

### Batas kepastian

Kontrak di atas adalah model perhitungan untuk statistik dasar, bukan replika engine game. Pembulatan internal, perubahan balance yang belum masuk snapshot, timing, radius, pemulihan HP, dan immunity fase tertentu dapat memengaruhi hasil nyata. Keterbatasan ditampilkan pada halaman dan hasil tidak dinyatakan sebagai jaminan serangan.

Referensi primer:

- [Supercell: Coming Soon, Desember 2020](https://supercell.com/en/games/clashofclans/blog/game-updates/coming-soon/) menjelaskan immunity Lightning pada Clan Castle.
- [Supercell: pembaruan Februari 2026](https://supercell.com/en/games/clashofclans/blog/release-notes/the-february-update-has-escaped/) menjelaskan tambahan damage Earthquake terhadap pasukan darat.
- [Snapshot dataset yang dikunci](https://github.com/chiefpansancolt/clash-of-clans-data/tree/431f8da169ba93b730d182dfec0ca4820998db0d) memasok statistik dan deskripsi spell. Provenance lengkap disertakan dalam dataset.
- [Penjelasan metode milik pembuat ZapQuake](https://www.zapquake.com/guides/calculation-method/) menjadi pembanding implementasi untuk model pembagi ganjil dan pemisahan persentase bangunan/hero. Ini sumber primer tentang metode tool tersebut, bukan bukti independen tentang pembulatan engine game. ClanIntel tidak menyalin semua aturan tool tersebut; khususnya immunity Town Hall tetap diberlakukan, batas kapasitas selalu diperiksa, dan mode hero dipilih manual.

Sumber resmi di atas tidak menerbitkan seluruh rincian koefisien dan pembulatan. Karena itu UI secara eksplisit menyebut **estimasi model**. Verifikasi replay/kasus langsung di game tetap diperlukan sebelum memperluas klaim akurasi.

## Pencarian kombinasi

- Enumerasi dibatasi 0–15 setiap spell dan kapasitas total 0–15: paling banyak 256 kandidat, lalu dipangkas berdasarkan batas sumber dan kapasitas.
- Spell yang tidak efektif atau dinonaktifkan tidak digunakan dalam rekomendasi.
- Urutan prioritas: kapasitas paling sedikit, margin damage terbesar, lalu jumlah Earthquake lebih sedikit sebagai pembeda deterministik.
- Maksimal enam alternatif selain kombinasi terbaik ditampilkan.
- Tidak ada solusi berarti tidak ada kombinasi yang menghancurkan target dalam batas pilihan model; bukan pernyataan bahwa target mustahil dihancurkan oleh seluruh metode di game.
- Pencarian cukup kecil untuk berjalan langsung tanpa Worker. Debounce dan identitas permintaan membatalkan pembaruan UI dari konfigurasi lama.

## UI, routing, dan deployment

- Desktop: konfigurasi di kiri, hasil dan penjelasan di kanan. Mobile: satu kolom.
- Semua pesan, validasi, tanggal/angka mengikuti CocI18n; empat varian tema memakai token tema aplikasi.
- Ikon spell dan hero memakai aset lokal; pertahanan memakai ikon umum. Town Hall memakai gambar sesuai level.
- Tidak ada equipment atau preset modifier yang tampak aktif padahal belum dihitung.
- Server menghasilkan `lang`, title, description, canonical, dan alternate id/en/x-default. Halaman masuk sitemap tanpa varian konfigurasi.
- `/zapquake.html` dan `/tools/zapquake/` diarahkan ke `/tools/zapquake`, mempertahankan query bahasa.
- `.htaccess` mengarahkan file HTML kalkulator melalui front controller agar metadata dan redirect bekerja meskipun salinan HTML ada di document root hosting.
- Manifest harus direvalidasi (`no-cache`), sedangkan versi dataset dan LICENSE immutable. Client mengambil manifest baru dan dapat memakai cache untuk versi dataset yang sama.
- Pada hosting yang melayani file nyata langsung melalui Apache/LiteSpeed, header PHP untuk berkas JSON dapat dilewati. Client tetap meminta manifest dengan `cache: no-cache`; pastikan konfigurasi hosting/CDN tidak memaksakan cache immutable pada manifest.
- Unggah HTML, JS, CSS, backend/routing, `.htaccess`, serta dataset versi terkait dalam rilis yang sesuai. Tidak memerlukan cron atau perubahan `.env`.

## Pengujian

```powershell
composer test:zapquake
node tests/i18n.test.js
composer test
```

Pengujian matematika mencakup kasus HP/damage snapshot, ambang tepat hancur, selisih pecahan yang tidak boleh dibulatkan menjadi hancur, hit berulang, immunity, hero darat/udara, batas kapasitas, preset TH, input tidak valid, urutan, spell berlebih, serta prioritas pencarian.

Pengujian PHP memeriksa routing, metadata dua bahasa, cache dataset, lisensi, dan redirect. Pemeriksaan browser saat implementasi mencakup lebar 320/390/900/1440, empat tema, dua bahasa, filter kosong, error/retry, mode hero, reset, dan tidak adanya request pemain/klan.
