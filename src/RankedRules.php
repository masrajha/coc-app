<?php
declare(strict_types=1);
namespace CocTracker;

final class RankedRules
{
    public const EFFECTIVE_DATE='2026-11-16';
    /** Official local divisions mapped to the API's cumulative division numbers. */
    private const CHANGES=[
        'Archer League 8'=>[40,10],'Archer League 9'=>[40,10],
        'Wizard League 11'=>[40,15],'Wizard League 12'=>[35,15],
        'Valkyrie League 13'=>[30,15],'Valkyrie League 14'=>[40,15],'Valkyrie League 15'=>[35,15],
        'Witch League 16'=>[30,15],'Witch League 17'=>[40,15],'Witch League 18'=>[35,15],
        'Golem League 19'=>[30,15],'Golem League 20'=>[35,20],'Golem League 21'=>[30,20],
        'P.E.K.K.A League 22'=>[30,20],'P.E.K.K.A League 23'=>[35,20],'P.E.K.K.A League 24'=>[30,20],
        'Titan League 25'=>[25,20],'Titan League 26'=>[35,20],'Titan League 27'=>[30,20],
        'Dragon League 28'=>[25,20],'Dragon League 29'=>[20,20],'Dragon League 30'=>[20,20],
        'Electro League 31'=>[20,20],'Electro League 32'=>[20,20],
    ];
    public static function resolve(string $canonicalTier,array $legacy,?int $seasonId):array
    {
        // The official rollout date is a calendar date, not a guessed exact timestamp.
        // Never choose the latest rule by today's date for an archived season.
        $updated=$seasonId!==null && $seasonId>0 && gmdate('Y-m-d',$seasonId)>=self::EFFECTIVE_DATE;
        $rule=$legacy;
        if($updated && isset(self::CHANGES[$canonicalTier]))[$rule['promoted'],$rule['demoted']]=self::CHANGES[$canonicalTier];
        return $rule+['version'=>$updated?'2026-11-16':'legacy-2026-10',
            'effectiveDate'=>$updated?self::EFFECTIVE_DATE:null,'seasonId'=>$seasonId,
            'source'=>$updated?ZapquakeTh19::SOURCE:null,'dateBasis'=>'official-rollout-calendar-date'];
    }
}
