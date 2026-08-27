import { NextRequest } from "next/server";
import { jsonOk, jsonError, requireApiUser } from "@/lib/api";
import { audit } from "@/lib/audit";
import { sanitizeText } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  const { user, error } = await requireApiUser(req);
  if (error || !user) return error;

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body", 400);

  const company = sanitizeText(body.company || "");
  const teamSize = sanitizeText(body.teamSize || "50+");
  const email = sanitizeText(body.email || user.email);
  const requirements = Array.isArray(body.requirements) ? body.requirements.map((r: string) => sanitizeText(r)) : [];
  const message = sanitizeText(body.message || "");

  if (!company) {
    return jsonError("Company name is required", 422);
  }

  // Record enterprise inquiry in audit logs
  await audit({
    userId: user.id,
    action: "CREATE",
    entityType: "SalesInquiry",
    entityId: `lead_${Date.now()}`,
    details: {
      company,
      email,
      teamSize,
      requirements,
      message,
    },
  });

  return jsonOk({
    success: true,
    message: "Thank you! Our enterprise solutions team will reach out within 24 hours.",
  });
}
