import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const url = process.env.DATABASE_URL;
if(!url){ console.error('DATABASE_URL not set. Set env var and retry.'); process.exit(1); }

const sql = neon(url);

async function run(){
  console.log('Connecting to Neon...');
  await sql`CREATE TABLE IF NOT EXISTS fleet (id SERIAL PRIMARY KEY, name TEXT NOT NULL, seating TEXT, price TEXT, features TEXT, image TEXT, display_mode TEXT DEFAULT '3d', model_color TEXT DEFAULT '#d96c2c', vehicle_type TEXT DEFAULT 'suv', visible BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), status TEXT DEFAULT 'published', sort_order INT DEFAULT 0)`;
  await sql`CREATE TABLE IF NOT EXISTS packages (id SERIAL PRIMARY KEY, service TEXT NOT NULL, vehicle TEXT, price TEXT, note TEXT, visible BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), status TEXT DEFAULT 'published')`;
  await sql`CREATE TABLE IF NOT EXISTS gallery (id SERIAL PRIMARY KEY, src TEXT NOT NULL, category TEXT, title TEXT, visible BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS testimonials (id SERIAL PRIMARY KEY, name TEXT NOT NULL, place TEXT, text TEXT NOT NULL, rating INT DEFAULT 5, visible BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), consent BOOLEAN DEFAULT false)`;
  await sql`CREATE TABLE IF NOT EXISTS bookings (id SERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, date TEXT, service TEXT, message TEXT, source TEXT, status TEXT DEFAULT 'new', pickup TEXT, destination TEXT, passengers INT, consent BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS owner_sessions (id SERIAL PRIMARY KEY, token TEXT UNIQUE NOT NULL, created_at TIMESTAMPTZ DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ)`;
  await sql`CREATE TABLE IF NOT EXISTS audit_events (id SERIAL PRIMARY KEY, actor TEXT, event_type TEXT NOT NULL, entity_type TEXT, entity_id TEXT, before_json JSONB, after_json JSONB, ip TEXT, user_agent TEXT, created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS drivers (id SERIAL PRIMARY KEY, internal_code TEXT, legal_name TEXT NOT NULL, display_name TEXT, phone TEXT, alternate_phone TEXT, photo_url TEXT, languages TEXT, experience_years INT, eligible_vehicles TEXT, active_status TEXT DEFAULT 'available', verification_state TEXT DEFAULT 'pending', notes TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS availability_blocks (id SERIAL PRIMARY KEY, resource_type TEXT NOT NULL, resource_id INT NOT NULL, start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, status TEXT DEFAULT 'unavailable', reason TEXT, created_by TEXT, created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS booking_assignments (id SERIAL PRIMARY KEY, booking_id INT REFERENCES bookings(id), vehicle_id INT REFERENCES fleet(id), driver_id INT REFERENCES drivers(id), start_at TIMESTAMPTZ, end_at TIMESTAMPTZ, status TEXT DEFAULT 'assigned', assigned_by TEXT, created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS trip_access_tokens (id SERIAL PRIMARY KEY, booking_id INT REFERENCES bookings(id), token_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS service_settings (service_id TEXT PRIMARY KEY, price TEXT DEFAULT '', price_note TEXT DEFAULT '', pinned BOOLEAN DEFAULT false, visible BOOLEAN DEFAULT true, updated_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS custom_services (id SERIAL PRIMARY KEY, category_id TEXT NOT NULL, name_en TEXT NOT NULL, name_mr TEXT DEFAULT '', price TEXT DEFAULT '', price_note TEXT DEFAULT '', pinned BOOLEAN DEFAULT false, visible BOOLEAN DEFAULT true, sort_order INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS service_groups (id TEXT PRIMARY KEY, slug TEXT UNIQUE, title TEXT NOT NULL, title_mr TEXT, icon TEXT, description TEXT, description_mr TEXT, color TEXT, theme_key TEXT, replica_ids JSONB DEFAULT '[]', include_tour BOOLEAN DEFAULT false, sort_order INT DEFAULT 0, visible BOOLEAN DEFAULT true, status TEXT DEFAULT 'published', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`;
  // migrations for existing DBs
  try{ await sql`ALTER TABLE service_groups ADD COLUMN IF NOT EXISTS title_mr TEXT`; }catch{}
  try{ await sql`ALTER TABLE service_groups ADD COLUMN IF NOT EXISTS description TEXT`; }catch{}
  try{ await sql`ALTER TABLE service_groups ADD COLUMN IF NOT EXISTS description_mr TEXT`; }catch{}
  try{ await sql`ALTER TABLE service_groups ADD COLUMN IF NOT EXISTS color TEXT`; }catch{}
  try{ await sql`ALTER TABLE service_groups ADD COLUMN IF NOT EXISTS theme_key TEXT`; }catch{}
  try{ await sql`ALTER TABLE service_groups ADD COLUMN IF NOT EXISTS replica_ids JSONB DEFAULT '[]'`; }catch{}
  try{ await sql`ALTER TABLE service_groups ADD COLUMN IF NOT EXISTS include_tour BOOLEAN DEFAULT false`; }catch{}
  try{ await sql`ALTER TABLE service_groups ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0`; }catch{}
  try{ await sql`ALTER TABLE service_groups ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT true`; }catch{}
  try{ await sql`ALTER TABLE service_groups ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published'`; }catch{}
  // add columns if old DB: ensure bookings has new cols (ignore if exists - postgres will error if duplicate, so use DO)
  try{ await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new'`; }catch{}
  try{ await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup TEXT`; }catch{}
  try{ await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS destination TEXT`; }catch{}
  try{ await sql`ALTER TABLE fleet ADD COLUMN IF NOT EXISTS display_mode TEXT DEFAULT '3d'`; }catch{}
  try{ await sql`ALTER TABLE fleet ADD COLUMN IF NOT EXISTS model_color TEXT DEFAULT '#d96c2c'`; }catch{}
  try{ await sql`ALTER TABLE fleet ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'suv'`; }catch{}
  console.log('Tables created (including drivers/audit/sessions)');

  // seed service_groups if empty
  const groupCount = await sql`SELECT COUNT(*) as c FROM service_groups`;
  if(parseInt(groupCount[0].c)===0){
    console.log('Seeding service_groups...');
    const groups = JSON.parse(fs.readFileSync('assets/data/service-groups.json','utf8'));
    for(let i=0;i<groups.length;i++){
      const g=groups[i];
      await sql`INSERT INTO service_groups (id, slug, title, title_mr, icon, description, description_mr, color, theme_key, replica_ids, include_tour, sort_order, visible, status) VALUES (${g.id}, ${g.slug||g.id}, ${g.title}, ${g.titleMr||''}, ${g.icon||''}, ${g.desc||''}, ${g.descMr||''}, ${g.color||'#0F4C81'}, ${g.themeKey||''}, ${JSON.stringify(g.replicaIds||[])}, ${!!g.includeTour}, ${g.sort_order||i}, ${g.visible!==false}, ${g.status||'published'})`;
    }
    console.log('Seeded groups', groups.length);
  }
  // seed if empty
  const fleetCount = await sql`SELECT COUNT(*) as c FROM fleet`;
  if (parseInt(fleetCount[0].c)===0){
    console.log('Seeding...');
    const seed = JSON.parse(fs.readFileSync('assets/data/site-data.json','utf8'));
    for (const f of seed.fleet){ await sql`INSERT INTO fleet (name,seating,price,features,image,display_mode,model_color,vehicle_type,visible) VALUES (${f.name},${f.seating},${f.price},${f.features},${f.image},${f.display_mode||'3d'},${f.model_color||'#d96c2c'},${f.vehicle_type||'suv'},${f.visible})`; }
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
