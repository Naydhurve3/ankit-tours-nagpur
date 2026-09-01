import { getSql } from '../lib/db.js';
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  const sql=getSql();
  try{
    if(req.method==='GET'){ const rows=await sql`SELECT * FROM bookings ORDER BY created_at DESC LIMIT 50`; return res.status(200).json(rows); }
    if(req.method==='POST'){ const {name,phone,date,service,message,source}=req.body; if(!name||!phone) return res.status(400).json({error:'name and phone required'}); const rows=await sql`INSERT INTO bookings (name,phone,date,service,message,source) VALUES (${name},${phone},${date||''},${service||''},${message||''},${source||''}) RETURNING *`; return res.status(201).json(rows[0]); }
    return res.status(405).json({error:'method not allowed'});
  }catch(e){ return res.status(500).json({error:e.message}); }
}
