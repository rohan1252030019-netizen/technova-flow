"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GitBranch, Plus, ChevronRight, Pencil, ArrowUp, ArrowDown, Trash2, Copy, PlayCircle, Power } from "lucide-react";
import { Card, Button, Badge, EmptyState, PageHeader, Skeleton, ConfirmDialog } from "@/components/ui";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  LEAVE: "Leave",
  EXPENSE: "Expense",
  REIMBURSEMENT: "Reimbursement",
  PURCHASE: "Purchase",
  IT_SERVICE: "IT Service",
  DOCUMENT_APPROVAL: "Document Approval",
  CUSTOM: "Custom",
};

export function WorkflowsClient() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/workflows")
      .then((r) => r.json())
      .then((d) => setWorkflows(d.data?.workflows ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggleStatus(w: any) {
    const next = w.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const res = await fetch(`/api/workflows/${w.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const d = await res.json();
    if (res.ok) {
      setWorkflows((prev) => prev.map((x) => (x.id === w.id ? { ...x, status: next } : x)));
      setToast({ msg: next === "ACTIVE" ? "Workflow published" : "Workflow disabled", type: "ok" });
    } else {
      setToast({ msg: d.message || "Failed", type: "err" });
    }
    setTimeout(() => setToast(null), 3000);
  }

  if (loading) {
    return <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;
  }

  return (
    <div>
      <PageHeader
        title="Workflows"
        description="Configure approval chains and business process templates"
        actions={<Link href="/workflows/new"><Button><Plus className="h-4 w-4" /> New Workflow</Button></Link>}
      />

      {toast && (
        <div className={cn("mb-4 rounded-lg border px-4 py-3 text-sm", toast.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700")}>
          {toast.msg}
        </div>
      )}

      {workflows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<GitBranch className="h-10 w-10" />}
            title="No workflows yet"
            description="Create your first workflow template to start automating approvals."
            action={<Link href="/workflows/new"><Button><Plus className="h-4 w-4" /> Create Workflow</Button></Link>}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {workflows.map((w) => (
            <Card key={w.id} className="p-0">
              <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <GitBranch className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/workflows/${w.id}`} className="text-sm font-semibold text-slate-900 hover:text-indigo-600">
                      {w.name}
                    </Link>
                    <Badge color={w.status === "ACTIVE" ? "green" : w.status === "DRAFT" ? "amber" : "gray"}>{w.status}</Badge>
                    <Badge color="blue">{TYPE_LABELS[w.trigger] || w.trigger}</Badge>
                  </div>
                  {w.description && <p className="mt-1 line-clamp-1 text-sm text-slate-500">{w.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span>{w._count?.steps || 0} steps</span>
                    <span>·</span>
                    <span>{w._count?.requests || 0} requests</span>
                    <span>·</span>
                    <span>v{w.version || 1}</span>
                    <span>·</span>
                    <span>{w.department?.name || "All departments"}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleStatus(w)}>
                    {w.status === "ACTIVE" ? <><Power className="h-3.5 w-3.5" /> Disable</> : <><PlayCircle className="h-3.5 w-3.5" /> {w.status === "DRAFT" ? "Publish" : "Enable"}</>}
                  </Button>
                  <Link href={`/workflows/builder/${w.id}`}>
                    <Button size="sm"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}