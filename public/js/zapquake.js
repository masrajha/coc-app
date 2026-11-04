(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const el = id => document.getElementById(id), form = el('zapForm'); if (!form) return;
    const tr = (key, vars) => window.CocI18n.t(key, vars);
    const number = value => value > 0 && value < 0.01 ? '< ' + window.CocI18n.number(0.01, {minimumFractionDigits:2}) : window.CocI18n.number(value, {maximumFractionDigits:2});
    const node = (tag, text, className) => { const value = document.createElement(tag); if (text != null) value.textContent = text; if (className) value.className = className; return value; };
    const option = (value, text) => { const result = node('option', text); result.value = value; return result; };
    const base = '/assets/data/zapquake/';
    const targetArtwork = (kind, id, level) => kind === 'heroes' ? `/assets/images/hero/characters/${id}.webp`
      : id === 'town-hall' ? `/assets/images/town-hall/th-${level}.webp` : `/assets/images/zapquake/${id}-${level}.webp`;
    function artwork(image, source) {
      image.src=source;image.alt='';image.decoding='async';
      image.onerror=()=>{image.onerror=null;image.src='/assets/images/profile/status.svg';};
      return image;
    }
    let data, engine, manifest, timer, loading = false, runId = 0, cancelWorker;
    let galleryRun=0, galleryWorker, galleryTimer;
    const targetState=new Map();
    function setupCatalog() {
      const fieldset=el('zapInputs'), panels=[...fieldset.children], targetPanel=panels[0], spellPanel=panels[1], planPanel=panels[3];
      document.querySelector('.zap-layout').classList.add('zap-catalog-layout');
      const equipment=el('zapEquipment').closest('details');equipment.open=true;equipment.classList.add('zap-equipment-panel');
      spellPanel.after(equipment);equipment.classList.add('zap-panel');
      spellPanel.classList.add('zap-global-spells');
      const loadout=el('zapLoadout').closest('label'), attackerControls=node('div',null,'zap-attacker-controls');
      const attackerTitle=spellPanel.querySelector('h2');attackerTitle.dataset.i18n='zap.attackerSettings';attackerTitle.textContent=tr('zap.attackerSettings');
      attackerControls.append(el('zapTownHall').closest('label'),loadout);spellPanel.querySelector('.zap-spells').before(attackerControls);
      const attackerHelp=node('p',tr('zap.attackerHelp'),'zap-hint');attackerHelp.dataset.i18n='zap.attackerHelp';attackerControls.after(attackerHelp);
      const plan=node('details',null,'zap-panel zap-plan-panel'), planTitle=node('summary',tr('zap.plan'));planTitle.dataset.i18n='zap.plan';plan.append(planTitle);planPanel.replaceWith(plan);plan.append(planPanel);planPanel.classList.remove('zap-panel');
      planPanel.append(spellPanel.querySelector('[data-i18n="zap.presetScope"]'));
      const planSummary=node('small',null,'zap-condition-summary');planSummary.id='zapPlanSummary';planTitle.removeAttribute('data-i18n');const planLabel=node('span',tr('zap.plan'));planLabel.dataset.i18n='zap.plan';planTitle.replaceChildren(planLabel,planSummary);
      const summary=node('small',null,'zap-condition-summary'), conditionTitle=el('zapConditions').querySelector('summary'), conditionLabel=node('span',tr('zap.conditions'));conditionLabel.dataset.i18n='zap.conditions';conditionTitle.removeAttribute('data-i18n');conditionTitle.replaceChildren(conditionLabel,summary);summary.id='zapConditionSummary';
      const toolbar=node('section',null,'zap-panel zap-catalog-toolbar'), filterLabel=el('zapFilter').closest('label'), category=node('label');
      const categoryText=node('span',tr('zap.group'));categoryText.dataset.i18n='zap.group';const categorySelect=node('select');categorySelect.id='zapCatalogKind';
      for(const [value,key] of [['all','zap.catalogAll'],['buildings','zap.buildings'],['heroes','zap.heroes']]){const item=option(value,tr(key));item.dataset.i18n=key;categorySelect.append(item);}
      const defenderLabel=node('label'),defenderTitle=node('span',tr('zap.defenderTH')),defender=node('select');defenderTitle.dataset.i18n='zap.defenderTH';defender.id='zapDefenderTH';
      const manual=option(0,tr('zap.allLevels'));manual.dataset.i18n='zap.allLevels';defender.append(manual);for(let th=1;th<=18;th++)defender.append(option(th,'TH '+number(th)));
      defenderLabel.append(defenderTitle,defender);defender.addEventListener('change',applyDefenderPreset);
      const defenderHelp=node('p',tr('zap.defenderHelp'),'zap-hint zap-defender-help');defenderHelp.dataset.i18n='zap.defenderHelp';
      category.append(categoryText,categorySelect);toolbar.append(filterLabel,defenderLabel,category,defenderHelp);fieldset.append(toolbar);
      const grid=node('div',null,'zap-target-grid');grid.id='zapCatalog';grid.setAttribute('aria-live','polite');fieldset.append(grid);
      const dialog=node('dialog',null,'zap-detail-dialog');dialog.id='zapDetail';dialog.setAttribute('aria-labelledby','zapDetailTitle');
      const heading=node('div',null,'zap-detail-heading'), title=node('h2',tr('zap.details'));title.id='zapDetailTitle';title.dataset.i18n='zap.details';const close=node('button',tr('zap.close'));close.type='button';close.dataset.i18n='zap.close';close.addEventListener('click',()=>dialog.close());heading.append(title,close);
      const local=node('section',null,'zap-panel'), localTitle=node('h2',tr('zap.targetConditions'));localTitle.dataset.i18n='zap.targetConditions';local.append(localTitle);
      for(const id of ['zapHeroModeField','zapSuperchargeFields','zapWeaponField'])local.append(el(id));
      local.append(el('zapHealing').closest('label'));
      local.append(el('zapMode').closest('label'),el('zapTestFields'));
      const customReset=node('button',tr('zap.reset'));customReset.type='button';customReset.dataset.i18n='zap.reset';customReset.addEventListener('click',()=>{for(const id of ['zapCustomHP','zapCustomFlatHP','zapCustomDamage'])el(id).value='0';conditions();run();scheduleCatalog();});el('zapCustomFields').append(customReset);
      dialog.append(heading,targetPanel,local,el('zapResult'));fieldset.append(dialog);
      document.querySelector('.zap-output').classList.add('zap-reference');
      el('zapTarget').closest('label').hidden=true;el('zapKind').closest('label').hidden=true;
      dialog.addEventListener('close',()=>{saveTarget();scheduleCatalog();});
      categorySelect.addEventListener('change',scheduleCatalog);
      form.addEventListener('input',scheduleCatalog);form.addEventListener('change',scheduleCatalog);
    }
    function saveTarget(){if(!data||!selected())return;targetState.set(el('zapKind').value+':'+selected().id,{level:numeric('zapTargetLevel'),defendingMode:el('zapHeroMode').value,supercharge:el('zapSupercharge').checked,superchargeHitpoints:numeric('zapSuperchargeHP'),targetWeaponActive:el('zapWeaponActive').checked,healingPerSecond:numeric('zapHealing')});}
    function openTarget(kind,item){
      if(el('zapDetail').open)saveTarget();const saved=targetState.get(kind+':'+item.id)||{};
      el('zapKind').value=kind;targets(item.id);levels(saved.level);
      const modes=kind==='heroes'?window.ZapquakeModel.heroModes(item.id):[];
      el('zapHeroMode').value=modes.length===1?modes[0]:saved.defendingMode||'';el('zapSupercharge').checked=!!saved.supercharge;el('zapSuperchargeHP').value=saved.superchargeHitpoints||'';el('zapWeaponActive').checked=!!saved.targetWeaponActive;el('zapHealing').value=saved.healingPerSecond||0;
      conditions();el('zapDetail').showModal();run();
    }
    const targetRows=(kind,item)=>engine.targetLevels(kind,item.id,numeric('zapDefenderTH'));
    function applyDefenderPreset(){
      if(!engine)return;
      for(const kind of ['buildings','heroes'])for(const item of data[kind]){
        const rows=targetRows(kind,item),key=kind+':'+item.id;
        if(!rows.length){targetState.delete(key);continue;}
        targetState.set(key,{...targetState.get(key),level:rows.at(-1).level,supercharge:false,superchargeHitpoints:0,targetWeaponActive:false});
      }
      targets();levels(targetState.get(el('zapKind').value+':'+el('zapTarget').value)?.level);
      el('zapSupercharge').checked=false;el('zapSuperchargeHP').value='';el('zapWeaponActive').checked=false;
      conditions();
    }
    function scheduleCatalog(){clearTimeout(galleryTimer);galleryWorker?.terminate();const token=++galleryRun;if(!engine||loading)return;el('zapCatalog').setAttribute('aria-busy','true');galleryTimer=setTimeout(()=>catalog(token),180);}
    async function catalog(token){
      if(el('zapDetail').open)saveTarget();
      const grid=el('zapCatalog'), query=el('zapFilter').value.trim().toLocaleLowerCase(), category=el('zapCatalogKind').value;
      const entries=['buildings','heroes'].filter(kind=>category==='all'||category===kind).flatMap(kind=>data[kind].filter(item=>item.name.toLocaleLowerCase().includes(query)&&targetRows(kind,item).length).map(item=>({kind,item})));
      const inputs=entries.map(({kind,item})=>{const saved=targetState.get(kind+':'+item.id)||{},rows=targetRows(kind,item),modes=kind==='heroes'?window.ZapquakeModel.heroModes(item.id):[];return {...config(),kind,target:item.id,supercharge:false,superchargeHitpoints:0,targetWeaponActive:false,healingPerSecond:0,...saved,defendingMode:modes.length===1?modes[0]:saved.defendingMode||'',level:rows.some(row=>row.level===saved.level)?saved.level:rows.at(-1).level};});
      grid.replaceChildren();
      const cards=entries.map(({kind,item},index)=>{
        const card=node('article',null,'zap-target-card'), heading=node('h3',item.name), levelLabel=node('label'), label=node('span',tr('zap.level')), select=node('select');
        card.dataset.target=item.id;card.dataset.kind=kind;
        const header=node('div',null,'zap-card-heading'), image=artwork(node('img'),targetArtwork(kind,item.id,inputs[index].level));image.width=72;image.height=72;image.loading='lazy';header.append(image,heading);
        select.setAttribute('aria-label',item.name+' '+tr('zap.level'));for(const row of targetRows(kind,item))select.append(option(row.level,number(row.level)));select.value=String(inputs[index].level);
        select.addEventListener('change',()=>{targetState.set(kind+':'+item.id,{...targetState.get(kind+':'+item.id),level:Number(select.value)});scheduleCatalog();});
        levelLabel.append(label,select);const hp=node('p',number(item.levels[inputs[index].level-1].hitpoints)+' HP','zap-card-hp'), result=node('div',tr('zap.calculating'),'zap-card-result');
        const detail=node('button',tr('zap.details'),'zap-card-detail');detail.type='button';detail.addEventListener('click',()=>openTarget(kind,item));card.append(header,levelLabel);
        if(kind==='heroes'&&inputs[index].defendingMode)card.append(node('small',tr('zap.fixedHeroMode',{mode:tr('zap.'+inputs[index].defendingMode)}),'zap-hint'));
        card.append(hp,result,detail);grid.append(card);return {hp,result};
      });
      if(!entries.length){grid.append(node('p',tr('zap.noTargets')));grid.setAttribute('aria-busy','false');return;}
      const fallback=async()=>{const results=[];for(const input of inputs){if(token!==galleryRun)return [];try{results.push(engine.search(input));}catch(error){results.push({error:error.code||'invalid'});}await new Promise(resolve=>setTimeout(resolve,0));}return results;};
      let results;
      try{results=await new Promise((resolve,reject)=>{galleryWorker=new Worker('/js/zapquake-worker.js?v='+window.ZapquakeModel.VERSION+'&catalog=1');galleryWorker.onmessage=event=>{galleryWorker.terminate();galleryWorker=null;event.data.error?reject(new Error(event.data.error)):resolve(event.data.result);};galleryWorker.onerror=()=>{galleryWorker.terminate();galleryWorker=null;reject(new Error('worker'));};galleryWorker.postMessage({data,batch:inputs});});}catch{results=await fallback();}
      if(token!==galleryRun)return;
      results.forEach((result,index)=>{const {hp,result:body}=cards[index];body.replaceChildren();
        if(result.error){const key='zap.error.'+result.error;body.append(node('p',window.CocI18n.hasTranslation(key,window.CocI18n.locale)?tr(key):tr('zap.error.invalid')));return;}
        hp.textContent=number(result.hitpoints)+' HP';if(result.hitpoints!==result.baseHitpoints)hp.append(node('small',tr('zap.baseHP',{value:number(result.baseHitpoints)})));
        if(result.best){body.append(node('strong',combo(result.best)),node('span',tr('zap.cardSlots',{slots:number(result.best.slots)})));}else body.append(node('p',tr('zap.noSolution')));
        if(inputs[index].equipment.length)body.append(node('small',tr('zap.equipmentApplied',{count:number(inputs[index].equipment.length)})));
        if(inputs[index].supercharge||inputs[index].healingPerSecond||inputs[index].targetWeaponActive)body.append(node('small',tr('zap.localActive')));
      });grid.setAttribute('aria-busy','false');
    }
    const equipmentIcons = {'fireball':'35402e21bbb723c795c747370b2fb0412524979dfff9d24d77519bb6ee16d526','giant-arrow':'b24fdbd560620795380ccc5d857d7f71d78265ea3a9687b4046ff2caced9a9ab',
      'spiky-ball':'ae8d31c5bedadf425741bb156667aa9db2cb051ece81f764399a15ebda3f5dfa','seeking-shield':'29c80bd25767c50a76cfa7e68ee4fea086595eabed8211dd722e34acabe70099',
      'rocket-backpack':'9d80017aa6c330d24a7396c69c65f822b857939aa377aee84070c5cbfbfa6667','flame-blower':'d30235cde8af50bfeba7e887fed35609a8fca508a173791aeedc02758a0a59b6',
      'earthquake-boots':'1a4e1c577447792d6052c86d08bfb1e11e0227eac72ce9f8ad8530b92d25a84c','electro-boots':'5a96d68cd6b3fc5504db24e513d448c9e02dd6da9de31fdc74eba82a1380a318'};
    const spells = id => data.spells.find(item => item.id === id);
    const selected = () => data?.[el('zapKind').value]?.find(item => item.id === el('zapTarget').value);
    const numeric = id => el(id).value === '' ? NaN : Number(el(id).value);
    const config = () => ({kind:el('zapKind').value, target:el('zapTarget').value, level:numeric('zapTargetLevel'), defendingMode:el('zapHeroMode').value,defenderTownHall:numeric('zapDefenderTH'),
      lightningLevel:numeric('zapLightningLevel'), earthquakeLevel:numeric('zapEarthquakeLevel'), townHall:numeric('zapTownHall'),
      capacity:numeric('zapCapacity'), maxZaps:numeric('zapMaxZaps'), maxQuakes:numeric('zapMaxQuakes'), zaps:numeric('zapZaps'), quakes:numeric('zapQuakes'), order:el('zapOrder').value,
      environment:el('zapEnvironment').value, league:el('zapLeague').value, rulesDate:el('zapRulesDate').value, loadoutMode:el('zapLoadout').value,
      customHPPercent:el('zapEnvironment').value === 'custom' ? numeric('zapCustomHP') : 0,
      customFlatHP:el('zapEnvironment').value === 'custom' ? numeric('zapCustomFlatHP') : 0,
      customDamagePercent:el('zapEnvironment').value === 'custom' ? numeric('zapCustomDamage') : 0,
      supercharge:!el('zapSuperchargeFields').hidden && el('zapSupercharge').checked, superchargeHitpoints:numeric('zapSuperchargeHP'),
      targetWeaponActive:!el('zapWeaponField').hidden && el('zapWeaponActive').checked,
      spellInterval:numeric('zapInterval'), healingPerSecond:numeric('zapHealing'), equipmentPosition:el('zapEquipmentPosition').value,
      equipment:(data?.equipment || []).filter(item => el('eq-'+item.id+'-enabled')?.checked).map(item => ({id:item.id, level:numeric('eq-'+item.id+'-level'),
        confirmed:true, time:numeric('eq-'+item.id+'-time'), duration:item.modelType === 'periodic' ? numeric('eq-'+item.id+'-duration') : 0}))});
    function equipmentCards() {
      const container = el('zapEquipment'); container.replaceChildren();
      for (const item of data.equipment || []) {
        const card = node('div', null, 'zap-equipment-card'), check = node('label', null, 'zap-equip-check');
        const input = node('input'); input.type = 'checkbox'; input.id = 'eq-'+item.id+'-enabled';
        const image = node('img'); image.src = item.id==='fireball' ? '/assets/images/zapquake/fireball.webp' : '/assets/images/army/'+equipmentIcons[item.id]+'.webp'; image.width = 36; image.height = 36; image.alt = ''; image.loading = 'lazy';
        const title = node('span'); title.append(node('strong',item.name),node('small',data.heroes.find(hero=>hero.id===item.hero)?.name || item.hero));
        check.append(input,image,title);card.append(check);
        const fields = node('div', null, 'zap-equipment-fields'); fields.id='eq-'+item.id+'-fields';
        const addField = (key,suffix,control) => { const label=node('label'),text=node('span',tr(key));text.dataset.i18n=key;control.id='eq-'+item.id+'-'+suffix;label.append(text,control);fields.append(label);return control; };
        const level=addField('zap.level','level',node('select')); for (const row of item.levels) level.append(option(row.level,number(row.level)));level.value=String(item.levels.length);
        const time=addField('zap.activation','time',node('input'));time.type='number';time.min='0';time.max='30';time.step='0.1';time.value='0';
        if (item.modelType==='periodic') {const duration=addField('zap.duration','duration',node('input'));duration.type='number';duration.min='0.4';duration.max='30';duration.step='0.1';duration.value='2';}
        const hint=node('small',null,'zap-hint');hint.id='eq-'+item.id+'-hint'; fields.append(hint);card.append(fields);container.append(card);
      }
      refreshEquipment();
    }
    function refreshEquipment() {
      let modifier; try { modifier=window.ZapquakeModifiers.resolve(config(),el('zapKind').value==='heroes'); } catch { /* The result panel explains invalid presets. */ }
      for (const item of data.equipment || []) {
        const townHall=numeric('zapTownHall'),heroHall=data.requirements['hero-hall'].filter(row=>!townHall||row.townHallRequired<=townHall).at(-1),blacksmith=data.requirements.blacksmith.filter(row=>!townHall||row.townHallRequired<=townHall).at(-1);
        const owner=data.heroes.find(hero=>hero.id===item.hero);
        const rows=!townHall?item.levels:!heroHall||!blacksmith||owner.levels[0].heroHallLevelRequired>heroHall.level?[]:item.levels.filter(row=>row.blacksmithLevelRequired<=blacksmith.level&&row.level<=blacksmith[item.rarity]);
        const checkbox=el('eq-'+item.id+'-enabled'),fields=el('eq-'+item.id+'-fields'),card=fields.closest('.zap-equipment-card'),levelSelect=el('eq-'+item.id+'-level'),previous=Number(levelSelect.value);
        card.hidden=!rows.length;checkbox.disabled=!rows.length;if(!rows.length)checkbox.checked=false;
        levelSelect.replaceChildren(...rows.map(row=>option(row.level,number(row.level))));levelSelect.value=String(rows.some(row=>row.level===previous)?previous:rows.at(-1)?.level||'');
        const enabled=checkbox.checked;fields.hidden=!enabled;
        card.classList.toggle('is-active',enabled);
        for(const field of fields.querySelectorAll('input,select'))field.disabled=!enabled;
        const chosen=numeric('eq-'+item.id+'-level'),effective=Math.max(1,chosen-(item.rarity==='epic'?modifier?.epicReduction||0:modifier?.commonReduction||0));
        el('eq-'+item.id+'-hint').textContent=tr('zap.effectiveLevel',{selected:number(chosen),effective:number(effective)});
      }
      let empty=el('zapEquipmentEmpty');if(!empty){empty=node('p',tr('zap.noEquipment'),'zap-hint');empty.id='zapEquipmentEmpty';empty.dataset.i18n='zap.noEquipment';el('zapEquipment').after(empty);}
      empty.hidden=[...el('zapEquipment').children].some(card=>!card.hidden);
    }
    function conditions() {
      const environment=el('zapEnvironment').value, league=el('zapLeague'), previous=league.value;
      const choices=environment==='cwl' ? [['titan-3','Titan III'],['titan-2','Titan II'],['titan-1','Titan I'],['legend','Legend'],['other',tr('zap.otherCWL')]]
        : [['normal',tr('zap.normalProfile')],['legend-3','Legend III'],['legend-2','Legend II'],['legend-1','Legend I'],...(environment==='friendly'?[['esports','Esports']]:[])];
      league.replaceChildren(...choices.map(([id,text])=>option(id,text)));league.value=choices.some(([id])=>id===previous)?previous:choices[0][0];
      el('zapLeagueField').hidden=!['ranked','cwl','friendly'].includes(environment);league.disabled=el('zapLeagueField').hidden;
      el('zapRulesDateField').hidden=['normal','custom'].includes(environment);el('zapRulesDate').disabled=el('zapRulesDateField').hidden;
      el('zapCustomFields').hidden=environment!=='custom';for(const field of el('zapCustomFields').querySelectorAll('input'))field.disabled=environment!=='custom';
      const target=selected();el('zapSuperchargeFields').hidden=el('zapKind').value!=='buildings'||!target?.supercharges?.length;
      el('zapSuperchargeHP').disabled=el('zapSuperchargeFields').hidden||!el('zapSupercharge').checked;
      el('zapWeaponField').hidden=target?.id!=='town-hall'||target?.levels[numeric('zapTargetLevel')-1]?.weaponAvailable!==true;
      refreshEquipment();
      const rulesDate=new Date(el('zapRulesDate').value+'T12:00:00');
      if(el('zapConditionSummary'))el('zapConditionSummary').textContent=' · '+el('zapEnvironment').selectedOptions[0].textContent+(el('zapLeagueField').hidden?'':' · '+league.selectedOptions[0].textContent)+(el('zapRulesDateField').hidden||!Number.isFinite(rulesDate.getTime())?'':' · '+window.CocI18n.dateTime(rulesDate,{dateStyle:'medium'}));
      if(el('zapPlanSummary'))el('zapPlanSummary').textContent=tr('zap.planSummary',{slots:number(numeric('zapCapacity'))})+' · '+el('zapOrder').selectedOptions[0].textContent;
    }
    function status(key, busy = false) {
      const text = node('span', tr(key)); el('zapStatus').replaceChildren(...(busy ? [node('span', null, 'zap-spinner'), text] : [text]));
      el('zapStatus').querySelector('.zap-spinner')?.setAttribute('aria-hidden', 'true');
    }
    function preview() {
      const target = selected(), level = numeric('zapTargetLevel'), row = target?.levels[level - 1];
      const modes=el('zapKind').value==='heroes'?window.ZapquakeModel.heroModes(target?.id):[];
      el('zapHeroModeField').hidden = modes.length!==2;
      el('zapHeroMode').disabled = modes.length!==2;
      let fixed=el('zapFixedHeroMode');if(!fixed){fixed=node('p',null,'zap-hint');fixed.id='zapFixedHeroMode';el('zapHeroModeField').after(fixed);}
      fixed.hidden=modes.length!==1;
      if(modes.length===1){el('zapHeroMode').value=modes[0];fixed.textContent=tr('zap.fixedHeroMode',{mode:tr('zap.'+modes[0])});}
      el('zapTargetPreview').hidden = !row;
      if (!row) return;
      el('zapTargetName').textContent = `${target.name} · ${tr('zap.level')} ${number(level)}`;
      el('zapTargetHP').textContent = `${number(row.hitpoints)} HP`;
      el('zapRequirement').textContent = el('zapKind').value === 'heroes' ? tr('zap.heroHall', {level:number(row.heroHallLevelRequired)}) : `TH ${number(row.townHallRequired)}`;
      const image = el('zapTargetImage');
      artwork(image,targetArtwork(el('zapKind').value,target.id,level));
    }
    function levels(keep) {
      const target = selected(), select = el('zapTargetLevel'); select.replaceChildren();
      const rows=target?targetRows(el('zapKind').value,target):[];
      for (const row of rows) select.append(option(row.level, number(row.level)));
      select.value = String(rows.some(row=>row.level===Number(keep))?keep:rows.at(-1)?.level||'');
      select.disabled = !target; preview(); conditions();
    }
    function targets(keep) {
      const old = keep || el('zapTarget').value, level = el('zapTargetLevel').value;
      const query = ''; // Catalog search does not change the detail target.
      const choices = data[el('zapKind').value].filter(item => item.name.toLocaleLowerCase().includes(query)&&targetRows(el('zapKind').value,item).length);
      const select = el('zapTarget'); select.replaceChildren();
      for (const item of choices) select.append(option(item.id, item.name));
      if (!choices.length) select.append(option('', tr('zap.noTargets')));
      select.value = choices.some(item => item.id === old) ? old : choices[0]?.id || '';
      levels(select.value === old ? level : undefined);
    }
    function spellLevels(keep = true) {
      const th = numeric('zapTownHall');
      for (const [id, spellId] of [['zapLightningLevel','lightning-spell'], ['zapEarthquakeLevel','earthquake-spell']]) {
        const select = el(id), previous = keep ? Number(select.value) : -1;
        const rows = spells(spellId).levels.filter(row => !th || row.townHallRequired <= th);
        select.replaceChildren(option(0, tr('zap.off')), ...rows.map(row => option(row.level, number(row.level))));
        select.value = String(previous === 0 || rows.some(row => row.level === previous) ? previous : rows.at(-1)?.level || 0);
      }
      spellHints();
    }
    function spellHints() {
      const lightning = spells('lightning-spell').levels[numeric('zapLightningLevel') - 1];
      const quake = spells('earthquake-spell').levels[numeric('zapEarthquakeLevel') - 1];
      el('zapLightningDamage').textContent = lightning ? tr('zap.flatDamage', {damage:number(lightning.damage)}) : tr('zap.off');
      el('zapEarthquakeDamage').textContent = quake ? tr('zap.percentDamage', {damage:number(quake.buildingDamagePercent), hero:number(quake.troopDamagePercent || 0)}) : tr('zap.off');
    }
    function mode() {
      const search = el('zapMode').value === 'search';
      el('zapSearchFields').hidden = !search; el('zapTestFields').hidden = search;
      for (const input of el('zapSearchFields').querySelectorAll('input')) input.disabled = !search;
      for (const input of el('zapTestFields').querySelectorAll('input')) input.disabled = search;
    }
    function metrics(result) {
      const grid = node('div', null, 'zap-metrics');
      for (const [key, value] of [['zap.hp', `${number(result.hitpoints)} HP`], ['zap.slots', `${number(result.slots)} / ${number(numeric('zapCapacity'))}`],
        [result.status === 'destroyed' ? 'zap.overkill' : 'zap.remaining', `${number(result.status === 'destroyed' ? result.overkill : result.remaining)} HP`]]) {
        const item = node('div'); item.append(node('span', tr(key)), node('strong', value)); grid.append(item);
      }
      return grid;
    }
    const combo = result => tr('zap.combo', {zaps:number(result.zaps), quakes:number(result.quakes)});
    function notes(body, list) {
      if (!list.length) return;
      const ul = node('ul'); for (const key of list) ul.append(node('li', tr('zap.note.' + key))); body.append(ul);
    }
    function renderResult(result, search) {
      const body = el('zapResultBody'); body.replaceChildren();
      const best = search ? result.best : result;
      const profileName = modifier => ({normal:tr('zap.normalProfile'),custom:tr('zap.custom'),'legend-1':'Legend I','legend-2':'Legend II','legend-3':'Legend III',esports:'Esports'}[modifier.id] || modifier.id);
      el('zapResult').dataset.outcome = best?.status || 'noSolution';
      if (!best) {
        body.append(node('p', tr('zap.noSolution'), 'zap-result-status'), node('p', tr('zap.noSolutionHint')));
        body.append(node('p',tr('zap.hpTransformation',{base:number(result.baseHitpoints),effective:number(result.hitpoints),profile:profileName(result.modifier)})));
        notes(body, result.notes); return;
      }
      body.append(node('p', tr(best.status === 'destroyed' ? 'zap.destroyed' : 'zap.survives'), 'zap-result-status'), node('div', combo(best), 'zap-combo'), metrics(best));
      body.append(node('p',tr('zap.hpTransformation',{base:number(best.baseHitpoints),effective:number(best.hitpoints),profile:profileName(best.modifier)})));
      if(best.modifier.sources.length){const references=node('details');references.append(node('summary',tr('zap.modifierSources')));
        for(const source of best.modifier.sources){const line=node('p'),link=node('a',source);link.href=source;link.target='_blank';link.rel='noopener noreferrer';line.append(link);references.append(line);}body.append(references);}
      if(best.equipment.length){const list=node('ul');for(const item of best.equipment)list.append(node('li',tr('zap.usedEquipment',{name:data.equipment.find(entry=>entry.id===item.id).name,selected:number(item.selectedLevel),effective:number(item.effectiveLevel),ticks:number(item.ticks)})));body.append(list);}
      if(best.healed>0)body.append(node('p',tr('zap.healed',{value:number(best.healed)})));
      if (best.thinMargin) body.append(node('p', tr('zap.thinMargin'), 'zap-thin'));
      notes(body, best.notes);
      if (search) {
        body.append(node('p', tr('zap.priority')));
        if (result.alternatives.length) {
          const details = node('details'); details.append(node('summary', tr('zap.alternatives')));
          const list = node('div', null, 'zap-alternatives');
          for (const item of result.alternatives) {
            const row = node('div', null, 'zap-alternative'); row.append(node('strong', combo(item)), node('span', tr('zap.alternativeInfo', {slots:number(item.slots), margin:number(item.overkill)}))); list.append(row);
          }
          details.append(list); body.append(details);
        }
      }
      const details = node('details'); details.append(node('summary', tr('zap.breakdown')));
      const list = node('ol', null, 'zap-event-list');
      for (const event of best.breakdown) {const name=event.type==='lightning'?'Lightning':event.type==='earthquake'?'Earthquake':data.equipment.find(item=>item.id===event.type)?.name||event.type;
        list.append(node('li',event.unused?tr('zap.unused',{spell:name}):tr('zap.timedEvent',{spell:name,time:number(event.time),damage:number(event.damage),healed:number(event.healed),remaining:number(event.remaining)})));}
      details.append(list); body.append(details);
      body.append(node('p', tr('zap.modelResult')));
    }
    function run() {
      if (!engine || loading) return;
      const id = ++runId; clearTimeout(timer);cancelWorker?.(); status('zap.calculating', true);
      el('zapResult').setAttribute('aria-busy','true');
      timer = setTimeout(async () => {
        if (id !== runId) return;
        try {
          const input = config(), search = el('zapMode').value === 'search';
          const result = search ? await backgroundSearch(input) : engine.calculate(input);
          if(id!==runId)return;
          renderResult(result, search); el('zapResult').setAttribute('aria-busy','false');status('zap.ready');
        } catch (error) {
          if(id!==runId)return;
          el('zapResult').dataset.outcome = 'error';
          const key = window.CocI18n.hasTranslation('zap.error.' + error.code, window.CocI18n.locale) ? 'zap.error.' + error.code : 'zap.error.invalid';
          el('zapResultBody').replaceChildren(node('p', tr(key), 'zap-result-status'));el('zapResult').setAttribute('aria-busy','false'); status('zap.ready');
        }
      }, 100);
    }
    function backgroundSearch(input) {
      if(typeof Worker==='undefined')return Promise.resolve(engine.search(input));
      return new Promise((resolve,reject)=>{
        let worker;try{worker=new Worker('/js/zapquake-worker.js?v='+window.ZapquakeModel.VERSION);}catch{return resolve(engine.search(input));}
        const finish=()=>{worker.terminate();cancelWorker=null;};
        cancelWorker=()=>{finish();reject(new Error('cancelled'));};
        worker.onmessage=event=>{finish();if(event.data.error){const error=new Error(event.data.error);error.code=event.data.error;reject(error);}else resolve(event.data.result);};
        worker.onerror=()=>{finish();try{resolve(engine.search(input));}catch(error){reject(error);}};
        worker.postMessage({data,config:input});
      });
    }
    async function jsonFile(path, immutable = false) {
      const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(path, {signal:controller.signal, cache:immutable ? 'default' : 'no-cache'});
        if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) throw new Error('data');
        const text = await response.text(); if (text.length > 1000000) throw new Error('data');
        return {text, value:JSON.parse(text)};
      } finally { clearTimeout(timeout); }
    }
    async function load() {
      if (loading) return; loading = true; el('zapInputs').disabled = true; el('zapRetry').hidden = true; status('zap.loading', true);
      try {
        manifest = (await jsonFile(base + 'manifest.json')).value;
        if (manifest.schemaVersion !== 1 || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(manifest.dataVersion) || manifest.dataset !== manifest.dataVersion + '/dataset.json'
          || manifest.license !== manifest.dataVersion + '/LICENSE.txt' || !/^[a-f0-9]{64}$/.test(manifest.sha256)) throw new Error('data');
        const file = await jsonFile(base + manifest.dataset, true), bytes = new TextEncoder().encode(file.text);
        if (bytes.length !== manifest.bytes) throw new Error('data');
        if (globalThis.crypto?.subtle) {
          const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
          if (hash !== manifest.sha256) throw new Error('data');
        }
        if (file.value.dataVersion !== manifest.dataVersion) throw new Error('data');
        data = file.value; engine = window.ZapquakeModel.create(data);
        const defenderSupported=data.buildings.every(item=>Array.isArray(item.availablePerTownHall));
        el('zapDefenderTH').disabled=!defenderSupported;if(!defenderSupported)el('zapDefenderTH').value='0';
        const defenderHelp=document.querySelector('.zap-defender-help');defenderHelp.dataset.i18n=defenderSupported?'zap.defenderHelp':'zap.defenderUnsupported';defenderHelp.textContent=tr(defenderHelp.dataset.i18n);
        el('zapLicense').href = base + manifest.license;
        el('zapDataVersion').textContent = tr('zap.version', {data:data.dataVersion, engine:window.ZapquakeModel.VERSION, profiles:window.ZapquakeModifiers.VERSION});
        el('zapInputs').disabled = false;
        equipmentCards(); targets('air-defense'); spellLevels(false); mode(); preview(); conditions(); loading = false; run();scheduleCatalog();
      } catch {
        loading = false; engine = null; status('zap.loadError'); el('zapRetry').hidden = false;
        el('zapResult').dataset.outcome = 'error'; el('zapResultBody').replaceChildren(node('p', tr('zap.loadError')));
      }
    }
    for (let th = 1; th <= 18; th++) el('zapTownHall').append(option(th, `TH ${number(th)}`));
    el('zapLightningLevel').setAttribute('aria-label', `Lightning · ${tr('zap.level')}`);
    el('zapEarthquakeLevel').setAttribute('aria-label', `Earthquake · ${tr('zap.level')}`);
    document.title = tr('zap.title') + ' - ClanIntel';
    form.addEventListener('submit', event => { event.preventDefault(); run(); });
    form.addEventListener('change', event => {
      if (!data) return;
      if (event.target.id === 'zapFilter') return;
      if (event.target.id === 'zapKind') targets();
      if (event.target.id === 'zapTarget') levels();
      if (event.target.id === 'zapTargetLevel' || event.target.id === 'zapKind') preview();
      if (event.target.id === 'zapTownHall') spellLevels();
      if (['zapLightningLevel','zapEarthquakeLevel'].includes(event.target.id)) spellHints();
      if (event.target.id === 'zapMode') mode();
      conditions();
      run();
    });
    form.addEventListener('input', event => { if (event.target.id === 'zapFilter' && data) { scheduleCatalog(); } else if (event.target.type === 'number') run(); });
    form.addEventListener('reset', () => { ++runId; clearTimeout(timer);cancelWorker?.(); setTimeout(() => { if (data) { targetState.clear();equipmentCards();targets('air-defense'); levels(); spellLevels(false); mode(); conditions();run();scheduleCatalog(); } }, 0); });
    el('zapRetry').addEventListener('click', load);
    window.addEventListener('coc-language-changed', () => {
      document.title = tr('zap.title') + ' - ClanIntel';
      if (!data) { status(loading ? 'zap.loading' : 'zap.loadError', loading); return; }
      const level = el('zapTargetLevel').value; targets(); levels(level); spellHints(); conditions();run();scheduleCatalog();
    });
    setupCatalog();
    load();
  });
})();
