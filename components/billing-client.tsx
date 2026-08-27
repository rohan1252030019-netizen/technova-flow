"use client";

import { useEffect, useState } from "react";
import { SessionUser } from "@/lib/auth";
import { Card, Badge, Button, Skeleton } from "@/components/ui";
import {
  Check,
  Zap,
  CreditCard,
  Building2,
  Users,
  GitBranch,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanData {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  maxUsers: number;
  maxWorkflows: number;
  features: string[];
  highlight?: boolean;
}

interface SubscriptionResponse {
  organization: {
    id: string;
    name: string;
    plan: string;
    subscriptionStatus: string;
    currentPeriodEnd?: string;
    hasStripeCustomer: boolean;
  };
  plan: PlanData;
  allPlans: PlanData[];
  usage: {
    users: { current: number; max: number };
    workflows: { current: number; max: number };
  };
  isStripeConfigured: boolean;
}

export function BillingClient({ user }: { user: SessionUser }) {
  const [data, setData] = useState<SubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSubscription = async () => {
    try {
      const res = await fetch("/api/billing/subscription");
      const json = await res.json();
      if (res.ok && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load subscription data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handleCheckout = async (planId: string) => {
    if (planId === data?.organization.plan) return;
    setUpgradingPlan(planId);
    setMessage(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, interval: billingInterval }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to initiate checkout");
      }

      if (json.data?.mode === "simulation" || json.data?.mode === "downgrade") {
        setMessage({
          type: "success",
          text: `Plan updated to ${planId}! (Simulated mode / Demo checkout)`,
        });
        await fetchSubscription();
      } else if (json.data?.url) {
        window.location.href = json.data.url;
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Checkout failed" });
    } finally {
      setUpgradingPlan(null);
    }
  };

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.data?.url) {
        window.location.href = json.data.url;
      } else {
        setMessage({
          type: "success",
          text: "Stripe Customer Portal is active. Connect your live Stripe account to manage live credit cards.",
        });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to open customer portal" });
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const currentPlan = data?.organization.plan || "FREE";
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Subscription & Billing
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your organization plan, employee tier limits, and billing methods.
          </p>
        </div>

        {data?.organization.hasStripeCustomer && (
          <Button
            variant="outline"
            onClick={handleOpenPortal}
            loading={portalLoading}
            className="gap-2"
          >
            <CreditCard className="h-4 w-4" /> Manage Invoices & Cards
          </Button>
        )}
      </div>

      {message && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border p-4 text-sm font-medium",
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          )}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Current Plan Overview Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium uppercase tracking-wider text-slate-500">
                Current Active Tier
              </span>
              <Badge color={currentPlan === "ENTERPRISE" ? "purple" : currentPlan === "PRO" ? "indigo" : "blue"}>
                {data?.plan.name || currentPlan}
              </Badge>
              <Badge color={data?.organization.subscriptionStatus === "active" ? "green" : "amber"}>
                {data?.organization.subscriptionStatus || "active"}
              </Badge>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {data?.organization.name || "TechNova Global"}
            </h2>
            <p className="text-sm text-slate-600">
              {data?.plan.description}
            </p>
          </div>

          {/* Usage Metrics */}
          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Users className="h-3.5 w-3.5" /> Team Members
              </div>
              <p className="text-lg font-bold text-slate-900">
                {data?.usage.users.current}{" "}
                <span className="text-xs font-normal text-slate-500">
                  / {data?.usage.users.max === 99999 ? "Unlimited" : data?.usage.users.max}
                </span>
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <GitBranch className="h-3.5 w-3.5" /> Active Workflows
              </div>
              <p className="text-lg font-bold text-slate-900">
                {data?.usage.workflows.current}{" "}
                <span className="text-xs font-normal text-slate-500">
                  / {data?.usage.workflows.max === 99999 ? "Unlimited" : data?.usage.workflows.max}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interval Toggle */}
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="inline-flex items-center rounded-xl bg-slate-100 p-1.5">
          <button
            type="button"
            onClick={() => setBillingInterval("month")}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-medium transition-all",
              billingInterval === "month"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval("year")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-all",
              billingInterval === "year"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Annual Billing
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Tier Pricing Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {data?.allPlans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const price = billingInterval === "year" ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;

          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-sm transition-all",
                plan.highlight
                  ? "border-indigo-600 ring-2 ring-indigo-600/20"
                  : "border-slate-200 hover:border-slate-300"
              )}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm">
                  Most Popular
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <p className="mt-1 text-xs text-slate-500 min-h-[32px]">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">
                    ${price}
                  </span>
                  <span className="text-xs text-slate-500">
                    / month {billingInterval === "year" && plan.monthlyPrice > 0 ? "(billed annually)" : ""}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-3">
                    Plan includes:
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-700">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                {isCurrent ? (
                  <Button
                    disabled
                    variant="outline"
                    className="w-full justify-center bg-slate-50 text-slate-400"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Current Plan
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleCheckout(plan.id)}
                    loading={upgradingPlan === plan.id}
                    disabled={!isSuperAdmin}
                    variant={plan.highlight ? "primary" : "outline"}
                    className="w-full justify-center"
                  >
                    {plan.monthlyPrice === 0 ? "Downgrade to Free" : `Upgrade to ${plan.name}`}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Enterprise Security Box */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-slate-900">
                Need Custom Enterprise Licensing or Self-Hosted Deployment?
              </h4>
              <p className="text-sm text-slate-500">
                Get dedicated SLA agreements, on-premise Docker instances, and custom SSO connectors.
              </p>
            </div>
          </div>
          <Button variant="outline" className="shrink-0 gap-2">
            Contact Sales <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
