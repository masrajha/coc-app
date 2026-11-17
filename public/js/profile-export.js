(function(root){
  'use strict';
  const valid=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
  function summary(profile){
    const progress=profile?.progress, categories=Object.values(progress?.score?.categories||{});
    return {townHall:profile?.player?.townHallLevel??null,version:progress?.tableVersion??null,
      status:!progress||progress.capStatus==='unavailable'?'unavailable':progress.complete?'complete':'partial',
      known:categories.reduce((sum,row)=>sum+Number(row.knownItems||0),0),
      observed:categories.reduce((sum,row)=>sum+Number(row.observedItems??row.knownItems??0),0),
      score:valid(progress?.score?.overall)?Number(progress.score.overall):null};
  }
  const statusKey={complete:'export.complete',partial:'export.partial',unavailable:'export.unavailable'};
  function columns(profile,tr,number=String){
    const data=summary(profile),missing=tr('export.unavailable');
    return [data.townHall??missing,data.version||missing,tr(statusKey[data.status]),
      data.status==='unavailable'?missing:number(data.known)+' / '+number(data.observed),
      data.score===null?missing:number(data.score)+'%'];
  }
  function headers(tr){return [tr('export.th'),tr('export.version'),tr('export.status'),tr('export.coverage'),tr('export.score')];}
  function playerRows(profile,tr,number=String){
    const player=profile?.player||{},head=headers(tr),values=columns(profile,tr,number);
    return [[tr('export.field'),tr('export.value')],[tr('export.name'),player.name],[tr('export.tag'),player.tag],
      ...head.map((label,index)=>[label,values[index]]),
      [tr('player.trophies'),player.trophies??tr('export.unavailable')],['War Stars',player.warStars??tr('export.unavailable')]];
  }
  function cell(value){
    let text=value==null?'':String(value);
    if(typeof value!=='number'&&/^[\t\r\n ]*[=+@-]/.test(text))text="'"+text;
    return '"'+text.replaceAll('"','""')+'"';
  }
  const csv=rows=>'\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
  const api={summary,columns,headers,playerRows,cell,csv};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProfileExport=api;
})(typeof window==='undefined'?globalThis:window);
