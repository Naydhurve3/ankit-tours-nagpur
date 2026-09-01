// Main public logic
document.addEventListener("DOMContentLoaded", async ()=>{
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
  try{
    if(!sessionStorage.getItem("att_nudge_seen")) window.setTimeout(()=>{ if(nudge && !quoteDialog?.open) nudge.hidden=false; },12000);
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
