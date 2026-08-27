import Stripe from "stripe";
import { prisma } from "@/lib/db";

export type SubscriptionPlanId = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";

export interface PlanDefinition {
  id: SubscriptionPlanId;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number; // Annual per month or annual total
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?: string;
  maxUsers: number;
  maxWorkflows: number;
  features: string[];
  highlight?: boolean;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "Free Starter",
    description: "Ideal for small teams testing automated internal workflows.",
    monthlyPrice: 0,
    annualPrice: 0,
    maxUsers: 15,
    maxWorkflows: 3,
    features: [
      "Up to 15 team members",
      "3 active automated workflows",
      "Standard approval chains",
      "Email & in-app notifications",
      "Standard support",
    ],
  },
  STARTER: {
    id: "STARTER",
    name: "Starter Growth",
    description: "For emerging teams scaling departmental operations.",
    monthlyPrice: 29,
    annualPrice: 290, // $24.16/mo (save 17%)
    stripePriceIdMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_STARTER_ANNUAL,
    maxUsers: 30,
    maxWorkflows: 10,
    features: [
      "Up to 30 team members",
      "10 active automated workflows",
      "Multi-level approval branching",
      "Custom request metadata fields",
      "CSV reports export",
      "Priority email support",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Professional",
    description: "Complete workflow automation and SLA tracking for companies.",
    monthlyPrice: 79,
    annualPrice: 790, // $65.83/mo (save 17%)
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL,
    maxUsers: 100,
    maxWorkflows: 50,
    highlight: true,
    features: [
      "Up to 100 team members",
      "Unlimited automated workflows",
      "Automated SLA breach tracking & auto-escalations",
      "Advanced KPI analytics dashboard",
      "Custom department routing rules",
      "Full API & Webhook access",
      "24/7 dedicated support",
    ],
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise",
    description: "Maximum security, custom compliance, and unlimited scale.",
    monthlyPrice: 199,
    annualPrice: 1990, // $165.83/mo (save 17%)
    stripePriceIdMonthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
    maxUsers: 99999,
    maxWorkflows: 99999,
    features: [
      "Unlimited team members",
      "Unlimited workflows & requests",
      "Full 30-permission custom RBAC management",
      "Tamper-evident compliance audit trail",
      "Custom SSO / SAML / OAuth integration",
      "Multi-stage Docker container support",
      "Dedicated account manager & SLA guarantee",
    ],
  },
};

/**
 * Stripe client instance (returns null if STRIPE_SECRET_KEY is not configured)
 */
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia" as never,
      typescript: true,
    })
  : null;

/**
 * Creates a Stripe Checkout Session or simulates checkout in demo mode
 */
export async function createCheckoutSession({
  orgId,
  userEmail,
  planId,
  interval,
  returnUrl,
}: {
  orgId: string;
  userEmail: string;
  planId: SubscriptionPlanId;
  interval: "month" | "year";
  returnUrl: string;
}): Promise<{ url: string; mode: "stripe" | "simulation" }> {
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan) throw new Error("Invalid plan selected");

  if (!stripe) {
    // Simulation / Demo Mode: Instantly upgrade organization plan in database
    const periodEnd = new Date();
    periodEnd.setFullYear(periodEnd.getFullYear() + (interval === "year" ? 1 : 0));
    if (interval === "month") periodEnd.setMonth(periodEnd.getMonth() + 1);

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        plan: planId,
        subscriptionStatus: "active",
        currentPeriodEnd: periodEnd,
      },
    });

    return {
      url: `${returnUrl}?session_id=demo_${Date.now()}&status=success`,
      mode: "simulation",
    };
  }

  // Live Stripe Checkout
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  let customerId = org?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { orgId },
    });
    customerId = customer.id;
    await prisma.organization.update({
      where: { id: orgId },
      data: { stripeCustomerId: customerId },
    });
  }

  const priceId =
    interval === "year" ? plan.stripePriceIdAnnual : plan.stripePriceIdMonthly;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `TechNova Flow — ${plan.name} Plan`,
                description: plan.description,
              },
              unit_amount: (interval === "year" ? plan.annualPrice : plan.monthlyPrice) * 100,
              recurring: { interval },
            },
            quantity: 1,
          },
        ],
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&status=success`,
    cancel_url: `${returnUrl}?status=cancelled`,
    metadata: {
      orgId,
      planId,
      interval,
    },
  });

  return { url: session.url || returnUrl, mode: "stripe" };
}

/**
 * Creates a Stripe Billing Customer Portal session
 */
export async function createCustomerPortalSession({
  orgId,
  returnUrl,
}: {
  orgId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org?.stripeCustomerId || !stripe) {
    return { url: returnUrl };
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}
