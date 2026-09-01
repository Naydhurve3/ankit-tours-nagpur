import { getSql } from '../lib/db.js';
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  const sql=getSql();
  try{
    if(req.method==='GET'){ const rows=await sql`SELECT * FROM packages ORDER BY created_at DESC`; return res.status(200).json(rows); }
    if(req.method==='POST'){ const {service,vehicle,price,note,visible}=req.body; if(!service) return res.status(400).json({error:'service required'}); const rows=await sql`INSERT INTO packages (service,vehicle,price,note,visible) VALUES (${service},${vehicle||''},${price||''},${note||''},${visible!==false}) RETURNING *`; return res.status(201).json(rows[0]); }
    if(req.method==='PUT'){ const {id,service,vehicle,price,note,visible}=req.body; const rows=await sql`UPDATE packages SET service=${service},vehicle=${vehicle},price=${price},note=${note},visible=${visible} WHERE id=${id} RETURNING *`; return res.status(200).json(rows[0]); }
    if(req.method==='DELETE'){ const {id}=req.query; await sql`DELETE FROM packages WHERE id=${id}`; return res.status(200).json({ok:true}); }
    return res.status(405).json({error:'method not allowed'});
  }catch(e){ return res.status(500).json({error:e.message}); }
}
