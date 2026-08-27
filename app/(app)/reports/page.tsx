import { requireUser } from "@/lib/auth";
import { ReportsClient } from "@/components/reports-client";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  await requireUser();
  return <ReportsClient />;
}