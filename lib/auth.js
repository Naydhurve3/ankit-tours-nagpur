import { getSql } from './db.js';
import crypto from 'crypto';

function getTokenFromReq(req){
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|; )att_owner=([^;]+)/);
  if(match) return decodeURIComponent(match[1]);
  const auth = req.headers.authorization || '';
  if(auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export async function requireAuth(req, res){
  const token = getTokenFromReq(req);
  if(!token){
    res.status(401).json({error:'Unauthorized - owner login required'});
    return false;
  }
  try{
    const sql = getSql();
    const rows = await sql`SELECT * FROM owner_sessions WHERE token=${token} AND expires_at > now() AND revoked_at IS NULL LIMIT 1`;
    if(rows.length===0){
      res.status(401).json({error:'Session expired or invalid'});
      return false;
    }
    req.ownerSession = rows[0];
    return true;
  }catch(e){
    res.status(500).json({error:'Auth check failed'});
    return false;
  }
}

export function setAuthCookie(res, token){
  const expires = new Date(Date.now() + 8*60*60*1000).toUTCString(); // 8h
  // HttpOnly, Secure in production (Vercel is https), SameSite Lax
  res.setHeader('Set-Cookie', `att_owner=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}; Secure`);
}

export function clearAuthCookie(res){
  res.setHeader('Set-Cookie', `att_owner=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure`);
}

export function generateToken(){
  return crypto.randomBytes(32).toString('hex');
}

export async function logAudit(sql, {actor, event_type, entity_type, entity_id, before_json, after_json, req}){
  try{
    const ip = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').toString().split(',')[0].trim().slice(0,45);
    const ua = (req.headers['user-agent'] || '').toString().slice(0,300);
    await sql`INSERT INTO audit_events (actor, event_type, entity_type, entity_id, before_json, after_json, ip, user_agent) VALUES (${actor||'owner'}, ${event_type}, ${entity_type||''}, ${String(entity_id||'')}, ${before_json?JSON.stringify(before_json):null}, ${after_json?JSON.stringify(after_json):null}, ${ip}, ${ua})`;
  }catch(e){ console.error('audit log failed', e.message); }
}
