import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

function createClient() {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://cnt_user:cnt_password_secure@localhost:5433/cnt_project";

  const isCloud =
    connectionString.includes("supabase.com") ||
    connectionString.includes("neon.tech") ||
    connectionString.includes("sslmode=") ||
    process.env.NODE_ENV === "production";

  if (!globalForPrisma.pool) {
    globalForPrisma.pool = new Pool({
      connectionString,
      ssl: isCloud ? { rejectUnauthorized: false } : undefined,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  const adapter = new PrismaPg(globalForPrisma.pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? (globalForPrisma.prisma = createClient());

export type PrismaTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;