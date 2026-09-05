// Main public logic
document.addEventListener("DOMContentLoaded", async ()=>{
  const route=location.pathname;
  document.body.dataset.pageTone=route.startsWith('/travel')?'travel':route.startsWith('/banking')?'banking':route.startsWith('/print')?'printing':route.startsWith('/online')?'online':route.startsWith('/contact')?'contact':'neutral';
  // Branded loader: long enough to read, short enough to stay out of the way.
  const loader = document.getElementById("siteLoader");
  const loaderStarted = performance.now();
  const finishLoader = ()=>{
    const wait = Math.max(0, 1150-(performance.now()-loaderStarted));
    window.setTimeout(()=>{ loader?.classList.add("is-done"); document.body.classList.remove("is-loading"); },wait);
  };
  if(document.readyState==="complete") finishLoader(); else window.addEventListener("load",finishLoader,{once:true});
  window.setTimeout(finishLoader,2600);
  // lang
  const savedLang = localStorage.getItem("att_lang") || "en";
  applyI18n(savedLang);
  document.querySelectorAll(".lang-switch button").forEach(b=> b.addEventListener("click", ()=> applyI18n(b.dataset.lang)));

  // mobile nav
  const ham = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");
  const header = document.querySelector(".header");
  const setMenu = open=>{
    navLinks?.classList.toggle("open", open);
    ham?.setAttribute("aria-expanded", String(open));
    ham?.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("nav-open", open);
    if(open) header?.classList.remove("header-hidden");
  };
  if(ham) ham.addEventListener("click", ()=> setMenu(!navLinks.classList.contains("open")));
  document.querySelectorAll("#navLinks a").forEach(a=> a.addEventListener("click", ()=> setMenu(false)));
  document.addEventListener("click", e=>{
    if(navLinks?.classList.contains("open") && !e.target.closest(".nav")) setMenu(false);
  });
  document.addEventListener("keydown", e=>{ if(e.key==="Escape") setMenu(false); });

  // Compact mobile header: hide on downward scroll, reveal on upward scroll.
  let lastY = window.scrollY;
  let scrollTick = false;
  const syncHeader = ()=>{
    const y = Math.max(window.scrollY, 0);
    header?.classList.toggle("scrolled", y > 18);
    if(window.innerWidth <= 1100 && !navLinks?.classList.contains("open")){
      header?.classList.toggle("header-hidden", y > 120 && y > lastY + 4);
      if(y < lastY - 4 || y < 50) header?.classList.remove("header-hidden");
    }else header?.classList.remove("header-hidden");
    lastY = y;
    scrollTick = false;
  };
  window.addEventListener("scroll", ()=>{
    if(!scrollTick){ scrollTick=true; requestAnimationFrame(syncHeader); }
  },{passive:true});
  window.addEventListener("resize", ()=>{ if(window.innerWidth>1100) setMenu(false); syncHeader(); });

  // Mobile quick actions stay available without permanently covering content.
  const actionDock=document.querySelector('.mobile-action-dock');
  let dockTimer;
  const revealDock=()=>{
    actionDock?.classList.remove('dock-hidden');
    clearTimeout(dockTimer);
    if(window.innerWidth<=640) dockTimer=window.setTimeout(()=>actionDock?.classList.add('dock-hidden'),3200);
  };
  actionDock?.addEventListener('pointerenter',()=>{ clearTimeout(dockTimer); actionDock.classList.remove('dock-hidden'); });
  actionDock?.addEventListener('pointerleave',revealDock);
  actionDock?.addEventListener('focusin',()=>{ clearTimeout(dockTimer); actionDock.classList.remove('dock-hidden'); });
  actionDock?.addEventListener('click',revealDock);
  window.addEventListener('scroll',()=>{
    if(window.innerWidth>640) return;
    const movingUp=window.scrollY<lastY;
    if(movingUp || window.scrollY<100) revealDock();
    else if(window.scrollY>180) actionDock?.classList.add('dock-hidden');
  },{passive:true});
  revealDock();

  // active nav on scroll
  const sections = document.querySelectorAll("section[id]");
  const navAs = document.querySelectorAll("#navLinks a");
  const observerNav = new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        navAs.forEach(a=> a.classList.toggle("active", a.getAttribute("href")==="#"+e.target.id));
      }
    });
  },{rootMargin:"-40% 0px -50% 0px", threshold:0});
  sections.forEach(s=> observerNav.observe(s));

  // reveal
  const reveals = document.querySelectorAll(".reveal");
  const revObs = new IntersectionObserver(es=>{
    es.forEach(en=> { if(en.isIntersecting) en.target.classList.add("in"); });
  },{threshold:0.12});
  reveals.forEach(r=> revObs.observe(r));

  // load data
  const data = await loadData();
  renderFleet(data.fleet);
  renderPackages(data.packages);
  renderGallery(data.gallery);
  renderTestimonials(data.testimonials);

  // Replica Click: grouped catalogue + dedicated group pages
  const replicaServices = await loadReplicaServices();
  const customServices = await loadCustomServices();
  customServices.forEach(item=>{
    const category=replicaServices.find(service=>service.id===item.category_id);
    if(!category)return;
    category.items=[...(category.items||[]),item.name_en];
    category.itemsMr=[...(category.itemsMr||[]),item.name_mr||''];
    category.customIds=[...(category.customIds||[]),item.id];
    category.customSettings={...(category.customSettings||{}),[item.id]:item};
  });
  window._serviceSettings = await loadServiceSettings();
  const serviceGroups = await loadServiceGroups();
  window._groups=serviceGroups; window._replicaServices=replicaServices;
  renderServiceGroups(serviceGroups, replicaServices);
  renderReplicaServices(replicaServices);
  setupOnlineServiceDialog(replicaServices, setMenu);
  // initial group from URL ?group= or /services/<id>.html path — Home starts with only groups visible (no clutter)
  const initialGroup = getInitialGroup();
  if(initialGroup) applyGroup(initialGroup, serviceGroups, replicaServices, false);
  else {
    // Home clean: hide detailed catalog and all tour-related sections until a group is chosen (per spec homepage = 4 cards only)
    document.getElementById('replicaCatalogWrap')?.classList.add('hidden');
    document.getElementById('popularStrip')?.classList.add('hidden');
    document.getElementById('groupPlaceholder')?.classList.remove('hidden');
    ['services','fleet','packages','routes','about','why','gallery','testimonials'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.classList.add('filtered-hidden');
    });
  }
  document.querySelectorAll('[data-popular]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const val=btn.getAttribute('data-popular')||'';
      const search=document.getElementById('onlineServiceSearch');
      if(search){ search.value=val; search.dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('replicaServices')?.scrollIntoView({behavior:'smooth', block:'start'}); }
      else document.dispatchEvent(new CustomEvent('replica:enquire',{detail:{service:val}}));
    });
  });
  document.getElementById('backToAll')?.addEventListener('click', ()=> clearGroup(serviceGroups, replicaServices));
  window.addEventListener('popstate', ()=>{
    const g = new URLSearchParams(location.search).get('group');
    if(g) applyGroup(g, serviceGroups, replicaServices, false);
    else clearGroup(serviceGroups, replicaServices, false);
  });

  // Expandable service cards save space while remaining touch and keyboard friendly.
  document.querySelectorAll(".service-toggle").forEach(btn=>btn.addEventListener("click",()=>{
    const card=btn.closest(".service-card");
    const expanded=!card.classList.contains("expanded");
    card.classList.toggle("expanded",expanded);
    btn.setAttribute("aria-expanded",String(expanded));
    btn.firstChild.textContent=expanded ? "Hide details " : "View details ";
  }));

  // gallery filter
  document.querySelectorAll("[data-filter]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll("[data-filter]").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      const f = btn.dataset.filter;
      document.querySelectorAll(".gitem").forEach(el=>{
        el.classList.toggle("hidden", f!=="all" && el.dataset.category!==f);
      });
    });
  });

  // lightbox
  const dlg = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbTitle = document.getElementById("lbTitle");
  document.addEventListener("click", e=>{
    const g = e.target.closest(".gitem");
    if(g && g.dataset.src){
      lbImg.src = g.dataset.src;
      lbTitle.textContent = g.dataset.title || "";
      dlg.showModal();
    }
  });
  document.getElementById("lbClose")?.addEventListener("click", ()=> dlg.close());
  dlg?.addEventListener("click", e=>{ if(e.target===dlg) dlg.close(); });

  // hero quick form -> whatsapp
  document.getElementById("heroForm")?.addEventListener("submit", handleHeroForm);
  document.getElementById("contactForm")?.addEventListener("submit", handleContactForm);

  // Accessible quick-quote popup and a small, one-time trip prompt.
  const quoteDialog = document.getElementById("quoteDialog");
  const openQuote = ()=>{
    setMenu(false);
    if(!quoteDialog?.open) quoteDialog?.showModal();
    window.setTimeout(()=> quoteDialog?.querySelector("input")?.focus(), 80);
  };
  document.querySelectorAll(".quote-trigger").forEach(btn=>btn.addEventListener("click", openQuote));
  document.getElementById("quoteClose")?.addEventListener("click", ()=>quoteDialog.close());
  quoteDialog?.addEventListener("click", e=>{ if(e.target===quoteDialog) quoteDialog.close(); });
  document.getElementById("quoteForm")?.addEventListener("submit", handleQuoteForm);

  const nudge = document.getElementById("smartNudge");
  const dismissNudge = ()=>{
    if(nudge) nudge.hidden=true;
    try{ sessionStorage.setItem("att_nudge_seen","1"); }catch{}
  };
  nudge?.querySelector(".nudge-close")?.addEventListener("click", dismissNudge);
  nudge?.querySelector(".nudge-action")?.addEventListener("click", dismissNudge);
  let replicaInView=false;
  const replicaSection=document.getElementById('replicaCenter');
  if(replicaSection && nudge){
    new IntersectionObserver(entries=>{
      replicaInView=entries.some(entry=>entry.isIntersecting);
      if(replicaInView) nudge.hidden=true;
    },{threshold:.08}).observe(replicaSection);
  }
  try{
    if(!sessionStorage.getItem("att_nudge_seen")) window.setTimeout(()=>{ if(nudge && !quoteDialog?.open && !replicaInView) nudge.hidden=false; },12000);
  }catch{}
});

function esc(s){ if(s===null || s===undefined) return ''; return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function vehicleKind(f){ const n=(f.vehicle_type||f.name||'').toLowerCase(); return /traveller|tempo|van|bus/.test(n)?'traveller':/sedan|dzire|aura/.test(n)?'sedan':'suv'; }
function safeColor(value){ return /^#[0-9a-f]{6}$/i.test(value||'') ? value : '#d96c2c'; }
function vehicle3dMarkup(f){
  const kind=vehicleKind(f), color=safeColor(f.model_color);
  return `<div class="vehicle-stage" style="--vehicle-color:${color}" aria-label="Stylised 3D ${esc(f.name)} vehicle illustration" role="img">
    <span class="vehicle-visual-label">Interactive 3D</span>
    <div class="vehicle-3d ${kind}"><span class="car-body"></span><span class="car-window"></span><span class="car-wheel wheel-a"></span><span class="car-wheel wheel-b"></span><span class="car-light"></span></div>
  </div>`;
}
function renderFleet(fleet){
  const wrap = document.getElementById("fleetGrid");
  if(!wrap) return;
  const items = visibleOnly(fleet);
  if(items.length===0){ wrap.innerHTML = '<p class="muted" style="grid-column:1/-1;text-align:center">No vehicles available at the moment.</p>'; return;}
  wrap.innerHTML = items.map(f=> {
    const mode=['3d','photo','auto'].includes(f.display_mode)?f.display_mode:'3d';
    const hasPhoto=Boolean(f.image);
    const visual=mode==='photo'&&hasPhoto
      ? `${vehicle3dMarkup(f)}<img class="vehicle-photo" src="${esc(f.image)}" alt="${esc(f.name)}" loading="lazy" onerror="this.closest('.fleet-card').classList.remove('photo-mode');this.style.display='none'">`
      : `${vehicle3dMarkup(f)}${mode==='auto'&&hasPhoto?`<img class="vehicle-photo" src="${esc(f.image)}" alt="${esc(f.name)}" loading="lazy"><button class="visual-toggle" type="button" aria-label="Switch ${esc(f.name)} between 3D and photo">View photo</button>`:''}`;
    return `
    <article class="glass-card fleet-card reveal in ${mode==='photo'&&hasPhoto?'photo-mode':''}" data-mode="${mode}">
      ${visual}
      <div class="fleet-body">
        <h3>${esc(f.name)}</h3>
        <div class="fleet-meta"><span>${esc(f.seating)}</span><span>${esc(f.price)}</span></div>
        <p class="small muted">${esc(f.features||'')}</p>
        <a class="btn btn-primary" style="margin-top:12px;width:100%;justify-content:center" href="https://wa.me/917276066532?text=${encodeURIComponent('Hi Ankit Tours, I want to book '+f.name+' ('+f.seating+')')}" target="_blank">Book ${esc(f.name)}</a>
      </div>
    </article>
  `}).join("");
  wrap.querySelectorAll('.visual-toggle').forEach(btn=>btn.addEventListener('click',()=>{
    const card=btn.closest('.fleet-card'); const photo=card.classList.toggle('show-photo'); btn.textContent=photo?'View 3D':'View photo';
  }));
}

function renderPackages(pkgs){
  const tbody = document.getElementById("pkgBody");
  if(!tbody) return;
  const items = visibleOnly(pkgs);
  if(items.length===0){ tbody.innerHTML = '<tr><td colspan="5" style="text-align:center" class="muted">No packages available</td></tr>'; return;}
  tbody.innerHTML = items.map(p=> `
    <tr>
      <td data-label="Service"><b>${esc(p.service)}</b></td>
      <td data-label="Vehicle"><span class="tag">${esc(p.vehicle)}</span></td>
      <td data-label="Price"><b style="color:var(--primary)">${esc(p.price)}</b></td>
      <td data-label="Note" class="muted small">${esc(p.note||'')}</td>
      <td data-label="Action"><a class="btn btn-primary" style="padding:8px 14px;font-size:13px" href="https://wa.me/917276066532?text=${encodeURIComponent('Hi, enquiry for '+p.service+' - '+p.vehicle+' - '+p.price)}" target="_blank">Book Now</a></td>
    </tr>
  `).join("");
}

function renderGallery(gallery){
  const grid = document.getElementById("galleryGrid");
  if(!grid) return;
  const items = visibleOnly(gallery);
  if(items.length===0){ grid.innerHTML = '<p class="muted">No images available.</p>'; return;}
  grid.innerHTML = items.map(g=> {
    const stock=/images\.unsplash\.com/i.test(g.src||'');
    const symbol=g.category==='safari'?'🐅':g.category==='pilgrimage'?'ॐ':'🚕';
    return stock ? `<div class="gitem local-poster" data-category="${esc(g.category)}" data-symbol="${symbol}" data-title="${esc(g.title||'')}"><div class="cap">${esc(g.title||g.category)}</div></div>`
      : `<div class="gitem" data-category="${esc(g.category)}" data-src="${esc(g.src)}" data-title="${esc(g.title||'')}"><img src="${esc(g.src)}" alt="${esc(g.title||g.category)}" loading="lazy"><div class="cap">${esc(g.title||g.category)}</div></div>`;
  }).join("");
}

function renderTestimonials(tests){
  const wrap = document.getElementById("testiSlider");
  if(!wrap) return;
  const items = visibleOnly(tests);
  if(items.length===0){ wrap.innerHTML='<p class="muted">No testimonials yet.</p>'; return;}
  wrap.innerHTML = items.map(t=> `
    <div class="testi">
      <div class="stars">${'★'.repeat(t.rating||5)}<span style="color:#cbd5e1">${'★'.repeat(5-(t.rating||5))}</span></div>
      <p>"${esc(t.text)}"</p>
      <b>${esc(t.name)}</b><br><span class="small muted">${esc(t.place||'')}</span>
    </div>
  `).join("");
}

async function fetchJsonWithFallback(paths){
  for(const p of paths){
    try{
      const r=await fetch(p);
      if(r.ok) return await r.json();
    }catch{}
  }
  return null;
}
async function loadReplicaServices(){
  const data = await fetchJsonWithFallback(['/assets/data/replica-services.json','assets/data/replica-services.json','../assets/data/replica-services.json']);
  if(Array.isArray(data)) return data;
  if(data) return Array.isArray(data)?data:[];
  console.warn('Replica Click services could not be loaded');
  return [];
}

async function loadServiceSettings(){
  try{
    const response=await fetch('/api/service-settings');
    if(response.ok){
      const rows=await response.json();
      return Object.fromEntries(rows.map(row=>[row.service_id,row]));
    }
  }catch{}
  return {};
}

async function loadCustomServices(){
  try{const response=await fetch('/api/service-groups?kind=custom');if(response.ok)return await response.json();}catch{}
  return [];
}

function serviceItems(service){
  return (service.items||[]).map((label,index)=>{
    const customOffset=(service.items||[]).length-(service.customIds||[]).length;
    const customId=index>=customOffset?(service.customIds||[])[index-customOffset]:null;
    const id=customId?`custom-${customId}`:`${service.id}-${index+1}`;
    const setting=customId?(service.customSettings?.[customId]||{}):(window._serviceSettings?.[id]||{});
    return {id,label,labelMr:(service.itemsMr||[])[index]||'',setting};
  }).filter(item=>item.setting.visible!==false)
    .sort((a,b)=>Number(b.setting.pinned===true)-Number(a.setting.pinned===true));
}

function serviceItemsMarkup(service){
  return serviceItems(service).map(item=>`<li class="${item.setting.pinned?'is-pinned':''}">${item.setting.pinned?'<span class="pin-label">★ Featured • विशेष</span>':''}<span>${esc(item.label)}</span>${item.labelMr?`<span class="marathi-copy" lang="mr">${esc(item.labelMr)}</span>`:''}${item.setting.price?`<b class="service-price">${esc(item.setting.price)}</b>`:''}${item.setting.price_note?`<small>${esc(item.setting.price_note)}</small>`:''}</li>`).join('');
}

function renderReplicaServices(services){
  const grid=document.getElementById('onlineServiceGrid');
  const search=document.getElementById('onlineServiceSearch');
  if(!grid) return;

  const draw=(query='')=>{
    const needle=query.trim().toLowerCase();
    const filtered=services.filter(service=>{
      const haystack=[service.title,...(service.items||[])].join(' ').toLowerCase();
      return !needle || haystack.includes(needle);
    });
    if(!filtered.length){
      grid.innerHTML='<p class="replica-empty">No matching service found. Ask us on WhatsApp and we will guide you.</p>';
      return;
    }
    grid.innerHTML=filtered.map((service,index)=>{
      const panelId=`online-service-panel-${service.id||index}`;
      return `
      <article class="online-service-card">
        <div class="online-service-heading">
          <span class="online-service-icon" aria-hidden="true">${esc(service.icon||'✓')}</span>
          <div><span class="online-service-number">${String(index+1).padStart(2,'0')}</span><h3>${esc(service.title)}${service.titleMr?`<span class="marathi-copy" lang="mr">${esc(service.titleMr)}</span>`:''}</h3></div>
        </div>
        <button class="online-service-toggle" type="button" aria-expanded="false" aria-controls="${esc(panelId)}">
          <span class="toggle-label">Expand services</span> <span class="toggle-symbol" aria-hidden="true">＋</span>
        </button>
        <div class="online-service-details" id="${esc(panelId)}">
          <ul>${serviceItemsMarkup(service)}</ul>
          <button class="btn btn-primary online-card-enquire" type="button" data-service="${esc(service.title)}">Enquire on WhatsApp</button>
        </div>
      </article>`;
    }).join('');

    grid.querySelectorAll('.online-service-toggle').forEach(button=>button.addEventListener('click',()=>{
      const card=button.closest('.online-service-card');
      const expanded=!card.classList.contains('expanded');
      grid.querySelectorAll('.online-service-card.expanded').forEach(openCard=>{
        if(openCard===card) return;
        openCard.classList.remove('expanded');
        const openButton=openCard.querySelector('.online-service-toggle');
        openButton?.setAttribute('aria-expanded','false');
        if(openButton) openButton.querySelector('.toggle-label').textContent='Expand services';
        if(openButton) openButton.querySelector('.toggle-symbol').textContent='＋';
      });
      card.classList.toggle('expanded',expanded);
      button.setAttribute('aria-expanded',String(expanded));
      button.querySelector('.toggle-label').textContent=expanded ? 'Minimize services' : 'Expand services';
      button.querySelector('.toggle-symbol').textContent=expanded ? '−' : '＋';
    }));
    grid.querySelectorAll('.online-card-enquire').forEach(button=>button.addEventListener('click',()=>{
      document.dispatchEvent(new CustomEvent('replica:enquire',{detail:{service:button.dataset.service}}));
    }));
  };
  draw();
  search?.addEventListener('input',event=>draw(event.target.value));
}

function setupOnlineServiceDialog(services,setMenu){
  const dialog=document.getElementById('onlineServiceDialog');
  const form=document.getElementById('onlineServiceForm');
  const select=document.getElementById('onlineServiceSelect');
  if(!dialog || !form || !select) return;
  select.innerHTML='<option value="">Choose a service category</option>'+services.map(service=>`<option value="${esc(service.title)}">${esc(service.title)}</option>`).join('');
  const open=(service='')=>{
    setMenu(false);
    select.value=service;
    if(!dialog.open) dialog.showModal();
    window.setTimeout(()=>form.querySelector('input')?.focus(),80);
  };
  document.querySelectorAll('.online-request-trigger').forEach(button=>button.addEventListener('click',()=>open(button.dataset.service||'')));
  document.addEventListener('replica:enquire',event=>open(event.detail?.service||''));
  document.getElementById('onlineServiceClose')?.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{ if(event.target===dialog) dialog.close(); });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const fd=new FormData(form);
    const file=fd.get('document');
    const hasFile=file && file instanceof File && file.size>0;
    if(hasFile && file.size>5*1024*1024){ showToast('Document too large — max 5MB. Bring original to center.'); return; }
    const details={
      name:fd.get('name')?.toString().trim(),
      phone:fd.get('phone')?.toString().trim(),
      service:fd.get('service')?.toString().trim(),
      message:fd.get('message')?.toString().trim(),
      source:'replica-online-service',
      documentName: hasFile? file.name : ''
    };
    const consent=fd.get('consent');
    if(!details.name || !details.phone || !details.service){ showToast('Please add your name, mobile number and service'); return; }
    if(!consent){ showToast('Please accept the consent checkbox'); return; }
    const extra = details.documentName ? `%0AAttachment: ${encodeURIComponent(details.documentName)} (original to be shown at center)` : '';
    const text=`Namaskar Replica Click,%0AName: ${encodeURIComponent(details.name)}%0APhone: ${encodeURIComponent(details.phone)}%0AService: ${encodeURIComponent(details.service)}%0AWork details: ${encodeURIComponent(details.message||'Please guide me about the required process and documents.')}${extra}%0A%0AI will not send OTP, PIN, password or sensitive ID details here.`;
    saveBooking(details);
    dialog.close();
    form.reset();
    showToast('Request received — opening WhatsApp. Owner will confirm documents and charges.');
    window.open(`https://wa.me/917276066532?text=${text}`,'_blank','noopener');
  });
}

async function loadServiceGroups(){
  // Prefer live DB (public) for owner-edited visibility/order, fallback to static seed
  try{
    const r=await fetch('/api/service-groups?public=true');
    if(r.ok){
      const j=await r.json();
      if(Array.isArray(j) && j.length) return j;
    }
  }catch{}
  const j=await fetchJsonWithFallback(['/assets/data/service-groups.json','assets/data/service-groups.json','../assets/data/service-groups.json']);
  return Array.isArray(j)?j:[];
}
function renderServiceGroups(groups, replicaServices){
  const wrap=document.getElementById('serviceGroups');
  if(!wrap) return;
  wrap.innerHTML = groups.map(g=>{
    const count = g.replicaIds ? replicaServices.filter(s=> g.replicaIds.includes(s.id)).length : 0;
    const tourCount = g.includeTour ? 6 : 0;
    const total = count + tourCount;
    const titleMr = g.title_mr ? `<span class="marathi-copy" lang="mr" style="display:block;font-size:11px;color:var(--muted)">${esc(g.title_mr)}</span>` : '';
    const descMr = g.description_mr ? `<span class="marathi-copy" lang="mr" style="display:block;font-size:11px;color:var(--muted)">${esc(g.description_mr)}</span>` : '';
    return `<div class="group-card" role="button" tabindex="0" data-group="${esc(g.id)}" style="--group-accent:${esc(g.color)}" aria-label="View ${esc(g.title)}">
      <div class="group-icon" style="background: color-mix(in srgb, ${esc(g.color)} 14%, var(--surface-elevated)); border-color: color-mix(in srgb, ${esc(g.color)} 22%, var(--border))">${esc(g.icon)}</div>
      <div class="group-title">${esc(g.title)}${titleMr}</div>
      <div class="group-desc">${esc(g.description||g.desc||'')}${descMr}</div>
      <small>${total} services • <span style="opacity:.6">Live</span></small>
      <span class="group-count">${total}</span>
      <button class="group-explore" type="button" data-explore="${esc(g.id)}" aria-label="Explore ${esc(g.title)} page">Explore →</button>
    </div>`;
  }).join('') + `<button class="group-card" type="button" data-group="all" style="border-style:dashed;--group-accent:#627076"><div class="group-icon">✦</div><div class="group-title">All Services</div><div class="group-desc">Show everything together</div><small>Back to home view</small></button>`;
  wrap.querySelectorAll('.group-card').forEach(card=>{
    const gid=card.getAttribute('data-group');
    const explore=card.querySelector('[data-explore]');
    card.addEventListener('click', (e)=>{
      if(e.target.closest('[data-explore]')) return; // let explore button handle navigation
      if(gid==='all') clearGroup(groups, replicaServices);
      else applyGroup(gid, groups, replicaServices, true);
    });
    card.addEventListener('keydown', e=>{
      if(e.key==='Enter' || e.key===' '){ e.preventDefault(); card.click(); }
    });
    if(explore){
      explore.addEventListener('click', (e)=>{
        e.stopPropagation();
        explore.textContent='Opening…';
        // new hub routes per spec 27.3
        const hubMap={travel:'/travel/', 'banking-services':'/banking-services/', 'print-photo':'/print-photo/', 'online-services':'/online-services/'};
        const target=hubMap[gid] || `services/${gid}.html`;
        location.href=target;
      });
    }
  });
  // keyboard for all button
  const allBtn=wrap.querySelector('[data-group="all"]');
  if(allBtn) allBtn.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); clearGroup(groups, replicaServices); }});
}
function getInitialGroup(){
  const urlGroup=new URLSearchParams(location.search).get('group');
  if(urlGroup) return urlGroup;
  // check path /services/<id>.html (legacy)
  const m=location.pathname.match(/\/services\/([^\/\.]+)\.html/i);
  if(m) return m[1];
  // new hub routes per spec 27.3
  const path=location.pathname.replace(/\/index\.html$/,'').replace(/\/$/,'');
  const seg=path.split('/').filter(Boolean).pop();
  if(['travel','banking-services','print-photo','online-services'].includes(seg)) return seg;
  return null;
}
let _activeGroup=null;
function applyGroup(groupId, groups, replicaServices, push=true){
  const group = groups.find(g=>g.id===groupId);
  if(!group && groupId!=='all') return;
  _activeGroup=groupId;
  // update group cards active state
  document.querySelectorAll('.group-card').forEach(c=>{
    const isActive=c.getAttribute('data-group')===groupId;
    c.classList.toggle('active', isActive);
    c.setAttribute('aria-pressed', String(isActive));
  });
  // filter replica grid
  const allowed = group ? new Set(group.replicaIds||[]) : null;
  // re-render replica with filtered
  const filteredReplica = group ? replicaServices.filter(s=> allowed.has(s.id)) : replicaServices;
  // temporarily override draw: we re-render grid only with filtered
  // Use existing grid but re-draw with filtered set
  const grid=document.getElementById('onlineServiceGrid');
  if(grid){
    // call internal draw via reusing render function: we dispatch filtered list
    // easiest: re-call render logic inline
    const searchVal=document.getElementById('onlineServiceSearch')?.value||'';
    // rebuild filtered with search
    const needle=searchVal.trim().toLowerCase();
    const finalFiltered= filteredReplica.filter(s=>{
      const hay=[s.title,...(s.items||[])].join(' ').toLowerCase();
      return !needle || hay.includes(needle);
    });
    if(!finalFiltered.length){
      grid.innerHTML='<p class="replica-empty">No services in this group. Try another category or <a href="#" onclick="clearGroup(window._groups, window._replicaServices); return false;">go back</a>.</p>';
    } else {
      grid.innerHTML=finalFiltered.map((service,index)=>{
        const panelId=`online-service-panel-${service.id||index}`;
        return `<article class="online-service-card">
          <div class="online-service-heading">
            <span class="online-service-icon" aria-hidden="true">${esc(service.icon||'✓')}</span>
            <div><span class="online-service-number">${String(index+1).padStart(2,'0')}</span><h3>${esc(service.title)}${service.titleMr?`<span class="marathi-copy" lang="mr">${esc(service.titleMr)}</span>`:''}</h3></div>
          </div>
          <button class="online-service-toggle" type="button" aria-expanded="false" aria-controls="${esc(panelId)}">
            <span class="toggle-label">Expand services</span> <span class="toggle-symbol" aria-hidden="true">＋</span>
          </button>
          <div class="online-service-details" id="${esc(panelId)}">
            <ul>${serviceItemsMarkup(service)}</ul>
            <button class="btn btn-primary online-card-enquire" type="button" data-service="${esc(service.title)}">Enquire on WhatsApp</button>
          </div>
        </article>`;
      }).join('');
      // re-bind toggles
      grid.querySelectorAll('.online-service-toggle').forEach(button=>button.addEventListener('click',()=>{
        const card=button.closest('.online-service-card');
        const expanded=!card.classList.contains('expanded');
        grid.querySelectorAll('.online-service-card.expanded').forEach(openCard=>{
          if(openCard===card) return;
          openCard.classList.remove('expanded');
          const openButton=openCard.querySelector('.online-service-toggle');
          openButton?.setAttribute('aria-expanded','false');
          if(openButton) openButton.querySelector('.toggle-label').textContent='Expand services';
          if(openButton) openButton.querySelector('.toggle-symbol').textContent='＋';
        });
        card.classList.toggle('expanded',expanded);
        button.setAttribute('aria-expanded',String(expanded));
        button.querySelector('.toggle-label').textContent=expanded ? 'Minimize services' : 'Expand services';
        button.querySelector('.toggle-symbol').textContent=expanded ? '−' : '＋';
      }));
      grid.querySelectorAll('.online-card-enquire').forEach(button=>button.addEventListener('click',()=>{
        document.dispatchEvent(new CustomEvent('replica:enquire',{detail:{service:button.dataset.service}}));
      }));
    }
  }
  // toggle tour-related sections — Home hides them until Travel chosen; dedicated travel page shows them always
  const tourSections=['services','fleet','packages','routes','about','why','gallery','testimonials'];
  const showTour = group ? !!group.includeTour : true;
  tourSections.forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.classList.toggle('filtered-hidden', !showTour && groupId!==null);
  });
  // also hide replica about/why when filtered? keep them visible for context
  // show/hide catalog and popular strip vs placeholder
  const placeholder=document.getElementById('groupPlaceholder');
  const catalog=document.getElementById('replicaCatalogWrap');
  const popular=document.getElementById('popularStrip');
  if(placeholder) placeholder.classList.add('hidden');
  if(catalog) catalog.classList.remove('hidden');
  if(popular) popular.classList.remove('hidden');
  // animate catalog in
  if(catalog){ catalog.style.opacity='0'; catalog.style.transform='translateY(8px)'; requestAnimationFrame(()=>{ catalog.style.transition='opacity .35s, transform .35s'; catalog.style.opacity='1'; catalog.style.transform='translateY(0)'; }); }
  // show active filter bar
  const bar=document.getElementById('activeFilterBar');
  const label=document.getElementById('activeFilterLabel');
  const link=document.getElementById('viewPageLink');
  if(bar && label){
    bar.classList.remove('hidden');
    label.textContent = group ? `${group.icon} ${group.title} — ${filteredReplica.length} categories` : 'All services';
    const hubMap2={travel:'/travel/', 'banking-services':'/banking-services/', 'print-photo':'/print-photo/', 'online-services':'/online-services/'};
    if(link && group) link.href= hubMap2[group.id] || `services/${group.id}.html`;
    else if(link) link.href='services/index.html';
  }
  // push state
  if(push){
    const url=new URL(location.href);
    if(groupId && groupId!=='all') url.searchParams.set('group', groupId);
    else url.searchParams.delete('group');
    history.pushState({group:groupId}, '', url.toString());
    // scroll to services
    document.getElementById('replicaServices')?.scrollIntoView({behavior:'smooth', block:'start'});
  }
  // store globally for clear
  window._groups=groups; window._replicaServices=replicaServices;
}
function clearGroup(groups, replicaServices, push=true){
  // If we're on a dedicated group page, go back to home
  if(location.pathname.match(/\/services\/(travel|banking|identity|farmer|bills|printing|banking-services|print-photo|online-services)(\.html)?/i) || ['/travel','/banking-services','/print-photo','/online-services'].some(p=>location.pathname.startsWith(p))){
    location.href='/';
    return;
  }
  _activeGroup=null;
  document.querySelectorAll('.group-card').forEach(c=>{ c.classList.remove('active'); c.removeAttribute('aria-pressed'); });
  // restore: hide catalog, show placeholder, show all sections
  const placeholder=document.getElementById('groupPlaceholder');
  const catalog=document.getElementById('replicaCatalogWrap');
  const popular=document.getElementById('popularStrip');
  if(placeholder) placeholder.classList.remove('hidden');
  if(catalog) catalog.classList.add('hidden');
  if(popular) popular.classList.add('hidden');
  document.querySelectorAll('.filtered-hidden').forEach(el=>el.classList.remove('filtered-hidden'));
  // for home clean view, hide tour sections again until Travel chosen? Keep them visible on clear? Spec says home should show groups overview, not scattered tours – so hide tours until travel
  const tourSections=['services','fleet','packages','routes'];
  tourSections.forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.classList.add('filtered-hidden');
  });
  // but keep catalog hidden, popular hidden
  const bar=document.getElementById('activeFilterBar');
  if(bar) bar.classList.add('hidden');
  if(push){
    const url=new URL(location.href);
    url.searchParams.delete('group');
    history.pushState({}, '', url.pathname + url.hash);
    document.getElementById('replicaServices')?.scrollIntoView({behavior:'smooth'});
  }
}

function handleHeroForm(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const name = fd.get("name")?.toString().trim();
  const phone = fd.get("phone")?.toString().trim();
  const date = fd.get("date")?.toString().trim();
  const service = fd.get("service")?.toString().trim();
  if(!name || !phone){ alert("Please enter name and phone"); return; }
  const msg = `Hi Ankit Tours & Travels,%0AName: ${encodeURIComponent(name)}%0APhone: ${encodeURIComponent(phone)}%0ADate: ${encodeURIComponent(date||'Not specified')}%0AService: ${encodeURIComponent(service||'General enquiry')}%0A%0APlease share quote.`;
  window.open(`https://wa.me/917276066532?text=${msg}`,'_blank');
  saveBooking({name,phone,date,service, source:"hero"});
  e.target.reset();
}

function handleContactForm(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const name = fd.get("name")?.toString().trim();
  const phone = fd.get("phone")?.toString().trim();
  const service = fd.get("service")?.toString().trim();
  const msg = fd.get("message")?.toString().trim();
  if(!name || !phone){ alert("Please enter name and phone"); return; }
  const text = `Hi Ankit Tours,%0AName: ${encodeURIComponent(name)}%0APhone: ${encodeURIComponent(phone)}%0AService: ${encodeURIComponent(service||'General')}%0AMessage: ${encodeURIComponent(msg||'')}`;
  window.open(`https://wa.me/917276066532?text=${text}`,'_blank');
  saveBooking({name,phone,service,message:msg, source:"contact"});
  e.target.reset();
  showToast("Opening WhatsApp with your trip details");
}

function handleQuoteForm(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const details = {
    name: fd.get("name")?.toString().trim(),
    phone: fd.get("phone")?.toString().trim(),
    date: fd.get("date")?.toString().trim(),
    passengers: fd.get("passengers")?.toString().trim(),
    service: fd.get("service")?.toString().trim(),
    message: fd.get("message")?.toString().trim(),
    source: "quote-dialog"
  };
  if(!details.name || !details.phone){ showToast("Please add your name and mobile number"); return; }
  const text = `Hi Ankit Tours & Travels,%0AName: ${encodeURIComponent(details.name)}%0APhone: ${encodeURIComponent(details.phone)}%0ATravel date: ${encodeURIComponent(details.date||'Not specified')}%0APassengers: ${encodeURIComponent(details.passengers||'Not specified')}%0AService: ${encodeURIComponent(details.service||'General enquiry')}%0ARoute: ${encodeURIComponent(details.message||'Not specified')}%0A%0APlease confirm availability and quote.`;
  saveBooking(details);
  document.getElementById("quoteDialog")?.close();
  e.target.reset();
  showToast("Opening WhatsApp — booking is confirmed only after owner approval");
  window.open(`https://wa.me/917276066532?text=${text}`,'_blank','noopener');
}

let toastTimer;
function showToast(message){
  const toast = document.getElementById("siteToast");
  if(!toast) return;
  toast.textContent=message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.classList.remove("show"),3200);
}

async function saveBooking(b){
  // save to Neon via API + local fallback
  try{
    await fetch('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
  }catch(e){ console.warn('booking api failed',e); }
  try{
    const key="att_bookings";
    const arr = JSON.parse(localStorage.getItem(key)||"[]");
    arr.unshift({...b, at: new Date().toISOString()});
    localStorage.setItem(key, JSON.stringify(arr.slice(0,50)));
  }catch{}
}
