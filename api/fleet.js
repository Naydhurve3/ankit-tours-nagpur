import { getSql } from '../lib/db.js';
import { requireAuth, logAudit } from '../lib/auth.js';

function sanitize(str, max=200){ if(typeof str!=='string') return ''; return str.trim().slice(0,max); }
function isValidUrl(u){
  if(!u) return true; // allow empty -> fallback image
  if(u.startsWith('data:')) return false; // reject base64
  try{ const parsed=new URL(u); return ['https:','http:'].includes(parsed.protocol); }catch{ return false; }
}
function displayMode(v){ return ['3d','photo','auto'].includes(v) ? v : '3d'; }
function vehicleType(v){ return ['suv','sedan','traveller'].includes(v) ? v : 'suv'; }
function modelColor(v){ return /^#[0-9a-f]{6}$/i.test(v||'') ? v : '#d96c2c'; }
let fleetSchemaReady;
function ensureFleetSchema(sql){
  if(!fleetSchemaReady) fleetSchemaReady=Promise.all([
    sql`ALTER TABLE fleet ADD COLUMN IF NOT EXISTS display_mode TEXT DEFAULT '3d'`,
    sql`ALTER TABLE fleet ADD COLUMN IF NOT EXISTS model_color TEXT DEFAULT '#d96c2c'`,
    sql`ALTER TABLE fleet ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'suv'`
  ]);
  return fleetSchemaReady;
}

export default async function handler(req, res) {
  // CORS: same-origin only - no wildcard for mutations
  if (req.method === 'OPTIONS'){
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }
  const sql = getSql();
  const rid = Math.random().toString(36).slice(2,8);
  try {
    await ensureFleetSchema(sql);
    if (req.method === 'GET') {
      // Public: only visible
      const rows = await sql`SELECT id, name, seating, price, features, image, display_mode, model_color, vehicle_type, visible, created_at FROM fleet WHERE visible=true ORDER BY created_at DESC`;
      return res.status(200).json(rows);
    }
    // Mutations require owner auth
    const ok = await requireAuth(req, res);
    if(!ok) return;
    if (req.method === 'POST') {
      const { name, seating, price, features, image, display_mode, model_color, vehicle_type, visible } = req.body || {};
      const n = sanitize(name, 80);
      if (!n) return res.status(400).json({ error: 'name required (max 80)' });
      if(!isValidUrl(image)) return res.status(400).json({ error: 'image must be https URL, not base64' });
      const rows = await sql`INSERT INTO fleet (name,seating,price,features,image,display_mode,model_color,vehicle_type,visible) VALUES (${n},${sanitize(seating,40)},${sanitize(price,40)},${sanitize(features,120)},${sanitize(image,500)},${displayMode(display_mode)},${modelColor(model_color)},${vehicleType(vehicle_type)},${visible!==false}) RETURNING *`;
      await logAudit(sql,{event_type:'CREATE', entity_type:'fleet', entity_id:rows[0].id, after_json:rows[0], req});
      return res.status(201).json(rows[0]);
    }
    if (req.method === 'PUT') {
      const { id, name, seating, price, features, image, display_mode, model_color, vehicle_type, visible } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      if(!isValidUrl(image)) return res.status(400).json({ error: 'image must be https URL' });
      const before = await sql`SELECT * FROM fleet WHERE id=${id} LIMIT 1`;
      const rows = await sql`UPDATE fleet SET name=${sanitize(name,80)}, seating=${sanitize(seating,40)}, price=${sanitize(price,40)}, features=${sanitize(features,120)}, image=${sanitize(image,500)}, display_mode=${displayMode(display_mode)}, model_color=${modelColor(model_color)}, vehicle_type=${vehicleType(vehicle_type)}, visible=${visible}, updated_at=now() WHERE id=${id} RETURNING *`;
      if(rows.length===0) return res.status(404).json({error:'not found'});
      await logAudit(sql,{event_type:'UPDATE', entity_type:'fleet', entity_id:id, before_json:before[0], after_json:rows[0], req});
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });
      const before = await sql`SELECT * FROM fleet WHERE id=${id} LIMIT 1`;
      await sql`DELETE FROM fleet WHERE id=${id}`;
      await logAudit(sql,{event_type:'DELETE', entity_type:'fleet', entity_id:id, before_json:before[0], req});
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    console.error(`fleet ${rid}`, e);
    return res.status(500).json({ error: 'Server error', requestId: rid });
  }
}
