import { requireUser } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard-client";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  await requireUser();
  return <DashboardClient />;
}