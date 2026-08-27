"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { FileText, Plus, Search, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Card, Button, Input, Select, Badge, EmptyState, PageHeader, Skeleton, Table } from "@/components/ui";
import { cn, formatDate, formatCurrency, formatRelative } from "@/lib/utils";

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

const TYPE_LABELS: Record<string, string> = {
  LEAVE: "Leave",
  EXPENSE: "Expense",
  REIMBURSEMENT: "Reimbursement",
  PURCHASE: "Purchase",
  IT_SERVICE: "IT Service",
  DOCUMENT_APPROVAL: "Document Approval",
  CUSTOM: "Custom",
};

export function RequestsClient({ mine }: { mine?: boolean }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const pageSize = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (mine) params.set("mine", "true");
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      if (deptFilter) params.set("departmentId", deptFilter);
      const res = await fetch(`/api/requests?${params}`);
      const d = await res.json();
      setRequests(d.data?.requests ?? []);
      setTotal(d.data?.total ?? 0);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [page, q, status, type, deptFilter, mine]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/departments").then((r) => r.json()).then((d) => setDepartments(d.data?.departments ?? [])).catch(() => {});
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader
        title={mine ? "My Requests" : "Requests"}
        description="Track and manage all workflow requests"
        actions={
          <Link href="/requests/new">
            <Button><Plus className="h-4 w-4" /> New Request</Button>
          </Link>
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search request number or title..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {Object.keys(STATUS_COLORS).map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </Select>
          <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="space-y-3 p-5">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-10 w-10" />}
            title="No requests found"
            description="Create a request to start a workflow, or adjust your filters."
            action={<Link href="/requests/new"><Button><Plus className="h-4 w-4" /> New Request</Button></Link>}
          />
        ) : (
          <>
            <Table
              headers={["Request", "Type", "Requester", "Status", "Current Step", "Priority", "Created", ""]}
            >
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/requests/${r.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {r.title}
                    </Link>
                    <p className="text-xs text-slate-400">{r.requestNumber}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{TYPE_LABELS[r.type] || r.type}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{r.requester?.name}</td>
                  <td className="px-4 py-3"><Badge color={STATUS_COLORS[r.status] as any}>{r.status.replace(/_/g, " ")}</Badge></td>
                  <td className="px-4 py-3 text-sm text-slate-600">{r.currentStep?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge color={r.priority === "URGENT" ? "red" : r.priority === "HIGH" ? "amber" : r.priority === "MEDIUM" ? "blue" : "gray"}>{r.priority}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500" title={formatDate(r.createdAt)}>{formatRelative(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    {r.amount != null && <span className="text-sm font-medium text-slate-700">{formatCurrency(r.amount)}</span>}
                  </td>
                </tr>
              ))}
            </Table>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <p className="text-xs text-slate-500">Showing {requests.length} of {total} requests</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="px-2 text-xs text-slate-600">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}