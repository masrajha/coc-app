<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require dirname(__DIR__).'/vendor/autoload.php';

use CocTracker\ZapquakeDataset as Dataset;
use GuzzleHttp\Client;

$root = dirname(__DIR__);
$options = getopt('', ['help','download','publish','lock:','source-dir:','output-dir:','report-dir:','activate:']);
if (isset($options['help'])) {
    echo "php scripts/prepare-zapquake-data.php [--download] [--publish]\n"
        ."  --lock=FILE        Default: scripts/zapquake/source-lock.json\n"
        ."  --source-dir=DIR   Default: data/zapquake-source\n"
        ."  --report-dir=DIR   Default: data/zapquake-reports\n"
        ."  --output-dir=DIR   Default: public/assets/data/zapquake\n"
        ."  --activate=VERSION Re-activate a previously published immutable dataset\n"
        ."Without --publish, only validate and write a preview/change report. No .env or player API is used.\n";
    exit;
}
try {
    $source = $options['source-dir'] ?? $root.'/data/zapquake-source';
    $output = $options['output-dir'] ?? $root.'/public/assets/data/zapquake';
    $reports = $options['report-dir'] ?? $root.'/data/zapquake-reports';
    if (isset($options['activate'])) {
        $version = $options['activate'];
        if (!preg_match('/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/', $version) || isset($options['download']) || isset($options['publish'])) throw new RuntimeException('Invalid activation options.');
        $bundle = ['dataset'=>Dataset::decode((string)file_get_contents($output.'/'.$version.'/dataset.json')),
            'license'=>(string)file_get_contents($output.'/'.$version.'/LICENSE.txt')];
        if ($bundle['dataset']['dataVersion'] !== $version) throw new RuntimeException('Release identity mismatch.');
        Dataset::publish($output, $bundle);
        echo 'Activated '.$version."\n"; exit;
    }
    $lock = Dataset::lock($options['lock'] ?? __DIR__.'/zapquake/source-lock.json');
    if (isset($options['download'])) {
        $client = new Client(['timeout'=>15, 'connect_timeout'=>5, 'allow_redirects'=>false, 'http_errors'=>false]);
        $downloaded = Dataset::download($lock, $source, static function(string $url) use ($client): string {
            $response = $client->get($url, ['stream'=>true, 'headers'=>['User-Agent'=>'ClanIntel dataset importer']]);
            if ($response->getStatusCode() !== 200) throw new RuntimeException('Source download failed: HTTP '.$response->getStatusCode());
            $stream = $response->getBody(); $body = '';
            while (!$stream->eof()) {
                $body .= $stream->read(8192);
                if (strlen($body) > 2097152) throw new RuntimeException('Source file exceeds size limit.');
            }
            return $body;
        });
        echo 'Downloaded '.$downloaded." locked files.\n";
    }
    $bundle = Dataset::build($lock, $source); $before = null;
    if (is_file($output.'/manifest.json')) {
        $manifest = Dataset::decode((string)file_get_contents($output.'/manifest.json'));
        if (!preg_match('~^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}/dataset\.json$~', $manifest['dataset'] ?? '')) throw new RuntimeException('Invalid active manifest.');
        $body = (string)file_get_contents($output.'/'.$manifest['dataset']);
        if (!hash_equals($manifest['sha256'] ?? '', hash('sha256', $body))) throw new RuntimeException('Active dataset checksum mismatch.');
        $before = Dataset::decode($body); Dataset::validate($before);
    }
    $diff = Dataset::diff($before, $bundle['dataset']);
    Dataset::atomic($reports.'/dataset.preview.json', Dataset::json($bundle['dataset']));
    Dataset::atomic($reports.'/changes.json', Dataset::json($diff));
    $availabilityConflicts=[];
    foreach ($bundle['dataset']['buildings'] as $building) foreach ($building['availablePerTownHall'] as $availability) {
        $count=$availability['countAfterMerges'] ?? $availability['count'];$th=$availability['townHallLevel'];
        if ($count>0 && !array_filter($building['levels'],static fn(array $row):bool=>$row['townHallRequired']<=$th))
            $availabilityConflicts[]=['target'=>$building['id'],'townHall'=>$th,'sourceCount'=>$count,'resolution'=>'hidden-no-eligible-level'];
    }
    Dataset::atomic($reports.'/audit.json', Dataset::json([
        'sourceRevision'=>$lock['revision'], 'dataVersion'=>$lock['dataVersion'], 'sourceFiles'=>count($lock['files']),
        'buildings'=>count($bundle['dataset']['buildings']), 'spells'=>count($bundle['dataset']['spells']),
        'heroes'=>count($bundle['dataset']['heroes'] ?? []),
        'equipment'=>count($bundle['dataset']['equipment'] ?? []),
        'heroLevels'=>array_sum(array_map(static fn(array $item): int=>count($item['levels']), $bundle['dataset']['heroes'] ?? [])),
        'normalBuildingLevels'=>array_sum(array_map(static fn(array $item): int=>count($item['levels']), $bundle['dataset']['buildings'])),
        'superchargeRows'=>array_sum(array_map(static fn(array $item): int=>count($item['supercharges']), $bundle['dataset']['buildings'])),
        'availabilityConflicts'=>$availabilityConflicts,
        'changes'=>count($diff['changes']), 'calculationReady'=>false,
        'pending'=>['Internal game rounding','Automatic supercharge binding','Automatic seasonal Hero Bell bonuses','Full combat movement and target healing dynamics'],
    ]));
    if (isset($options['publish'])) Dataset::publish($output, $bundle);
    echo (isset($options['publish']) ? 'Published ' : 'Validated preview ').$lock['dataVersion'].'; '
        .count($bundle['dataset']['buildings']).' buildings, '.count($bundle['dataset']['heroes'] ?? []).' heroes, '.count($bundle['dataset']['equipment'] ?? []).' equipment, '.count($bundle['dataset']['spells']).' spells, '.count($diff['changes'])." changes.\n";
    echo 'Reports: '.$reports."\nReference statistics only; battle profiles are supplied separately by the calculator engine.\n";
} catch (Throwable $error) {
    fwrite(STDERR, 'Zapquake import failed: '.$error->getMessage()."\n"); exit(1);
}
