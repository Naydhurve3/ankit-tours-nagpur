import { getSql } from '../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const sql = getSql();
  try {
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM fleet ORDER BY created_at DESC`;
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const { name, seating, price, features, image, visible } = req.body;
      if (!name) return res.status(400).json({ error: 'name required' });
      const rows = await sql`INSERT INTO fleet (name,seating,price,features,image,visible) VALUES (${name},${seating||''},${price||''},${features||''},${image||''},${visible!==false}) RETURNING *`;
      return res.status(201).json(rows[0]);
    }
    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });
      const rows = await sql`UPDATE fleet SET name=${fields.name}, seating=${fields.seating}, price=${fields.price}, features=${fields.features}, image=${fields.image}, visible=${fields.visible} WHERE id=${id} RETURNING *`;
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });
      await sql`DELETE FROM fleet WHERE id=${id}`;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
