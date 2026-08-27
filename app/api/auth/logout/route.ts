import { NextRequest, NextResponse } from "next/server";
import { destroySession, getSessionUser } from "@/lib/auth";
import { jsonOk } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (user) {
    await audit({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      action: "USER_LOGOUT",
      entityType: "User",
      entityId: user.id,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: req.headers.get("user-agent"),
    });
  }
  await destroySession();
  return jsonOk(null, "Logged out");
}