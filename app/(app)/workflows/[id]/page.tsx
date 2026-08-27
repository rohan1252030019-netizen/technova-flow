import { requireUser } from "@/lib/auth";
import { WorkflowDetailClient } from "@/components/workflow-detail-client";

export const metadata = { title: "Workflow Detail" };

export default async function WorkflowDetailPage() {
  await requireUser();
  return <WorkflowDetailClient />;
}