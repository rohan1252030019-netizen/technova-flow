"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, StatCard, Badge, EmptyState, Skeleton } from "@/components/ui";
import {
  Users,
  GitBranch,
  FileText,
  CheckCircle2,
  XCircle,
  AlarmClock,
  ClipboardCheck,
  ArrowRight,
  Inbox,
  TrendingUp,
  Activity,
} from "lucide-react";
import { cn, formatRelative, formatDateTime, timeUntil } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  SUBMITTED: "#60a5fa",
  UNDER_REVIEW: "#a78bfa",
  PENDING_APPROVAL: "#f59e0b",
  IN_PROGRESS: "#3b82f6",
  ESCALATED: "#ef4444",
  APPROVED: "#10b981",
  REJECTED: "#ef4444",
  COMPLETED: "#10b981",
  CANCELLED: "#94a3b8",
};

const BAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#ef4444"];

type DashboardData = {
  stats: {
    totalEmployees: number;
    activeWorkflows: number;
    totalRequests: number;
    pendingApprovals: number;
    completedRequests: number;
    rejectedRequests: number;
    overdueTasks: number;
    avgProcessingHours: number;
    slaBreaches: number;
    completionRate: number;
  };
  requestTrend: { date: string; count: number }[];
  byDepartment: { name: string; count: number }[];
  byStatus: { status: string; count: number }[];
};

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [pending, setPending] = useState<{ requests: any[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics/summary").then((r) => r.json()),
      fetch("/api/approvals?status=pending&pageSize=5").then((r) => r.json()),
    ])
      .then(([analytics, approvals]) => {
        setData(analytics.data);
        setPending(approvals.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <EmptyState
          icon={<Inbox className="h-10 w-10" />}
          title="Could not load dashboard"
          description="Please refresh the page or try again later."
        />
      </Card>
    );
  }

  const s = data.stats;
  const statusChartData = data.byStatus.map((x) => ({
    name: x.status.replace(/_/g, " "),
    value: x.count,
    color: STATUS_COLORS[x.status] || "#94a3b8",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Enterprise Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            {process.env.NEXT_PUBLIC_ORG_NAME || "TechNova Global"} · Overview of workflows, approvals and performance
          </p>
        </div>
        <Link
          href="/requests/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <FileText className="h-4 w-4" /> New Request
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Employees" value={s.totalEmployees} icon={<Users className="h-5 w-5" />} color="indigo" />
        <StatCard label="Active Workflows" value={s.activeWorkflows} icon={<GitBranch className="h-5 w-5" />} color="blue" />
        <StatCard label="Total Requests" value={s.totalRequests} icon={<FileText className="h-5 w-5" />} color="purple" sub={`${s.completionRate}% completion rate`} />
        <StatCard label="Pending Approvals" value={s.pendingApprovals} icon={<ClipboardCheck className="h-5 w-5" />} color="amber" />
        <StatCard label="Completed" value={s.completedRequests} icon={<CheckCircle2 className="h-5 w-5" />} color="green" />
        <StatCard label="Rejected" value={s.rejectedRequests} icon={<XCircle className="h-5 w-5" />} color="red" />
        <StatCard label="Overdue Tasks" value={s.overdueTasks} icon={<AlarmClock className="h-5 w-5" />} color="amber" />
        <StatCard
          label="Avg Processing"
          value={`${s.avgProcessingHours}h`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="cyan"
          sub={`${s.slaBreaches} SLA breaches`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Requests Over Time" subtitle="Last 30 days" className="lg:col-span-2">
          <div className="h-72 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChartLike data={data.requestTrend} />
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Requests by Status">
          <div className="h-72 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {statusChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Requests by Department">
          <div className="h-72 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byDepartment}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.byDepartment.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          title="Pending Approvals"
          subtitle="Awaiting your action"
          className="lg:col-span-2"
          action={
            <Link href="/approvals" className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {!pending || pending.requests.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-10 w-10" />}
              title="No pending approvals"
              description="You're all caught up. New approvals will appear here."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {pending.requests.map((r) => (
                <li key={r.id}>
                  <Link href={`/requests/${r.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <div className={cn("h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold", STATUS_STYLE[r.status]?.bg || "bg-slate-100 text-slate-600")}>
                      {r.requestNumber.replace("REQ-", "")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{r.title}</p>
                      <p className="truncate text-xs text-slate-500">
                        {r.requestNumber} · {r.requester?.name} · {r.workflow?.name}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      {r.currentStep && (
                        <Badge color="amber">{r.currentStep.name}</Badge>
                      )}
                      {r.dueDate && (
                        <p className={cn("mt-1 text-[11px]", new Date(r.dueDate) < new Date() ? "text-red-600" : "text-slate-500")}>
                          {timeUntil(r.dueDate)}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Workflow Health" className="lg:col-span-2">
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <HealthItem label="Active workflows" value={s.activeWorkflows} icon={<GitBranch className="h-4 w-4" />} color="text-blue-600 bg-blue-50" />
            <HealthItem label="In progress" value={s.totalRequests - s.completedRequests - s.rejectedRequests} icon={<Activity className="h-4 w-4" />} color="text-indigo-600 bg-indigo-50" />
            <HealthItem label="SLA breaches" value={s.slaBreaches} icon={<AlarmClock className="h-4 w-4" />} color="text-red-600 bg-red-50" />
          </div>
        </Card>

        <Card title="Recent Activity" subtitle="Latest audit events">
          <RecentAuditEvents />
        </Card>
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<string, { bg: string }> = {
  PENDING_APPROVAL: { bg: "bg-amber-100 text-amber-700" },
  UNDER_REVIEW: { bg: "bg-purple-100 text-purple-700" },
  SUBMITTED: { bg: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { bg: "bg-indigo-100 text-indigo-700" },
};

function HealthItem({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-lg border border-slate-100 p-4">
      <div className={cn("mb-2 inline-flex rounded-lg p-2", color)}>{icon}</div>
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function AreaChartLike({ data }: { data: { date: string; count: number }[] }) {
  return (
    <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
      <XAxis
        dataKey="date"
        tick={{ fontSize: 10 }}
        tickFormatter={(v: string) => v.slice(5)}
      />
      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
      <Tooltip />
      <Line
        type="monotone"
        dataKey="count"
        name="Requests"
        stroke="#6366f1"
        strokeWidth={2}
        dot={false}
        activeDot={{ r: 4 }}
      />
    </LineChart>
  );
}

function RecentAuditEvents() {
  const [events, setEvents] = useState<any[] | null>(null);
  useEffect(() => {
    fetch("/api/audit-logs?pageSize=5")
      .then((r) => r.json())
      .then((d) => setEvents(d.data?.logs ?? []))
      .catch(() => setEvents([]));
  }, []);
  if (!events) return <Skeleton className="h-40" />;
  if (events.length === 0) return <p className="px-5 py-8 text-center text-sm text-slate-500">No activity yet.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {events.map((e) => (
        <li key={e.id} className="flex items-start gap-3 px-5 py-3">
          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-slate-700">
              <span className="font-medium">{e.userName || e.userEmail || "System"}</span>{" "}
              {e.action.replace(/_/g, " ").toLowerCase()}
            </p>
            <p className="text-xs text-slate-400">{formatDateTime(e.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}