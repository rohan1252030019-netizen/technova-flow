"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2, Users, GitBranch, FileText, CheckSquare, BarChart3 } from "lucide-react";
import { Card, Badge, EmptyState, Skeleton } from "@/components/ui";
import { cn, initials } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "gray",
  SUBMITTED: "blue",
  UNDER_REVIEW: "purple",
  PENDING_APPROVAL: "amber",
  IN_PROGRESS: "cyan",
  ESCALATED: "red",
  APPROVED: "green",
  REJECTED: "red",
  COMPLETED: "green",
  CANCELLED: "gray",
} as const;

export function DepartmentDetailClient() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/departments/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) setError(d.message || "Failed to load");
        else setData(d.data);
      })
      .catch(() => setError("Failed to load department"));
  }, [id]);

  if (error) return <Card><EmptyState title="Department unavailable" description={error} /></Card>;
  if (!data) return <Skeleton className="h-96" />;

  const d = data.department;
  const reqStats = Object.fromEntries((data.requestStats || []).map((r: any) => [r.status, r._count]));
  const taskStats = Object.fromEntries((data.taskStats || []).map((r: any) => [r.status, r._count]));

  return (
    <div>
      <Link href="/departments" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-4 w-4" /> Back to Departments
      </Link>

      <Card className="mb-4 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{d.name}</h1>
              <Badge color={d.isActive ? "green" : "gray"}>{d.isActive ? "Active" : "Inactive"}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{d.code}{d.description ? ` · ${d.description}` : ""}</p>
            <p className="mt-1 text-xs text-slate-400">
              Department Head: {d.head?.name || "—"}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat label="Employees" value={d.users?.length || 0} icon={<Users className="h-4 w-4" />} />
        <MiniStat label="Workflows" value={d.workflows?.length || 0} icon={<GitBranch className="h-4 w-4" />} />
        <MiniStat label="Requests" value={Object.values(reqStats).reduce((a: number, b: any) => a + b, 0)} icon={<FileText className="h-4 w-4" />} />
        <MiniStat label="Tasks" value={Object.values(taskStats).reduce((a: number, b: any) => a + b, 0)} icon={<CheckSquare className="h-4 w-4" />} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Request Breakdown by Status">
          <div className="flex flex-wrap gap-2 p-5">
            {Object.keys(reqStats).length === 0 ? (
              <p className="text-sm text-slate-500">No requests yet.</p>
            ) : (
              Object.entries(reqStats).map(([status, count]: [string, any]) => (
                <div key={status} className="rounded-lg border border-slate-100 p-3 text-center">
                  <Badge color={STATUS_COLORS[status] as any}>{status.replace(/_/g, " ")}</Badge>
                  <p className="mt-1.5 text-lg font-bold text-slate-900">{count}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Task Breakdown by Status">
          <div className="flex flex-wrap gap-2 p-5">
            {Object.keys(taskStats).length === 0 ? (
              <p className="text-sm text-slate-500">No tasks yet.</p>
            ) : (
              Object.entries(taskStats).map(([status, count]: [string, any]) => (
                <div key={status} className="rounded-lg border border-slate-100 p-3 text-center">
                  <Badge color={status === "COMPLETED" ? "green" : status === "IN_PROGRESS" ? "blue" : "gray"}>{status.replace(/_/g, " ")}</Badge>
                  <p className="mt-1.5 text-lg font-bold text-slate-900">{count}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card title={`Employees (${d.users?.length || 0})`} className="mt-4">
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {d.users?.map((u: any) => (
            <Link key={u.id} href={`/employees/${u.id}`} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                {initials(u.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{u.name}</p>
                <p className="truncate text-xs text-slate-500">{u.designation || u.role.replace(/_/g, " ")}</p>
              </div>
            </Link>
          ))}
          {(!d.users || d.users.length === 0) && <p className="text-sm text-slate-500">No active employees.</p>}
        </div>
      </Card>

      <Card title="Department Workflows" className="mt-4">
        <div className="divide-y divide-slate-100">
          {d.workflows?.map((w: any) => (
            <Link key={w.id} href={`/workflows/${w.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <GitBranch className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{w.name}</p>
                  <p className="text-xs text-slate-500">{w.trigger.replace(/_/g, " ")}</p>
                </div>
              </div>
              <Badge color={w.status === "ACTIVE" ? "green" : w.status === "DRAFT" ? "amber" : "gray"}>{w.status}</Badge>
            </Link>
          ))}
          {(!d.workflows || d.workflows.length === 0) && <p className="px-5 py-6 text-sm text-slate-500">No workflows for this department.</p>}
        </div>
      </Card>
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-slate-400">{icon}<p className="text-xs font-medium uppercase tracking-wide">{label}</p></div>
      <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
    </Card>
  );
}