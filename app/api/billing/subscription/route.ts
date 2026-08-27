import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, requireApiUser } from "@/lib/api";
import { SUBSCRIPTION_PLANS, SubscriptionPlanId } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  const { user, error } = await requireApiUser(req);
  if (error || !user) return error;

  const org = await prisma.organization.findFirst();
  const currentPlanId = (org?.plan as SubscriptionPlanId) || "FREE";
  const planInfo = SUBSCRIPTION_PLANS[currentPlanId] || SUBSCRIPTION_PLANS.FREE;

  const [activeUsersCount, activeWorkflowsCount] = await Promise.all([
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.workflow.count({ where: { status: "ACTIVE" } }),
  ]);

  return jsonOk({
    organization: {
      id: org?.id,
      name: org?.name,
      plan: currentPlanId,
      subscriptionStatus: org?.subscriptionStatus || "active",
      currentPeriodEnd: org?.currentPeriodEnd,
      hasStripeCustomer: Boolean(org?.stripeCustomerId),
    },
    plan: planInfo,
    allPlans: Object.values(SUBSCRIPTION_PLANS),
    usage: {
      users: {
        current: activeUsersCount,
        max: planInfo.maxUsers,
      },
      workflows: {
        current: activeWorkflowsCount,
        max: planInfo.maxWorkflows,
      },
    },
    isStripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
  });
}
