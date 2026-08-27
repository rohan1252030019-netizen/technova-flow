import { requireUser } from "@/lib/auth";
import { AuditLogsClient } from "@/components/audit-logs-client";

export const metadata = { title: "Audit Logs" };

export default async function AuditLogsPage() {
  await requireUser();
  return <AuditLogsClient />;
}