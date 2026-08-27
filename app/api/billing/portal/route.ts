import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, requireApiPermission } from "@/lib/api";
import { createCustomerPortalSession } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const { user, error } = await requireApiPermission(req, "settings.manage");
  if (error || !user) return error;

  const org = await prisma.organization.findFirst();
  if (!org) return jsonError("Organization not found", 404);

  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://technova-flow.vercel.app";
  const returnUrl = `${origin}/settings/billing`;

  try {
    const result = await createCustomerPortalSession({
      orgId: org.id,
      returnUrl,
    });

    return jsonOk(result);
  } catch (err: any) {
    console.error("Stripe Portal Error:", err);
    return jsonError(err.message || "Failed to create customer portal session", 500);
  }
}
