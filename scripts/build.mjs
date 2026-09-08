import {mkdir,cp,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'dist');await mkdir(out,{recursive:true});
for(const dir of ['web','assets'])await cp(path.join(root,dir),path.join(out,dir),{recursive:true});
const page=await readFile(path.join(root,'web/index.html'),'utf8');
const pages={'index.html':'Replica Click | Your local service centre, Kondhali','travel/index.html':'Ankit Tours & Travels | Kondhali, Nagpur','banking-services/index.html':'Banking & Citizen Help | Replica Click','print-photo/index.html':'Print, Photo & Documents | Replica Click','online-services/index.html':'Online Services | Replica Click','contact/index.html':'Contact & Directions | Replica Click','services/index.html':'Service Directory | Replica Click'};
for(const [file,title] of Object.entries(pages)){await mkdir(path.dirname(path.join(out,file)),{recursive:true});await writeFile(path.join(out,file),page.replace(/<title>.*?<\/title>/,`<title>${title}</title>`));}
await cp(path.join(root,'web/owner.html'),path.join(out,'admin.html'));
for(const file of ['robots.txt','sitemap.xml'])await cp(path.join(root,file),path.join(out,file));
console.log('Built public routes, owner workspace and local assets into dist.');
