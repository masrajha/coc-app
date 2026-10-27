<?php
declare(strict_types=1);
namespace CocTracker;

final class SeoGuides
{
    public const UPDATED = '2026-10-28';

    public static function all(string $lang): array
    {
        if ($lang === 'en') return [
            'ranked-league' => [
                'title' => 'Clash of Clans Ranked League: battle logs, trophies and league changes',
                'intro' => 'Read a Ranked League session in ClanIntel: identify the correct league, separate attack and defense trophies, and understand what the available data can tell you.',
                'sections' => [
                    ['Start with the session', 'Open a player profile and choose Ranked League. Check the session date and league tier before interpreting the result. After promotion or demotion, a previous session must use its historical tier, not the badge currently shown on the profile. If the tier cannot be confirmed, ClanIntel leaves it unavailable rather than assigning a rule without evidence.'],
                    ['Attack points, defense points and bonuses', 'Attack and defense cards show the points reported for individual battles. Defense bonuses are separate from battles: they have no opponent, stars or destruction percentage. ClanIntel only displays a calculated bonus for a completed session when the relevant totals and quota are available. It reconciles official trophies with recorded attack and defense points; a missing log is not proof of a bonus.'],
                    ['Compare performance with context', 'Stars per attack and attack destruction describe offense. Opponent stars and destruction received describe defense. Check the number of battles behind each average: two attacks provide less evidence than a completed session. When comparing players, verify the season dates and account for differences in league rules. A higher trophy total alone does not describe every part of performance.'],
                    ['Legend I and missing information', 'Legend I uses a global leaderboard context. A group battle log may be unavailable even when the profile is valid. Read the ranking coverage note, and select a previous group session if one exists. A player absent from a fetched ranking list has an unknown rank, not automatically a low one. Use Standard for detailed percentages, or Game for a compact grid/list and PNG export.'],
                ],
                'source' => ['Ranked Leagues — Supercell Support', 'https://support.supercell.com/clash-of-clans/en/articles/ranked-leagues-4.html'],
                'tool' => 'player',
            ],
            'war-cwl' => [
                'title' => 'CoC War and CWL statistics: stars, destruction and cleanup targets',
                'intro' => 'Use the clan War & CWL tab to inspect a war roster, remaining attacks and cleanup opportunities, then read the result without confusing individual totals with the clan score.',
                'sections' => [
                    ['Read the war state first', 'Preparation, an active battle and a finished war answer different questions. Remaining attacks in an active war represent opportunities, not guaranteed stars. A finished war should be evaluated by the result already achieved. Always check the last update before making roster decisions from a cached view.'],
                    ['Stars and the destruction tiebreak', 'War stars decide the result first; destruction breaks a tie in stars. If both clans reach the maximum stars and full destruction, asking for another star is not a meaningful target. The theoretical star limit is the roster size multiplied by three. Do not add every individual attack together to reconstruct the clan score: attacks may hit the same base.'],
                    ['Find a useful cleanup target', 'Switch the roster to Map or use the target list. Untouched bases and bases with fewer than three stars need different plans. Inspect the best result received by a base together with available attacks and Town Hall context. The map position is illustrative; it is not a reconstruction of an opponent village layout.'],
                    ['Interpret War and CWL history carefully', 'Select the same period when comparing players or clans. Report both the result and sample size, and distinguish a missed attack in a completed war from an attack still available in a live war. ClanIntel can only analyze wars it has archived or received from the API. A private war log or a gap in the archive does not establish that a clan was inactive.'],
                ],
                'source' => ['Intro to Clan Wars — Supercell Support', 'https://support.supercell.com/clash-of-clans/en/articles/about-clan-wars-2.html'],
                'tool' => 'clan',
            ],
            'player-progress' => [
                'title' => 'Check a CoC player profile: hero progress, equipment and rushed indicators',
                'intro' => 'Search a player by tag to explore the army, achievements and progress indicators. Understand which parts of the account the public data actually covers.',
                'sections' => [
                    ['Use the player tag as the identity', 'Names can change or be shared by different players. A tag identifies the account you intend to inspect. After opening a profile, check the name, Town Hall and clan. The clan shown is the current affiliation in the available data, not a permanent record of every clan the player has joined.'],
                    ['Read levels against the appropriate limit', 'A level only becomes useful for progress analysis when its reference limit is known. Players at different Town Hall levels can have different reachable levels. Check whether an item uses a Town Hall limit or an API maximum before comparing percentages. An unknown cap should remain unknown instead of making an item appear fully upgraded.'],
                    ['What a rushed indicator means', 'ClanIntel evaluates the portions of the army covered by its rules and available data. A weak or strong indicator is a signal to inspect relevant heroes, troops, spells and equipment. It is not a complete village audit. The absence of a rushed indicator does not certify that buildings, defenses and walls are maxed, because those levels are not included in this analysis.'],
                    ['Separate current progress from historical progress', 'The profile displays current available levels; the application does not yet maintain daily snapshots of every army item. Activity charts use available clan snapshots, such as trophies and donations. Donation counters can reset, and a missing date means no observation, not zero activity. Compare players within the same category and read the coverage note alongside the score.'],
                ],
                'source' => ['Clash of Clans Developer API', 'https://developer.clashofclans.com/'],
                'tool' => 'player',
            ],
            'clan-capital' => [
                'title' => 'Clan Capital tracker: district levels, snapshots and Raid Weekend statistics',
                'intro' => 'Explore Capital Hall and District Hall levels, then use Raid Weekend statistics to understand recorded participation and loot without overstating what a snapshot represents.',
                'sections' => [
                    ['Capital Hall and district levels', 'Open a clan and select Clan Capital. Each district card identifies the district and its Hall level. Capital Peak uses Capital Hall; other districts use District Hall. A Hall level describes that building, not the completion percentage of every building in the district.'],
                    ['What the change indicator compares', 'The district report compares the available Capital data with an earlier daily clan snapshot. Read the baseline date before interpreting an unchanged level. A district may have received upgrades without its Hall level changing, so an unchanged Hall is not evidence that the clan made no progress.'],
                    ['Check raid coverage and weekend dates', 'Raid reports refer to specific weekends. When comparing players or clans, use a weekend available to both sides and inspect attack counts as well as loot. Loot per attack is affected by the targets and cleanup work; it should not be treated as a complete skill ranking by itself.'],
                    ['What ClanIntel archives', 'Clan snapshots retain the Capital fields supplied by the API when the clan endpoint is accessed. The application keeps up to 120 daily clan snapshots, replacing an earlier observation on the same UTC date. Raid archives are stored separately. Gaps in collection cannot be reconstructed as exact daily activity, and these reports are not a history of every individual Capital building upgrade.'],
                ],
                'source' => ['Clash of Clans Developer API', 'https://developer.clashofclans.com/'],
                'tool' => 'clan',
            ],
        ];
        return [
            'ranked-league' => [
                'title' => 'Panduan Ranked League CoC: battle log, poin trofi dan perubahan liga',
                'intro' => 'Pahami sesi Ranked League di ClanIntel: pilih level liga yang tepat, pisahkan poin serangan dan pertahanan, serta kenali batas informasi yang tersedia.',
                'sections' => [
                    ['Mulai dari sesi yang dipilih', 'Buka profil pemain lalu pilih Ranked League. Periksa tanggal sesi dan level liga sebelum membaca hasilnya. Setelah promosi atau demosi, sesi sebelumnya harus menggunakan level liga historis, bukan badge terbaru pada profil. Jika level tersebut belum dapat dipastikan, ClanIntel menampilkannya sebagai belum tersedia dan tidak menetapkan aturan tanpa bukti.'],
                    ['Poin serangan, pertahanan dan bonus', 'Kartu serangan dan pertahanan menampilkan poin pada setiap battle yang tercatat. Bonus pertahanan dipisahkan karena bukan battle: tidak memiliki lawan, bintang atau persentase destruksi. ClanIntel hanya menampilkan bonus hasil perhitungan pada sesi selesai jika total dan kuotanya tersedia. Perhitungannya mencocokkan trofi resmi dengan poin serangan dan pertahanan yang tercatat; log yang hilang saja bukan bukti adanya bonus.'],
                    ['Bandingkan performa dengan konteks', 'Bintang per serangan dan destruksi serangan menggambarkan sisi menyerang. Bintang lawan dan destruksi yang diterima menggambarkan pertahanan. Lihat jumlah battle di balik rata-rata: dua serangan memberi bukti lebih sedikit daripada satu sesi lengkap. Saat membandingkan pemain, cocokkan tanggal musim dan perhatikan perbedaan aturan liga. Total trofi yang lebih tinggi tidak menjelaskan seluruh aspek performa.'],
                    ['Legend I dan informasi yang belum tersedia', 'Legend I menggunakan konteks leaderboard global. Log battle grup dapat tidak tersedia walaupun profil pemain valid. Baca keterangan cakupan peringkat dan gunakan sesi grup sebelumnya jika tersedia. Pemain yang tidak ditemukan pada daftar peringkat yang diambil memiliki peringkat belum diketahui, bukan otomatis rendah. Gunakan Standar untuk rincian persentase, atau Game untuk tampilan kotak/daftar dan ekspor PNG.'],
                ],
                'source' => ['Ranked Leagues — Supercell Support', 'https://support.supercell.com/clash-of-clans/en/articles/ranked-leagues-4.html'],
                'tool' => 'player',
            ],
            'war-cwl' => [
                'title' => 'Statistik War dan CWL CoC: bintang, destruksi dan target cleanup',
                'intro' => 'Gunakan tab War & CWL untuk memeriksa roster, sisa serangan dan peluang cleanup, lalu baca hasilnya tanpa menyamakan total individu dengan skor klan.',
                'sections' => [
                    ['Periksa status perang terlebih dahulu', 'Persiapan, perang berlangsung dan perang selesai menjawab pertanyaan yang berbeda. Sisa serangan pada perang aktif adalah peluang, bukan jaminan tambahan bintang. Perang yang selesai dinilai dari hasil yang sudah diperoleh. Periksa waktu pembaruan sebelum mengambil keputusan roster dari tampilan tersimpan.'],
                    ['Bintang dan penentu seri melalui destruksi', 'Bintang menentukan hasil terlebih dahulu; destruksi menjadi pembeda ketika bintang sama. Jika kedua klan sudah mencapai bintang maksimal dan destruksi penuh, meminta tambahan bintang tidak lagi menjadi target yang masuk akal. Batas teoretis bintang adalah ukuran roster dikali tiga. Jangan menjumlahkan seluruh serangan individu untuk menghitung skor klan karena beberapa serangan dapat mengenai base yang sama.'],
                    ['Pilih target cleanup yang bermanfaat', 'Gunakan tampilan Peta pada roster atau daftar target. Base yang belum diserang memerlukan rencana berbeda dari base yang belum mendapat tiga bintang. Periksa hasil terbaik yang diterima base, sisa serangan dan konteks Town Hall. Posisi pada peta bersifat ilustratif; bukan rekonstruksi tata letak desa lawan.'],
                    ['Baca riwayat War dan CWL secara hati-hati', 'Pilih periode yang sama ketika membandingkan pemain atau klan. Sertakan hasil beserta jumlah sampelnya, dan bedakan serangan terlewat pada perang selesai dari serangan yang masih tersedia pada perang aktif. ClanIntel hanya menganalisis perang yang diarsipkan atau diperoleh dari API. War log privat atau celah arsip tidak membuktikan bahwa klan tidak aktif.'],
                ],
                'source' => ['Intro to Clan Wars — Supercell Support', 'https://support.supercell.com/clash-of-clans/en/articles/about-clan-wars-2.html'],
                'tool' => 'clan',
            ],
            'player-progress' => [
                'title' => 'Cek profil pemain CoC: progres hero, equipment dan indikator rushed',
                'intro' => 'Cari pemain melalui tag untuk memeriksa Army, pencapaian dan indikator progres. Pahami bagian akun yang benar-benar tercakup dalam data publik.',
                'sections' => [
                    ['Gunakan tag sebagai identitas pemain', 'Nama dapat berubah atau digunakan oleh beberapa pemain. Tag membantu memastikan akun yang diperiksa. Setelah profil terbuka, cocokkan nama, Town Hall dan klannya. Klan pada profil menunjukkan afiliasi dalam data yang tersedia, bukan catatan permanen seluruh klan yang pernah diikuti pemain.'],
                    ['Bandingkan level dengan batas yang sesuai', 'Level bermanfaat untuk analisis progres jika batas acuannya diketahui. Pemain dengan Town Hall berbeda dapat memiliki batas level berbeda. Periksa apakah item memakai batas berdasarkan Town Hall atau maksimum API sebelum membandingkan persentasenya. Batas yang tidak diketahui perlu tetap dinyatakan belum diketahui, bukan membuat item terlihat sudah maksimal.'],
                    ['Arti indikator rushed', 'ClanIntel mengevaluasi bagian Army yang tercakup oleh aturan dan data tersedia. Indikator tersebut menjadi petunjuk untuk memeriksa hero, troop, spell dan equipment terkait, bukan audit lengkap desa. Tidak adanya indikator rushed tidak membuktikan bangunan, pertahanan dan tembok sudah maksimal karena levelnya tidak tercakup dalam analisis ini.'],
                    ['Pisahkan progres terkini dan historis', 'Profil menampilkan level yang tersedia saat ini; aplikasi belum menyimpan snapshot harian seluruh item Army. Grafik aktivitas menggunakan snapshot klan yang tersedia, misalnya trofi dan donasi. Penghitung donasi dapat direset, sedangkan tanggal yang tidak tercatat berarti tidak ada pengamatan, bukan aktivitas nol. Bandingkan pemain pada kategori yang sama dan baca cakupan data bersama skor progresnya.'],
                ],
                'source' => ['Clash of Clans Developer API', 'https://developer.clashofclans.com/'],
                'tool' => 'player',
            ],
            'clan-capital' => [
                'title' => 'Pelacak Clan Capital: level distrik, snapshot dan statistik Raid Weekend',
                'intro' => 'Periksa level Capital Hall dan District Hall, lalu gunakan statistik Raid Weekend untuk memahami partisipasi dan loot yang tercatat sesuai batas datanya.',
                'sections' => [
                    ['Capital Hall dan level distrik', 'Buka klan lalu pilih Clan Capital. Setiap kartu menampilkan nama distrik beserta level Hall. Capital Peak menggunakan Capital Hall, sedangkan distrik lainnya menggunakan District Hall. Level Hall menjelaskan bangunan tersebut, bukan persentase penyelesaian semua bangunan di distrik.'],
                    ['Apa yang dibandingkan oleh indikator perubahan', 'Laporan distrik membandingkan data Capital yang tersedia dengan snapshot klan harian sebelumnya. Periksa tanggal pembanding sebelum menafsirkan level yang tetap. Distrik dapat menerima upgrade tanpa perubahan level Hall, sehingga Hall yang tetap tidak membuktikan bahwa klan tidak berkembang.'],
                    ['Periksa cakupan dan tanggal raid', 'Laporan raid mengacu pada weekend tertentu. Saat membandingkan pemain atau klan, pilih weekend yang tersedia bagi kedua sisi dan periksa jumlah serangan bersama loot. Loot per serangan dipengaruhi target serta pekerjaan cleanup; angka ini saja bukan penilaian lengkap keterampilan pemain.'],
                    ['Data yang diarsipkan ClanIntel', 'Snapshot klan menyimpan field Capital dari API saat endpoint klan diakses. Aplikasi mempertahankan maksimal 120 snapshot harian dan mengganti pengamatan sebelumnya pada tanggal UTC yang sama. Arsip raid disimpan terpisah. Celah pengambilan tidak dapat direkonstruksi sebagai aktivitas harian yang tepat, dan laporan ini bukan riwayat upgrade setiap bangunan Capital.'],
                ],
                'source' => ['Clash of Clans Developer API', 'https://developer.clashofclans.com/'],
                'tool' => 'clan',
            ],
        ];
    }
}
