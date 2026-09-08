import { getSql } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

export default async function handler(req,res){
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');return res.status(200).end();}
  if(req.method!=='GET')return res.status(405).json({error:'method not allowed'});
  const ok=await requireAuth(req,res);if(!ok)return;
  const sql=getSql();
  try{
    await sql`CREATE TABLE IF NOT EXISTS audit_events (
      id SERIAL PRIMARY KEY,
      event_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      actor TEXT,
      ip TEXT,
      user_agent TEXT,
      before_json JSONB,
      after_json JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    )`;
    const limit=Math.min(Math.max(parseInt(req.query.limit)||50,1),200);
    const offset=Math.max(parseInt(req.query.offset)||0,0);
    res.setHeader('Cache-Control','private, no-store');
    const entity=typeof req.query.entity_type==='string'?req.query.entity_type:'';
    const rows=entity
      ?await sql`SELECT id,event_type,entity_type,entity_id,created_at FROM audit_events WHERE entity_type=${entity} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`
      :await sql`SELECT id,event_type,entity_type,entity_id,created_at FROM audit_events ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`;
    const count=entity
      ?await sql`SELECT COUNT(*)::int AS total FROM audit_events WHERE entity_type=${entity}`
      :await sql`SELECT COUNT(*)::int AS total FROM audit_events`;
    return res.status(200).json({rows,total:count[0]?.total||0,limit,offset});
  }catch(error){console.error('audit',error);return res.status(500).json({error:'Server error'});}
}
