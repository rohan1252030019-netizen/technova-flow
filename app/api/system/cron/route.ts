import { NextRequest } from "next/server";
import { jsonOk, jsonError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { runSlaCheck } from "@/lib/services/sla-runner";

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET || "dev-cron-secret";
  const authHeader = req.headers.get("authorization");
  const url = new URL(req.url);
  const queryKey = url.searchParams.get("key");

  const providedSecret = authHeader?.replace(/^Bearer\s+/i, "") || queryKey;

  if (process.env.NODE_ENV === "production" && providedSecret !== secret) {
    return jsonError("Unauthorized cron trigger", 401);
  }

  const results = await runSlaCheck();

  await audit({
    action: "CRON_SLA_SWEEP",
    entityType: "System",
    details: results as never,
    ip: req.headers.get("x-forwarded-for") || "system-cron",
    userAgent: req.headers.get("user-agent") || "automated-cron",
  });

  return jsonOk(results, "Automated SLA and escalation sweep completed");
}
