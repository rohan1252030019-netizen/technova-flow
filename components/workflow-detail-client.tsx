"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, GitBranch, Pencil, ArrowDown } from "lucide-react";
import { Card, Badge, EmptyState, Skeleton, Button } from "@/components/ui";
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

export function WorkflowDetailClient() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/workflows/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) setError(d.message || "Failed to load");
        else setData(d.data);
      })
      .catch(() => setError("Failed to load workflow"));
  }, [id]);

  if (error) {
    return <Card><EmptyState title="Workflow not found" description={error} /></Card>;
  }
  if (!data) return <Skeleton className="h-96" />;

  const w = data.workflow;

  return (
    <div>
      <Link href="/workflows" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-4 w-4" /> Back to Workflows
      </Link>

      <Card className="mb-4 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <GitBranch className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{w.name}</h1>
                <Badge color={w.status === "ACTIVE" ? "green" : w.status === "DRAFT" ? "amber" : "gray"}>{w.status}</Badge>
                <Badge color="blue">{TYPE_LABELS[w.trigger] || w.trigger}</Badge>
              </div>
              {w.description && <p className="mt-1 text-sm text-slate-500">{w.description}</p>}
              <p className="mt-2 text-xs text-slate-400">
                v{w.version || 1} · {w.steps.length} steps · {w._count?.requests || 0} requests · {w.department?.name || "All departments"}
              </p>
            </div>
          </div>
          <Link href={`/workflows/builder/${w.id}`}>
            <Button><Pencil className="h-4 w-4" /> Edit Workflow</Button>
          </Link>
        </div>
      </Card>

      <div className="max-w-3xl">
        {w.steps.map((s: any, i: number) => (
          <div key={s.id || i}>
            <Card className="p-4">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white",
                  s.stepType === "APPROVAL" ? "bg-amber-500" : s.stepType === "TASK" ? "bg-blue-500" : "bg-slate-500"
                )}>
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                    <Badge color={s.stepType === "APPROVAL" ? "amber" : s.stepType === "TASK" ? "blue" : "gray"}>{s.stepType}</Badge>
                    {s.isFinal && <Badge color="green">Final</Badge>}
                  </div>
                  {s.description && <p className="mt-1 text-xs text-slate-500">{s.description}</p>}
                </div>
              </div>
              <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
                <div><span className="text-slate-400">Assignee: </span>
                  {s.assigneeType === "ROLE" ? (s.assignedRole || "—").replace(/_/g, " ") : s.assigneeType === "DEPARTMENT" ? (s.assignedDepartment?.name || "Department") : (s.assignedUser?.name || "Specific user")}
                </div>
                <div><span className="text-slate-400">SLA: </span>{s.slaHours ? `${s.slaHours}h` : "None"}</div>
                <div><span className="text-slate-400">Escalation: </span>{s.escalationHours ? `${s.escalationHours}h to ${(s.escalationRole || "—").replace(/_/g, " ")}` : "None"}</div>
                <div><span className="text-slate-400">Rejection: </span>{s.allowRejection ? "Allowed" : "Not allowed"}</div>
                <div><span className="text-slate-400">Comments: </span>{s.requiresComment ? "Required" : "Optional"}</div>
                <div><span className="text-slate-400">Approval: </span>{s.requiresApproval ? "Required" : "Not required"}</div>
              </div>
            </Card>
            {i < w.steps.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowDown className="h-4 w-4 text-slate-300" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}