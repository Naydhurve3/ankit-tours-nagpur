import { getSql } from '../lib/db.js';
import { requireAuth, logAudit } from '../lib/auth.js';
function s(v,m=120){ return typeof v==='string'? v.trim().slice(0,m): ''; }
export default async function handler(req,res){
  if(req.method==='OPTIONS'){ res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization'); return res.status(200).end(); }
  const sql=getSql(); const rid=Math.random().toString(36).slice(2,8);
  try{
    if(req.method==='GET'){ const rows=await sql`SELECT id, service, vehicle, price, note, visible, created_at FROM packages WHERE visible=true ORDER BY created_at DESC`; return res.status(200).json(rows); }
    const ok=await requireAuth(req,res); if(!ok) return;
    if(req.method==='POST'){ const {service,vehicle,price,note,visible}=req.body||{}; const svc=s(service,80); if(!svc) return res.status(400).json({error:'service required'}); const rows=await sql`INSERT INTO packages (service,vehicle,price,note,visible) VALUES (${svc},${s(vehicle,60)},${s(price,40)},${s(note,200)},${visible!==false}) RETURNING *`; await logAudit(sql,{event_type:'CREATE', entity_type:'packages', entity_id:rows[0].id, after_json:rows[0], req}); return res.status(201).json(rows[0]); }
    if(req.method==='PUT'){ const {id,service,vehicle,price,note,visible}=req.body||{}; if(!id) return res.status(400).json({error:'id required'}); const before=await sql`SELECT * FROM packages WHERE id=${id} LIMIT 1`; const rows=await sql`UPDATE packages SET service=${s(service,80)},vehicle=${s(vehicle,60)},price=${s(price,40)},note=${s(note,200)},visible=${visible} WHERE id=${id} RETURNING *`; if(!rows.length) return res.status(404).json({error:'not found'}); await logAudit(sql,{event_type:'UPDATE', entity_type:'packages', entity_id:id, before_json:before[0], after_json:rows[0], req}); return res.status(200).json(rows[0]); }
    if(req.method==='DELETE'){ const {id}=req.query; if(!id) return res.status(400).json({error:'id required'}); const before=await sql`SELECT * FROM packages WHERE id=${id} LIMIT 1`; await sql`DELETE FROM packages WHERE id=${id}`; await logAudit(sql,{event_type:'DELETE', entity_type:'packages', entity_id:id, before_json:before[0], req}); return res.status(200).json({ok:true}); }
    return res.status(405).json({error:'method not allowed'});
  }catch(e){ console.error('pkg '+rid,e); return res.status(500).json({error:'Server error', requestId:rid}); }
}
