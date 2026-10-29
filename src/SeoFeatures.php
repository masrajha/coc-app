<?php
declare(strict_types=1);
namespace CocTracker;

/** Product explanations, distinct from the statistical interpretation guides. */
final class SeoFeatures
{
    public const UPDATED = '2026-10-29';

    public static function all(string $lang): array
    {
        if ($lang === 'en') return [
            'player-comparison' => [
                'title'=>'CoC player comparison: progress, War/CWL and Ranked League',
                'intro'=>'Compare two Clash of Clans players with Town Hall context, army progress, War/CWL performance and Ranked League battle logs in ClanIntel.',
                'icon'=>'icon-swords.webp', 'tool'=>'compare', 'cta'=>'Compare two players', 'guide'=>'player-progress',
                'sections'=>[
                    ['Compare more than trophy totals','Place two player tags side by side to inspect heroes, troops, spells, pets and equipment. Switch between actual levels and progress against the available level cap. Filters help isolate differences instead of making you scan every item. Town Hall context matters: a lower absolute hero level may still represent stronger progress against that player’s reachable maximum. Unknown limits remain unavailable rather than being treated as maxed.'],
                    ['Evaluate War/CWL performance with its sample','Read stars, destruction and recorded participation within the same period. Use the number of available wars and attacks to judge how much evidence supports an average. This helps a clan leader review roster choices or a player compare recent performance. ClanIntel can only evaluate wars available through the API or its own archive; missing observations do not establish inactivity.'],
                    ['Compare Ranked League offense and defense','Select each player’s session to compare attack and defense points, stars and destruction. Comparison indicators require the same Ranked League season, even across different groups or tiers. League tiers and battle quotas remain visible because totals alone can hide those differences. For Legend I, an available previous group session can provide battle-log context alongside the current global-leaderboard information.'],
                    ['Share a game-style comparison image','Open Comparison image in the Ranked League tab, choose Attacks, Defenses or Full log, and generate a PNG. Both sides use the same log order and six cards per row. Destruction percentages, session dates and defense bonuses remain visible. Native image sharing depends on browser support; PNG download is the alternative. Cards aligned across players represent log order, not direct duels.'],
                ],
                'steps'=>['Choose Compare Player on the home page and enter two player tags.','Review Town Hall and data coverage, then open Army, War/CWL or Ranked League.','Match the periods or sessions before interpreting differences; open Comparison image to export battle logs.'],
            ],
            'ranked-battle-log' => [
                'title'=>'CoC Ranked Battle Log: attack and defense trophies, stars and PNG sharing',
                'intro'=>'Check Clash of Clans Ranked League attack and defense logs, destruction percentages and trophy points. View game-style cards and share a PNG with ClanIntel.',
                'icon'=>'icon-trophy.webp', 'tool'=>'player', 'cta'=>'Find a player’s battle log', 'guide'=>'ranked-league',
                'sections'=>[
                    ['Read attack and defense results separately','Open a player profile and select Ranked League to see the available session. Attack and defense cards show recorded stars, destruction and trophy points, with opponent and time details when supplied. Choose Oldest or Latest, or filter by result. Keep the battle count beside averages: a short sample gives a different picture from a completed session.'],
                    ['Understand defense bonuses and session totals','For completed sessions, ClanIntel can display separate defense-bonus cards when the battle quota, official total and logs support the calculation. Those cards are not battles and have no opponent, stars or destruction. An ongoing session does not receive a calculated end-of-session bonus. Missing or inconsistent data stays marked as incomplete instead of becoming an invented result.'],
                    ['Use historical league context after promotion or demotion','A previous session must be read using its historical league tier and rules when these can be established. For Legend I, current group logs may be unavailable because its ranking uses a global context. An available previous group session can still be inspected. Not finding a player in a fetched ranking list means the rank is unknown within that coverage, not that the player has zero trophies.'],
                    ['Switch to game view and export an image','Game view presents compact cards with gold three-star attacks, pink three-star defenses and distinct bonus cards. Generate a PNG of that view for download or supported native sharing. On the player-comparison page, Comparison image places both players’ logs side by side. Different sessions and tiers are identified, and the image follows the data selected on the page.'],
                ],
                'steps'=>['Find a player by tag and open Ranked League.','Choose an available session and inspect attacks, defenses and data coverage.','Select Game view to export one player, or compare two players and open Comparison image.'],
            ],
            'war-cwl-analysis' => [
                'title'=>'CoC War and CWL analysis: player performance, roster and cleanup',
                'intro'=>'Review Clash of Clans War/CWL performance, remaining attacks, roster coverage and cleanup targets. Use ClanIntel to evaluate recorded results with context.',
                'icon'=>'icon-shield.webp', 'tool'=>'clan', 'cta'=>'Open a clan’s War/CWL dashboard', 'guide'=>'war-cwl',
                'sections'=>[
                    ['Follow the war from score to available attacks','The clan War & CWL tab brings together the score, destruction, war phase and remaining attack quota. Check whether the war is in preparation, active or finished before making decisions. The result message accounts for the maximum possible score: once all stars are secured, it should not ask the clan to earn another star that cannot exist.'],
                    ['Inspect the roster and find cleanup opportunities','Use the roster, target list and two-sided war map to inspect bases and recorded attacks. A base with two stars calls for a different cleanup decision from an untouched base. Available attacks and Town Hall context help explain the remaining opportunities. Map positions are illustrative; this is an analysis of API results, not a reconstruction of the village layout or an attack replay.'],
                    ['Review player performance across War and CWL','Player profiles and player comparison bring recorded stars, destruction and participation together. Choose a shared period and read the sample-size indicator before drawing conclusions from an average. A missed attack in a finished war should be distinguished from an attack still available in a live war. These reports support roster review without reducing every decision to a single trophy total.'],
                    ['Keep archive coverage visible','Classic war history depends on the clan’s public war log and available API data; detailed performance depends on wars ClanIntel has observed or archived. Private logs and collection gaps limit what can be shown. Snapshot dates and last-update times help distinguish current information from saved observations. Unknown data is left unknown rather than presented as zero participation.'],
                ],
                'steps'=>['Find a clan by tag or name and open War & CWL.','Read the war phase, score and remaining attacks, then inspect the roster, map and cleanup targets.','Open player performance or Compare Player, select a shared period and check archive coverage.'],
            ],
        ];
        return [
            'player-comparison' => [
                'title'=>'Bandingkan pemain CoC: progres, performa War/CWL dan Ranked League',
                'intro'=>'Bandingkan dua pemain Clash of Clans dengan konteks Town Hall, progres Army, performa War/CWL, dan battle log Ranked League di ClanIntel.',
                'icon'=>'icon-swords.webp', 'tool'=>'compare', 'cta'=>'Bandingkan dua pemain', 'guide'=>'player-progress',
                'sections'=>[
                    ['Bandingkan lebih dari jumlah trofi','Masukkan dua tag pemain untuk melihat hero, pasukan, spell, pet, dan equipment berdampingan. Gunakan level aktual atau progres terhadap batas level yang tersedia, lalu saring item yang berbeda. Konteks Town Hall membantu membaca perbandingan dengan tepat: level hero yang lebih rendah belum tentu memiliki progres lebih buruk terhadap maksimum yang dapat dicapai pemain tersebut. Batas level yang belum diketahui tetap ditandai tidak tersedia.'],
                    ['Nilai performa War/CWL bersama jumlah sampelnya','Baca bintang, destruksi, dan partisipasi tercatat dalam periode yang sama. Jumlah perang dan serangan membantu menilai seberapa kuat bukti di balik rata-rata. Ini berguna untuk evaluasi roster oleh pengurus klan maupun perbandingan performa pribadi. ClanIntel hanya dapat mengevaluasi perang yang tersedia dari API atau arsipnya; tanggal yang tidak tercatat bukan bukti bahwa pemain tidak aktif.'],
                    ['Bandingkan serangan dan pertahanan Ranked League','Pilih sesi masing-masing pemain untuk membandingkan poin attack/defense, bintang, dan destruksi. Tanda perbandingan mensyaratkan musim Ranked League yang sama, meskipun grup atau level liganya berbeda. Level liga dan kuota battle tetap perlu diperhatikan karena total poin saja dapat menyamarkan perbedaannya. Untuk Legend I, sesi grup sebelumnya yang tersedia dapat melengkapi informasi peringkat global saat ini.'],
                    ['Bagikan gambar perbandingan bergaya game','Buka Gambar perbandingan pada tab Ranked League, pilih Attacks, Defenses, atau Lengkap, lalu buat PNG. Kedua sisi menggunakan urutan log yang sama dan enam kartu per baris. Persentase destruksi, tanggal sesi, dan bonus pertahanan tetap terlihat. Fitur bagikan gambar mengikuti dukungan browser; unduh PNG menjadi alternatifnya. Kartu yang sejajar menunjukkan urutan log, bukan duel langsung antarpemain.'],
                ],
                'steps'=>['Pilih Compare Player di halaman utama dan masukkan dua tag pemain.','Periksa Town Hall dan cakupan data, lalu buka Army, Performa War/CWL, atau Ranked League.','Samakan periode atau sesi sebelum menilai perbedaan; buka Gambar perbandingan untuk mengekspor battle log.'],
            ],
            'ranked-battle-log' => [
                'title'=>'Ranked Battle Log CoC: trofi attack/defense, bintang dan berbagi PNG',
                'intro'=>'Cek battle log Ranked League Clash of Clans, persentase destruksi, dan poin trofi serangan/pertahanan. Lihat kartu bergaya game dan bagikan PNG lewat ClanIntel.',
                'icon'=>'icon-trophy.webp', 'tool'=>'player', 'cta'=>'Cari battle log pemain', 'guide'=>'ranked-league',
                'sections'=>[
                    ['Baca hasil serangan dan pertahanan secara terpisah','Buka profil pemain dan pilih Ranked League untuk melihat sesi yang tersedia. Kartu attack dan defense menampilkan bintang, destruksi, serta poin trofi yang tercatat, disertai lawan dan waktu jika disediakan. Gunakan urutan Terlama atau Terbaru, atau saring berdasarkan hasil. Perhatikan jumlah battle di balik rata-rata: sampel singkat memberikan gambaran berbeda dari sesi yang telah selesai.'],
                    ['Pahami bonus pertahanan dan total sesi','Pada sesi selesai, ClanIntel dapat menampilkan kotak bonus pertahanan terpisah jika kuota battle, total resmi, dan log mendukung perhitungannya. Kotak ini bukan battle dan tidak memiliki lawan, bintang, maupun destruksi. Sesi berjalan tidak diberi bonus akhir sesi hasil perhitungan. Data yang hilang atau tidak konsisten tetap ditandai belum lengkap, bukan diubah menjadi hasil rekaan.'],
                    ['Gunakan konteks liga historis setelah promosi atau demosi','Sesi sebelumnya perlu dibaca menggunakan level liga dan aturan historisnya jika dapat dipastikan. Pada Legend I, log grup saat ini dapat tidak tersedia karena peringkat menggunakan konteks global. Sesi grup sebelumnya yang tersedia masih dapat diperiksa. Pemain yang tidak ditemukan dalam daftar peringkat yang diambil memiliki peringkat belum diketahui dalam cakupan tersebut, bukan otomatis bertrofi nol.'],
                    ['Gunakan mode game dan ekspor gambar','Mode game menyajikan kartu ringkas: gold untuk attack tiga bintang, pink untuk defense tiga bintang, dan warna tersendiri untuk bonus. Buat PNG dari tampilan itu untuk diunduh atau dibagikan melalui browser yang mendukung. Pada halaman compare pemain, Gambar perbandingan menempatkan log kedua pemain berdampingan. Perbedaan sesi dan liga dijelaskan, dan gambar mengikuti data yang dipilih pada halaman.'],
                ],
                'steps'=>['Cari pemain berdasarkan tag, lalu buka Ranked League.','Pilih sesi yang tersedia dan periksa serangan, pertahanan, serta cakupan datanya.','Pilih tampilan Game untuk satu pemain, atau bandingkan dua pemain dan buka Gambar perbandingan.'],
            ],
            'war-cwl-analysis' => [
                'title'=>'Analisis War dan CWL CoC: performa pemain, roster dan cleanup',
                'intro'=>'Periksa performa War/CWL Clash of Clans, sisa serangan, cakupan roster, dan target cleanup. Gunakan ClanIntel untuk mengevaluasi hasil tercatat dengan konteks.',
                'icon'=>'icon-shield.webp', 'tool'=>'clan', 'cta'=>'Buka dashboard War/CWL klan', 'guide'=>'war-cwl',
                'sections'=>[
                    ['Pantau perang dari skor hingga sisa serangan','Tab War & CWL klan menggabungkan skor, destruksi, fase perang, dan sisa kuota serangan. Periksa apakah perang masih persiapan, berlangsung, atau selesai sebelum mengambil keputusan. Pesan hasil memperhitungkan skor maksimal: ketika seluruh bintang sudah diamankan, klan tidak lagi diminta mengejar tambahan bintang yang memang tidak tersedia.'],
                    ['Periksa roster dan temukan peluang cleanup','Gunakan roster, daftar target, dan peta perang dua sisi untuk melihat base serta serangan yang tercatat. Base dua bintang memerlukan keputusan cleanup berbeda dari base yang belum diserang. Sisa serangan dan konteks Town Hall membantu menjelaskan peluang yang tersedia. Posisi peta bersifat ilustratif; fitur ini menganalisis hasil API, bukan merekonstruksi layout desa atau menayangkan replay serangan.'],
                    ['Evaluasi performa pemain pada War dan CWL','Profil dan compare pemain menggabungkan bintang, destruksi, serta partisipasi tercatat. Pilih periode yang sama dan baca indikator jumlah sampel sebelum menarik kesimpulan dari rata-rata. Serangan yang terlewat pada perang selesai perlu dibedakan dari serangan yang masih tersedia pada perang aktif. Laporan ini membantu evaluasi roster dengan lebih banyak konteks daripada jumlah trofi saja.'],
                    ['Tetap perhatikan cakupan arsip','Riwayat perang klasik bergantung pada war log publik klan dan data API yang tersedia; performa terperinci bergantung pada perang yang telah diamati atau diarsipkan ClanIntel. Log privat dan jeda pengumpulan membatasi informasi yang dapat ditampilkan. Tanggal snapshot serta waktu pembaruan membantu membedakan kondisi terbaru dari pengamatan tersimpan. Data yang belum diketahui tidak disajikan sebagai partisipasi nol.'],
                ],
                'steps'=>['Cari klan berdasarkan tag atau nama, lalu buka War & CWL.','Baca fase perang, skor, dan sisa serangan; lanjutkan ke roster, peta, serta target cleanup.','Buka performa pemain atau Compare Player, pilih periode yang sama, dan periksa cakupan arsip.'],
            ],
        ];
    }
}
