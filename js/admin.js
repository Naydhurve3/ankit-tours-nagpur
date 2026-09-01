let data = {fleet:[], packages:[], gallery:[], testimonials:[]};
let currentTab = "fleet";
let useApi = false;
let authenticated = false;

async function checkApi(){
  try{
    const r = await fetch('/api/health');
    if(r.ok){ useApi = true; return true; }
  }catch{}
  useApi=false; return false;
}
async function loadFromApi(){
  try{
    const [fleet, packages, gallery, testimonials] = await Promise.all([
      fetch('/api/fleet').then(r=>r.json()),
      fetch('/api/packages').then(r=>r.json()),
      fetch('/api/gallery').then(r=>r.json()),
      fetch('/api/testimonials').then(r=>r.json())
    ]);
    return {fleet, packages, gallery, testimonials};
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
  if(currentTab==="fleet") panel.innerHTML = renderFleetAdmin();
  if(currentTab==="packages") panel.innerHTML = renderPackagesAdmin();
  if(currentTab==="gallery") panel.innerHTML = renderGalleryAdmin();
  if(currentTab==="testimonials") panel.innerHTML = renderTestimonialsAdmin();
  if(currentTab==="drivers") panel.innerHTML = renderDriversAdmin();
  if(currentTab==="bookings") panel.innerHTML = renderBookingsAdmin();
  bindAdminEvents();
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
      <input id="f_image" class="field" placeholder="https:// image URL only (no base64)" style="flex:2">
    </div>
    <div style="margin-top:10px;display:flex;gap:8px">
      <button class="btn-sm primary" onclick="addFleet()">+ Add Vehicle</button>
      <span class="hint">Use https URL. Eye = hide/show on public.</span>
    </div>
    <div class="list" style="margin-top:14px">${data.fleet.map((f,i)=>`
      <div class="item ${f.visible===false?'off':''}">
        <img src="${f.image}" onerror="this.style.background='#e2e8f0'">
        <div>
          <b>${escapeHtml(f.name)}</b> <span class="badge ${f.visible!==false?'on':''}">${f.visible!==false?'Visible':'Hidden'}</span><br>
          <span class="small muted">${escapeHtml(f.seating)} • ${escapeHtml(f.price)} • ${escapeHtml(f.features||'')}</span>
        </div>
        <div class="item-actions">
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

function bindAdminEvents(){ /* base64 removed per spec */ }

// Actions - API aware
async function addFleet(){
  const name=document.getElementById("f_name").value.trim();
  const seating=document.getElementById("f_seating").value.trim()||"—";
  const price=document.getElementById("f_price").value.trim()||"On Request";
  const features=document.getElementById("f_features").value.trim();
  const image=document.getElementById("f_image").value.trim() || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600";
  if(!name){ toast("Enter vehicle name"); return; }
  if(image.startsWith('data:')){ toast('Base64 not allowed - use https URL'); return; }
  if(useApi){
    const res = await fetch('/api/fleet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,seating,price,features,image,visible:true})});
    if(res.ok){ const row=await res.json(); data.fleet.unshift(row); render(); toast('Added to Neon DB'); } else { const j=await res.json(); toast(j.error||'API failed'); }
  } else {
    data.fleet.unshift({id:"f"+Date.now(), name, seating, price, features, image, visible:true});
    saveLocal(data); render(); toast("Vehicle added.");
  }
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
