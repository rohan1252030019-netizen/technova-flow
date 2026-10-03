import pg from "pg";
import { requireDatabaseUrl, sslForUrl } from "./db-url";

const url = requireDatabaseUrl();

const pool = new pg.Pool({ connectionString: url, ssl: sslForUrl(url) });

async function main() {
  const client = await pool.connect();
  console.log("Adding subscription columns safely to Supabase database...");

  await client.query(`
    ALTER TABLE "Organization" 
    ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'FREE',
    ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT,
    ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT,
    ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT,
    ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3);
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");
    CREATE UNIQUE INDEX IF NOT EXISTS "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");
  `);

  console.log("Supabase database updated successfully!");
  client.release();
  await pool.end();
}

main().catch(console.error);
