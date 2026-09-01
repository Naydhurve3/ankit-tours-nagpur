import { getSql } from '../lib/db.js';
import { requireAuth, logAudit } from '../lib/auth.js';
function s(v,m=200){ return typeof v==='string'? v.trim().slice(0,m): ''; }
export default async function handler(req,res){
  if(req.method==='OPTIONS'){ res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization'); return res.status(200).end(); }
  const sql=getSql(); const rid=Math.random().toString(36).slice(2,8);
  try{
    if(req.method==='GET'){
      // Public coarse view: only display_name, photo, languages, experience, active_status available/assigned
      // But if authenticated owner, return full
      const token = (req.headers.cookie||'').match(/att_owner=([^;]+)/);
      let isOwner=false;
      if(token){
        try{ const rows=await sql`SELECT 1 FROM owner_sessions WHERE token=${decodeURIComponent(token[1])} AND expires_at>now() AND revoked_at IS NULL LIMIT 1`; isOwner=rows.length>0; }catch{}
      }
      if(isOwner){
        const rows=await sql`SELECT * FROM drivers ORDER BY created_at DESC`;
        return res.status(200).json(rows);
      } else {
        const rows=await sql`SELECT id, display_name, photo_url, languages, experience_years, active_status FROM drivers WHERE active_status IN ('available','assigned') ORDER BY created_at DESC`;
        return res.status(200).json(rows);
      }
    }
    const ok=await requireAuth(req,res); if(!ok) return;
    if(req.method==='POST'){
      const {internal_code, legal_name, display_name, phone, alternate_phone, photo_url, languages, experience_years, eligible_vehicles, active_status, notes}=req.body||{};
      const ln=s(legal_name,80); if(!ln) return res.status(400).json({error:'legal_name required'});
      if(photo_url && photo_url.startsWith('data:')) return res.status(400).json({error:'photo must be https URL'});
      const rows=await sql`INSERT INTO drivers (internal_code, legal_name, display_name, phone, alternate_phone, photo_url, languages, experience_years, eligible_vehicles, active_status, notes) VALUES (${s(internal_code,20)}, ${ln}, ${s(display_name,60)}, ${s(phone,20)}, ${s(alternate_phone,20)}, ${s(photo_url,500)}, ${s(languages,100)}, ${parseInt(experience_years)||null}, ${s(eligible_vehicles,100)}, ${s(active_status||'available',20)}, ${s(notes,500)}) RETURNING *`;
      await logAudit(sql,{event_type:'CREATE', entity_type:'drivers', entity_id:rows[0].id, after_json:rows[0], req});
      return res.status(201).json(rows[0]);
    }
    if(req.method==='PUT'){
      const {id, ...f}=req.body||{}; if(!id) return res.status(400).json({error:'id required'});
      const before=await sql`SELECT * FROM drivers WHERE id=${id} LIMIT 1`;
      const rows=await sql`UPDATE drivers SET display_name=${s(f.display_name,60)}, phone=${s(f.phone,20)}, photo_url=${s(f.photo_url,500)}, languages=${s(f.languages,100)}, active_status=${s(f.active_status,20)}, notes=${s(f.notes,500)}, updated_at=now() WHERE id=${id} RETURNING *`;
      await logAudit(sql,{event_type:'UPDATE', entity_type:'drivers', entity_id:id, before_json:before[0], after_json:rows[0], req});
      return res.status(200).json(rows[0]);
    }
    if(req.method==='DELETE'){
      const {id}=req.query; if(!id) return res.status(400).json({error:'id required'});
      const before=await sql`SELECT * FROM drivers WHERE id=${id} LIMIT 1`;
      await sql`DELETE FROM drivers WHERE id=${id}`;
      await logAudit(sql,{event_type:'DELETE', entity_type:'drivers', entity_id:id, before_json:before[0], req});
      return res.status(200).json({ok:true});
    }
    return res.status(405).json({error:'method not allowed'});
  }catch(e){ console.error('drivers '+rid,e); return res.status(500).json({error:'Server error', requestId:rid}); }
}
