import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, requireApiUser, getClientIp } from "@/lib/api";
import { audit } from "@/lib/audit";
import { validatePasswordStrength } from "@/lib/utils";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { prefix: "change_pwd", maxRequests: 5, windowMs: 60000 });
  if (rateLimitError) return rateLimitError;

  const { user, error } = await requireApiUser(req);
  if (error || !user) return error;

  const body = await req.json().catch(() => null);
  const current = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const next = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!current || !next) return jsonError("Current and new password are required", 422);
  const pwdCheck = validatePasswordStrength(next);
  if (!pwdCheck.valid) return jsonError(pwdCheck.message || "Invalid password", 422);
  if (next === current) return jsonError("New password must be different from current password", 422);

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return jsonError("User not found", 404);

  const valid = await bcrypt.compare(current, dbUser.passwordHash);
  if (!valid) return jsonError("Current password is incorrect", 401);

  const passwordHash = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: "PASSWORD_CHANGED",
    entityType: "User",
    entityId: user.id,
    ip: await getClientIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  return jsonOk(null, "Password changed successfully. Please sign in again.");
}