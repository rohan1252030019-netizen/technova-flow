import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { redirect } from "next/navigation";
import { cache } from "react";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { User, Role } from "@/app/generated/prisma/client";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");
const SESSION_COOKIE = "cnt_session";
const TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 7);

export type SessionUser = {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
  managerId: string | null;
  isAdmin: boolean;
};

export async function createSession(user: User, ip?: string, userAgent?: string) {
  const sessionToken = `${user.id}.${Date.now()}.${randomBytes(16).toString("hex")}`;
  const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);

  const hash = await hashToken(sessionToken);

  await prisma.session.create({
    data: { userId: user.id, tokenHash: hash, expiresAt, ip, userAgent },
  });

  const jwt = await new SignJWT({ sub: user.id, sid: sessionToken.slice(0, 32) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_DAYS}d`)
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_DAYS * 24 * 60 * 60,
  });

  return sessionToken;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get(SESSION_COOKIE)?.value;
  if (jwt) {
    try {
      const { payload } = await jwtVerify(jwt, SECRET);
      if (payload.sid) {
        await prisma.session.deleteMany({
          where: { tokenHash: await hashToken(`${payload.sub}.${payload.sid}`) },
        }).catch(() => {});
      }
    } catch {}
  }
  cookieStore.delete(SESSION_COOKIE);
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const jwt = cookieStore.get(SESSION_COOKIE)?.value;
  if (!jwt) return null;

  try {
    const { payload } = await jwtVerify(jwt, SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub as string },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        managerId: true,
        status: true,
      },
    });
    if (!user || user.status !== "ACTIVE") return null;
    return { ...user, isAdmin: user.role === "SUPER_ADMIN" || user.role === "HR_ADMIN" };
  } catch {
    return null;
  }
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

export function currentSessionCookieName() {
  return SESSION_COOKIE;
}

async function hashToken(token: string) {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}