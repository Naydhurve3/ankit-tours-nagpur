import { getSql } from '../lib/db.js';
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  const sql=getSql();
  try{
    if(req.method==='GET'){ const rows=await sql`SELECT * FROM gallery ORDER BY created_at DESC`; return res.status(200).json(rows); }
    if(req.method==='POST'){ const {src,category,title,visible}=req.body; if(!src) return res.status(400).json({error:'src required'}); const rows=await sql`INSERT INTO gallery (src,category,title,visible) VALUES (${src},${category||'fleet'},${title||''},${visible!==false}) RETURNING *`; return res.status(201).json(rows[0]); }
    if(req.method==='PUT'){ const {id,src,category,title,visible}=req.body; const rows=await sql`UPDATE gallery SET src=${src},category=${category},title=${title},visible=${visible} WHERE id=${id} RETURNING *`; return res.status(200).json(rows[0]); }
    if(req.method==='DELETE'){ const {id}=req.query; await sql`DELETE FROM gallery WHERE id=${id}`; return res.status(200).json({ok:true}); }
    return res.status(405).json({error:'method not allowed'});
  }catch(e){ return res.status(500).json({error:e.message}); }
}
