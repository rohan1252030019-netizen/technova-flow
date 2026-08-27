import { requireUser } from "@/lib/auth";
import { AnalyticsClient } from "@/components/analytics-client";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  await requireUser();
  return <AnalyticsClient />;
}