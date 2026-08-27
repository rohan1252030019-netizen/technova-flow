import { requireUser } from "@/lib/auth";
import { WorkflowsClient } from "@/components/workflows-client";

export const metadata = { title: "Workflows" };

export default async function WorkflowsPage() {
  await requireUser();
  return <WorkflowsClient />;
}