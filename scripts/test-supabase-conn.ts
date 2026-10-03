import pg from "pg";
import { requireDatabaseUrl, sslForUrl } from "./db-url";

const url = requireDatabaseUrl();

async function testSupabase() {
  console.log("Testing Supabase Cloud PostgreSQL connection...");
  const pool = new pg.Pool({ connectionString: url, ssl: sslForUrl(url) });

  try {
    const res = await pool.query('SELECT current_database(), current_user, count(*) as user_count FROM "User";');
    console.log("✅ Supabase DB connected successfully! Data:", res.rows[0]);
  } catch (err: any) {
    console.error("❌ Supabase connection error:", err.message);
  } finally {
    await pool.end();
  }
}

testSupabase();
