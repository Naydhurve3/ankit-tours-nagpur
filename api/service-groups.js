import { getSql } from '../lib/db.js';
import { requireAuth, logAudit } from '../lib/auth.js';

function s(v,m=200){ return typeof v==='string'? v.trim().slice(0,m): ''; }

export default async function handler(req,res){
  if(req.method==='OPTIONS'){ res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization'); return res.status(200).end(); }
  const sql=getSql(); const rid=Math.random().toString(36).slice(2,8);
  try{
    if(req.method==='GET'){
      const isPublic = req.query.public === 'true' || req.query.public === '1';
      // try to ensure table exists (migration already)
      if(isPublic){
        const rows=await sql`SELECT id, slug, title, title_mr, icon, description, description_mr, color, theme_key, replica_ids, include_tour, sort_order, visible, status FROM service_groups WHERE visible=true AND status='published' ORDER BY sort_order ASC, created_at ASC`;
        return res.status(200).json(rows);
      } else {
        // owner: require auth
        const ok=await requireAuth(req,res); if(!ok) return;
        const rows=await sql`SELECT * FROM service_groups ORDER BY sort_order ASC, created_at ASC`;
        return res.status(200).json(rows);
      }
    }
    const ok=await requireAuth(req,res); if(!ok) return;
    if(req.method==='POST'){
      const {id, slug, title, title_mr, icon, description, description_mr, color, theme_key, replica_ids, include_tour, sort_order, visible, status}=req.body||{};
      const nid=s(id,40) || s(slug,40);
      if(!nid) return res.status(400).json({error:'id/slug required'});
      if(!s(title,80)) return res.status(400).json({error:'title required'});
      const rows=await sql`INSERT INTO service_groups (id, slug, title, title_mr, icon, description, description_mr, color, theme_key, replica_ids, include_tour, sort_order, visible, status) VALUES (${nid}, ${s(slug,40)||nid}, ${s(title,80)}, ${s(title_mr,80)}, ${s(icon,20)}, ${s(description,200)}, ${s(description_mr,200)}, ${s(color,20)||'#0F4C81'}, ${s(theme_key,20)}, ${JSON.stringify(replica_ids||[])}, ${!!include_tour}, ${parseInt(sort_order)||0}, ${visible!==false}, ${s(status,20)||'published'}) RETURNING *`;
      await logAudit(sql,{event_type:'CREATE', entity_type:'service_groups', entity_id:nid, after_json:rows[0], req});
      return res.status(201).json(rows[0]);
    }
    if(req.method==='PUT'){
      const {id, slug, title, title_mr, icon, description, description_mr, color, theme_key, replica_ids, include_tour, sort_order, visible, status}=req.body||{};
      if(!id) return res.status(400).json({error:'id required'});
      const before=await sql`SELECT * FROM service_groups WHERE id=${id} LIMIT 1`;
      if(!before.length) return res.status(404).json({error:'not found'});
      const rows=await sql`UPDATE service_groups SET slug=${s(slug,40)||id}, title=${s(title,80)}, title_mr=${s(title_mr,80)}, icon=${s(icon,20)}, description=${s(description,200)}, description_mr=${s(description_mr,200)}, color=${s(color,20)}, theme_key=${s(theme_key,20)}, replica_ids=${JSON.stringify(replica_ids||[])}, include_tour=${!!include_tour}, sort_order=${parseInt(sort_order)||0}, visible=${visible!==false}, status=${s(status,20)||'published'}, updated_at=now() WHERE id=${id} RETURNING *`;
      await logAudit(sql,{event_type:'UPDATE', entity_type:'service_groups', entity_id:id, before_json:before[0], after_json:rows[0], req});
      return res.status(200).json(rows[0]);
    }
    if(req.method==='DELETE'){
      const {id}=req.query; if(!id) return res.status(400).json({error:'id required'});
      const before=await sql`SELECT * FROM service_groups WHERE id=${id} LIMIT 1`;
      await sql`DELETE FROM service_groups WHERE id=${id}`;
      await logAudit(sql,{event_type:'DELETE', entity_type:'service_groups', entity_id:id, before_json:before[0], req});
      return res.status(200).json({ok:true});
    }
    return res.status(405).json({error:'method not allowed'});
  }catch(e){
    console.error('service-groups '+rid, e);
    // if table not exists, try to create quickly
    if(e.message && e.message.includes('does not exist')){
      return res.status(500).json({error:'Table not ready, run init-db', requestId:rid});
    }
    return res.status(500).json({error:'Server error', requestId:rid});
  }
}
