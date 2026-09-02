import { getSql } from '../lib/db.js';
import { requireAuth, logAudit } from '../lib/auth.js';

function cleanId(value){ return typeof value==='string' && /^[a-z0-9-]{2,100}$/i.test(value) ? value : ''; }
function cleanText(value,max=80){ return typeof value==='string' ? value.trim().slice(0,max) : ''; }

async function ensureSchema(sql){
  await sql`CREATE TABLE IF NOT EXISTS service_settings (
    service_id TEXT PRIMARY KEY,
    price TEXT DEFAULT '',
    price_note TEXT DEFAULT '',
    pinned BOOLEAN DEFAULT false,
    visible BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
  )`;
}

export default async function handler(req,res){
  if(req.method==='OPTIONS'){
    res.setHeader('Access-Control-Allow-Methods','GET,PUT,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
    return res.status(200).end();
  }
  const sql=getSql();
  try{
    await ensureSchema(sql);
    if(req.method==='GET'){
      const rows=await sql`SELECT service_id, price, price_note, pinned, visible, updated_at FROM service_settings ORDER BY pinned DESC, service_id`;
      return res.status(200).json(rows);
    }
    if(req.method==='PUT'){
      const ok=await requireAuth(req,res); if(!ok) return;
      const {service_id,price,price_note,pinned,visible}=req.body||{};
      const id=cleanId(service_id); if(!id) return res.status(400).json({error:'valid service_id required'});
      const before=await sql`SELECT * FROM service_settings WHERE service_id=${id} LIMIT 1`;
      const rows=await sql`INSERT INTO service_settings (service_id,price,price_note,pinned,visible,updated_at)
        VALUES (${id},${cleanText(price,40)},${cleanText(price_note,100)},${pinned===true},${visible!==false},now())
        ON CONFLICT (service_id) DO UPDATE SET price=EXCLUDED.price,price_note=EXCLUDED.price_note,pinned=EXCLUDED.pinned,visible=EXCLUDED.visible,updated_at=now()
        RETURNING *`;
      await logAudit(sql,{event_type:'UPDATE',entity_type:'service_settings',entity_id:id,before_json:before[0],after_json:rows[0],req});
      return res.status(200).json(rows[0]);
    }
    return res.status(405).json({error:'method not allowed'});
  }catch(error){
    console.error('service-settings',error);
    return res.status(500).json({error:'Server error'});
  }
}
