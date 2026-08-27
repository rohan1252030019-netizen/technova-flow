"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Building2,
  ShieldCheck,
  RefreshCw,
  Database,
  Users,
  GitBranch,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Card, Badge, Button, Input, PageHeader, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

export function SettingsClient() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [orgForm, setOrgForm] = useState({ name: "", description: "", timezone: "Asia/Kolkata", currency: "INR" });
  const [slaResult, setSlaResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [counts, setCounts] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.data?.user ?? null)).catch(() => {});
    fetch("/api/system/overview").then((r) => r.json()).then((d) => {
      if (d.data) {
        setOrg(d.data.org);
        setCounts(d.data.counts);
        if (d.data.org) setOrgForm({ name: d.data.org.name || "", description: d.data.org.description || "", timezone: d.data.org.timezone || "Asia/Kolkata", currency: d.data.org.currency || "INR" });
      }
    }).catch(() => {});
  }, []);

  async function saveOrg(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/system/org", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orgForm),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  async function runSlaCheck() {
    setRunning(true);
    setSlaResult(null);
    try {
      const res = await fetch("/api/system/sla-check", { method: "POST" });
      const d = await res.json();
      setSlaResult(d.data);
    } catch {
      setSlaResult({ error: "Failed" });
    } finally {
      setRunning(false);
    }
  }

  if (!user) return <Skeleton className="h-96" />;

  return (
    <div>
      <PageHeader title="Settings" description="Organization configuration and system operations" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Organization" className="p-6">
          <form onSubmit={saveOrg} className="space-y-4">
            <Input label="Organization Name" value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} />
            <Input label="Description" value={orgForm.description} onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Timezone" value={orgForm.timezone} onChange={(e) => setOrgForm({ ...orgForm, timezone: e.target.value })} />
              <Input label="Currency" value={orgForm.currency} onChange={(e) => setOrgForm({ ...orgForm, currency: e.target.value })} />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit">Save Organization</Button>
              {saved && <span className="flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
            </div>
          </form>
        </Card>

        <Card title="System Overview" subtitle="Live database counts" className="p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile icon={<Users className="h-4 w-4" />} label="Employees" value={counts?.users ?? "—"} />
            <StatTile icon={<Building2 className="h-4 w-4" />} label="Departments" value={counts?.departments ?? "—"} />
            <StatTile icon={<GitBranch className="h-4 w-4" />} label="Workflows" value={counts?.workflows ?? "—"} />
            <StatTile icon={<FileText className="h-4 w-4" />} label="Requests" value={counts?.requests ?? "—"} />
            <StatTile icon={<Database className="h-4 w-4" />} label="Tasks" value={counts?.tasks ?? "—"} />
            <StatTile icon={<ShieldCheck className="h-4 w-4" />} label="Audit Events" value={counts?.auditLogs ?? "—"} />
          </div>
        </Card>

        <Card title="SLA & Escalation Engine" subtitle="Check overdue requests and trigger escalations" className="p-6">
          <p className="text-sm text-slate-500">
            Scans all in-flight requests for SLA breaches, marks snapshots as breached, escalates
            requests past their escalation window, and notifies stakeholders of overdue tasks.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={runSlaCheck} loading={running}>
              <RefreshCw className="h-4 w-4" /> Run SLA Check
            </Button>
            {slaResult && (
              <span className="text-sm text-slate-600">
                {typeof slaResult.breached === "number" && (
                  <>Breaches: {slaResult.breached} · Escalated: {slaResult.escalated} · Overdue tasks: {slaResult.tasksOverdue}</>
                )}
                {slaResult.message && slaResult.message}
              </span>
            )}
          </div>
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Tip: schedule this endpoint (POST /api/system/sla-check) with a cron job every hour in production.
          </p>
        </Card>

        <Card title="Access Control" subtitle="Role-based permissions" className="p-6">
          <div className="space-y-3">
            {[
              { role: "SUPER_ADMIN", desc: "Full access — users, roles, workflows, analytics, audit logs" },
              { role: "HR_ADMIN", desc: "Employee management, HR requests, department administration" },
              { role: "MANAGER", desc: "Team approvals, task assignment, escalations" },
              { role: "DEPARTMENT_HEAD", desc: "Department approvals and monitoring" },
              { role: "FINANCE", desc: "Financial approvals and reimbursement processing" },
              { role: "EMPLOYEE", desc: "Create requests, track workflows, complete tasks" },
            ].map((r) => (
              <div key={r.role} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{r.role.replace(/_/g, " ")}</p>
                  <p className="text-xs text-slate-500">{r.desc}</p>
                </div>
                <Badge color={user?.role === r.role ? "green" : "gray"}>{user?.role === r.role ? "You" : "Role"}</Badge>
              </div>
            ))}
          </div>
          {user?.role !== "SUPER_ADMIN" && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" /> Some settings are restricted to Super Admin.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <div className="text-slate-400">{icon}</div>
      <p className="mt-1.5 text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}