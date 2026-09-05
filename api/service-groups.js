import { getSql } from '../lib/db.js';
import { requireAuth, logAudit } from '../lib/auth.js';

function s(v,m=200){ return typeof v==='string'? v.trim().slice(0,m): ''; }

const customCategories=new Set(['aadhaar','pan','banking','farmer','government','bachat','bus','bills','printing','education','tickets','business','vehicle']);
function text(value,max=120){return typeof value==='string'?value.trim().slice(0,max):'';}
function number(value){const parsed=Number(value);return Number.isFinite(parsed)?Math.max(0,Math.min(9999,Math.trunc(parsed))):0;}
async function ensureCustomSchema(sql){
  await sql`CREATE TABLE IF NOT EXISTS custom_services (
    id SERIAL PRIMARY KEY,
    category_id TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_mr TEXT DEFAULT '',
    price TEXT DEFAULT '',
    price_note TEXT DEFAULT '',
    pinned BOOLEAN DEFAULT false,
    visible BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`;
}

export default async function handler(req,res){
  if(req.method==='OPTIONS'){ res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization'); return res.status(200).end(); }
  const sql=getSql(); const rid=Math.random().toString(36).slice(2,8);
  if(req.query?.kind==='custom') return customHandler(req,res,sql);
  try{
    if(req.method==='GET'){
      const isPublic = req.query.public === 'true' || req.query.public === '1';
      if(isPublic){
        const rows=await sql`SELECT id, slug, title, title_mr, icon, description, description_mr, color, theme_key, replica_ids, include_tour, sort_order, visible, status FROM service_groups WHERE visible=true AND status='published' ORDER BY sort_order ASC, created_at ASC`;
        return res.status(200).json(rows);
      } else {
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
    if(e.message && e.message.includes('does not exist')){
      return res.status(500).json({error:'Table not ready, run init-db', requestId:rid});
    }
    return res.status(500).json({error:'Server error', requestId:rid});
  }
}

async function customHandler(req,res,sql){
  try{
    await ensureCustomSchema(sql);
    if(req.method==='GET'){
      if(req.query?.all==='1'){const ok=await requireAuth(req,res);if(!ok)return;const rows=await sql`SELECT * FROM custom_services ORDER BY pinned DESC, sort_order, id`;return res.status(200).json(rows);}
      const rows=await sql`SELECT id,category_id,name_en,name_mr,price,price_note,pinned,visible,sort_order FROM custom_services WHERE visible=true ORDER BY pinned DESC,sort_order,id`;
      return res.status(200).json(rows);
    }
    const ok=await requireAuth(req,res);if(!ok)return;
    if(req.method==='POST'){
      const body=req.body||{};const category=customCategories.has(body.category_id)?body.category_id:'';const name=text(body.name_en,100);
      if(!category||!name)return res.status(400).json({error:'Category and English service name are required'});
      const rows=await sql`INSERT INTO custom_services(category_id,name_en,name_mr,price,price_note,pinned,visible,sort_order) VALUES(${category},${name},${text(body.name_mr,120)},${text(body.price,40)},${text(body.price_note,100)},${body.pinned===true},${body.visible!==false},${number(body.sort_order)}) RETURNING *`;
      await logAudit(sql,{event_type:'CREATE',entity_type:'custom_service',entity_id:rows[0].id,after_json:rows[0],req});return res.status(201).json(rows[0]);
    }
    if(req.method==='PUT'){
      const body=req.body||{};if(!body.id)return res.status(400).json({error:'id required'});const category=customCategories.has(body.category_id)?body.category_id:'';const name=text(body.name_en,100);if(!category||!name)return res.status(400).json({error:'Category and English service name are required'});
      const before=await sql`SELECT * FROM custom_services WHERE id=${body.id} LIMIT 1`;
      const rows=await sql`UPDATE custom_services SET category_id=${category},name_en=${name},name_mr=${text(body.name_mr,120)},price=${text(body.price,40)},price_note=${text(body.price_note,100)},pinned=${body.pinned===true},visible=${body.visible!==false},sort_order=${number(body.sort_order)},updated_at=now() WHERE id=${body.id} RETURNING *`;
      if(!rows.length)return res.status(404).json({error:'not found'});await logAudit(sql,{event_type:'UPDATE',entity_type:'custom_service',entity_id:body.id,before_json:before[0],after_json:rows[0],req});return res.status(200).json(rows[0]);
    }
    if(req.method==='DELETE'){
      const id=req.query?.id;if(!id)return res.status(400).json({error:'id required'});const before=await sql`SELECT * FROM custom_services WHERE id=${id} LIMIT 1`;await sql`DELETE FROM custom_services WHERE id=${id}`;await logAudit(sql,{event_type:'DELETE',entity_type:'custom_service',entity_id:id,before_json:before[0],req});return res.status(200).json({ok:true});
    }
    return res.status(405).json({error:'method not allowed'});
  }catch(error){console.error('custom-services',error);return res.status(500).json({error:'Server error'});}
}