import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, requireApiPermission } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireApiPermission(req, "settings.manage");
  if (error || !user) return error;

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body", 400);

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.description === "string") data.description = body.description.trim() || null;
  if (typeof body.timezone === "string") data.timezone = body.timezone;
  if (typeof body.currency === "string") data.currency = body.currency.toUpperCase();

  const existing = await prisma.organization.findFirst();
  const org = existing
    ? await prisma.organization.update({ where: { id: existing.id }, data })
    : await prisma.organization.create({ data: { name: "TechNova Global Pvt. Ltd.", ...data } });

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: "ORGANIZATION_UPDATED",
    entityType: "Organization",
    entityId: org.id,
    details: { fields: Object.keys(data) },
    userAgent: req.headers.get("user-agent"),
  });

  return jsonOk({ org }, "Organization updated");
}