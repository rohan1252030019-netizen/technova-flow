import { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { BillingClient } from "@/components/billing-client";

export const metadata: Metadata = {
  title: "Subscription & Billing — TechNova Flow",
  description: "Manage subscription plans, billing tiers, limits, and payment methods.",
};

export default async function BillingPage() {
  const user = await requireUser();
  return <BillingClient user={user} />;
}
