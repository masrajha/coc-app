(() => {
  const el=id=>document.getElementById(id), root=el('reference');
  const sourceScores=[40,22,32,32,40,40,13,0,0,0,28,0,40,18,40,40,27,40,13,0,27,26,0,16,40,40,40,40,40,25,0,0,26,12,13,0,26,40,22,40,40,40,26,17,0,27,11,11];
  const sourceStars=[3,2,2,2,3,3,2,3,3,3,1,3,3,2,3,3,2,3,2,3,1,1,3,2,3,3,3,3,3,2,3,3,1,1,2,3,2,3,2,3,3,3,1,1,3,1,0,0];
  const attackNames=['PP3 - Wedzyang2','[FenIX]™','√AHya^Null™','xRizzz','Rosario','boss_peps','KHALID','Thorne','Ares','Nita','Satria','Makarov1401'];
  const defenseNames=['You','♧NGU-SASUKE','-HORZUMLU-','NightFall','Cream⁵⁶','ChanhGay','Krishno Grete✌✌','Gustavo','MAMBA','KING CHARAN','Kushal','Darth'];
  const attackPercents=[100,69,99,98,100,100,100];
  const defensePercents=[83,100,100,100,64,100,83];
  function sample(size) {
    const attacks=[],defenses=[];
    for(let row=0;row<4;row++)for(let col=0;col<6;col++){
      const index=row*12+col;
      attacks.push({points:sourceScores[index],stars:sourceStars[index],side:'attack'});
      const position=index+6;
      defenses.push({points:sourceScores[position],stars:position>=46?null:sourceStars[position],bonus:position>=46,side:'defense'});
    }
    if(size>24){
      defenses.splice(-2);
      while(attacks.length<size){const index=attacks.length;attacks.push({points:index%4===0?27:40,stars:index%4===0?2:3,side:'attack'});}
      while(defenses.length<size-2){const index=defenses.length;defenses.push({points:index%3===0?18:0,stars:index%3===0?2:3,side:'defense'});}
      defenses.push({points:11,stars:null,bonus:true,side:'defense'},{points:11,stars:null,bonus:true,side:'defense'});
    }
    const enrich=(logs,names,percents)=>logs.map((log,index)=>({...log,
      opponentName:log.bonus?'Bonus defense':names[index%names.length]+(index>=names.length?' '+(Math.floor(index/names.length)+1):''),
      destruction:log.bonus?null:percents[index] ?? (log.stars===3?100:log.stars===2?85:48)}));
    return {attacks:enrich(attacks,attackNames,attackPercents),defenses:enrich(defenses,defenseNames,defensePercents)};
  }
  function star(active){
    const span=document.createElement('span');span.className='coc-ref-star';
    span.innerHTML=`<svg viewBox="0 0 35 35" aria-hidden="true"><path d="M17.5 2.2 22.5 12l10.8 1.5-7.9 7.6 1.9 10.8-9.8-5.1-9.8 5.1 1.9-10.8-7.9-7.6L12.5 12Z" fill="${active?'#a3c7d8':'#8f8b8c'}" stroke="#373435" stroke-width="2.1" stroke-linejoin="round"/><path d="M17.5 5.8 21 14l8.5 1-6.2 6 1.3 7.1-7.1-3.9-7.1 3.9 1.3-7.1-6.2-6 8.5-1Z" fill="${active?'#bedce7':'#a29c9d'}" opacity=".7"/></svg>`;
    return span;
  }
  function showDetails(log,index){
    el('demoDetailsTitle').textContent=(log.side==='attack'?'Attacks':'Defenses')+' · '+(log.bonus?'Bonus':'#'+(index+1));
    const values=[['Pemain',log.opponentName],['Trofi',(log.points>0?'+':'')+log.points],['Bintang',log.bonus?'Tidak berlaku':log.stars+' / 3'],['Destruksi',log.bonus?'Tidak berlaku':log.destruction+'%'],['Jenis',log.bonus?'Bonus defense':'Battle contoh']];
    el('demoDetailsValues').replaceChildren();
    for(const [label,value] of values){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;el('demoDetailsValues').append(dt,dd);}
    el('demoDetails').showModal();
  }
  function card(log,index){
    const button=document.createElement('button');button.type='button';
    button.className='coc-ref-card'+(log.bonus?' blue no-stars':log.stars===3?log.side==='attack'?' gold':' red':'');
    button.title=log.bonus?'Bonus defense: +'+log.points+' trofi':log.opponentName+' · '+log.destruction+'% · '+log.stars+' bintang · '+log.points+' trofi';
    button.setAttribute('aria-label',button.title);
    const name=document.createElement('span');name.className='demo-row-name';name.textContent=log.opponentName;
    const percent=document.createElement('span');percent.className='demo-row-percent';percent.textContent=log.bonus?'':log.destruction+'%';button.append(name,percent);
    const score=document.createElement('div');score.className='coc-ref-score';score.append(document.createTextNode(log.points>0?'+'+log.points:String(log.points)));
    const trophy=document.createElement('img');trophy.className='demo-trophy';trophy.src='/assets/trophy.png';trophy.alt='';trophy.width=23;trophy.height=29;score.append(trophy);button.append(score);
    if(!log.bonus){const stars=document.createElement('div');stars.className='coc-ref-stars';stars.setAttribute('aria-hidden','true');for(let i=0;i<3;i++)stars.append(star(i<log.stars));button.append(stars);}
    button.addEventListener('click',()=>showDetails(log,index));return button;
  }
  function resize(){
    if(el('demoViewport').hidden)return;
    const available=el('demoViewport').clientWidth-(innerWidth<=700?16:32);
    const zoom=el('demoZoom').value==='fit'?Math.min(1,available/1440):Number(el('demoZoom').value);
    root.style.transform=`scale(${zoom})`;
    el('demoStage').style.width=1440*zoom+'px';el('demoStage').style.height=root.offsetHeight*zoom+'px';
  }
  function render(){
    const {attacks,defenses}=sample(Number(el('demoScenario').value));
    el('demoAttackGrid').replaceChildren(...attacks.map(card));el('demoDefenseGrid').replaceChildren(...defenses.map(card));
    const a=attacks.reduce((total,log)=>total+log.points,0),d=defenses.reduce((total,log)=>total+log.points,0);
    el('demoTotal').textContent=String(a+d);el('demoAttackTotal').textContent='+'+a;el('demoDefenseTotal').textContent='+'+d;
    el('demoCounts').textContent=attacks.length+' serangan · '+defenses.filter(log=>!log.bonus).length+' pertahanan · '+defenses.filter(log=>log.bonus).length+' bonus defense';
    resize();
  }
  function view(list){root.classList.toggle('coc-ref-list',list);el('demoList').setAttribute('aria-pressed',String(list));el('demoGrid').setAttribute('aria-pressed',String(!list));resize();}
  el('demoList').addEventListener('click',()=>view(true));el('demoGrid').addEventListener('click',()=>view(false));
  root.querySelectorAll('.coc-ref-tab').forEach(button=>button.addEventListener('click',()=>{
    root.querySelectorAll('.coc-ref-tab').forEach(tab=>{
      tab.setAttribute('aria-pressed',String(tab===button));
    });
    // These tabs demonstrate the game header only; the battle log stays visible.
  }));
  el('demoScenario').addEventListener('change',render);el('demoZoom').addEventListener('change',resize);
  el('demoStyle').addEventListener('change',()=>{root.classList.toggle('demo-refined',el('demoStyle').value==='refined');resize();});
  el('demoName').addEventListener('input',()=>{el('demoPlayer').textContent='#11 '+(el('demoName').value.trim()||'Kyuraa');});
  el('demoClose').addEventListener('click',()=>{el('demoViewport').hidden=true;el('demoReopen').hidden=false;el('demoReopen').focus();});
  el('demoReopen').addEventListener('click',()=>{el('demoViewport').hidden=false;el('demoReopen').hidden=true;resize();});
  new ResizeObserver(resize).observe(root);window.addEventListener('resize',resize);
  document.fonts.ready.then(resize);render();
  if(new URLSearchParams(location.search).get('view')==='list')view(true);
})();
