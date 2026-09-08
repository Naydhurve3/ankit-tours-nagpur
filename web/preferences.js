(function(){
  const root=document.documentElement;
  const system=matchMedia('(prefers-color-scheme: dark)');
  const read=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch{return fallback;}};
  let theme=read('replica_v2_theme','light'), language=read('replica_v2_language','both');
  const valid=['light','dark','system'];
  if(!valid.includes(theme))theme='light';
  if(!['both','en','mr'].includes(language))language='both';
  function apply(){
    const active=theme==='system'?(system.matches?'dark':'light'):theme;
    root.dataset.theme=active;root.dataset.language=language;root.lang=language==='mr'?'mr':'en';root.style.colorScheme=active;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',active==='dark'?'#15191e':'#f3f5f8');
    document.querySelectorAll('[data-theme-select]').forEach(el=>el.value=theme);
    document.querySelectorAll('[data-language-select]').forEach(el=>el.value=language);
  }
  window.Preferences={apply,setTheme(value){theme=valid.includes(value)?value:'light';try{localStorage.setItem('replica_v2_theme',theme);}catch{}apply();},setLanguage(value){language=['en','mr','both'].includes(value)?value:'both';try{localStorage.setItem('replica_v2_language',language);}catch{}apply();}};
  apply();system.addEventListener('change',apply);
  window.addEventListener('storage',event=>{if(event.key==='replica_v2_theme'){theme=valid.includes(event.newValue)?event.newValue:'light';apply();}if(event.key==='replica_v2_language'){language=['both','mr','en'].includes(event.newValue)?event.newValue:'both';apply();}});
  document.addEventListener('change',event=>{if(event.target.matches('[data-theme-select]'))window.Preferences.setTheme(event.target.value);if(event.target.matches('[data-language-select]'))window.Preferences.setLanguage(event.target.value);});
})();
