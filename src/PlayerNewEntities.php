<?php
declare(strict_types=1);
namespace CocTracker;

/** Optional API containers are reported conservatively; reference unlocks are not ownership. */
final class PlayerNewEntities
{
    public static function metadata(): array
    {
        static $cached=null; if($cached!==null)return $cached;
        $path=dirname(__DIR__).'/public/assets/data/game-features/2026-11-17.1/features.json';
        $data=json_decode((string)@file_get_contents($path),true);
        return $cached=is_array($data) && ($data['schemaVersion']??null)===1 ? $data : [];
    }

    public static function separateKind(string $name): ?string
    {
        $data=self::metadata();
        if(in_array($name,array_column($data['squads']??[],'name'),true))return 'squads';
        if(in_array($name,$data['guardianNames']??[],true))return 'guardians';
        return null;
    }

    private static function reported(array $player,string $field): array
    {
        $present=array_key_exists($field,$player);$raw=$player[$field]??null;
        $invalid=$present&&!is_array($raw)?1:0;$items=[];
        foreach(is_array($raw)?$raw:[] as $item){
            if(!is_array($item)||!is_string($item['name']??null)||trim($item['name'])===''||!is_int($item['level']??null)||$item['level']<0||$item['level']>300){$invalid++;continue;}
            $items[$item['name']]=['name'=>$item['name'],'level'=>$item['level'],'sourceField'=>$field];
        }
        foreach($player['troops']??[] as $item){
            if(is_array($item)&&self::separateKind((string)($item['name']??''))===$field&&is_int($item['level']??null)&&$item['level']>=0&&$item['level']<=300){
                $present=true;$items[$item['name']]=['name'=>$item['name'],'level'=>$item['level'],'sourceField'=>'troops'];
            }
        }
        return ['status'=>!$present?'unavailable':($invalid?'partial':'reported'),'items'=>array_values($items),'unrecognizedItems'=>$invalid,'apiContractVerified'=>false];
    }

    public static function profile(array $player): array
    {
        $data=self::metadata();
        $th=(int)($player['townHallLevel']??0);
        $troops=array_column($player['troops']??[],null,'name');
        $squads=[];
        foreach($data['squads']??[] as $squad){
            if($squad['unlockTownHall']>$th)continue;
            foreach($squad['composition'] as &$member){
                $level=$troops[$member['name']]['level']??null;
                $member['reportedTroopLevel']=is_int($level)&&$level>0?$level:null;
            }
            unset($member);$squads[]=$squad;
        }
        $selected=$player['townHallTroop']??null;
        $selection=is_array($selected)&&in_array($selected['name']??null,array_column($data['townHallTroops']['options']??[],'name'),true)
            ? ['name'=>$selected['name'],'level'=>is_int($selected['level']??null)?$selected['level']:null] : null;
        return ['dataVersion'=>$data['dataVersion']??null,'source'=>$data['source']??null,
            'squads'=>self::reported($player,'squads')+['reference'=>$squads],
            'guardians'=>self::reported($player,'guardians'),
            'guardianShrine'=>$data['guardianShrine']??[],
            'townHallTroops'=>['status'=>$selection?'reported':(array_key_exists('townHallTroop',$player)?'partial':'unavailable'),'selection'=>$selection,'apiContractVerified'=>false]+($data['townHallTroops']??[]),
            'heroicSpell'=>$data['heroicSpell']??[]];
    }
}
