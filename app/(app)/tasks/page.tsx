import { requireUser } from "@/lib/auth";
import { TasksClient } from "@/components/tasks-client";

export const metadata = { title: "Tasks" };

export default async function TasksPage() {
  await requireUser();
  return <TasksClient />;
}