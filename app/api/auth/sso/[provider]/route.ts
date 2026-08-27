import { NextRequest, NextResponse } from "next/server";
import { getOAuthLoginUrl, SsoProvider } from "@/lib/sso";
import { jsonError } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const validProviders: SsoProvider[] = ["google", "microsoft", "github"];

  if (!validProviders.includes(provider as SsoProvider)) {
    return jsonError(`Invalid SSO provider '${provider}'. Supported: google, microsoft, github`, 400);
  }

  try {
    const loginUrl = getOAuthLoginUrl(provider as SsoProvider);
    return NextResponse.redirect(loginUrl);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to initiate SSO", 500);
  }
}
