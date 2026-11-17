<?php
declare(strict_types=1);
namespace CocTracker;

/** Selective official overlay; never fills missing HP or damage by interpolation. */
final class ZapquakeTh19
{
    public const SOURCE = 'https://supercell.com/en/games/clashofclans/blog/release-notes/the-clash-of-titans-update-is-rolling-out/';
    public const VERSION = '2026-11-17.3';
    public static function apply(array $before): array
    {
        if (($before['dataVersion'] ?? '') !== '2026-11-04.5') throw new \RuntimeException('Unexpected pre-TH19 baseline.');
        $data=$before;
        $data['dataVersion']=self::VERSION;$data['normalizerVersion']='1.4.0';$data['reviewedAt']='2026-11-17';
        $data['maxTownHall']=19;
        $data['overlays']=['th19'=>['source'=>self::SOURCE,'effectiveDate'=>'2026-11-16','dateBasis'=>'Announced rollout date, not article publication timestamp.', 'reviewedAt'=>'2026-11-17']];
        $removed=['air-defense','hidden-tesla','x-bow','multi-archer-tower','multi-gear-tower','ricochet-cannon','builders-hut'];
        foreach($data['buildings'] as &$item){
            // Unknown counts are not zero and are not copied from TH18.
            $item['availablePerTownHall'][]=['townHallLevel'=>19,'count'=>null,'status'=>'unverified'];
            if(in_array($item['id'],$removed,true)){$item['historicalSupercharges']=$item['supercharges'];$item['supercharges']=[];}
            if($item['id']==='air-defense'){
                $row=&$item['levels'][15];
                $row['historicalHitpoints']=[['before'=>'2026-11-16','hitpoints'=>$row['hitpoints']]];
                $row['hitpoints']=2050;$row['hitpointSource']=self::SOURCE;
                unset($row);
            }
        }
        unset($item);
        foreach(['spiky-tower'=>['Spiky Tower',[5959,6363]],'firecracker-tower'=>['Firecracker Tower',[6500,6700]]] as $id=>[$name,$hp]){
            $data['buildings'][]=['id'=>$id,'dataId'=>null,'name'=>$name,'sourceFile'=>null,'sourceUrl'=>self::SOURCE,
                'category'=>'defense','availableFrom'=>'2026-11-16','spellEquipmentTargetVerified'=>true,
                'levels'=>[['level'=>1,'townHallRequired'=>19,'hitpoints'=>$hp[0]],['level'=>2,'townHallRequired'=>19,'hitpoints'=>$hp[1]]],
                'availablePerTownHall'=>[['townHallLevel'=>19,'count'=>2]],'supercharges'=>[]];
        }
        $data['coverage']['th19']=['supportedTargets'=>['spiky-tower','firecracker-tower'],
            'missing'=>['Town Hall 19 HP','New hero level HP','Lightning 14 damage','Other new target levels and TH19 counts','TH19 equipment/hero loadout bounds'],
            'equipmentPresetVerified'=>false,'source'=>self::SOURCE];
        ZapquakeDataset::validate($data);
        return $data;
    }
}
