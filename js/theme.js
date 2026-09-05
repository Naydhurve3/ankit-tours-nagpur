// Shared theme controller for the public site and owner portal.
(function(){
  const KEY = 'att_theme';
  const VALID = new Set(['light', 'dark', 'system']);
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  function preference(){ try { const saved=localStorage.getItem(KEY); return VALID.has(saved)?saved:'light'; } catch(_){ return 'light'; } }
  function effective(value){ return value==='system'?(systemTheme.matches?'dark':'light'):value; }
  function controls(){ return [...document.querySelectorAll('#themeToggle, #adminThemeToggle, [data-theme-toggle]')]; }
  function apply(value, announce){
    const selected=VALID.has(value)?value:'light'; const active=effective(selected); const isDark=active==='dark';
    document.documentElement.dataset.theme=active; document.documentElement.style.colorScheme=active;
    let meta=document.querySelector('meta[name="theme-color"]');
    if(!meta){ meta=document.createElement('meta'); meta.name='theme-color'; document.head.appendChild(meta); }
    meta.content=isDark?'#111315':'#edf2f5';
    controls().forEach(button=>{
      button.textContent=isDark?'☀️':'🌙'; button.setAttribute('aria-label',isDark?'Switch to light theme':'Switch to dark theme');
      button.setAttribute('aria-pressed',String(isDark)); button.title=isDark?'Switch to light theme':'Switch to dark theme';
      if(announce) button.classList.add('theme-changed'); window.setTimeout(()=>button.classList.remove('theme-changed'),360);
    });
    document.querySelectorAll('#themeSelect, [data-theme-select]').forEach(select=>{ select.value=selected; });
    window.dispatchEvent(new CustomEvent('themechange',{detail:{preference:selected,theme:active}}));
  }
  function set(value,announce){ const selected=VALID.has(value)?value:'light'; try{localStorage.setItem(KEY,selected);}catch(_){} apply(selected,announce); }
  const api={set(value){set(value,true);},toggle(){set(effective(preference())==='dark'?'light':'dark',true);},get:preference,effective(){return effective(preference());}};
  window.Theme=api; apply(preference(),false);
  function bind(){
    controls().forEach(button=>{ if(button.dataset.themeBound)return; button.dataset.themeBound='true'; button.addEventListener('click',api.toggle); });
    document.querySelectorAll('#themeSelect, [data-theme-select]').forEach(select=>{ if(select.dataset.themeBound)return; select.dataset.themeBound='true'; select.addEventListener('change',event=>api.set(event.target.value)); });
    apply(preference(),false); requestAnimationFrame(()=>document.documentElement.classList.add('theme-ready'));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind,{once:true}); else bind();
  const systemChanged=()=>{if(preference()==='system')apply('system',false);};
  if(systemTheme.addEventListener)systemTheme.addEventListener('change',systemChanged); else if(systemTheme.addListener)systemTheme.addListener(systemChanged);
  window.addEventListener('storage',event=>{if(event.key===KEY)apply(preference(),false);});
})();
