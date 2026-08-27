import { NextRequest, NextResponse } from "next/server";
import { handleSsoLogin, SsoProvider, SsoUserProfile } from "@/lib/sso";
import { getClientIp } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!code) {
    return NextResponse.redirect(`${appUrl}/login?error=sso_code_missing`);
  }

  try {
    const ip = await getClientIp(req);
    const userAgent = req.headers.get("user-agent") || undefined;
    let profile: SsoUserProfile | null = null;

    if (provider === "google") {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          redirect_uri: `${appUrl}/api/auth/sso/google/callback`,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.access_token) {
        const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userData = await userRes.json();
        if (userData.email) {
          profile = {
            email: userData.email,
            name: userData.name || userData.email.split("@")[0],
            provider: "google",
            providerId: userData.id,
            avatarUrl: userData.picture,
          };
        }
      }
    } else if (provider === "github") {
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID || "",
          client_secret: process.env.GITHUB_CLIENT_SECRET || "",
          code,
          redirect_uri: `${appUrl}/api/auth/sso/github/callback`,
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.access_token) {
        const userRes = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            "User-Agent": "TechNova-Flow",
          },
        });
        const userData = await userRes.json();
        const emailsRes = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            "User-Agent": "TechNova-Flow",
          },
        });
        const emails = await emailsRes.json();
        const primaryEmail = Array.isArray(emails) ? (emails.find((e: any) => e.primary)?.email || emails[0]?.email) : userData.email;
        if (primaryEmail) {
          profile = {
            email: primaryEmail,
            name: userData.name || userData.login,
            provider: "github",
            providerId: String(userData.id),
            avatarUrl: userData.avatar_url,
          };
        }
      }
    }

    if (!profile) {
      return NextResponse.redirect(`${appUrl}/login?error=sso_profile_failed`);
    }

    await handleSsoLogin(profile, ip, userAgent);
    return NextResponse.redirect(`${appUrl}/dashboard`);
  } catch (err) {
    console.error("SSO Callback error:", err);
    return NextResponse.redirect(`${appUrl}/login?error=sso_failed`);
  }
}
