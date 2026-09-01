import { getSql } from '../lib/db.js';
export default async function handler(req,res){
  try{
    const sql=getSql();
    const rows=await sql`SELECT 1 as ok`;
    return res.status(200).json({status:'ok', db: rows[0].ok===1 ? 'connected' : 'unknown'});
  }catch(e){ return res.status(500).json({status:'error', error:e.message}); }
}
