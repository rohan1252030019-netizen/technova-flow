import pg from "pg";

const url = "postgresql://postgres.cklzlmbvdixgznkylyvm:Roh%40nshally9967@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres";

const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

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
