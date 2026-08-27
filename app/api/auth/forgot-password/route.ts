import { NextRequest } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, getClientIp } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email) return jsonError("Email is required", 422);

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const raw = randomBytes(24).toString("hex");
    const tokenHash = createHash("sha256").update(raw).digest("hex");

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await audit({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      action: "PASSWORD_RESET_REQUESTED",
      entityType: "User",
      entityId: user.id,
      ip: await getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return jsonOk(
      {
        resetUrl:
          process.env.NODE_ENV === "development"
            ? `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${raw}`
            : null,
      },
      "If an account exists for this email, a reset link has been generated."
    );
  }

  return jsonOk(null, "If an account exists for this email, a reset link has been generated.");
}