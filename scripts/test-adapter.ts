import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const connectionString = "postgresql://postgres.cklzlmbvdixgznkylyvm:Roh%40nshally9967@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres";

async function testAdapter() {
  console.log("Testing with Pool instance...");
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const userCount = await prisma.user.count();
  console.log("User count from Prisma via Pool adapter:", userCount);

  const users = await prisma.user.findMany({
    select: { email: true, role: true },
    take: 6,
  });
  console.log("Sample users:", users);

  await pool.end();
}

testAdapter().catch(console.error);
