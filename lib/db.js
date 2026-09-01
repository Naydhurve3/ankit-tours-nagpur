import { neon } from '@neondatabase/serverless';

let sql = null;
export function getSql() {
  if (sql) return sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  sql = neon(url);
  return sql;
}
