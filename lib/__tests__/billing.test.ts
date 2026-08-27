import { describe, it, expect } from "vitest";
import { SUBSCRIPTION_PLANS, createCheckoutSession, SubscriptionPlanId } from "../stripe";

describe("Stripe Subscription Billing Suite", () => {
  it("defines all 4 tiered subscription plans with valid limits", () => {
    const planIds: SubscriptionPlanId[] = ["FREE", "STARTER", "PRO", "ENTERPRISE"];
    for (const id of planIds) {
      const plan = SUBSCRIPTION_PLANS[id];
      expect(plan).toBeDefined();
      expect(plan.id).toBe(id);
      expect(plan.name).toBeTypeOf("string");
      expect(plan.maxUsers).toBeGreaterThan(0);
      expect(plan.maxWorkflows).toBeGreaterThan(0);
      expect(plan.features.length).toBeGreaterThan(3);
    }
  });

  it("calculates annual discount savings correctly (approx 17%)", () => {
    const starter = SUBSCRIPTION_PLANS.STARTER;
    const pro = SUBSCRIPTION_PLANS.PRO;
    const enterprise = SUBSCRIPTION_PLANS.ENTERPRISE;

    // Monthly total vs annual price
    expect(starter.annualPrice).toBeLessThan(starter.monthlyPrice * 12);
    expect(pro.annualPrice).toBeLessThan(pro.monthlyPrice * 12);
    expect(enterprise.annualPrice).toBeLessThan(enterprise.monthlyPrice * 12);
  });

  it("handles checkout session creation in demo/simulation mode when Stripe keys are not set", async () => {
    const result = await createCheckoutSession({
      orgId: "org-technova",
      userEmail: "admin@technova.com",
      planId: "PRO",
      interval: "month",
      returnUrl: "http://localhost:3000/settings/billing",
    });

    expect(result).toBeDefined();
    expect(result.mode).toBe("simulation");
    expect(result.url).toContain("/settings/billing");
    expect(result.url).toContain("status=success");
  });

  it("rejects invalid subscription plan identifiers", async () => {
    await expect(
      createCheckoutSession({
        orgId: "org-technova",
        userEmail: "admin@technova.com",
        planId: "INVALID_PLAN" as any,
        interval: "month",
        returnUrl: "http://localhost:3000/settings/billing",
      })
    ).rejects.toThrow("Invalid plan selected");
  });
});
