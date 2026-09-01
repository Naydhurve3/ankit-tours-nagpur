import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const url = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_xskYvHAQ12VX@ep-still-credit-ay5tt32j-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(url);

async function run(){
  console.log('Connecting to Neon...');
  await sql`CREATE TABLE IF NOT EXISTS fleet (id SERIAL PRIMARY KEY, name TEXT NOT NULL, seating TEXT, price TEXT, features TEXT, image TEXT, visible BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS packages (id SERIAL PRIMARY KEY, service TEXT NOT NULL, vehicle TEXT, price TEXT, note TEXT, visible BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS gallery (id SERIAL PRIMARY KEY, src TEXT NOT NULL, category TEXT, title TEXT, visible BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS testimonials (id SERIAL PRIMARY KEY, name TEXT NOT NULL, place TEXT, text TEXT NOT NULL, rating INT DEFAULT 5, visible BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS bookings (id SERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, date TEXT, service TEXT, message TEXT, source TEXT, created_at TIMESTAMPTZ DEFAULT now())`;
  console.log('Tables created');

  // seed if empty
  const fleetCount = await sql`SELECT COUNT(*) as c FROM fleet`;
  if (parseInt(fleetCount[0].c)===0){
    console.log('Seeding...');
    const seed = JSON.parse(fs.readFileSync('assets/data/site-data.json','utf8'));
    for (const f of seed.fleet){ await sql`INSERT INTO fleet (name,seating,price,features,image,visible) VALUES (${f.name},${f.seating},${f.price},${f.features},${f.image},${f.visible})`; }
    for (const p of seed.packages){ await sql`INSERT INTO packages (service,vehicle,price,note,visible) VALUES (${p.service},${p.vehicle},${p.price},${p.note},${p.visible})`; }
    for (const g of seed.gallery){ await sql`INSERT INTO gallery (src,category,title,visible) VALUES (${g.src},${g.category},${g.title},${g.visible})`; }
    for (const t of seed.testimonials){ await sql`INSERT INTO testimonials (name,place,text,rating,visible) VALUES (${t.name},${t.place},${t.text},${t.rating},${t.visible})`; }
    console.log('Seeded from site-data.json');
  } else {
    console.log('Already seeded, skipping');
  }
  const counts = await sql`SELECT (SELECT COUNT(*) FROM fleet) as fleet, (SELECT COUNT(*) FROM packages) as packages, (SELECT COUNT(*) FROM gallery) as gallery, (SELECT COUNT(*) FROM testimonials) as testi`;
  console.log(counts[0]);
  console.log('Done');
}
run().catch(e=>{ console.error(e); process.exit(1); });
