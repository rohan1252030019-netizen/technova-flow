import { requireUser } from "@/lib/auth";
import { DepartmentDetailClient } from "@/components/department-detail-client";

export const metadata = { title: "Department Detail" };

export default async function DepartmentDetailPage() {
  await requireUser();
  return <DepartmentDetailClient />;
}