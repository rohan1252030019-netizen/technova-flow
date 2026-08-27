import { requireUser } from "@/lib/auth";
import { WorkflowBuilderClient } from "@/components/workflow-builder-client";

export const metadata = { title: "New Workflow" };

export default async function NewWorkflowPage() {
  await requireUser();
  return <WorkflowBuilderClient />;
}