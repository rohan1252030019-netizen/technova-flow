import { requireUser } from "@/lib/auth";
import { TaskDetailClient } from "@/components/task-detail-client";

export const metadata = { title: "Task Detail" };

export default async function TaskDetailPage() {
  const user = await requireUser();
  return <TaskDetailClient userId={user.id} />;
}