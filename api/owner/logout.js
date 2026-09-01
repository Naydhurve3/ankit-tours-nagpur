import { getSql } from '../../lib/db.js';
import { clearAuthCookie, logAudit } from '../../lib/auth.js';

function getToken(req){
  const c = req.headers.cookie || '';
  const m = c.match(/(?:^|; )att_owner=([^;]+)/);
  if(m) return decodeURIComponent(m[1]);
  const a = req.headers.authorization || '';
  if(a.startsWith('Bearer ')) return a.slice(7);
  return null;
}

export default async function handler(req,res){
  if(req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  const token = getToken(req);
  const sql = getSql();
  if(token){
    try{ await sql`UPDATE owner_sessions SET revoked_at=now() WHERE token=${token}`; }catch{}
    try{ await logAudit(sql, {event_type:'LOGOUT', entity_type:'owner', req}); }catch{}
  }
  clearAuthCookie(res);
  return res.status(200).json({ok:true});
}
