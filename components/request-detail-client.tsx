"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  X,
  Undo2,
  MessageSquareWarning,
  UserPlus,
  AlertTriangle,
  Send,
  Paperclip,
  Download,
  Trash2,
  Clock,
  FileText,
  MessageCircle,
  GitBranch,
  CalendarClock,
} from "lucide-react";
import { Card, Badge, Button, Textarea, EmptyState, Skeleton, Modal, ConfirmDialog } from "@/components/ui";
import { cn, formatCurrency, formatDateTime, formatRelative, initials, timeUntil, isOverdue } from "@/lib/utils";

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

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "gray",
  MEDIUM: "blue",
  HIGH: "amber",
  URGENT: "red",
} as const;

const ACTION_COLORS: Record<string, string> = {
  APPROVED: "green",
  REJECTED: "red",
  SEND_BACK: "amber",
  REQUEST_CHANGES: "amber",
  DELEGATED: "blue",
  ESCALATED: "red",
} as const;

export function RequestDetailClient({ userId }: { userId: string }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [actionModal, setActionModal] = useState<null | "APPROVED" | "REJECTED" | "SEND_BACK" | "REQUEST_CHANGES" | "ESCALATED">(null);
  const [delegateModal, setDelegateModal] = useState(false);
  const [comment, setComment] = useState("");
  const [newComment, setNewComment] = useState("");
  const [acting, setActing] = useState(false);
  const [delegateTo, setDelegateTo] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    fetch("/api/users?pageSize=100").then((r) => r.json()).then((d) => setEmployees(d.data?.users ?? [])).catch(() => {});
  }, []);

  async function load() {
    const res = await fetch(`/api/requests/${id}`);
    const d = await res.json();
    if (!d.success) {
      setError(d.message || "Failed to load request");
      return;
    }
    setData(d.data);
  }

  if (error) {
    return <Card><EmptyState title="Request unavailable" description={error} /></Card>;
  }
  if (!data) return <Skeleton className="h-[500px]" />;

  const r = data.request;
  const isRequester = r.requester?.id === userId;

  async function submitAction(action: string) {
    setActing(true);
    try {
      const res = await fetch(`/api/requests/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      });
      const d = await res.json();
      if (!res.ok) {
        setToast({ msg: d.message || "Action failed", type: "err" });
        return;
      }
      setToast({ msg: d.message || "Done", type: "ok" });
      setActionModal(null);
      setComment("");
      load();
    } finally {
      setActing(false);
    }
  }

  async function delegate() {
    if (!delegateTo) return;
    setActing(true);
    try {
      const res = await fetch(`/api/requests/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELEGATED", delegateToId: delegateTo, comment }),
      });
      const d = await res.json();
      setToast({ msg: d.message || "Delegated", type: res.ok ? "ok" : "err" });
      setDelegateModal(false);
      setComment("");
      load();
    } finally {
      setActing(false);
    }
  }

  async function postComment() {
    if (newComment.trim().length < 2) return;
    const res = await fetch(`/api/requests/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newComment }),
    });
    const d = await res.json();
    if (res.ok) {
      setNewComment("");
      load();
    } else {
      setToast({ msg: d.message || "Failed to add comment", type: "err" });
    }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/requests/${id}/attachments`, { method: "POST", body: fd });
    const d = await res.json();
    if (res.ok) {
      setToast({ msg: "File uploaded", type: "ok" });
      load();
    } else {
      setToast({ msg: d.message || "Upload failed", type: "err" });
    }
    e.target.value = "";
  }

  const workflow = r.workflow;
  const stepIndex = r.currentStepOrder ?? 0;

  const actionLabels: Record<string, string> = {
    APPROVED: "Approve",
    REJECTED: "Reject",
    SEND_BACK: "Send Back",
    REQUEST_CHANGES: "Request Changes",
    ESCALATED: "Escalate",
  };

  return (
    <div>
      <Link href="/requests" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-4 w-4" /> Back to Requests
      </Link>

      {toast && (
        <div className={cn("mb-4 rounded-lg border px-4 py-3 text-sm", toast.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700")}>
          {toast.msg}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900">{r.title}</h1>
                  <Badge color={STATUS_COLORS[r.status] as any}>{r.status.replace(/_/g, " ")}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {r.requestNumber} · {r.type.replace(/_/g, " ")} · {r.workflow?.name || "No workflow"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge color={PRIORITY_COLORS[r.priority] as any}>{r.priority} priority</Badge>
                {r.amount != null && <Badge color="purple">{formatCurrency(r.amount, r.currency)}</Badge>}
              </div>
            </div>

            {r.description && <p className="mt-4 text-sm leading-relaxed text-slate-600">{r.description}</p>}

            <div className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs text-slate-400">Requester</p>
                <p className="font-medium text-slate-800">{r.requester?.name}</p>
                <p className="text-xs text-slate-500">{r.requester?.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Department</p>
                <p className="font-medium text-slate-800">{r.department?.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Assigned To</p>
                <p className="font-medium text-slate-800">{r.assignedUser?.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Created</p>
                <p className="font-medium text-slate-800">{formatDateTime(r.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Due</p>
                <p className={cn("font-medium", r.dueDate && isOverdue(r.dueDate) ? "text-red-600" : "text-slate-800")}>
                  {r.dueDate ? formatDateTime(r.dueDate) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Completed</p>
                <p className="font-medium text-slate-800">{r.completedAt ? formatDateTime(r.completedAt) : "—"}</p>
              </div>
            </div>

            {r.dueDate && ["PENDING_APPROVAL", "UNDER_REVIEW", "SUBMITTED", "IN_PROGRESS"].includes(r.status) && (
              <div className={cn("mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", isOverdue(r.dueDate) ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
                <Clock className="h-4 w-4" />
                <span className="font-medium">{timeUntil(r.dueDate)}</span>
                {isOverdue(r.dueDate) && " — SLA breached, escalation may apply"}
              </div>
            )}

            {(r.status === "DRAFT" || r.status === "SUBMITTED" || r.status === "PENDING_APPROVAL" || r.status === "UNDER_REVIEW" || r.status === "IN_PROGRESS" || r.status === "ESCALATED") && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)} className="text-red-600 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" /> Cancel Request
                </Button>
              </div>
            )}
          </Card>

          <Card title="Workflow Progress" subtitle={workflow?.name || "Workflow"}>
            {!workflow || workflow.steps.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">No workflow steps configured for this request.</p>
            ) : (
              <div className="overflow-x-auto px-5 py-4">
                <div className="flex min-w-max items-center">
                  {workflow.steps.map((s: any, i: number) => {
                    const done = i < stepIndex;
                    const current = i === stepIndex;
                    const approved = r.approvals?.some((a: any) => a.stepId === s.id);
                    return (
                      <div key={s.id} className="flex items-center">
                        <div className="flex w-40 flex-col items-center text-center">
                          <div className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold",
                            done || approved ? "border-emerald-500 bg-emerald-500 text-white"
                              : current ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-200 bg-white text-slate-400"
                          )}>
                            {done || approved ? <Check className="h-4 w-4" /> : i + 1}
                          </div>
                          <p className={cn("mt-1.5 text-xs font-medium leading-tight", current ? "text-indigo-700" : done || approved ? "text-slate-700" : "text-slate-400")}>
                            {s.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {s.slaHours ? `${s.slaHours}h SLA` : ""}
                          </p>
                        </div>
                        {i < workflow.steps.length - 1 && (
                          <div className={cn("h-0.5 w-8 sm:w-12", i < stepIndex ? "bg-emerald-500" : "bg-slate-200")} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          <Card title="Approval Actions" subtitle="Act on the current step">
            {!["PENDING_APPROVAL", "UNDER_REVIEW", "SUBMITTED", "IN_PROGRESS", "ESCALATED"].includes(r.status) ? (
              <p className="px-5 py-6 text-sm text-slate-500">
                This request is {r.status.toLowerCase().replace(/_/g, " ")} — no actions available.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 p-5">
                <Button variant="success" onClick={() => setActionModal("APPROVED")}>
                  <Check className="h-4 w-4" /> Approve
                </Button>
                <Button variant="danger" onClick={() => setActionModal("REJECTED")}>
                  <X className="h-4 w-4" /> Reject
                </Button>
                <Button variant="secondary" onClick={() => setActionModal("SEND_BACK")}>
                  <Undo2 className="h-4 w-4" /> Send Back
                </Button>
                <Button variant="outline" onClick={() => setActionModal("REQUEST_CHANGES")}>
                  <MessageSquareWarning className="h-4 w-4" /> Request Changes
                </Button>
                <Button variant="outline" onClick={() => setDelegateModal(true)}>
                  <UserPlus className="h-4 w-4" /> Delegate
                </Button>
                <Button variant="outline" onClick={() => setActionModal("ESCALATED")} className="text-amber-700 hover:bg-amber-50">
                  <AlertTriangle className="h-4 w-4" /> Escalate
                </Button>
              </div>
            )}
          </Card>

          <Card title={`Comments (${r.comments?.length || 0})`}>
            <div className="space-y-4 p-5">
              {r.comments?.length === 0 && (
                <p className="text-sm text-slate-500">No comments yet. Start the discussion.</p>
              )}
              {r.comments?.map((c: any) => (
                <div key={c.id} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: c.user?.avatarColor || "#6366f1" }}>
                    {initials(c.user?.name || "?")}
                  </div>
                  <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3.5 py-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-800">{c.user?.name}</p>
                      <p className="text-[11px] text-slate-400">{formatRelative(c.createdAt)}</p>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{c.body}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 border-t border-slate-100 pt-4">
                <Textarea
                  rows={2}
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button onClick={postComment} className="shrink-0 self-end">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          <Card title={`Attachments (${r.attachments?.length || 0})`}>
            <div className="p-5">
              <input ref={fileRef} type="file" className="hidden" onChange={uploadFile} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt" />
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
                <Paperclip className="h-4 w-4 text-slate-400" />
                <p className="flex-1 text-xs text-slate-500">
                  Upload supporting documents — PDF, DOC/DOCX, XLS/XLSX, PNG/JPG (max 10MB)
                </p>
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                  <Paperclip className="h-3.5 w-3.5" /> Upload
                </Button>
              </div>
              {r.attachments?.length === 0 && <p className="text-sm text-slate-500">No attachments yet.</p>}
              <ul className="divide-y divide-slate-100">
                {r.attachments?.map((a: any) => (
                  <li key={a.id} className="flex items-center gap-3 py-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{a.originalName}</p>
                      <p className="text-xs text-slate-500">
                        {(a.size / 1024).toFixed(1)} KB · {a.uploader?.name} · {formatRelative(a.createdAt)}
                      </p>
                    </div>
                    <a
                      href={`/api/attachments/${a.id}`}
                      className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Approval History" subtitle={`${r.approvals?.length || 0} actions recorded`}>
            {r.approvals?.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">No approvals yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {r.approvals?.map((a: any) => (
                  <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-600">
                      {initials(a.approver?.name || "?")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-800">
                        <span className="font-semibold">{a.approver?.name}</span>{" "}
                        <Badge color={ACTION_COLORS[a.action] as any} className="ml-1">{a.action.replace(/_/g, " ")}</Badge>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {a.step?.name} · {formatDateTime(a.createdAt)}
                      </p>
                      {a.comment && <p className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">“{a.comment}”</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {r.escalations?.length > 0 && (
            <Card title="Escalations">
              <ul className="divide-y divide-slate-100">
                {r.escalations.map((e: any) => (
                  <li key={e.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                    <div>
                      <p className="text-slate-700">
                        Escalated to <span className="font-medium">{e.escalatedTo?.name}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatRelative(e.createdAt)} {e.reason && `· ${e.reason}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="SLA Tracking">
            <ul className="divide-y divide-slate-100">
              {r.slaSnapshots?.length === 0 && <p className="px-5 py-6 text-sm text-slate-500">No SLA configured for this request.</p>}
              {r.slaSnapshots?.map((s: any) => (
                <li key={s.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">{s.stepName}</p>
                    <Badge color={s.breached ? "red" : "green"}>{s.breached ? "Breached" : "On track"}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {s.slaHours}h SLA · started {formatRelative(s.startedAt)} · due {formatDateTime(s.dueAt)}
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Metadata" subtitle="Request form data">
            <div className="space-y-1.5 px-5 py-4 text-sm">
              {r.metadata && Object.keys(r.metadata).length > 0 ? (
                Object.entries(r.metadata).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-400">{k.replace(/([A-Z])/g, " $1")}</span>
                    <span className="font-medium text-slate-700">{String(v)}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">No additional data.</p>
              )}
              {r.tasks?.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
                    <GitBranch className="h-3 w-3" /> Linked Tasks
                  </p>
                  {r.tasks.map((t: any) => (
                    <Link key={t.id} href={`/tasks/${t.id}`} className="block py-0.5 text-indigo-600 hover:underline">
                      {t.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={!!actionModal}
        onClose={() => setActionModal(null)}
        title={actionLabels[actionModal || ""] || "Action"}
        footer={
          <>
            <Button variant="outline" onClick={() => setActionModal(null)}>Cancel</Button>
            <Button
              variant={actionModal === "REJECTED" ? "danger" : actionModal === "APPROVED" ? "success" : "primary"}
              onClick={() => submitAction(actionModal!)}
              loading={acting}
            >
              Confirm {actionLabels[actionModal || ""]}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
            <p className="font-medium text-slate-800">{r.requestNumber} — {r.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">Current step: {r.currentStep?.name}</p>
          </div>
          <Textarea
            label={actionModal === "REJECTED" ? "Rejection reason *" : actionModal === "REQUEST_CHANGES" ? "Change request comment *" : actionModal === "SEND_BACK" ? "Comment (optional)" : "Comment (optional)"}
            rows={3}
            required={actionModal === "REJECTED" || actionModal === "REQUEST_CHANGES"}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={actionModal === "REJECTED" ? "Explain why this request is rejected..." : "Add a note for the requester..."}
          />
          {actionModal === "REJECTED" && <p className="text-xs text-red-600">Rejection reason is mandatory.</p>}
        </div>
      </Modal>

      <Modal
        open={delegateModal}
        onClose={() => setDelegateModal(false)}
        title="Delegate Approval"
        footer={
          <>
            <Button variant="outline" onClick={() => setDelegateModal(false)}>Cancel</Button>
            <Button onClick={delegate} loading={acting}>Delegate</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Delegate to</label>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={delegateTo}
              onChange={(e) => setDelegateTo(e.target.value)}
            >
              <option value="">— Select employee —</option>
              {employees.filter((u) => u.id !== userId).map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.employeeId})</option>
              ))}
            </select>
          </div>
          <Textarea label="Note (optional)" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
      </Modal>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={async () => {
          const res = await fetch(`/api/requests/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "cancel" }),
          });
          const d = await res.json();
          if (res.ok) {
            setToast({ msg: "Request cancelled", type: "ok" });
            load();
          } else {
            setToast({ msg: d.message || "Failed to cancel", type: "err" });
          }
          setCancelOpen(false);
        }}
        title="Cancel request"
        message={`Cancel ${r.requestNumber}? This cannot be undone. The request will be marked as cancelled.`}
        confirmText="Cancel Request"
        danger
      />
    </div>
  );
}