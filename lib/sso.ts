import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { Role } from "@/app/generated/prisma/client";

export type SsoProvider = "google" | "microsoft" | "github";

export type SsoUserProfile = {
  email: string;
  name: string;
  provider: SsoProvider;
  providerId: string;
  avatarUrl?: string;
};

/**
 * Returns OAuth authorization redirect URL for standard SSO providers
 */
export function getOAuthLoginUrl(provider: SsoProvider, state?: string): string {
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/sso/${provider}/callback`;

  if (provider === "google") {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
      state: state || "default",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  if (provider === "github") {
    const clientId = process.env.GITHUB_CLIENT_ID || "";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "user:email read:user",
      state: state || "default",
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  if (provider === "microsoft") {
    const clientId = process.env.MICROSOFT_CLIENT_ID || "";
    const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid profile email User.Read",
      state: state || "default",
    });
    return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  throw new Error(`Unsupported SSO provider: ${provider}`);
}

/**
 * Handles SSO user login/linking and creates authenticated session
 */
export async function handleSsoLogin(
  profile: SsoUserProfile,
  ip?: string,
  userAgent?: string
) {
  const email = profile.email.toLowerCase().trim();

  // Find existing user by corporate email
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Generate new employee entry if auto-provisioning is allowed
    const employeeCount = await prisma.user.count();
    const employeeId = `TN-${String(employeeCount + 101).padStart(4, "0")}`;

    user = await prisma.user.create({
      data: {
        email,
        name: profile.name || email.split("@")[0],
        employeeId,
        passwordHash: "$2a$10$SSO.PROVISIONED.ACCOUNT.NO.DIRECT.PASSWORD",
        role: Role.EMPLOYEE,
        status: "ACTIVE",
        avatarColor: "#6366f1",
      },
    });

    await audit({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      action: "SSO_USER_PROVISIONED",
      entityType: "User",
      entityId: user.id,
      details: { provider: profile.provider },
      ip,
      userAgent,
    });
  }

  if (user.status !== "ACTIVE") {
    throw new Error("Your account has been deactivated. Please contact your TechNova administrator.");
  }

  // Update last login timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Create session and set httpOnly cookie
  const sessionToken = await createSession(user, ip, userAgent);

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: "USER_LOGIN_SSO",
    entityType: "User",
    entityId: user.id,
    details: { provider: profile.provider },
    ip,
    userAgent,
  });

  return { user, sessionToken };
}
