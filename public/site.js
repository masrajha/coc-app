// Run before styles: choose the page shell without waiting for API data.
(() => {
  const path = location.pathname;
  const query = new URLSearchParams(location.search);
  document.documentElement.dataset.page = path.endsWith('/player.html') ? 'player'
    : path.endsWith('/compare-clan.html') ? 'compare-clan'
    : path.endsWith('/compare.html') ? 'compare'
    : query.get('tag') || query.get('clan') ? 'clan' : 'home';
})();

// Compact mobile history; desktop keeps all three panels visible.
document.addEventListener('DOMContentLoaded',()=>{
  const history=document.querySelector('[data-recent-history]');if(!history)return;
  const tabs=[...history.querySelectorAll('[data-history-target]')];
  function select(tab){
    for(const item of tabs){const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;}
    for(const panel of history.querySelectorAll('[data-history-panel]'))panel.dataset.historyActive=String(panel.id===tab.dataset.historyTarget);
  }
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>select(tab));
    tab.addEventListener('keydown',event=>{
      let next;if(event.key==='ArrowRight')next=tabs[(index+1)%tabs.length];else if(event.key==='ArrowLeft')next=tabs[(index+tabs.length-1)%tabs.length];else if(event.key==='Home')next=tabs[0];else if(event.key==='End')next=tabs.at(-1);else return;
      event.preventDefault();select(next);next.focus();
    });
  });
  history.dataset.historyReady='true';select(tabs[0]);
  const sidebar=history.closest('.landing-sidebar'),main=document.querySelector('.landing-main'),search=document.querySelector('.quick-search');
  if(sidebar&&main&&search){
    const anchor=document.createComment('Desktop history position');sidebar.before(anchor);
    const mobile=matchMedia('(max-width:700px)');
    const place=()=>{if(mobile.matches)search.after(sidebar);else anchor.after(sidebar);};
    mobile.addEventListener('change',place);place();
  }

});
