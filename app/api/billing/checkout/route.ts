import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, requireApiPermission } from "@/lib/api";
import { createCheckoutSession, SubscriptionPlanId, SUBSCRIPTION_PLANS } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const { user, error } = await requireApiPermission(req, "settings.manage");
  if (error || !user) return error;

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request payload", 400);

  const planId = body.planId as SubscriptionPlanId;
  const interval = (body.interval === "year" ? "year" : "month") as "month" | "year";

  if (!SUBSCRIPTION_PLANS[planId]) {
    return jsonError("Invalid subscription plan selected", 422);
  }

  const org = await prisma.organization.findFirst();
  if (!org) return jsonError("Organization not found", 404);

  // If selecting FREE plan, downgrade immediately
  if (planId === "FREE") {
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        plan: "FREE",
        subscriptionStatus: "active",
      },
    });
    return jsonOk({ success: true, plan: "FREE", mode: "downgrade" });
  }

  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://technova-flow.vercel.app";
  const returnUrl = `${origin}/settings/billing`;

  try {
    const result = await createCheckoutSession({
      orgId: org.id,
      userEmail: user.email,
      planId,
      interval,
      returnUrl,
    });

    return jsonOk(result);
  } catch (err: any) {
    console.error("Stripe Checkout Error:", err);
    return jsonError(err.message || "Failed to create checkout session", 500);
  }
}
