import { requireUser } from "@/lib/auth";
import { WorkflowBuilderClient } from "@/components/workflow-builder-client";

export const metadata = { title: "Workflow Builder" };

export default async function WorkflowBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  return <WorkflowBuilderClient workflowId={id} />;
}