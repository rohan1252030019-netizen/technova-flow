import { requireUser } from "@/lib/auth";
import { DepartmentsClient } from "@/components/departments-client";

export const metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  await requireUser();
  return <DepartmentsClient />;
}