// Theme: Light / Dark / System per spec 22
(function(){
  const KEY = 'att_theme';
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  function getSystem(){ return mql.matches ? 'dark' : 'light'; }
  function getSaved(){ return localStorage.getItem(KEY) || 'light'; }
  function resolve(val){
    if(val==='light' || val==='dark') return val;
    return getSystem();
  }
  function apply(val){
    const effective = resolve(val);
    document.documentElement.setAttribute('data-theme', effective);
    // meta
    let meta = document.querySelector('meta[name="color-scheme"]');
    if(!meta){ meta=document.createElement('meta'); meta.name='color-scheme'; document.head.appendChild(meta); }
    meta.content = effective==='dark' ? 'dark light' : 'light dark';
    // theme-color
    let tc = document.querySelector('meta[name="theme-color"]');
    if(!tc){ tc=document.createElement('meta'); tc.name='theme-color'; document.head.appendChild(tc); }
    tc.content = effective==='dark' ? '#09171C' : '#F7F1E7';
    // update button aria
    const btn = document.getElementById('themeToggle');
    if(btn){
      const isDark = effective==='dark';
      btn.textContent = isDark ? '☀️' : '🌙';
      btn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
      btn.title = isDark ? 'Switch to light theme' : 'Switch to dark theme';
    }
    // sync select if exists
    const sel = document.getElementById('themeSelect');
    if(sel) sel.value = val;
  }
  function save(val){ localStorage.setItem(KEY, val); }
  // early apply before paint already done via inline script, but ensure
  const initial = getSaved();
  apply(initial);

  // listen system changes when System
  const onSystemChange = ()=>{ if(getSaved()==='system') apply('system'); };
  if(mql.addEventListener) mql.addEventListener('change', onSystemChange);
  else if(mql.addListener) mql.addListener(onSystemChange);

  window.Theme = {
    toggle(){
      const cur = resolve(getSaved());
      const next = cur==='dark' ? 'light' : 'dark';
      // toggling via header button is light/dark only; system via select
      save(next); apply(next);
    },
    set(val){ save(val); apply(val); },
    get(){ return getSaved(); },
    effective(){ return resolve(getSaved()); }
  };

  document.addEventListener('DOMContentLoaded', ()=>{
    document.getElementById('themeToggle')?.addEventListener('click', ()=> window.Theme.toggle());
    document.getElementById('themeSelect')?.addEventListener('change', e=> window.Theme.set(e.target.value));
    apply(getSaved());
  });
})();
