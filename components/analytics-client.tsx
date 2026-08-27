"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";
import { Card, Badge, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

const TYPE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];

export function AnalyticsClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => setData(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="grid gap-4 lg:grid-cols-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80" />)}</div>;
  }

  if (!data) {
    return <Card><EmptyState icon={<BarChart3 className="h-10 w-10" />} title="Analytics unavailable" /></Card>;
  }

  const wf = data.workflowPerformance;
  const typeData = (wf.byType || []).map((t: any, i: number) => ({
    name: t.type.replace(/_/g, " "),
    value: t.count,
    color: TYPE_COLORS[i % TYPE_COLORS.length],
  }));

  const topDepts = [...(data.departmentPerformance || [])].sort((a, b) => b.requests - a.requests).slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Workflow performance, department workload and employee productivity"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard label="Total Requests" value={wf.totalRequests} />
        <MetricCard label="Avg Completion" value={`${wf.avgCompletionHours}h`} />
        <MetricCard label="Rejection Rate" value={`${wf.rejectionRate}%`} accent={wf.rejectionRate > 20 ? "text-red-600" : ""} />
        <MetricCard label="SLA Breach Rate" value={`${wf.slaBreachRate}%`} accent={wf.slaBreachRate > 20 ? "text-red-600" : ""} />
        <MetricCard label="Escalated" value={wf.escalatedRequests} accent={wf.escalatedRequests > 0 ? "text-amber-600" : ""} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Requests by Type" subtitle="Workflow triggers">
          <div className="h-72 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {typeData.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Department Performance" subtitle="Request volume by department">
          <div className="h-72 px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDepts} layout="vertical" margin={{ left: 40, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="requests" name="Requests" radius={[0, 4, 4, 0]}>
                  {topDepts.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Department Workload" subtitle="Completion, pending and overdue requests per department" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70">
                {["Department", "Requests", "Completed", "Pending", "Overdue", "Completion Rate"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.departmentPerformance.map((d: any) => (
                <tr key={d.name} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{d.name}</td>
                  <td className="px-5 py-3 text-slate-600">{d.requests}</td>
                  <td className="px-5 py-3"><Badge color="green">{d.completed}</Badge></td>
                  <td className="px-5 py-3"><Badge color="amber">{d.pending}</Badge></td>
                  <td className="px-5 py-3"><Badge color={d.overdue > 0 ? "red" : "gray"}>{d.overdue}</Badge></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-indigo-600" style={{ width: `${d.completionRate}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{d.completionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Top Performers" subtitle="Employees by completed tasks" className="mt-4">
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.employeePerformance.map((e: any, i: number) => (
            <div key={e.employeeId} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white", i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-amber-700" : "bg-indigo-500")}>
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{e.name}</p>
                <p className="truncate text-xs text-slate-500">{e.designation || e.employeeId}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">{e.completed}</p>
                <p className="text-[10px] text-slate-400">of {e.totalTasks} tasks</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("mt-1 text-xl font-bold text-slate-900", accent)}>{value}</p>
    </Card>
  );
}