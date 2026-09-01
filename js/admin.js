let data = {fleet:[], packages:[], gallery:[], testimonials:[]};
let currentTab = "fleet";
const PIN = "7276";

document.addEventListener("DOMContentLoaded", async ()=>{
  const seed = await fetchSeed();
  const local = loadLocal();
  data = local ? mergeData(seed, local) : structuredClone(seed);
  if(!local) saveLocal(data); // init

  // pin gate
  const gate = document.getElementById("gate");
  const dash = document.getElementById("dashboard");
  const pinInput = document.getElementById("pinInput");
  document.getElementById("pinBtn").addEventListener("click", checkPin);
  pinInput.addEventListener("keydown", e=>{ if(e.key==="Enter") checkPin(); });
  function checkPin(){
    if(pinInput.value.trim()===PIN){
      gate.classList.add("hidden");
      dash.classList.remove("hidden");
      render();
    } else {
      document.getElementById("pinMsg").textContent = "Wrong PIN. Hint: last 4 digits of 7276066532";
    }
  }
  // allow bypass for demo via query ?pin=7276
  const qp = new URLSearchParams(location.search);
  if(qp.get("pin")===PIN){ pinInput.value=PIN; checkPin(); }

  document.querySelectorAll(".tab").forEach(t=> t.addEventListener("click", ()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    t.classList.add("active");
    currentTab = t.dataset.tab;
    render();
  }));

  document.getElementById("saveBtn").addEventListener("click", ()=>{
    saveLocal(data);
    toast("Saved locally. Public site will show updated data on refresh.");
  });
  document.getElementById("exportBtn").addEventListener("click", ()=> downloadJSON(data));
  document.getElementById("resetBtn").addEventListener("click", async ()=>{
    if(!confirm("Reset to default seed? Current local changes will be lost.")) return;
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
  bindAdminEvents();
}

function renderFleetAdmin(){
  return `
    <h3>Fleet - Add / Hide / Remove</h3>
    <div class="toolbar">
      <input id="f_name" class="field" placeholder="Vehicle Name e.g. Innova Crysta">
      <input id="f_seating" class="field" placeholder="Seating e.g. 7+1">
      <input id="f_price" class="field" placeholder="Price e.g. ₹18 / km">
      <input id="f_features" class="field" placeholder="Features e.g. AC • Music">
    </div>
    <div class="toolbar">
      <input id="f_image" class="field" placeholder="Image URL (or use upload)" style="flex:2">
      <input type="file" id="f_file" accept="image/*" class="field" style="flex:1">
    </div>
    <div id="f_preview" class="preview">Preview will appear here</div>
    <div style="margin-top:10px;display:flex;gap:8px">
      <button class="btn-sm primary" onclick="addFleet()">+ Add Vehicle</button>
      <span class="hint">Tip: Upload image OR paste URL. Eye icon = hide/show on public site. Public reads only visible=true.</span>
    </div>
    <div class="list" style="margin-top:14px">${data.fleet.map((f,i)=>`
      <div class="item ${f.visible===false?'off':''}">
        <img src="${f.image}" onerror="this.style.background='#e2e8f0'">
        <div>
          <b>${f.name}</b> <span class="badge ${f.visible!==false?'on':''}">${f.visible!==false?'Visible':'Hidden'}</span><br>
          <span class="small muted">${f.seating} • ${f.price} • ${f.features||''}</span>
        </div>
        <div class="item-actions">
          <button class="icon-btn" title="Hide/Show" onclick="toggleFleet(${i})">${f.visible!==false?'👁️':'🚫'}</button>
          <button class="icon-btn danger" title="Delete" onclick="delFleet(${i})">✕</button>
        </div>
      </div>
    `).join("")}</div>
  `;
}
function renderPackagesAdmin(){
  return `
    <h3>Packages & Pricing</h3>
    <div class="toolbar">
      <input id="p_service" class="field" placeholder="Service e.g. Airport Transfer">
      <input id="p_vehicle" class="field" placeholder="Vehicle e.g. Ertiga">
      <input id="p_price" class="field" placeholder="Price e.g. ₹1,500">
      <input id="p_note" class="field" placeholder="Note e.g. Toll extra">
      <button class="btn-sm primary" onclick="addPkg()">+ Add</button>
    </div>
    <div class="list">${data.packages.map((p,i)=>`
      <div class="item ${p.visible===false?'off':''}" style="grid-template-columns:1fr auto">
        <div><b>${p.service}</b> • <span class="tag">${p.vehicle}</span> • <b style="color:#0f4c81">${p.price}</b><br><span class="small muted">${p.note||''}</span> <span class="badge ${p.visible!==false?'on':''}">${p.visible!==false?'Visible':'Hidden'}</span></div>
        <div class="item-actions">
          <button class="icon-btn" onclick="togglePkg(${i})">${p.visible!==false?'👁️':'🚫'}</button>
          <button class="icon-btn danger" onclick="delPkg(${i})">✕</button>
        </div>
      </div>
    `).join("")}</div>
  `;
}
function renderGalleryAdmin(){
  return `
    <h3>Gallery - Add / Hide</h3>
    <div class="toolbar">
      <input id="g_title" class="field" placeholder="Title e.g. Tadoba Jungle">
      <select id="g_cat" class="field"><option value="fleet">fleet</option><option value="safari">safari</option><option value="pilgrimage">pilgrimage</option></select>
      <input id="g_src" class="field" placeholder="Image URL" style="flex:2">
      <input type="file" id="g_file" accept="image/*" class="field">
      <button class="btn-sm primary" onclick="addGallery()">+ Add Image</button>
    </div>
    <div id="g_preview" class="preview">Preview</div>
    <div class="list" style="margin-top:14px">${data.gallery.map((g,i)=>`
      <div class="item ${g.visible===false?'off':''}">
        <img src="${g.src}">
        <div><b>${g.title||g.category}</b> <span class="badge">${g.category}</span> <span class="badge ${g.visible!==false?'on':''}">${g.visible!==false?'Visible':'Hidden'}</span></div>
        <div class="item-actions">
          <button class="icon-btn" onclick="toggleGal(${i})">${g.visible!==false?'👁️':'🚫'}</button>
          <button class="icon-btn danger" onclick="delGal(${i})">✕</button>
        </div>
      </div>
    `).join("")}</div>
  `;
}
function renderTestimonialsAdmin(){
  return `
    <h3>Testimonials</h3>
    <div class="toolbar">
      <input id="t_name" class="field" placeholder="Name">
      <input id="t_place" class="field" placeholder="Place e.g. Nagpur → Tadoba">
      <select id="t_rating" class="field" style="max-width:100px"><option value="5">5 ★</option><option value="4">4 ★</option><option value="3">3 ★</option></select>
    </div>
    <div class="toolbar"><textarea id="t_text" class="field" placeholder="Review text" style="min-height:70px;flex:1"></textarea><button class="btn-sm primary" onclick="addTesti()">+ Add</button></div>
    <div class="list">${data.testimonials.map((t,i)=>`
      <div class="item ${t.visible===false?'off':''}" style="grid-template-columns:1fr auto">
        <div><b>${t.name}</b> • ${'★'.repeat(t.rating)} <span class="badge ${t.visible!==false?'on':''}">${t.visible!==false?'Visible':'Hidden'}</span><br><span class="small muted">${t.place||''}</span><br><span class="small">${t.text}</span></div>
        <div class="item-actions"><button class="icon-btn" onclick="toggleTesti(${i})">${t.visible!==false?'👁️':'🚫'}</button><button class="icon-btn danger" onclick="delTesti(${i})">✕</button></div>
      </div>
    `).join("")}</div>
  `;
}

function bindAdminEvents(){
  // fleet file preview
  const fFile = document.getElementById("f_file");
  if(fFile) fFile.addEventListener("change", e=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=> {
      const url = reader.result;
      document.getElementById("f_image").value = url;
      const p = document.getElementById("f_preview");
      p.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover">`;
    };
    reader.readAsDataURL(file);
  });
  const gFile = document.getElementById("g_file");
  if(gFile) gFile.addEventListener("change", e=>{
    const file = e.target.files[0];
    if(!file) return;
    const r = new FileReader();
    r.onload=()=> {
      document.getElementById("g_src").value=r.result;
      document.getElementById("g_preview").innerHTML=`<img src="${r.result}" style="width:100%;height:100%;object-fit:cover">`;
    };
    r.readAsDataURL(file);
  });
}

// Actions
function addFleet(){
  const name=document.getElementById("f_name").value.trim();
  const seating=document.getElementById("f_seating").value.trim()||"—";
  const price=document.getElementById("f_price").value.trim()||"On Request";
  const features=document.getElementById("f_features").value.trim();
  const image=document.getElementById("f_image").value.trim() || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600";
  if(!name){ toast("Enter vehicle name"); return; }
  if(image.length > 800000) toast("Image large - may exceed 5MB storage. Use URL instead if needed.");
  data.fleet.unshift({id:"f"+Date.now(), name, seating, price, features, image, visible:true});
  saveLocal(data); render(); toast("Vehicle added. Click Save & check Public.");
}
function toggleFleet(i){ data.fleet[i].visible = data.fleet[i].visible===false ? true : false; saveLocal(data); render(); }
function delFleet(i){ if(confirm("Delete?")){ data.fleet.splice(i,1); saveLocal(data); render(); } }

function addPkg(){
  const service=document.getElementById("p_service").value.trim();
  const vehicle=document.getElementById("p_vehicle").value.trim()||"All";
  const price=document.getElementById("p_price").value.trim()||"On Request";
  const note=document.getElementById("p_note").value.trim();
  if(!service){ toast("Enter service"); return;}
  data.packages.unshift({id:"p"+Date.now(), service, vehicle, price, note, visible:true});
  saveLocal(data); render();
}
function togglePkg(i){ data.packages[i].visible = data.packages[i].visible===false?true:false; saveLocal(data); render(); }
function delPkg(i){ data.packages.splice(i,1); saveLocal(data); render(); }

function addGallery(){
  const title=document.getElementById("g_title").value.trim()||"Untitled";
  const category=document.getElementById("g_cat").value;
  const src=document.getElementById("g_src").value.trim();
  if(!src){ toast("Add image URL or upload"); return;}
  data.gallery.unshift({id:"g"+Date.now(), src, category, title, visible:true});
  saveLocal(data); render();
}
function toggleGal(i){ data.gallery[i].visible = data.gallery[i].visible===false?true:false; saveLocal(data); render(); }
function delGal(i){ data.gallery.splice(i,1); saveLocal(data); render(); }

function addTesti(){
  const name=document.getElementById("t_name").value.trim();
  const place=document.getElementById("t_place").value.trim();
  const rating=parseInt(document.getElementById("t_rating").value)||5;
  const text=document.getElementById("t_text").value.trim();
  if(!name||!text){ toast("Name and text required"); return;}
  data.testimonials.unshift({id:"t"+Date.now(), name, place, rating, text, visible:true});
  saveLocal(data); render();
}
function toggleTesti(i){ data.testimonials[i].visible = data.testimonials[i].visible===false?true:false; saveLocal(data); render(); }
function delTesti(i){ data.testimonials.splice(i,1); saveLocal(data); render(); }
