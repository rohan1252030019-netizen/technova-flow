import { requireUser } from "@/lib/auth";
import { EmployeesClient } from "@/components/employees-client";

export const metadata = { title: "Employees" };

export default async function EmployeesPage() {
  await requireUser();
  return <EmployeesClient />;
}