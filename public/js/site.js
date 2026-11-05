// Run before styles: choose the page shell without waiting for API data.
(() => {
  const path = location.pathname;
  const query = new URLSearchParams(location.search);
  document.documentElement.dataset.page = path.endsWith('/player.html') ? 'player'
    : path.startsWith('/tools/') ? 'tools'
    : path.endsWith('/compare-clan.html') ? 'compare-clan'
    : path.endsWith('/compare.html') ? 'compare'
    : query.get('tag') || query.get('clan') ? 'clan' : 'home';
})();

// The same server-rendered navigation is used on app, tools and editorial pages.
document.addEventListener('DOMContentLoaded',()=>{
  const header=document.querySelector('.global-header');if(!header)return;
  const toggle=header.querySelector('.global-nav-toggle'),menu=header.querySelector('#globalNavigationMenu');
  const dropdowns=[...header.querySelectorAll('.global-nav-dropdown')];
  function closeDropdowns(except){for(const item of dropdowns)if(item!==except)item.open=false;}
  function closeMenu(restoreFocus=false){toggle.setAttribute('aria-expanded','false');closeDropdowns();if(restoreFocus)toggle.focus();}
  header.dataset.navReady='true';
  toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));if(!open)closeDropdowns();});
  for(const item of dropdowns)item.addEventListener('toggle',()=>{if(item.open)closeDropdowns(item);});
  document.addEventListener('click',event=>{if(!header.contains(event.target))closeMenu();});
  header.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const open=dropdowns.find(item=>item.open);if(open){open.open=false;open.querySelector('summary').focus();}else closeMenu(true);});
  menu.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
  const media=matchMedia('(min-width:1281px)');media.addEventListener('change',()=>closeMenu());
  // Keep the home search section highlighted when a tab link changes only the hash.
  const activeHomeTab=()=>{
    const query=new URLSearchParams(location.search);
    if(!['/','/index.html'].includes(location.pathname)||query.get('clan')||query.get('tag'))return;
    const tab=location.hash.slice(1),section=tab==='player'?'player':tab.startsWith('compare')?'compare':tab==='clan'||tab==='clan-name'?'clan':'home';
    for(const link of header.querySelectorAll('a[data-nav-section]')){link.removeAttribute('aria-current');if(link.dataset.navSection===section&&!link.closest('details'))link.setAttribute('aria-current','page');}
    for(const item of dropdowns)item.querySelector('summary').classList.toggle('is-current',item.dataset.navSection===section);
  };
  activeHomeTab();window.addEventListener('hashchange',activeHomeTab);
  header.addEventListener('click',event=>{if(event.target.closest('[data-home-tab-link]'))setTimeout(activeHomeTab,0);});
});

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
