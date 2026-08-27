import { NextRequest } from "next/server";
import { jsonOk, requireApiPermission, getClientIp } from "@/lib/api";
import { audit } from "@/lib/audit";
import { runSlaCheck } from "@/lib/services/sla-runner";

export async function POST(req: NextRequest) {
  const { user, error } = await requireApiPermission(req, "settings.manage");
  if (error || !user) return error;

  const results = await runSlaCheck();

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: "SLA_CHECK_RUN",
    entityType: "System",
    details: results as never,
    ip: await getClientIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  return jsonOk(results, "SLA check completed");
}