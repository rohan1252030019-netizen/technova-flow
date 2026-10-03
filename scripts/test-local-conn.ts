import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

async function testConnection() {
  console.log("Testing connection with DATABASE_URL:", process.env.DATABASE_URL);
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const res = await pool.query("SELECT current_database(), current_user, count(*) FROM \"User\";");
    console.log("Connected successfully! Database Info:", res.rows[0]);
  } catch (err: any) {
    console.error("Connection failed:", err.message);
  } finally {
    await pool.end();
  }
}

testConnection();
