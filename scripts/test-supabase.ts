import pg from "pg";

const url = "postgresql://postgres.cklzlmbvdixgznkylyvm:Roh%40nshally9967@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres";

const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

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
