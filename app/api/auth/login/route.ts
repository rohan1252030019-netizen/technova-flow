import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { jsonError, jsonOk, getClientIp } from "@/lib/api";
import { audit } from "@/lib/audit";
import { enforceRateLimit } from "@/lib/rate-limit";

const MAX_ATTEMPTS = Number(process.env.MAX_LOGIN_ATTEMPTS || 5);
const WINDOW_MS = Number(process.env.LOGIN_WINDOW_MINUTES || 15) * 60 * 1000;
// Constant dummy hash to prevent user enumeration via timing attack
const DUMMY_HASH = "$2a$10$e8wE0v2G1yZ6n2H6M6m0heY8jU9w3A9uK4B0bC0dE0fG0hI0jK0lM";

export async function POST(req: NextRequest) {
  // Sliding-window IP rate limiter
  const rateLimitError = await enforceRateLimit(req, { prefix: "login", maxRequests: 10, windowMs: 60000 });
  if (rateLimitError) return rateLimitError;

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
      return jsonError("Email and password are required", 422);
    }

    const normalizedEmail = body.email.trim().toLowerCase();
    const ip = await getClientIp(req);

    if (normalizedEmail.length > 254 || body.password.length > 128) {
      return jsonError("Invalid credentials", 400);
    }

    const windowStart = new Date(Date.now() - WINDOW_MS);
    const recentFailures = await prisma.loginAttempt.count({
      where: { email: normalizedEmail, success: false, createdAt: { gte: windowStart } },
    });

    if (recentFailures >= MAX_ATTEMPTS) {
      return jsonError(
        `Too many failed attempts. Try again in ${process.env.LOGIN_WINDOW_MINUTES || 15} minutes.`,
        429
      );
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Constant-time execution path to prevent user enumeration
    const targetHash = user ? user.passwordHash : DUMMY_HASH;
    const valid = await bcrypt.compare(body.password, targetHash);

    if (!user || !valid) {
      await prisma.loginAttempt.create({ data: { email: normalizedEmail, ip, success: false } });
      return jsonError("Invalid email or password", 401);
    }

    if (user.status !== "ACTIVE") {
      return jsonError("Your account is inactive. Contact your administrator.", 403);
    }

    await prisma.loginAttempt.create({ data: { email: normalizedEmail, ip, success: true } });
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    // Clean up expired sessions automatically
    await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});

    const ua = req.headers.get("user-agent");
    await createSession(user, ip, ua ?? undefined);

    await audit({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      action: "USER_LOGIN",
      entityType: "User",
      entityId: user.id,
      ip,
      userAgent: ua,
      details: { via: "password" },
    });

    return jsonOk(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
        },
      },
      "Login successful"
    );
  } catch (err) {
    // Any unhandled throw here used to produce an empty 500, which the client
    // reported as "Network error" and hid the real cause (e.g. DB unreachable).
    console.error("[auth/login] request failed:", err);
    return jsonError(
      "Login is temporarily unavailable. Please try again in a moment.",
      503
    );
  }
}
