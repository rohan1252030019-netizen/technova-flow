"use client";

import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Card, Badge, Button, Input, Select, EmptyState, PageHeader, Skeleton, Table } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

const ACTION_COLORS: Record<string, string> = {
  USER_LOGIN: "green",
  USER_LOGOUT: "gray",
  USER_CREATED: "blue",
  USER_UPDATED: "blue",
  USER_DEACTIVATED: "red",
  REQUEST_CREATED: "indigo",
  REQUEST_APPROVED: "green",
  REQUEST_REJECTED: "red",
  REQUEST_SEND_BACK: "amber",
  REQUEST_REQUEST_CHANGES: "amber",
  REQUEST_DELEGATED: "blue",
  REQUEST_ESCALATED: "red",
  REQUEST_CANCELLED: "gray",
  REQUEST_UPDATED: "blue",
  WORKFLOW_CREATED: "purple",
  WORKFLOW_PUBLISHED: "green",
  WORKFLOW_UPDATED: "purple",
  WORKFLOW_DELETED: "red",
  TASK_CREATED: "indigo",
  TASK_UPDATED: "blue",
  COMMENT_ADDED: "cyan",
  DOCUMENT_UPLOADED: "blue",
  DEPARTMENT_CREATED: "purple",
  DEPARTMENT_UPDATED: "purple",
  PASSWORD_RESET_REQUESTED: "amber",
  PASSWORD_RESET_COMPLETED: "green",
  SLA_CHECK_RUN: "cyan",
};

export function AuditLogsClient() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const pageSize = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (q) params.set("q", q);
      if (action) params.set("action", action);
      const res = await fetch(`/api/audit-logs?${params}`);
      const d = await res.json();
      setLogs(d.data?.logs ?? []);
      setTotal(d.data?.total ?? 0);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [page, q, action]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const actions = [...new Set([...Object.keys(ACTION_COLORS), ...logs.map((l) => l.action)])].sort();

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Immutable record of all system activity"
        actions={<Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>}
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Search by user, email or action..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
            <option value="">All Actions</option>
            {actions.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
          </Select>
          <p className="flex items-center text-xs text-slate-400">Showing {logs.length} of {total} events</p>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="space-y-3 p-5">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : logs.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="h-10 w-10" />} title="No audit events found" />
        ) : (
          <>
            <Table headers={["User", "Action", "Entity", "Details", "IP", "Timestamp"]}>
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{l.userName || l.userEmail || "System"}</p>
                    <p className="text-xs text-slate-400">{l.userEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={(ACTION_COLORS[l.action] || "gray") as any}>{l.action.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {l.entityType || "—"}
                    {l.entityId && <p className="text-xs text-slate-400">{l.entityId.slice(0, 12)}</p>}
                  </td>
                  <td className="max-w-64 px-4 py-3">
                    {l.details ? (
                      <p className="line-clamp-2 text-xs text-slate-500">{JSON.stringify(l.details)}</p>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{l.ip || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">{formatDateTime(l.createdAt)}</td>
                </tr>
              ))}
            </Table>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}