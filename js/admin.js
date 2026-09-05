let data = {fleet:[], packages:[], gallery:[], testimonials:[], serviceCatalog:[], serviceSettings:[], serviceGroups:[], customServices:[]};
let currentTab = "overview";
let useApi = false;
let authenticated = false;

async function checkApi(){
  try{
    const r = await fetch('/api/service-groups?public=true');
    if(r.ok){ useApi = true; return true; }
  }catch{}
  try{
    const r2 = await fetch('/api/fleet');
    if(r2.ok){ useApi = true; return true; }
  }catch{}
  useApi=false; return false;
}
async function loadFromApi(){
  try{
    const [fleet, packages, gallery, testimonials, serviceCatalog, serviceSettings, serviceGroups, customServices] = await Promise.all([
      fetch('/api/fleet').then(r=>r.json()),
      fetch('/api/packages').then(r=>r.json()),
      fetch('/api/gallery').then(r=>r.json()),
      fetch('/api/testimonials').then(r=>r.json()),
      fetch('/assets/data/replica-services.json').then(r=>r.json()),
      fetch('/api/service-settings').then(r=>r.ok?r.json():[]),
      fetch('/api/service-groups').then(r=>r.ok?r.json():[]),
      fetch('/api/custom-services?all=1').then(r=>r.ok?r.json():[])
    ]);
    // also try public groups fallback if owner fetch fails due to auth (should be authed at this point)
    return {fleet, packages, gallery, testimonials, serviceCatalog, serviceSettings, serviceGroups, customServices};
  }catch(e){ return null;}
}
async function checkSession(){
  try{
    const r = await fetch('/api/owner/session');
    const j = await r.json();
    return !!j.authenticated;
  }catch{ return false; }
}

document.addEventListener("DOMContentLoaded", async ()=>{
  await checkApi();
  // theme toggle for admin
  document.getElementById('adminThemeToggle')?.addEventListener('click', ()=> window.Theme?.toggle());
  if(useApi){
    // check if already authenticated
    authenticated = await checkSession();
    if(authenticated){
      const apiData = await loadFromApi();
      if(apiData) data = apiData;
      showDashboard();
    }
  } else {
    const seed = await fetchSeed();
    const local = loadLocal();
    data = local ? mergeData(seed, local) : structuredClone(seed);
    data.serviceCatalog = await fetch('/assets/data/replica-services.json').then(r=>r.json()).catch(()=>[]);
    data.serviceSettings = data.serviceSettings||[];
    data.customServices = data.customServices||[];
    if(!local) saveLocal(data);
  }

  const gate = document.getElementById("gate");
  const pinInput = document.getElementById("pinInput");
  document.getElementById("pinBtn").addEventListener("click", handleLogin);
  pinInput.addEventListener("keydown", e=>{ if(e.key==="Enter") handleLogin(); });

  async function handleLogin(){
    const pin = pinInput.value.trim();
    if(!pin){ document.getElementById("pinMsg").textContent="Enter PIN"; return; }
    if(useApi){
      try{
        const res = await fetch('/api/owner/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin})});
        const j = await res.json();
        if(!res.ok) throw new Error(j.error||'Login failed');
        authenticated = true;
        const apiData = await loadFromApi();
        if(apiData) data = apiData;
        showDashboard();
        toast('Authenticated');
      }catch(e){
        document.getElementById("pinMsg").textContent = e.message || 'Invalid PIN';
      }
    } else {
      // local fallback - requires env PIN not available, so deny
      document.getElementById("pinMsg").textContent = "Server not reachable - cannot verify PIN";
    }
  }

  function showDashboard(){
    document.getElementById("gate").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");
    render();
  }

  document.querySelectorAll(".tab").forEach(t=> t.addEventListener("click", ()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    t.classList.add("active");
    currentTab = t.dataset.tab;
    render();
  }));

  // logout
  document.getElementById('logoutBtn')?.addEventListener('click', async ()=>{
    try{ await fetch('/api/owner/logout',{method:'POST'}); }catch{}
    location.reload();
  });

  if(!useApi){
    document.getElementById("saveBtn").addEventListener("click", ()=>{
      saveLocal(data);
      toast("Saved locally.");
    });
  } else {
    document.getElementById('saveBtn').textContent='↻ Reload';
    document.getElementById('saveBtn').onclick = async ()=>{ const d=await loadFromApi(); if(d) data=d; render(); toast('Reloaded from Neon'); };
  }
  document.getElementById("exportBtn").addEventListener("click", ()=> downloadJSON(data));
  document.getElementById("resetBtn").addEventListener("click", async ()=>{
    if(!confirm("Reset?")) return;
    if(useApi){ toast('Delete items individually in Neon mode'); return; }
    const fresh = await fetchSeed();
    data = structuredClone(fresh);
    saveLocal(data);
    render();
    toast("Reset done");
  });
  document.getElementById("viewPublicBtn").addEventListener("click", ()=> window.open("index.html","_blank"));
});

function toast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(()=> t.classList.add("hidden"), 2600);
}

function render(){
  const panel = document.getElementById("panel");
  if(currentTab==="overview") panel.innerHTML = renderOverviewAdmin();
  if(currentTab==="service-groups") panel.innerHTML = renderServiceGroupsAdmin();
  if(currentTab==="fleet") panel.innerHTML = renderFleetAdmin();
  if(currentTab==="packages") panel.innerHTML = renderPackagesAdmin();
  if(currentTab==="service-pricing") panel.innerHTML = renderServicePricingAdmin();
  if(currentTab==="gallery") panel.innerHTML = renderGalleryAdmin();
  if(currentTab==="testimonials") panel.innerHTML = renderTestimonialsAdmin();
  if(currentTab==="bookings") panel.innerHTML = renderBookingsAdmin();
  bindAdminEvents();
}

function renderOverviewAdmin(){
  const visibleGroups=(data.serviceGroups||[]).filter(g=>g.visible && g.status==='published').length;
  const hiddenGroups=(data.serviceGroups||[]).length - visibleGroups;
  const fleetVisible=(data.fleet||[]).filter(f=>f.visible!==false).length;
  const pendingBookings=(data.bookings?.length||0); // bookings not loaded yet but placeholder
  return `
    <h3>Overview — Live Public View</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:14px 0">
      <div class="glass-card" style="padding:14px;text-align:center"><b style="font-size:22px;color:var(--primary)">${visibleGroups}</b><br><span class="small muted">Groups visible</span><br><small>${hiddenGroups} hidden/draft</small></div>
      <div class="glass-card" style="padding:14px;text-align:center"><b style="font-size:22px;color:var(--primary)">${fleetVisible}/${(data.fleet||[]).length}</b><br><span class="small muted">Vehicles visible</span></div>
      <div class="glass-card" style="padding:14px;text-align:center"><b style="font-size:22px;color:var(--primary)">${(data.packages||[]).filter(p=>p.visible!==false).length}</b><br><span class="small muted">Packages visible</span></div>
      <div class="glass-card" style="padding:14px;text-align:center"><b style="font-size:22px;color:var(--primary)">${(data.customServices||[]).filter(service=>service.visible!==false).length}</b><br><span class="small muted">Owner-created services</span></div>
      <div class="glass-card" style="padding:14px;text-align:center"><b style="font-size:22px;color:var(--primary)">EN+मराठी</b><br><span class="small muted">Bilingual live</span><br><small>Hub theme</small></div>
    </div>
    <div class="panel" style="background:var(--surface-elevated);border-style:dashed">
      <h4 style="color:var(--primary)">Quick actions</h4>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button class="btn-sm primary" onclick="document.querySelector('[data-tab=\\'service-groups\\']').click()">Manage Groups →</button>
        <button class="btn-sm" onclick="document.querySelector('[data-tab=\\'service-pricing\\']').click()">Edit Service Prices →</button>
        <button class="btn-sm" onclick="document.querySelector('[data-tab=\\'fleet\\']').click()">Update Fleet →</button>
        <button class="btn-sm" onclick="window.open('/','_blank')">View Home ↗</button>
      </div>
      <p class="hint" style="margin-top:10px">Tip: Hiding a group removes it from homepage and navigation but keeps drafts via API, search, sitemap hidden. Change price display mode to <b>quote / exact / from / range</b> — public shows formatted, not raw input.</p>
    </div>
    <div class="panel" style="margin-top:14px">
      <h4 style="color:var(--primary)">What public sees now</h4>
      <p class="small muted">Only <code>visible && status=published</code> groups appear on homepage as 4 cards. Pinned services appear first. Example: Travel group “${(data.serviceGroups.find(g=>g.id==='travel')?.replicaIds||[]).length} replica cats + 6 tours”.</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${(data.serviceGroups||[]).map(g=>`<span class="badge ${g.visible&&g.status==='published'?'on':''}">${esc(g.icon||'')} ${esc(g.title)} ${g.visible&&g.status==='published'?'• Live':'• Hidden'}</span>`).join('')}</div>
    </div>
  `;
}
function renderServiceGroupsAdmin(){
  if(!data.serviceGroups) data.serviceGroups=[];
  return `
    <h3>Service Groups — Homepage 4 Cards ${useApi?'<span class="badge on">Neon DB</span>':''}</h3>
    <p class="small muted">Control what appears on the hub homepage. Only <b>visible + published</b> groups show as the 4 primary cards. Drag order → homepage order. Hide keeps drafts out of public API/search/sitemap.</p>
    <div class="list" style="margin-top:14px">
      ${data.serviceGroups.map((g,i)=>`
        <div class="item" style="grid-template-columns:42px 1fr auto;align-items:start">
          <div class="group-icon" style="width:42px;height:42px;display:grid;place-items:center;background:color-mix(in srgb, ${g.color||'#0F4C81'} 14%, var(--surface-elevated));border-radius:12px;font-size:20px">${g.icon||'•'}</div>
          <div style="display:grid;gap:8px;min-width:0">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <input class="field" data-gfield="title" data-id="${g.id}" value="${esc(g.title||'')}" placeholder="Title EN">
              <input class="field" data-gfield="title_mr" data-id="${g.id}" value="${esc(g.title_mr||'')}" placeholder="Title मराठी">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <input class="field" data-gfield="description" data-id="${g.id}" value="${esc(g.description||'')}" placeholder="Short description EN">
              <input class="field" data-gfield="description_mr" data-id="${g.id}" value="${esc(g.description_mr||'')}" placeholder="Short description मराठी">
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              <input class="field" data-gfield="icon" data-id="${g.id}" value="${esc(g.icon||'')}" placeholder="Icon" style="max-width:70px">
              <label class="color-field" style="min-width:0">Color <input type="color" data-gfield="color" data-id="${g.id}" value="${/^#[0-9a-f]{6}$/i.test(g.color||'')?g.color:'#0F4C81'}"></label>
              <select class="field" data-gfield="status" data-id="${g.id}" style="max-width:120px"><option value="published" ${g.status==='published'?'selected':''}>Published</option><option value="draft" ${g.status==='draft'?'selected':''}>Draft</option><option value="archived" ${g.status==='archived'?'selected':''}>Archived</option></select>
              <label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700"><input type="checkbox" data-gfield="visible" data-id="${g.id}" ${g.visible!==false?'checked':''}> Visible</label>
              <input class="field" data-gfield="sort_order" data-id="${g.id}" type="number" value="${g.sort_order||i}" style="max-width:80px" placeholder="Order">
              <label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="checkbox" data-gfield="include_tour" data-id="${g.id}" ${g.include_tour?'checked':''}> Include tours</label>
            </div>
            <div class="small muted">Slug: <code>${esc(g.slug||g.id)}</code> • IDs: ${(g.replica_ids||[]).join(', ')||'—'} <button class="btn-sm" style="margin-left:8px" onclick="editGroupIds('${g.id}')">Edit IDs</button></div>
          </div>
          <div class="item-actions" style="display:grid;gap:6px">
            <button class="btn-sm primary" onclick="saveGroup('${g.id}')">Save</button>
            <button class="icon-btn" title="Move up" onclick="moveGroup('${g.id}',-1)">↑</button>
            <button class="icon-btn" title="Move down" onclick="moveGroup('${g.id}',1)">↓</button>
          </div>
        </div>
      `).join('')}
    </div>
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn-sm primary" onclick="addGroup()">+ Add Group</button>
      <span class="hint">Tip: Hide a group to remove it from homepage/navigation. Public API filters <code>visible && status=published</code>.</span>
    </div>
  `;
}
function renderFleetAdmin(){
  return `
    <h3>Fleet - Add / Hide / Remove ${useApi?'<span class="badge on">Neon DB</span>':'<span class="badge">Local</span>'}</h3>
    <div class="toolbar">
      <input id="f_name" class="field" placeholder="Vehicle Name e.g. Innova Crysta">
      <input id="f_seating" class="field" placeholder="Seating e.g. 7+1">
      <input id="f_price" class="field" placeholder="Price e.g. ₹18 / km">
      <input id="f_features" class="field" placeholder="Features e.g. AC • Music">
    </div>
    <div class="toolbar">
      <select id="f_display" class="field"><option value="3d">3D vehicle only</option><option value="photo">Owner photo only</option><option value="auto">3D + visitor photo switch</option></select>
      <select id="f_type" class="field"><option value="suv">SUV / MPV</option><option value="sedan">Sedan</option><option value="traveller">Tempo Traveller / Van</option></select>
      <label class="color-field">3D colour <input id="f_color" type="color" value="#d96c2c"></label>
      <input id="f_image" class="field" placeholder="Optional https photo URL" style="flex:2">
    </div>
    <div style="margin-top:10px;display:flex;gap:8px">
      <button class="btn-sm primary" onclick="addFleet()">+ Add Vehicle</button>
      <span class="hint">Choose 3D, photo, or both. A photo URL is required only for Photo mode. Eye = hide/show.</span>
    </div>
    <div class="list" style="margin-top:14px">${data.fleet.map((f,i)=>`
      <div class="item ${f.visible===false?'off':''}">
        ${f.display_mode==='photo'&&f.image?`<img src="${f.image}" onerror="this.style.background='#e2e8f0'">`:`<div class="admin-vehicle-swatch" style="--swatch:${/^#[0-9a-f]{6}$/i.test(f.model_color||'')?f.model_color:'#d96c2c'}">🚕</div>`}
        <div>
          <b>${escapeHtml(f.name)}</b> <span class="badge ${f.visible!==false?'on':''}">${f.visible!==false?'Visible':'Hidden'}</span><br>
          <span class="small muted">${escapeHtml(f.seating)} • ${escapeHtml(f.price)} • ${escapeHtml(f.features||'')}</span><br><span class="badge">${escapeHtml((f.display_mode||'3d').toUpperCase())} visual</span>
        </div>
        <div class="item-actions">
          <button class="mode-btn" title="Cycle 3D / Photo / Auto" onclick="cycleFleetMode(${i}, ${f.id})">${f.display_mode==='photo'?'📷':f.display_mode==='auto'?'◐':'◈'}</button>
          <button class="icon-btn" title="Hide/Show" onclick="toggleFleet(${i}, ${f.id})">${f.visible!==false?'👁️':'🚫'}</button>
          <button class="icon-btn danger" title="Delete" onclick="delFleet(${i}, ${f.id})">✕</button>
        </div>
      </div>
    `).join("")}</div>
  `;
}
function renderPackagesAdmin(){
  return `
    <h3>Packages & Pricing ${useApi?'<span class="badge on">Neon DB</span>':''}</h3>
    <div class="toolbar">
      <input id="p_service" class="field" placeholder="Service e.g. Airport Transfer">
      <input id="p_vehicle" class="field" placeholder="Vehicle e.g. Ertiga">
      <input id="p_price" class="field" placeholder="Price e.g. ₹1,500">
      <input id="p_note" class="field" placeholder="Note e.g. Toll extra">
      <button class="btn-sm primary" onclick="addPkg()">+ Add</button>
    </div>
    <div class="list">${data.packages.map((p,i)=>`
      <div class="item ${p.visible===false?'off':''}" style="grid-template-columns:1fr auto">
        <div><b>${escapeHtml(p.service)}</b> • <span class="tag">${escapeHtml(p.vehicle)}</span> • <b style="color:var(--primary)">${escapeHtml(p.price)}</b><br><span class="small muted">${escapeHtml(p.note||'')}</span> <span class="badge ${p.visible!==false?'on':''}">${p.visible!==false?'Visible':'Hidden'}</span></div>
        <div class="item-actions">
          <button class="icon-btn" onclick="togglePkg(${i}, ${p.id})">${p.visible!==false?'👁️':'🚫'}</button>
          <button class="icon-btn danger" onclick="delPkg(${i}, ${p.id})">✕</button>
        </div>
      </div>
    `).join("")}</div>
  `;
}
function renderServicePricingAdmin(){
  const settings=Object.fromEntries((data.serviceSettings||[]).map(row=>[row.service_id,row]));
  const rows=(data.serviceCatalog||[]).flatMap(category=>(category.items||[]).map((name,index)=>({id:`${category.id}-${index+1}`,category:category.title,name,setting:settings[`${category.id}-${index+1}`]||{visible:true}})));
  const categoryOptions=(data.serviceCatalog||[]).map(category=>`<option value="${escapeHtml(category.id)}">${escapeHtml(category.title)} • ${escapeHtml(category.titleMr||'')}</option>`).join('');
  return `<div class="admin-section-heading"><span class="admin-kicker">PUBLIC SERVICE DIRECTORY</span><h3>Services, prices & publishing ${useApi?'<span class="badge on">Neon DB</span>':''}</h3><p class="small muted">Create services in English and Marathi, then control price, position and public visibility.</p></div>
    <section class="admin-create-card"><h4>Add a new public service</h4><div class="admin-form-grid"><select id="cs_category" class="field"><option value="">Choose service group</option>${categoryOptions}</select><input id="cs_name_en" class="field" placeholder="English service name"><input id="cs_name_mr" class="field" placeholder="मराठी सेवा नाव"><input id="cs_price" class="field" placeholder="Price, e.g. ₹2 / page"><input id="cs_note" class="field" placeholder="Price note"><input id="cs_order" class="field" type="number" min="0" value="0" placeholder="Display order"></div><div class="admin-publish-row"><label><input id="cs_pinned" type="checkbox"> Feature first</label><label><input id="cs_visible" type="checkbox" checked> Publish now</label><button class="btn-sm primary" onclick="addCustomService()">＋ Add service</button></div></section>
    <h4 class="admin-subheading">Owner-created services</h4><div class="list custom-service-list">${(data.customServices||[]).length?data.customServices.map(service=>`<div class="item ${service.visible===false?'off':''}" style="grid-template-columns:minmax(210px,1fr) auto"><div><b>${escapeHtml(service.name_en)}</b>${service.name_mr?`<span class="admin-marathi">${escapeHtml(service.name_mr)}</span>`:''}<span class="small muted">${escapeHtml((data.serviceCatalog||[]).find(category=>category.id===service.category_id)?.title||service.category_id)} • ${escapeHtml(service.price||'No public price')} ${service.price_note?'• '+escapeHtml(service.price_note):''}</span></div><div class="item-actions"><button class="icon-btn ${service.pinned?'pinned':''}" title="Feature" onclick="updateCustomService(${service.id},{pinned:${!service.pinned}})">${service.pinned?'★':'☆'}</button><button class="icon-btn" title="Publish / hide" onclick="updateCustomService(${service.id},{visible:${service.visible===false}})">${service.visible===false?'🚫':'👁️'}</button><button class="btn-sm" onclick="editCustomService(${service.id})">Edit</button><button class="icon-btn danger" onclick="deleteCustomService(${service.id})">✕</button></div></div>`).join(''):'<div class="admin-empty"><b>No custom services yet</b><span>Add one above. Built-in services remain available below.</span></div>'}</div>
    <h4 class="admin-subheading">Built-in service display</h4><p class="small muted">Feature important services, hide unavailable work, or add a customer-friendly price such as “₹2 / page”.</p>
    <label class="field" style="display:flex;margin:14px 0"><input id="serviceAdminSearch" type="search" placeholder="Search services…" style="width:100%;border:0;background:transparent;color:inherit"></label>
    <div class="list service-admin-list">${rows.map(row=>`<div class="item service-setting-row ${row.setting.visible===false?'off':''}" data-search="${escapeHtml((row.category+' '+row.name).toLowerCase())}" style="grid-template-columns:minmax(180px,1.5fr) minmax(120px,.7fr) minmax(120px,1fr) auto">
      <div><b>${escapeHtml(row.name)}</b><br><span class="small muted">${escapeHtml(row.category)}</span></div>
      <input class="field service-price-input" data-id="${row.id}" value="${escapeHtml(row.setting.price||'')}" placeholder="₹ price / unit">
      <input class="field service-note-input" data-id="${row.id}" value="${escapeHtml(row.setting.price_note||'')}" placeholder="Price note">
      <div class="item-actions"><button class="icon-btn ${row.setting.pinned?'pinned':''}" title="Pin / unpin" onclick="saveServiceSetting('${row.id}',{pinned:${!row.setting.pinned}})">${row.setting.pinned?'★':'☆'}</button><button class="icon-btn" title="Show / hide" onclick="saveServiceSetting('${row.id}',{visible:${row.setting.visible===false}})">${row.setting.visible===false?'🚫':'👁️'}</button><button class="btn-sm primary" onclick="saveServicePrice('${row.id}')">Save</button></div>
    </div>`).join('')}</div>`;
}
function renderGalleryAdmin(){
  return `
    <h3>Gallery - Add / Hide ${useApi?'<span class="badge on">Neon DB</span>':''}</h3>
    <div class="toolbar">
      <input id="g_title" class="field" placeholder="Title e.g. Tadoba Jungle">
      <select id="g_cat" class="field"><option value="fleet">fleet</option><option value="safari">safari</option><option value="pilgrimage">pilgrimage</option></select>
      <input id="g_src" class="field" placeholder="https:// image URL" style="flex:2">
      <button class="btn-sm primary" onclick="addGallery()">+ Add Image</button>
    </div>
    <div class="list" style="margin-top:14px">${data.gallery.map((g,i)=>`
      <div class="item ${g.visible===false?'off':''}">
        <img src="${g.src}">
        <div><b>${escapeHtml(g.title||g.category)}</b> <span class="badge">${escapeHtml(g.category)}</span> <span class="badge ${g.visible!==false?'on':''}">${g.visible!==false?'Visible':'Hidden'}</span></div>
        <div class="item-actions">
          <button class="icon-btn" onclick="toggleGal(${i}, ${g.id})">${g.visible!==false?'👁️':'🚫'}</button>
          <button class="icon-btn danger" onclick="delGal(${i}, ${g.id})">✕</button>
        </div>
      </div>
    `).join("")}</div>
  `;
}
function renderTestimonialsAdmin(){
  return `
    <h3>Testimonials ${useApi?'<span class="badge on">Neon DB</span>':''}</h3>
    <div class="toolbar">
      <input id="t_name" class="field" placeholder="Name">
      <input id="t_place" class="field" placeholder="Place e.g. Nagpur → Tadoba">
      <select id="t_rating" class="field" style="max-width:100px"><option value="5">5 ★</option><option value="4">4 ★</option><option value="3">3 ★</option></select>
    </div>
    <div class="toolbar"><textarea id="t_text" class="field" placeholder="Review text" style="min-height:70px;flex:1"></textarea><button class="btn-sm primary" onclick="addTesti()">+ Add</button></div>
    <div class="list">${data.testimonials.map((t,i)=>`
      <div class="item ${t.visible===false?'off':''}" style="grid-template-columns:1fr auto">
        <div><b>${escapeHtml(t.name)}</b> • ${'★'.repeat(t.rating)} <span class="badge ${t.visible!==false?'on':''}">${t.visible!==false?'Visible':'Hidden'}</span><br><span class="small muted">${escapeHtml(t.place||'')}</span><br><span class="small">${escapeHtml(t.text)}</span></div>
        <div class="item-actions"><button class="icon-btn" onclick="toggleTesti(${i}, ${t.id})">${t.visible!==false?'👁️':'🚫'}</button><button class="icon-btn danger" onclick="delTesti(${i}, ${t.id})">✕</button></div>
      </div>
    `).join("")}</div>
  `;
}
function renderDriversAdmin(){ return `<h3>Drivers</h3><p class="small muted">Driver management requires Neon migration - see backlog 23. Coming after auth stabilisation.</p>`; }
function renderBookingsAdmin(){ return `<h3>Bookings</h3><p class="small muted">Bookings list is now protected. Fetch via authenticated GET /api/bookings.</p>`; }

function escapeHtml(s){ if(!s) return ''; return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

function bindAdminEvents(){
  document.getElementById('serviceAdminSearch')?.addEventListener('input',event=>{const query=event.target.value.trim().toLowerCase();document.querySelectorAll('.service-setting-row').forEach(row=>row.classList.toggle('hidden',query&&!row.dataset.search.includes(query)))});
}

async function saveServicePrice(id){
  const price=document.querySelector(`.service-price-input[data-id="${id}"]`)?.value.trim()||'';
  const price_note=document.querySelector(`.service-note-input[data-id="${id}"]`)?.value.trim()||'';
  await saveServiceSetting(id,{price,price_note});
}

async function saveServiceSetting(id,changes){
  const current=(data.serviceSettings||[]).find(row=>row.service_id===id)||{service_id:id,price:'',price_note:'',pinned:false,visible:true};
  const next={...current,...changes,service_id:id};
  if(useApi){
    const response=await fetch('/api/service-settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)});
    if(!response.ok){toast('Service update failed');return;}
    const saved=await response.json();
    const index=(data.serviceSettings||[]).findIndex(row=>row.service_id===id);
    if(index>=0)data.serviceSettings[index]=saved;else data.serviceSettings.push(saved);
  }else{
    const index=(data.serviceSettings||[]).findIndex(row=>row.service_id===id);
    if(index>=0)data.serviceSettings[index]=next;else data.serviceSettings.push(next);
    saveLocal(data);
  }
  render();toast('Service display updated');
}

async function addCustomService(){
  const payload={category_id:document.getElementById('cs_category').value,name_en:document.getElementById('cs_name_en').value.trim(),name_mr:document.getElementById('cs_name_mr').value.trim(),price:document.getElementById('cs_price').value.trim(),price_note:document.getElementById('cs_note').value.trim(),sort_order:Number(document.getElementById('cs_order').value)||0,pinned:document.getElementById('cs_pinned').checked,visible:document.getElementById('cs_visible').checked};
  if(!payload.category_id||!payload.name_en||!payload.name_mr){toast('Choose a group and enter English and Marathi names');return;}
  if(!useApi){toast('Server connection is required to publish a new service');return;}
  const response=await fetch('/api/custom-services',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const result=await response.json().catch(()=>({}));
  if(!response.ok){toast(result.error||'Could not add service');return;}data.customServices.push(result);render();toast('New service published');
}

async function updateCustomService(id,changes){
  const current=(data.customServices||[]).find(service=>service.id===id);if(!current)return;
  const response=await fetch('/api/custom-services',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...current,...changes})});const result=await response.json().catch(()=>({}));
  if(!response.ok){toast(result.error||'Update failed');return;}data.customServices[data.customServices.findIndex(service=>service.id===id)]=result;render();toast('Service updated');
}

async function editCustomService(id){
  const current=(data.customServices||[]).find(service=>service.id===id);if(!current)return;
  const name_en=prompt('English service name',current.name_en);if(name_en===null)return;
  const name_mr=prompt('Marathi service name',current.name_mr||'');if(name_mr===null)return;
  const price=prompt('Public price (leave blank for none)',current.price||'');if(price===null)return;
  const price_note=prompt('Price note',current.price_note||'');if(price_note===null)return;
  if(!name_en.trim()||!name_mr.trim()){toast('Both language names are required');return;}
  await updateCustomService(id,{name_en:name_en.trim(),name_mr:name_mr.trim(),price:price.trim(),price_note:price_note.trim()});
}

async function deleteCustomService(id){
  if(!confirm('Delete this service permanently? Hide it if it may return later.'))return;
  const response=await fetch('/api/custom-services?id='+encodeURIComponent(id),{method:'DELETE'});if(!response.ok){toast('Delete failed');return;}
  data.customServices=data.customServices.filter(service=>service.id!==id);render();toast('Service deleted');
}

// Actions - API aware
async function addFleet(){
  const name=document.getElementById("f_name").value.trim();
  const seating=document.getElementById("f_seating").value.trim()||"—";
  const price=document.getElementById("f_price").value.trim()||"On Request";
  const features=document.getElementById("f_features").value.trim();
  const image=document.getElementById("f_image").value.trim();
  const display_mode=document.getElementById("f_display").value;
  const vehicle_type=document.getElementById("f_type").value;
  const model_color=document.getElementById("f_color").value;
  if(!name){ toast("Enter vehicle name"); return; }
  if(display_mode==='photo' && !image){ toast('Photo mode needs an https image URL'); return; }
  if(image.startsWith('data:')){ toast('Base64 not allowed - use https URL'); return; }
  if(useApi){
    const res = await fetch('/api/fleet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,seating,price,features,image,display_mode,model_color,vehicle_type,visible:true})});
    if(res.ok){ const row=await res.json(); data.fleet.unshift(row); render(); toast('Added to Neon DB'); } else { const j=await res.json(); toast(j.error||'API failed'); }
  } else {
    data.fleet.unshift({id:"f"+Date.now(), name, seating, price, features, image, display_mode, model_color, vehicle_type, visible:true});
    saveLocal(data); render(); toast("Vehicle added.");
  }
}
async function cycleFleetMode(i, id){
  const cur=data.fleet[i]; if(!cur) return;
  const modes=['3d','photo','auto'];
  const current=modes.includes(cur.display_mode)?cur.display_mode:'3d';
  let next=modes[(modes.indexOf(current)+1)%modes.length];
  if(next==='photo'&&!cur.image){ next='auto'; toast('No photo URL saved; switched to Auto instead'); }
  const updated={...cur,display_mode:next};
  if(useApi&&id){
    const res=await fetch('/api/fleet',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(updated)});
    if(!res.ok){ const j=await res.json().catch(()=>({})); toast(j.error||'Display update failed'); return; }
    data.fleet[i]=await res.json();
  }else{ data.fleet[i]=updated; saveLocal(data); }
  render(); toast(`Vehicle visual: ${next.toUpperCase()}`);
}
async function toggleFleet(i, id){ 
  if(useApi && id){
    const cur=data.fleet[i]; const res=await fetch('/api/fleet',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...cur, visible:!cur.visible})});
    if(res.ok){ data.fleet[i]=await res.json(); render(); toast(cur.visible?'Hidden':'Visible'); } else toast('Failed');
  } else { data.fleet[i].visible = data.fleet[i].visible===false ? true : false; saveLocal(data); render(); }
}
async function delFleet(i, id){ 
  if(!confirm("Delete?")) return;
  if(useApi && id){ const r=await fetch('/api/fleet?id='+id,{method:'DELETE'}); if(!r.ok) toast('Delete failed'); }
  data.fleet.splice(i,1); if(!useApi) saveLocal(data); render(); 
}
async function addPkg(){
  const service=document.getElementById("p_service").value.trim();
  const vehicle=document.getElementById("p_vehicle").value.trim()||"All";
  const price=document.getElementById("p_price").value.trim()||"On Request";
  const note=document.getElementById("p_note").value.trim();
  if(!service){ toast("Enter service"); return;}
  if(useApi){
    const res=await fetch('/api/packages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service,vehicle,price,note,visible:true})});
    if(res.ok){ data.packages.unshift(await res.json()); render(); toast('Added');} else toast('Failed');
  } else { data.packages.unshift({id:"p"+Date.now(), service, vehicle, price, note, visible:true}); saveLocal(data); render(); }
}
async function togglePkg(i, id){ 
  if(useApi && id){ const cur=data.packages[i]; const r=await fetch('/api/packages',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...cur, visible:!cur.visible})}); if(r.ok) data.packages[i]=await r.json(); render();
  } else { data.packages[i].visible = data.packages[i].visible===false?true:false; saveLocal(data); render(); }
}
async function delPkg(i, id){ if(useApi&&id) await fetch('/api/packages?id='+id,{method:'DELETE'}); data.packages.splice(i,1); if(!useApi) saveLocal(data); render(); }
async function addGallery(){
  const title=document.getElementById("g_title").value.trim()||"Untitled";
  const category=document.getElementById("g_cat").value;
  const src=document.getElementById("g_src").value.trim();
  if(!src){ toast("Add image URL"); return;}
  if(src.startsWith('data:')){ toast('Base64 not allowed'); return; }
  if(useApi){
    const res=await fetch('/api/gallery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({src,category,title,visible:true})});
    if(res.ok){ data.gallery.unshift(await res.json()); render(); toast('Added');} else toast('Failed');
  } else { data.gallery.unshift({id:"g"+Date.now(), src, category, title, visible:true}); saveLocal(data); render(); }
}
async function toggleGal(i, id){ if(useApi&&id){ const cur=data.gallery[i]; const r=await fetch('/api/gallery',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...cur, visible:!cur.visible})}); if(r.ok) data.gallery[i]=await r.json(); render(); } else { data.gallery[i].visible = data.gallery[i].visible===false?true:false; saveLocal(data); render(); } }
async function delGal(i, id){ if(useApi&&id) await fetch('/api/gallery?id='+id,{method:'DELETE'}); data.gallery.splice(i,1); if(!useApi) saveLocal(data); render(); }
async function addTesti(){
  const name=document.getElementById("t_name").value.trim();
  const place=document.getElementById("t_place").value.trim();
  const rating=parseInt(document.getElementById("t_rating").value)||5;
  const text=document.getElementById("t_text").value.trim();
  if(!name||!text){ toast("Name and text required"); return;}
  if(useApi){
    const res=await fetch('/api/testimonials',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,place,text,rating,visible:true})});
    if(res.ok){ data.testimonials.unshift(await res.json()); render(); toast('Added');} else toast('Failed');
  } else { data.testimonials.unshift({id:"t"+Date.now(), name, place, rating, text, visible:true}); saveLocal(data); render(); }
}
async function toggleTesti(i, id){ if(useApi&&id){ const cur=data.testimonials[i]; const r=await fetch('/api/testimonials',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...cur, visible:!cur.visible})}); if(r.ok) data.testimonials[i]=await r.json(); render(); } else { data.testimonials[i].visible = data.testimonials[i].visible===false?true:false; saveLocal(data); render(); } }
async function delTesti(i, id){ if(useApi&&id) await fetch('/api/testimonials?id='+id,{method:'DELETE'}); data.testimonials.splice(i,1); if(!useApi) saveLocal(data); render(); }

// Service Groups management
function collectGroupFields(id){
  const get=(field)=>document.querySelector(`[data-gfield="${field}"][data-id="${id}"]`);
  const val=(field, isCheck=false)=>{
    const el=get(field);
    if(!el) return null;
    if(isCheck) return el.checked;
    return el.value;
  };
  return {
    id,
    slug: val('slug') || id,
    title: val('title'),
    title_mr: val('title_mr'),
    icon: val('icon'),
    description: val('description'),
    description_mr: val('description_mr'),
    color: val('color'),
    theme_key: '', // derived from color
    replica_ids: (()=>{ const cur=data.serviceGroups.find(g=>g.id===id); return cur?cur.replica_ids:[]; })(),
    include_tour: !!val('include_tour', true),
    sort_order: parseInt(val('sort_order'))||0,
    visible: !!val('visible', true),
    status: val('status')
  };
}
async function saveGroup(id){
  const payload=collectGroupFields(id);
  if(!payload.title){ toast('Title required'); return; }
  const res=await fetch('/api/service-groups',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!res.ok){ const j=await res.json().catch(()=>({})); toast(j.error||'Save failed'); return; }
  const saved=await res.json();
  const idx=data.serviceGroups.findIndex(g=>g.id===id);
  if(idx>=0) data.serviceGroups[idx]=saved; else data.serviceGroups.push(saved);
  // keep sorted
  data.serviceGroups.sort((a,b)=> (a.sort_order||0)-(b.sort_order||0));
  render(); toast('Group saved — homepage reflects visible+published only');
}
async function addGroup(){
  const id=prompt('New group id (slug, e.g., travel):');
  if(!id) return;
  const title=prompt('Title EN:')||id;
  const res=await fetch('/api/service-groups',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id, slug:id, title, visible:true, status:'draft', sort_order: (data.serviceGroups.length), replica_ids:[]})});
  if(!res.ok){ toast('Add failed'); return; }
  const saved=await res.json();
  data.serviceGroups.push(saved);
  render(); toast('Group added as draft');
}
function editGroupIds(id){
  const cur=data.serviceGroups.find(g=>g.id===id);
  const current=(cur?.replica_ids||[]).join(', ');
  const inp=prompt('Replica IDs comma-separated (e.g., banking,aadhaar,pan). Valid IDs: '+ (data.serviceCatalog?.map(c=>c.id).join(', ')||'...'), current);
  if(inp===null) return;
  const ids=inp.split(',').map(s=>s.trim()).filter(Boolean);
  cur.replica_ids=ids;
  // persist via PUT
  saveGroup(id);
}
async function moveGroup(id, dir){
  const idx=data.serviceGroups.findIndex(g=>g.id===id);
  if(idx<0) return;
  const nidx=idx+dir;
  if(nidx<0 || nidx>=data.serviceGroups.length) return;
  // swap sort_order
  const a=data.serviceGroups[idx], b=data.serviceGroups[nidx];
  const tmp=a.sort_order; a.sort_order=b.sort_order; b.sort_order=tmp;
  // swap in array for immediate visual
  data.serviceGroups[idx]=b; data.serviceGroups[nidx]=a;
  // persist both
  await Promise.all([
    fetch('/api/service-groups',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(a)}),
    fetch('/api/service-groups',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)})
  ]);
  render();
}
