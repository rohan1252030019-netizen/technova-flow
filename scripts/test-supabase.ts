import pg from "pg";
import { requireDatabaseUrl, sslForUrl } from "./db-url";

const url = requireDatabaseUrl();

const pool = new pg.Pool({ connectionString: url, ssl: sslForUrl(url) });

async function main() {
  console.log("Connecting to Supabase...");
  const res = await pool.query("SELECT NOW()");
  console.log("Connected successfully! Server time:", res.rows[0]);
  await pool.end();
}

main().catch((err) => {
  console.error("Connection failed:", err.message);
  process.exit(1);
});
