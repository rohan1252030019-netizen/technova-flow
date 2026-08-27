import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient() {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://cnt_user:cnt_password_secure@localhost:5432/cnt_project";

  const isCloud =
    connectionString.includes("supabase.com") ||
    connectionString.includes("neon.tech") ||
    connectionString.includes("sslmode=") ||
    process.env.NODE_ENV === "production";

  const pool = new Pool({
    connectionString,
    ssl: isCloud ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type PrismaTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;