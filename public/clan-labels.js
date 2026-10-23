(() => {
  const selected = new Set();
  let labels = [], loading = false, loaded = false;
  const tr = (...args) => window.CocI18n.t(...args);
  // API names remain the fallback for future labels that are not yet in the dictionary.
  const names = {'Clan Wars':'wars','Clan War League':'cwl','Clan War Leagues':'cwl','Trophy Pushing':'trophies','Friendly Wars':'friendly','Clan Games':'games','Builder Base':'builder','Base Designing':'design','Farming':'farming','Active Donator':'donator','Active Donations':'donator','Donations':'donator','Friendly':'social','Talkative':'talkative','Underdog':'underdog','Relaxed':'relaxed','Competitive':'competitive','Clan Capital':'capital','Newbie Friendly':'newbie'};
  function render() {
    const list = document.getElementById('clanLabelOptions');
    list.replaceChildren();
    for (const label of labels) {
      const id = String(label.id);
      if (!/^\d{1,12}$/.test(id)) continue;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'clan-label-chip'; button.dataset.labelId = id;
      button.setAttribute('aria-pressed', String(selected.has(id)));
      button.disabled = selected.size >= 3 && !selected.has(id);
      const url = label.iconUrls?.small || label.iconUrls?.medium;
      if (url && /^https:\/\//.test(url)) {
        const img = document.createElement('img'); img.src = url; img.alt = ''; img.loading = 'lazy';
        img.addEventListener('error', () => img.remove(), {once:true}); button.append(img);
      }
      const key = 'labels.name.' + names[label.name];
      const name = document.createElement('span'); name.textContent = names[label.name] ? tr(key) : label.name || id; button.append(name);
      button.addEventListener('click', () => { selected.has(id) ? selected.delete(id) : selected.size < 3 && selected.add(id); render(); [...list.children].find(b => b.dataset.labelId === id)?.focus(); });
      list.append(button);
    }
    document.getElementById('clanLabelCount').textContent = tr('labels.selected', { count: window.CocI18n.number(selected.size) });
    document.getElementById('clanLabelClear').disabled = !selected.size;
  }
  async function load() {
    if (loading || loaded) return;
    loading = true;
    const status = document.getElementById('clanLabelStatus');
    status.replaceChildren();
    const spinner = document.createElement('span'); spinner.className = 'cc-spinner'; spinner.setAttribute('aria-hidden','true');
    status.append(spinner, document.createTextNode(tr('labels.loading')));
    try {
      const response = await window.CocI18n.apiFetch('/api/clans/labels'); const data = await response.json();
      if (!response.ok) throw new Error(data.error || tr('cc.failed'));
      labels = data.items || []; loaded = true; status.textContent = labels.length ? '' : tr('cc.empty'); render();
    } catch (error) {
      status.textContent = error.message + ' ';
      const retry = document.createElement('button'); retry.type='button'; retry.textContent=tr('labels.retry'); retry.onclick=load; status.append(retry);
    } finally { loading = false; }
  }
  window.ClanLabels = { load, ids: () => [...selected].join(',') };
  document.getElementById('clanLabelClear').addEventListener('click', () => { selected.clear(); render(); });
  render();
})();
