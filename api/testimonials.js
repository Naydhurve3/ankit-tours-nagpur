import { getSql } from '../lib/db.js';
import { requireAuth, logAudit } from '../lib/auth.js';
function s(v,m=500){ return typeof v==='string'? v.trim().slice(0,m): ''; }
export default async function handler(req,res){
  if(req.method==='OPTIONS'){ res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization'); return res.status(200).end(); }
  const sql=getSql(); const rid=Math.random().toString(36).slice(2,8);
  try{
    if(req.method==='GET'){ const rows=await sql`SELECT id, name, place, text, rating, visible, created_at FROM testimonials WHERE visible=true ORDER BY created_at DESC`; return res.status(200).json(rows); }
    const ok=await requireAuth(req,res); if(!ok) return;
    if(req.method==='POST'){ const {name,place,text,rating,visible}=req.body||{}; const n=s(name,60); const t=s(text,600); if(!n||!t) return res.status(400).json({error:'name and text required'}); const r=Math.min(5,Math.max(1,parseInt(rating)||5)); const rows=await sql`INSERT INTO testimonials (name,place,text,rating,visible) VALUES (${n},${s(place,80)},${t},${r},${visible!==false}) RETURNING *`; await logAudit(sql,{event_type:'CREATE', entity_type:'testimonials', entity_id:rows[0].id, after_json:rows[0], req}); return res.status(201).json(rows[0]); }
    if(req.method==='PUT'){ const {id,name,place,text,rating,visible}=req.body||{}; if(!id) return res.status(400).json({error:'id required'}); const before=await sql`SELECT * FROM testimonials WHERE id=${id} LIMIT 1`; const rows=await sql`UPDATE testimonials SET name=${s(name,60)},place=${s(place,80)},text=${s(text,600)},rating=${Math.min(5,Math.max(1,parseInt(rating)||5))},visible=${visible} WHERE id=${id} RETURNING *`; await logAudit(sql,{event_type:'UPDATE', entity_type:'testimonials', entity_id:id, before_json:before[0], after_json:rows[0], req}); return res.status(200).json(rows[0]); }
    if(req.method==='DELETE'){ const {id}=req.query; const before=await sql`SELECT * FROM testimonials WHERE id=${id} LIMIT 1`; await sql`DELETE FROM testimonials WHERE id=${id}`; await logAudit(sql,{event_type:'DELETE', entity_type:'testimonials', entity_id:id, before_json:before[0], req}); return res.status(200).json({ok:true}); }
    return res.status(405).json({error:'method not allowed'});
  }catch(e){ console.error('testi '+rid,e); return res.status(500).json({error:'Server error', requestId:rid}); }
}
