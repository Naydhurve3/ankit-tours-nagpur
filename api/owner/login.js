import { getSql } from '../../lib/db.js';
import { generateToken, setAuthCookie, logAudit } from '../../lib/auth.js';

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  const { pin } = req.body || {};
  const expected = process.env.ADMIN_PIN;
  if(!expected) return res.status(500).json({error:'Server not configured'});
  const sql = getSql();
  const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim().slice(0,45);
  if(!pin || pin !== expected){
    try{ await logAudit(sql, {event_type:'LOGIN_FAILURE', entity_type:'owner', req}); }catch{}
    return res.status(401).json({error:'Invalid PIN'});
  }
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 8*60*60*1000);
  await sql`INSERT INTO owner_sessions (token, expires_at) VALUES (${token}, ${expiresAt.toISOString()})`;
  setAuthCookie(res, token);
  await logAudit(sql, {event_type:'LOGIN_SUCCESS', entity_type:'owner', req});
  return res.status(200).json({ok:true});
}
