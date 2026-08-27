"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Users, GitBranch, ShieldCheck, BarChart3 } from "lucide-react";
import { Card, Button, Input, Select, PageHeader } from "@/components/ui";

export function ReportsClient() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");

  function download(type: string) {
    const params = new URLSearchParams({ type });
    if (type === "requests") {
      if (status) params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
    window.open(`/api/reports?${params}`, "_blank");
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Export operational data as CSV for analysis"
      />

      <Card className="mb-4 p-5">
        <p className="mb-3 text-sm font-semibold text-slate-800">Request report filters</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {["SUBMITTED", "UNDER_REVIEW", "PENDING_APPROVAL", "IN_PROGRESS", "ESCALATED", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </Select>
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportCard icon={<FileSpreadsheet className="h-5 w-5" />} title="Requests Report" description="All requests with status, workflow and timing" onClick={() => download("requests")} />
        <ReportCard icon={<Users className="h-5 w-5" />} title="Employee Report" description="Employee directory with task and request counts" onClick={() => download("employees")} />
        <ReportCard icon={<GitBranch className="h-5 w-5" />} title="Workflow Report" description="Workflow definitions with steps and SLA config" onClick={() => download("workflows")} />
        <ReportCard icon={<ShieldCheck className="h-5 w-5" />} title="Audit Report" description="Full audit trail (latest 5,000 events)" onClick={() => download("audit")} />
      </div>

      <Card className="mt-6 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600"><BarChart3 className="h-5 w-5" /></div>
          <div>
            <p className="text-sm font-semibold text-slate-800">PDF reporting</p>
            <p className="mt-0.5 text-sm text-slate-500">
              PDF export is available for the dashboard summary. CSV exports are provided for all operational reports.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ReportCard({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <Card className="p-5">
      <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600 w-fit">{icon}</div>
      <p className="mt-3 text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onClick}>
        <Download className="h-3.5 w-3.5" /> Export CSV
      </Button>
    </Card>
  );
}