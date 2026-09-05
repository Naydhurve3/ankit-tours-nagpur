import { getSql } from '../lib/db.js';
import { requireAuth, logAudit } from '../lib/auth.js';

const categories=new Set(['aadhaar','pan','banking','farmer','government','bachat','bus','bills','printing','education','tickets','business','vehicle']);
function text(value,max=120){return typeof value==='string'?value.trim().slice(0,max):'';}
function number(value){const parsed=Number(value);return Number.isFinite(parsed)?Math.max(0,Math.min(9999,Math.trunc(parsed))):0;}
async function ensureSchema(sql){
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
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');return res.status(200).end();}
  const sql=getSql();
  try{
    await ensureSchema(sql);
    if(req.method==='GET'){
      if(req.query?.all==='1'){const ok=await requireAuth(req,res);if(!ok)return;const rows=await sql`SELECT * FROM custom_services ORDER BY pinned DESC, sort_order, id`;return res.status(200).json(rows);}
      const rows=await sql`SELECT id,category_id,name_en,name_mr,price,price_note,pinned,visible,sort_order FROM custom_services WHERE visible=true ORDER BY pinned DESC,sort_order,id`;
      return res.status(200).json(rows);
    }
    const ok=await requireAuth(req,res);if(!ok)return;
    if(req.method==='POST'){
      const body=req.body||{};const category=categories.has(body.category_id)?body.category_id:'';const name=text(body.name_en,100);
      if(!category||!name)return res.status(400).json({error:'Category and English service name are required'});
      const rows=await sql`INSERT INTO custom_services(category_id,name_en,name_mr,price,price_note,pinned,visible,sort_order) VALUES(${category},${name},${text(body.name_mr,120)},${text(body.price,40)},${text(body.price_note,100)},${body.pinned===true},${body.visible!==false},${number(body.sort_order)}) RETURNING *`;
      await logAudit(sql,{event_type:'CREATE',entity_type:'custom_service',entity_id:rows[0].id,after_json:rows[0],req});return res.status(201).json(rows[0]);
    }
    if(req.method==='PUT'){
      const body=req.body||{};if(!body.id)return res.status(400).json({error:'id required'});const category=categories.has(body.category_id)?body.category_id:'';const name=text(body.name_en,100);if(!category||!name)return res.status(400).json({error:'Category and English service name are required'});
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
