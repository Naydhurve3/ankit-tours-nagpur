const STORAGE_KEY = "att_admin_data";

async function fetchSeed(){
  try{
    const res = await fetch("assets/data/site-data.json");
    if(!res.ok) throw new Error("seed fetch failed");
    return await res.json();
  }catch(e){
    console.warn(e);
    return {fleet:[], packages:[], gallery:[], testimonials:[]};
  }
}

function loadLocal(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch{ return null; }
}

function saveLocal(data){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function mergeData(seed, local){
  if(!local) return seed;
  // local overrides seed where ids match, and adds new; respects visible flag
  const merged = structuredClone(seed);
  ["fleet","packages","gallery","testimonials"].forEach(k=>{
    if(Array.isArray(local[k])){
      // use local as source of truth if exists, else seed
      // For fleet etc, if local has entries, we take local fully (allows hide/show/add/remove)
      // If local array empty, fallback to seed
      if(local[k].length>0) merged[k]=local[k];
    }
  });
  return merged;
}

async function loadData(){
  const seed = await fetchSeed();
  const local = loadLocal();
  return mergeData(seed, local);
}

function visibleOnly(arr){ return (arr||[]).filter(x=> x.visible !== false); }

// Export helper
function downloadJSON(data, filename="site-data.json"){
  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}
