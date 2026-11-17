<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
require dirname(__DIR__).'/vendor/autoload.php';
use CocTracker\ZapquakeDataset as D;
use CocTracker\ZapquakeTh19;
$options=getopt('',['publish','output-dir:','report-dir:']);
try{
    $root=dirname(__DIR__);$public=$root.'/public/assets/data/zapquake';
    $body=(string)file_get_contents($public.'/2026-11-04.5/dataset.json');
    if(hash('sha256',$body)!=='bebd8dc95c47bbf124133915608d90b41e66afd35b82c8d173f4e0a6d143e1a8')throw new RuntimeException('Baseline checksum mismatch.');
    $before=D::decode($body);$after=ZapquakeTh19::apply($before);
    $reports=$options['report-dir']??$root.'/audits/th19/zapquake';
    D::atomic($reports.'/changes.json',D::json(D::diff($before,$after)));
    D::atomic($reports.'/coverage.json',D::json($after['coverage']['th19']));
    if(isset($options['publish']))D::publish($options['output-dir']??$public,['dataset'=>$after,'license'=>(string)file_get_contents($public.'/2026-11-04.5/LICENSE.txt')]);
    echo (isset($options['publish'])?'Published ':'Previewed ').$after['dataVersion']."; verified TH19 targets only.\n";
}catch(Throwable $e){fwrite(STDERR,$e->getMessage()."\n");exit(1);}
