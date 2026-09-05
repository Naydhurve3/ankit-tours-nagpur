import { getSql } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';
function s(v,m=300){ return typeof v==='string'? v.trim().slice(0,m): ''; }
export default async function handler(req,res){
  if(req.method==='OPTIONS'){ res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization'); return res.status(200).end(); }
  const sql=getSql(); const rid=Math.random().toString(36).slice(2,8);
  try{
    if(req.method==='GET'){
      const ok=await requireAuth(req,res); if(!ok) return;
      const rows=await sql`SELECT * FROM bookings ORDER BY created_at DESC LIMIT 100`;
      return res.status(200).json(rows);
    }
    if(req.method==='POST'){
      // Public enquiry - validate + rate limit via IP? simple validation
      const {name,phone,date,service,message,source}=req.body||{};
      const n=s(name,60); const ph=s(phone,20);
      if(!n || !ph) return res.status(400).json({error:'name and phone required'});
      if(!/^[\d+ ]{10,15}$/.test(ph)) return res.status(400).json({error:'invalid phone'});
      // honeypot: if message too long
      const msg=s(message,1000);
      // basic rate limit: check recent bookings from same phone in last 2 minutes
      // skip heavy check for now
      const rows=await sql`INSERT INTO bookings (name,phone,date,service,message,source, status) VALUES (${n},${ph},${s(date,20)},${s(service,80)},${msg},${s(source,20)}, 'new') RETURNING id, name, created_at`;
      return res.status(201).json({ok:true, id:rows[0].id, ref: 'ATT-'+String(rows[0].id).padStart(5,'0')});
    }
    if(req.method==='PUT'){
      const ok=await requireAuth(req,res); if(!ok) return;
      const {id, status}=req.body||{};
      if(!id) return res.status(400).json({error:'id required'});
      const allowed=['new','confirmed','done','cancelled'];
      if(!allowed.includes(status)) return res.status(400).json({error:'invalid status'});
      const rows=await sql`UPDATE bookings SET status=${status}, updated_at=now() WHERE id=${id} RETURNING *`;
      if(!rows.length) return res.status(404).json({error:'not found'});
      return res.status(200).json(rows[0]);
    }
    return res.status(405).json({error:'method not allowed'});
  }catch(e){ console.error('bookings '+rid,e); return res.status(500).json({error:'Server error', requestId:rid}); }
}
