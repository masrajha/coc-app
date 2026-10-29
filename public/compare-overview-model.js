(function(root,factory){
  if(typeof module!=='undefined'&&module.exports)module.exports=factory(require('./compare-model.js'));
  else root.CompareOverviewModel=factory(root.CompareModel);
})(typeof window!=='undefined'?window:globalThis,model=>{
  const numeric=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
  function build(context){
    const profiles=context.profiles||{},performances=context.performances||{},league=context.league||{};
    const sides=['left','right'];
    const progress={comparable:model.comparableProgress(profiles.left,profiles.right),categories:model.progressCategorySummary(profiles.left,profiles.right),values:{}};
    for(const side of sides)progress.values[side]={score:numeric(profiles[side]?.progress?.score?.overall),th:numeric(profiles[side]?.player?.townHallLevel)};
    const rows=model.combineWars(performances.left,performances.right,context.warPeriod||'cwl-current',context.now||new Date()).map(row=>({...row,type:'combined'}));
    const war={values:{},partial:false};
    for(const side of sides){
      war.values[side]=performances[side]?model.warSummary(rows,side,'combined'):null;
      if(!war.values[side]||war.values[side].attacks<5)war.partial=true;
    }
    const ranked={sameSeason:model.sameLeagueSeason(league.left,league.right),values:{},partial:false};
    for(const side of sides){
      ranked.values[side]=league[side]?model.leagueSummary(league[side]):null;
      const sample=ranked.values[side];
      if(!sample||!sample.attack.pointDataComplete||!sample.defense.totalComplete||sample.stale)ranked.partial=true;
    }
    const shared=model.filterSnapshots(model.sharedSnapshots(performances.left,performances.right),context.activityPeriod||'30');
    const key=context.activityMetric==='donations'?'donations':'trophies';
    const activity={metric:key,count:shared.length,from:shared[0]?.date||null,to:shared.at(-1)?.date||null,values:{},partial:shared.length<2};
    for(const side of sides){
      const valid=shared.length>=2&&shared.every(point=>numeric(point[side]?.[key])!==null);
      const reset=key==='donations'&&valid&&shared.some((point,index)=>index>0&&Number(point[side][key])<Number(shared[index-1][side][key]));
      activity.values[side]={delta:valid&&!reset?Number(shared.at(-1)[side][key])-Number(shared[0][side][key]):null,reset};
      if(!valid||reset)activity.partial=true;
    }
    return {progress,war,ranked,activity};
  }
  return {build};
});
