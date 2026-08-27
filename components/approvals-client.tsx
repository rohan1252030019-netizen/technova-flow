"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ClipboardList, Check, ChevronLeft, ChevronRight, AlarmClock, AlertTriangle } from "lucide-react";
import { Card, Badge, EmptyState, PageHeader, Skeleton, Tabs, Button } from "@/components/ui";
import { cn, timeUntil, isOverdue } from "@/lib/utils";

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

export function ApprovalsClient() {
  const [tab, setTab] = useState("pending");
  const [data, setData] = useState<{ requests: any[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/approvals?status=${tab}&page=${page}&pageSize=${pageSize}`);
      const d = await res.json();
      setData(d.data);
    } catch {
      setData({ requests: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [tab]);

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / pageSize));

  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Requests waiting on your approval"
      />

      <Tabs
        tabs={[
          { key: "pending", label: "Pending" },
          { key: "overdue", label: "Overdue" },
          { key: "escalated", label: "Escalated" },
          { key: "COMPLETED", label: "Completed" },
          { key: "REJECTED", label: "Rejected" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <Card className="mt-4">
        {loading ? (
          <div className="space-y-3 p-5">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : !data || data.requests.length === 0 ? (
          <EmptyState
            icon={tab === "overdue" ? <AlarmClock className="h-10 w-10" /> : tab === "escalated" ? <AlertTriangle className="h-10 w-10" /> : <ClipboardList className="h-10 w-10" />}
            title={tab === "overdue" ? "No overdue approvals" : tab === "escalated" ? "No escalated requests" : "No pending approvals"}
            description={tab === "overdue" ? "Great — nothing has breached its SLA." : tab === "escalated" ? "No escalations need your attention." : "You're all caught up."}
          />
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {data.requests.map((r) => (
                <li key={r.id}>
                  <Link href={`/requests/${r.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                      tab === "overdue" ? "bg-red-100 text-red-700" : tab === "escalated" ? "bg-amber-100 text-amber-700" : "bg-amber-50 text-amber-700"
                    )}>
                      {tab === "overdue" ? <AlarmClock className="h-5 w-5" /> : tab === "escalated" ? <AlertTriangle className="h-5 w-5" /> : <Check className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{r.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                        <span>{r.requestNumber}</span>
                        <span>·</span>
                        <span>{r.requester?.name}</span>
                        <span>·</span>
                        <span>{r.workflow?.name}</span>
                        <span>·</span>
                        <span className="capitalize">{r.type.toLowerCase().replace(/_/g, " ")}</span>
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      {r.currentStep && <Badge color="amber">{r.currentStep.name}</Badge>}
                      {r.dueDate && (
                        <p className={cn("mt-1 text-[11px] font-medium", isOverdue(r.dueDate) ? "text-red-600" : "text-slate-500")}>
                          {timeUntil(r.dueDate)}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <p className="text-xs text-slate-500">Showing {data.requests.length} of {data.total}</p>
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