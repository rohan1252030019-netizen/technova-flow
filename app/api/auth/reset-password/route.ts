import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!token || !password) return jsonError("Token and new password are required", 422);
  if (password.length < 8 || password.length > 128) {
    return jsonError("Password must be at least 8 characters", 422);
  }

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const tokenHash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");

  const reset = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    return jsonError("Invalid or expired reset token", 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: reset.userId } }),
  ]);

  await audit({
    userId: reset.userId,
    userEmail: reset.user.email,
    userName: reset.user.name,
    action: "PASSWORD_RESET_COMPLETED",
    entityType: "User",
    entityId: reset.userId,
  });

  return jsonOk(null, "Password has been reset. You can now log in.");
}