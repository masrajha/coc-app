(function(root){
  const numeric=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
  function time(value){
    if(value==null)return null;
    if(typeof value==='number')return value<1e12?value*1000:value;
    const text=String(value),compact=text.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d{3})Z$/);
    const result=Date.parse(compact?`${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6]}.${compact[7]}Z`:text);
    return Number.isFinite(result)?result:null;
  }
  function prepare(data,order='oldest'){
    const sides={};let partial=false;
    for(const side of ['attack','defense']){
      const raw=Array.isArray(data?.[side]?.logs)?data[side].logs.filter(log=>log&&typeof log==='object'):[];
      const ordinary=raw.map((log,index)=>({...log,side,index:index+1,bonus:false,points:numeric(log.trophies),
        stars:Number.isInteger(numeric(log.stars))&&numeric(log.stars)>=0&&numeric(log.stars)<=3?numeric(log.stars):null,
        destruction:numeric(log.destructionPercentage),time:time(log.timestamp)}));
      ordinary.sort((a,b)=>a.time===null&&b.time===null?a.index-b.index:a.time===null?1:b.time===null?-1:(a.time-b.time)*(order==='latest'?-1:1));
      const bonuses=side==='defense'&&data?.session?.id==='previous'&&Array.isArray(data?.defense?.bonusLogs)
        ?data.defense.bonusLogs.filter(log=>log&&typeof log==='object').map(log=>({...log,side,bonus:true,points:numeric(log.trophies),stars:null,destruction:null})):[];
      const records=[...ordinary,...bonuses],count=numeric(data?.player?.[side+'Count']);
      const pointsKnown=records.every(log=>log.points!==null);
      const complete=count!==null&&count===ordinary.length;
      const points=pointsKnown&&(ordinary.length>0||count===0)&&!(count!==null&&count>ordinary.length)
        ?records.reduce((sum,log)=>sum+log.points,0):null;
      if(!complete||!pointsKnown)partial=true;
      sides[side]={logs:records,points,count:ordinary.length,bonusCount:bonuses.length};
    }
    const official=numeric(data?.player?.trophies);
    const sum=sides.attack.points!==null&&sides.defense.points!==null?sides.attack.points+sides.defense.points:null;
    if(official!==null&&sum!==null&&official!==sum)partial=true;
    const quota=numeric(data?.leagueRule?.battles??data?.defense?.battleQuota);
    return {...sides,total:official??sum,partial,quota:Number.isInteger(quota)&&quota>0&&quota<=56?quota:null};
  }
  const api={prepare,time};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RankedGameModel=api;
})(typeof window!=='undefined'?window:globalThis);
