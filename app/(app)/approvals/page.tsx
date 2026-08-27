import { requireUser } from "@/lib/auth";
import { ApprovalsClient } from "@/components/approvals-client";

export const metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  await requireUser();
  return <ApprovalsClient />;
}