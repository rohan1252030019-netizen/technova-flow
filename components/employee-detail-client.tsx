"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Mail, Phone, Building2, User2, CalendarDays, BadgeCheck, FileText, CheckSquare, History } from "lucide-react";
import { Card, Badge, EmptyState, Skeleton, Tabs } from "@/components/ui";
import { formatDate, initials } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  HR_ADMIN: "HR Admin",
  MANAGER: "Manager",
  DEPARTMENT_HEAD: "Department Head",
  FINANCE: "Finance",
  EMPLOYEE: "Employee",
};

export function EmployeeDetailClient() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("tasks");

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) setError(d.message || "Failed to load");
        else setData(d.data);
      })
      .catch(() => setError("Failed to load profile"));
  }, [id]);

  if (error) {
    return (
      <Card>
        <EmptyState title="Access denied" description={error} action={<Link href="/employees"><ArrowLeft className="h-4 w-4 inline" /> Back to employees</Link>} />
      </Card>
    );
  }

  if (!data) {
    return <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-96 lg:col-span-1" /><Skeleton className="h-96 lg:col-span-2" /></div>;
  }

  const { profile, tasks, requests, approvals } = data;

  return (
    <div>
      <Link href="/employees" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-4 w-4" /> Back to Employees
      </Link>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full text-xl font-bold text-white" style={{ backgroundColor: profile.avatarColor || "#6366f1" }}>
              {initials(profile.name)}
            </div>
            <h1 className="text-lg font-bold text-slate-900">{profile.name}</h1>
            <p className="text-sm text-slate-500">{profile.designation || "Employee"}</p>
            <div className="mt-3 flex justify-center gap-2">
              <Badge color="indigo">{ROLE_LABELS[profile.role] || profile.role}</Badge>
              <Badge color={profile.status === "ACTIVE" ? "green" : "red"}>{profile.status}</Badge>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-400">{profile.employeeId}</p>
          </div>

          <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm">
            <div className="flex items-center gap-3 text-slate-600">
              <Mail className="h-4 w-4 text-slate-400" /> <span className="truncate">{profile.email}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <Phone className="h-4 w-4 text-slate-400" /> {profile.phone || "—"}
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <Building2 className="h-4 w-4 text-slate-400" /> {profile.department?.name || "—"}
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <User2 className="h-4 w-4 text-slate-400" /> Manager: {profile.manager?.name || "—"}
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <CalendarDays className="h-4 w-4 text-slate-400" /> Joined {formatDate(profile.joiningDate)}
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <BadgeCheck className="h-4 w-4 text-slate-400" /> {profile.reports?.length || 0} direct report(s)
            </div>
          </div>

          {profile.reports && profile.reports.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Reports to</p>
              <div className="space-y-1.5">
                {profile.reports.map((r: any) => (
                  <Link key={r.id} href={`/employees/${r.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                    <div className="h-6 w-6 rounded-full bg-slate-200 text-[9px] font-bold flex items-center justify-center text-slate-600">{initials(r.name)}</div>
                    <span className="truncate">{r.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="lg:col-span-2">
          <Tabs
            tabs={[
              { key: "tasks", label: `Assigned Tasks (${tasks.length})` },
              { key: "requests", label: `Requests (${requests.length})` },
              { key: "approvals", label: `Approvals (${approvals.length})` },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === "tasks" && (
            <Card className="mt-4">
              {tasks.length === 0 ? (
                <EmptyState icon={<CheckSquare className="h-10 w-10" />} title="No tasks assigned" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {tasks.map((t: any) => (
                    <li key={t.id}>
                      <Link href={`/tasks/${t.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{t.title}</p>
                          <p className="text-xs text-slate-500">{t.status.replace(/_/g, " ")} · Due {formatDate(t.dueDate)}</p>
                        </div>
                        <Badge color={t.status === "COMPLETED" ? "green" : t.status === "IN_PROGRESS" ? "blue" : "amber"}>{t.status}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {tab === "requests" && (
            <Card className="mt-4">
              {requests.length === 0 ? (
                <EmptyState icon={<FileText className="h-10 w-10" />} title="No requests created" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {requests.map((r: any) => (
                    <li key={r.id}>
                      <Link href={`/requests/${r.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{r.title}</p>
                          <p className="text-xs text-slate-500">{r.requestNumber} · {r.type.replace(/_/g, " ")}</p>
                        </div>
                        <Badge color={r.status === "COMPLETED" || r.status === "APPROVED" ? "green" : r.status === "REJECTED" || r.status === "CANCELLED" ? "red" : "amber"}>{r.status.replace(/_/g, " ")}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {tab === "approvals" && (
            <Card className="mt-4">
              {approvals.length === 0 ? (
                <EmptyState icon={<History className="h-10 w-10" />} title="No approval actions yet" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {approvals.map((a: any) => (
                    <li key={a.id} className="px-5 py-3">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">{a.action.replace(/_/g, " ")}</span>
                        <span className="text-slate-400"> on request </span>
                        <Link href={`/requests/${a.requestId}`} className="font-medium text-indigo-600 hover:underline">{a.request?.requestNumber || a.requestId}</Link>
                      </p>
                      {a.comment && <p className="mt-0.5 text-xs text-slate-500">“{a.comment}”</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}