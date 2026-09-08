import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const json=async file=>JSON.parse(await readFile(path.join(root,file),'utf8'));
let checks=0;const check=(condition,message)=>{assert.ok(condition,message);checks++;console.log(`PASS ${message}`);};
const categories=await json('assets/data/replica-services.json');const groups=await json('assets/data/service-groups.json');const seed=await json('assets/data/site-data.json');
globalThis.location={hostname:'127.0.0.1',origin:'http://127.0.0.1:4185'};
let settings=[],custom=[],groupResponse=groups,offline=false;
const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>{
  let value;if(url==='/assets/data/replica-services.json')value=categories;
  else if(url==='/assets/data/site-data.json')value=seed;
  else if(offline)return {ok:false,json:async()=>({error:'Unavailable'})};
  else if(url==='/api/service-settings')value=settings;
  else if(url==='/api/service-groups?kind=custom')value=custom;
  else if(url==='/api/service-groups?public=true')value=groupResponse;
  else throw new Error(`Unexpected request: ${url}`);
  return {ok:true,json:async()=>structuredClone(value)};
};
const {loadCatalog,esc,travelCategory}=await import('../web/catalog.js');
let result=await loadCatalog();
check(categories.length===13&&categories.reduce((n,c)=>n+c.items.length,0)===72,'72 assistance services in 13 categories retained');
check(result.items.length===78&&new Set(result.items.map(i=>i.id)).size===78,'6 travel + 72 assistance services have unique stable IDs');
check(categories.every(c=>c.items.length===c.itemsMr.length),'Every built-in service has matching Marathi text');
for(const [id,count] of [['travel',6],['banking-services',43],['print-photo',7],['online-services',22]]){const route=result.routes.find(r=>r.id===id);check(result.items.filter(i=>route.categories.includes(i.category)).length===count,`${id} maps to all ${count} expected services`);}
settings=[{service_id:'printing-1',visible:false},{service_id:'travel-1',price:'₹999',pinned:true}];custom=[{id:7,category_id:'travel',name_en:'New owner travel service',name_mr:'नवीन प्रवास सेवा',visible:true},{id:8,category_id:'printing',name_en:'Hidden custom service',visible:false}];
result=await loadCatalog();
check(!result.items.some(i=>i.id==='printing-1'||i.id==='custom-8'),'Hidden standard and custom services are removed');
check(result.items[0].id==='travel-1'&&result.items[0].price==='₹999','Pinned services sort first and owner price is applied');
check(result.items.some(i=>i.id==='custom-7'&&i.category==='travel'),'Owner-created travel service enters the travel catalogue');
groupResponse=groups.map(g=>({...g,visible:g.id!=='banking-services'}));result=await loadCatalog();
check(!result.items.some(i=>['banking','aadhaar','pan','farmer','government','bachat','bus','bills'].includes(i.category)),'Hidden service group removes its services from public search');
offline=true;result=await loadCatalog();check(result.items.length===78,'Loopback design preview uses the full local catalogue');
globalThis.location.hostname='redesign.example';await assert.rejects(loadCatalog(),/temporarily unavailable/);checks++;console.log('PASS Hosted catalogue fails closed when publication APIs fail');
globalThis.fetch=originalFetch;
check(esc('<img src=x onerror="bad">').includes('&lt;img'),'Owner-provided text is escaped for HTML');

// Behavioral auth-boundary checks use mocked SQL and auth only; no database or credentials.
for(const name of ['fleet','packages','gallery','testimonials']){
  let authorised=false,queries=[];
  const sql=async(strings,...values)=>{const q=strings.join('?');queries.push(q);if(!q.startsWith('SELECT'))return [];const rows=[{id:1,visible:true},{id:2,visible:false}];return q.includes('WHERE visible=true')?rows.slice(0,1):rows;};
  const context=vm.createContext({console,URL,Math,Promise});
  const db=new vm.SyntheticModule(['getSql'],function(){this.setExport('getSql',()=>sql);},{context});
  const auth=new vm.SyntheticModule(['requireAuth','logAudit'],function(){this.setExport('requireAuth',async(req,res)=>{if(!authorised){res.status(401).json({error:'Unauthorized'});return false;}return true;});this.setExport('logAudit',async()=>{});},{context});
  const module=new vm.SourceTextModule(await readFile(path.join(root,`api/${name}.js`),'utf8'),{context});
  await module.link(spec=>spec.includes('db.js')?db:auth);await module.evaluate();
  async function get(query){queries=[];const res={code:200,data:null,headers:{},status(code){this.code=code;return this;},json(data){this.data=data;return this;},setHeader(k,v){this.headers[k]=v;},end(){}};await module.namespace.default({method:'GET',query,headers:{}},res);return res;}
  let response=await get({});check(response.data.length===1&&response.data[0].visible,`${name}: public feed excludes hidden records`);
  response=await get({all:'1'});check(response.code===401&&!queries.some(q=>q.startsWith('SELECT')),`${name}: owner feed refuses unauthenticated access`);
  authorised=true;response=await get({all:'1'});check(response.data.length===2&&response.headers['Cache-Control']==='private, no-store',`${name}: owner feed restores access to hidden records without caching`);
}

async function filesAt(dir){let files=[];for(const entry of await readdir(path.join(root,dir),{withFileTypes:true})){const child=path.join(dir,entry.name);files.push(...entry.isDirectory()?await filesAt(child):[child]);}return files;}
for(const file of [...await filesAt('web'),...await filesAt('api'),...await filesAt('lib'),...await filesAt('scripts')].filter(f=>/\.(js|mjs)$/.test(f)))execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});
check(true,'All active frontend, backend and build scripts pass JavaScript syntax checks');
const functions=(await filesAt('api')).filter(f=>f.endsWith('.js'));check(functions.length===12,'Vercel function count remains 12');
const html=await readFile(path.join(root,'dist/index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="(\/(?:web|assets)\/[^"#]+)"/g))await readFile(path.join(root,'dist',match[1]));
check(true,'Built homepage assets resolve in deployment output');
for(const route of ['travel','banking-services','print-photo','online-services','contact','services'])check((await readFile(path.join(root,'dist',route,'index.html'),'utf8')).includes('/web/app.js'),`${route}: built route uses the shared application`);
const built=await filesAt('dist');check(!built.some(f=>/\b(legacy|api|lib|docs|\.env)\b/.test(f)),'Static build excludes legacy, server code and environment files');
console.log(`\n${checks} verification checks passed. No live API writes or external messages were made.`);
