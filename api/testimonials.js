import { getSql } from '../lib/db.js';
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  const sql=getSql();
  try{
    if(req.method==='GET'){ const rows=await sql`SELECT * FROM testimonials ORDER BY created_at DESC`; return res.status(200).json(rows); }
    if(req.method==='POST'){ const {name,place,text,rating,visible}=req.body; if(!name||!text) return res.status(400).json({error:'name and text required'}); const rows=await sql`INSERT INTO testimonials (name,place,text,rating,visible) VALUES (${name},${place||''},${text},${rating||5},${visible!==false}) RETURNING *`; return res.status(201).json(rows[0]); }
    if(req.method==='PUT'){ const {id,name,place,text,rating,visible}=req.body; const rows=await sql`UPDATE testimonials SET name=${name},place=${place},text=${text},rating=${rating},visible=${visible} WHERE id=${id} RETURNING *`; return res.status(200).json(rows[0]); }
    if(req.method==='DELETE'){ const {id}=req.query; await sql`DELETE FROM testimonials WHERE id=${id}`; return res.status(200).json({ok:true}); }
    return res.status(405).json({error:'method not allowed'});
  }catch(e){ return res.status(500).json({error:e.message}); }
}
