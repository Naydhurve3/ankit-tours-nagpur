import { getSql } from '../../lib/db.js';

function getToken(req){
  const c = req.headers.cookie || '';
  const m = c.match(/(?:^|; )att_owner=([^;]+)/);
  if(m) return decodeURIComponent(m[1]);
  const a = req.headers.authorization || '';
  if(a.startsWith('Bearer ')) return a.slice(7);
  return null;
}

export default async function handler(req,res){
  const token = getToken(req);
  if(!token) return res.status(200).json({authenticated:false});
  try{
    const sql = getSql();
    const rows = await sql`SELECT id FROM owner_sessions WHERE token=${token} AND expires_at > now() AND revoked_at IS NULL LIMIT 1`;
    return res.status(200).json({authenticated: rows.length>0});
  }catch(e){
    return res.status(200).json({authenticated:false});
  }
}
