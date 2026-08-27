import fs from "fs";
import path from "path";
import pg from "pg";

const url = "postgresql://postgres.cklzlmbvdixgznkylyvm:Roh%40nshally9967@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres";

const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

async function main() {
  console.log("Connecting to Supabase...");
  const client = await pool.connect();
  console.log("Connected! Applying migrations...");

  const migration1 = fs.readFileSync(
    path.join(process.cwd(), "prisma/migrations/20260817121330_init/migration.sql"),
    "utf-8"
  );
  const migration2 = fs.readFileSync(
    path.join(process.cwd(), "prisma/migrations/20260817130119_task_step_link/migration.sql"),
    "utf-8"
  );

  console.log("Applying Migration 1 (Init Schema)...");
  await client.query(migration1);
  console.log("Migration 1 applied successfully!");

  console.log("Applying Migration 2 (Task Step Link)...");
  await client.query(migration2);
  console.log("Migration 2 applied successfully!");

  client.release();
  await pool.end();
  console.log("All tables, enums, and foreign keys created successfully on Supabase!");
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
