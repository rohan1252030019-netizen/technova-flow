import { requireUser } from "@/lib/auth";
import { EmployeeDetailClient } from "@/components/employee-detail-client";

export const metadata = { title: "Employee Profile" };

export default async function EmployeeDetailPage() {
  await requireUser();
  return <EmployeeDetailClient />;
}