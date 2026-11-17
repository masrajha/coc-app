# Audit baseline TH19 — T19-0 / T19-1

Tanggal: 16 November 2026. Dokumen ini mencatat hasil implementasi, bukan pengaktifan dataset TH19.

Lanjutan 17 November: tahap T19-2/T19-3 sudah memakai katalog per-TH dan overlay resmi. Lihat [GAME_CATALOG.md](../../GAME_CATALOG.md) untuk perilaku terbaru; penahanan seluruh skor TH18/19 di bawah adalah catatan tahap T19-1.

## Hasil T19-0

- Manifest, source lock, versi normalizer/engine, dan checksum dataset aktif dibekukan di `baseline.json`, `manifest.before.json`, dan `source-lock.before.json`.
- `report.json` mencakup 41 entitas pada seluruh kategori dataset aktif (bangunan, hero, spell, equipment, dan requirements), jumlah baris serta cakupan setiap field. Troop/pet/guardian/squad yang belum diimpor dinyatakan eksplisit sebagai kategori di luar baseline.
- `announced-changes.json` mencatat 66 perubahan cap sebagai acuan audit, beserta perubahan HP/modifier. File ini **tidak dibaca runtime** dan bukan tabel maksimum per TH. Statistik yang tidak diumumkan tidak dianggap tetap.
- `upstream-diff.json` membandingkan seluruh 44 file source lock dengan blob Git pada revisi kandidat `7afaa0375e5865c04021836a3a4192ffcfea092d`. Semuanya sama. Ini bukan klaim bahwa seluruh repository upstream tidak berubah.
- Status sumber per field dibedakan: tersedia, hilang, konflik, atau belum diverifikasi. Angka yang diumumkan belum otomatis memenuhi syarat simulasi.

Jalankan ulang audit tanpa jaringan:

```powershell
python scripts/audit-th19.py
```

Script memeriksa checksum baseline sebelum menghasilkan laporan. Jika manifest/source lock berubah, buat audit versi baru setelah peninjauan; jangan mengganti baseline lama untuk meloloskan pemeriksaan.

## Fixture dan batas verifikasi

`tests/fixtures/th19/player-th18-anonymized.json` berasal dari respons API pada cache lokal. Hanya nama item game, level, maksimum global dan village yang dipertahankan; identitas pemain/klan/grup dihapus.

Cache yang diperiksa belum memiliki profil TH19. Karena itu, `player-th19-synthetic.json` adalah **fixture sintetis**, bukan bukti kontrak API TH19 aktual. `provenance.json` membedakan keduanya. Penangkapan respons TH19 asli yang dianonimkan masih pending dan perlu ditambahkan sebelum menyatakan kontrak API baru telah diverifikasi. Tidak ada token atau `.env` dibaca oleh audit.

## Perilaku T19-1

- TH tanpa tabel lokal yang tepat tidak memakai fallback TH lain atau `maxLevel` API global. Saat ini termasuk TH18 dan TH19, serta TH lain di luar tabel parsial TH11–17.
- Level asli dan maksimum global API tetap tersedia pada Army/detail item. Maksimum global tidak dipakai sebagai batas TH pada compare, skor progres, pemilihan hero berdasarkan rasio, atau indikator maksimum untuk item dengan cap tidak tersedia.
- Skor progres dan verdict rushed menjadi `null`; UI Indonesia/English menjelaskan bahwa batas sesuai TH belum tersedia. Ini sengaja menahan skor TH18 juga sampai katalog per-TH T19-2 siap.
- Cakupan menampilkan jumlah item yang diamati, terpisah dari jumlah item yang batasnya diketahui. Item baru tidak dibuang karena belum memiliki cap atau gambar.
- Level yang melampaui tabel lokal dianggap sebagai baseline usang, bukan progres lebih dari 100%.
- Ikon item mempertahankan rantai fallback/inisial; ikon TH tanpa aset tidak menampilkan gambar rusak dan nomor TH tetap tampil. Tidak ada gambar TH18 yang diberi label TH19.
- Dataset simulasi, modifier, dan aturan sesi Ranked/CWL tidak diaktifkan pada tahap ini. Zapquake tetap dibatasi data yang sudah diverifikasi, maksimum TH18.

Model progress menggunakan versi `2026-11-16-th-cap-safety-v1`. Snapshot mentah tidak diubah. Perhitungan profile/progress dibuat ulang dari respons pemain sehingga tidak memerlukan penghapusan massal cache API.

## Validasi

```powershell
composer test
node --test tests/player-overview.test.js tests/compare-overview.test.js tests/i18n.test.js tests/theme.test.js
python scripts/audit-th19.py
```

Regresi khusus mencakup TH18/19, TH mendatang, level di atas tabel usang, item baru, jumlah cakupan, pelestarian level API, dan penahanan penilaian yang belum didukung.

Langkah berikutnya: tambahkan fixture TH19 aktual, lalu kerjakan resolver maksimum per TH pada T19-2. Jangan mengaktifkan angka simulasi dari berkas audit.
