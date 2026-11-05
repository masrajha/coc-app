<?php
declare(strict_types=1);
namespace CocTracker;

/** One server-rendered navigation shell for app and directory/guide pages. */
final class SiteNavigation
{
    public static function decorate(string $html, string $locale, string $path, array $query=[]): string
    {
        if (str_contains($html,'id="globalPrimaryNavigation"')) return $html;
        $pattern='~<header\b[^>]*class="[^"]*\bcommand-header\b[^"]*"[^>]*>.*?</header>~is';
        if (!preg_match($pattern,$html,$match)) return $html;
        // These application-owned headers contain flat anchors, labels and forms.
        // Preserve their controls verbatim without requiring the DOM PHP extension.
        if (!preg_match('~<a\b(?=[^>]*\bclass="[^"]*\b(?:command-brand|home-brand)\b)[^>]*>.*?</a>~is',$match[0],$brand)) return $html;
        $brandHtml=$brand[0];$appearance='';$actions='';
        preg_match('~<nav\b[^>]*>(.*?)</nav>~is',$match[0],$navMatch);$nav=$navMatch[1] ?? '';
        preg_match_all('~<label\b[^>]*>.*?</label>|<a\b[^>]*\blang="[^"]*"[^>]*>.*?</a>~is',$nav,$controls);
        foreach ($controls[0] as $control) if (str_contains($control,'data-language-switch') || str_contains($control,'data-theme-switch') || preg_match('~^<a\b~i',$control)) $appearance.=$control;
        preg_match_all('~<a\b[^>]*>.*?</a>|<form\b[^>]*>.*?</form>~is',$nav,$controls);
        foreach ($controls[0] as $control) if (preg_match('~^<form\b|\bclass="[^"]*\b(?:back-link|header-profile-link)\b|\bid="(?:backLink|compareLink)"~i',$control)) $actions.=$control;
        $word=static fn(string $id,string $en):string=>$locale==='en'?$en:$id;
        $escape=static fn(string $value):string=>htmlspecialchars($value,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
        $url=static fn(string $route,string $hash=''):string=>$route.'?lang='.($locale==='en'?'en':'id').($hash!==''?'#'.$hash:'');
        $active=match(true){$path==='/tools/zapquake'=>'zapquake',$path==='/clan.html'||(in_array($path,['/','/index.html'],true)&&(!empty($query['clan'])||!empty($query['tag'])))=>'clan',$path==='/player.html'=>'player',in_array($path,['/compare.html','/compare-clan.html'],true)=>'compare',$path==='/leaderboards'=>'rankings',str_starts_with($path,'/explore/')||str_starts_with($path,'/features')||str_starts_with($path,'/guides')=>'explore',default=>'home'};
        $link=static function(string $href,string $label,string $key,string $section,string $tab='') use ($escape,$active):string {
            return '<a href="'.$escape($href).'" data-nav-section="'.$section.'"'.($active===$section&&!in_array($section,['compare','explore'],true)?' aria-current="page"':'').($tab!==''?' data-home-tab-link="'.$tab.'"':'').'><span data-i18n="'.$key.'">'.$escape($label).'</span></a>';
        };
        $links=$link($url('/'),$word('Beranda','Home'),'globalNav.home','home');
        $links.=$link($url('/','clan'),$word('Cari klan','Find clan'),'globalNav.clan','clan','clan');
        $links.=$link($url('/','player'),$word('Cari pemain','Find player'),'globalNav.player','player','player');
        $links.='<details class="global-nav-dropdown" data-nav-section="compare"><summary'.($active==='compare'?' class="is-current"':'').'>'.$word('Bandingkan','Compare').'</summary><div class="global-nav-dropdown-panel">';
        $compare=$link($url('/','compare'),$word('Bandingkan pemain','Compare players'),'globalNav.comparePlayers','compare','compare');
        if (str_contains($nav,'id="comparePlayersLink"')) $compare=str_replace('<a ','<a id="comparePlayersLink" ',$compare);
        $links.=$compare.$link($url('/','compare-clan'),$word('Bandingkan klan','Compare clans'),'globalNav.compareClans','compare','compare-clan').'</div></details>';
        $links.=$link($url('/leaderboards'),'Leaderboard','globalNav.rankings','rankings');
        $links.=$link($url('/tools/zapquake'),$word('Kalkulator Zapquake','Zapquake Calculator'),'zap.title','zapquake');
        $links.='<details class="global-nav-dropdown" data-nav-section="explore"><summary'.($active==='explore'?' class="is-current"':'').'>'.$word('Jelajahi','Explore').'</summary><div class="global-nav-dropdown-panel">';
        foreach ([['/features','Fitur','Features','globalNav.features'],['/guides','Panduan','Guides','globalNav.guides'],['/explore/clans','Direktori klan','Clan directory','globalNav.clans'],['/explore/players','Direktori pemain','Player directory','globalNav.players']] as [$route,$id,$en,$key]) $links.=$link($url($route),$word($id,$en),$key,'explore');
        $links.='</div></details>';
        $header='<header class="site-header command-header global-header"><div class="global-header-row">'.$brandHtml.'<button class="global-nav-toggle" type="button" aria-expanded="false" aria-controls="globalNavigationMenu"><span aria-hidden="true">☰</span> Menu</button><div id="globalNavigationMenu" class="global-header-menu"><nav id="globalPrimaryNavigation" class="global-primary-nav" aria-label="'.$word('Navigasi utama','Main navigation').'">'.$links.'</nav><div class="global-appearance">'.$appearance.'</div></div></div>'.($actions!==''?'<div class="global-page-actions" aria-label="'.$word('Kontrol halaman','Page controls').'">'.$actions.'</div>':'').'</header>';
        $html=preg_replace_callback($pattern,static fn()=>$header,$html,1);
        if (!str_contains($html,'src="/js/site.js')) $html=str_replace('</head>','<script src="/js/site.js" defer></script></head>',$html);
        return $html;
    }
}
