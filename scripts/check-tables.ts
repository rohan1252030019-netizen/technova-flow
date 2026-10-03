import pg from "pg";
import { requireDatabaseUrl, sslForUrl } from "./db-url";

const url = requireDatabaseUrl();

const pool = new pg.Pool({ connectionString: url, ssl: sslForUrl(url) });

async function main() {
  const client = await pool.connect();
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log("Existing tables in Supabase public schema:", tables.rows.map(r => r.table_name));
  client.release();
  await pool.end();
}

main().catch(console.error);
