import { getSql } from '../lib/db.js';
import { requireAuth, logAudit } from '../lib/auth.js';
function s(v,m=300){ return typeof v==='string'? v.trim().slice(0,m): ''; }
function isUrl(u){ if(!u) return false; if(u.startsWith('data:')) return /^data:image\/(png|jpe?g|webp);base64,/.test(u) && u.length<=400000; try{ const p=new URL(u); return ['https:','http:'].includes(p.protocol);}catch{ return false; } }
export default async function handler(req,res){
  if(req.method==='OPTIONS'){ res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization'); return res.status(200).end(); }
  const sql=getSql(); const rid=Math.random().toString(36).slice(2,8);
  try{
    if(req.method==='GET'){ const rows=await sql`SELECT id, src, category, title, visible, created_at FROM gallery WHERE visible=true ORDER BY created_at DESC`; return res.status(200).json(rows); }
    const ok=await requireAuth(req,res); if(!ok) return;
    if(req.method==='POST'){ const {src,category,title,visible}=req.body||{}; if(!src || !isUrl(src)) return res.status(400).json({error:'valid https src required, base64 not allowed'}); const rows=await sql`INSERT INTO gallery (src,category,title,visible) VALUES (${s(src,400000)},${s(category,20)},${s(title,80)},${visible!==false}) RETURNING *`; await logAudit(sql,{event_type:'CREATE', entity_type:'gallery', entity_id:rows[0].id, after_json:rows[0], req}); return res.status(201).json(rows[0]); }
    if(req.method==='PUT'){ const {id,src,category,title,visible}=req.body||{}; if(!id) return res.status(400).json({error:'id required'}); if(src && !isUrl(src)) return res.status(400).json({error:'invalid src'}); const before=await sql`SELECT * FROM gallery WHERE id=${id} LIMIT 1`; const rows=await sql`UPDATE gallery SET src=${s(src,400000)},category=${s(category,20)},title=${s(title,80)},visible=${visible} WHERE id=${id} RETURNING *`; await logAudit(sql,{event_type:'UPDATE', entity_type:'gallery', entity_id:id, before_json:before[0], after_json:rows[0], req}); return res.status(200).json(rows[0]); }
    if(req.method==='DELETE'){ const {id}=req.query; const before=await sql`SELECT * FROM gallery WHERE id=${id} LIMIT 1`; await sql`DELETE FROM gallery WHERE id=${id}`; await logAudit(sql,{event_type:'DELETE', entity_type:'gallery', entity_id:id, before_json:before[0], req}); return res.status(200).json({ok:true}); }
    return res.status(405).json({error:'method not allowed'});
  }catch(e){ console.error('gal '+rid,e); return res.status(500).json({error:'Server error', requestId:rid}); }
}
