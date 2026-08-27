"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Send, CalendarClock, Flag, User2, GitBranch, FileText } from "lucide-react";
import { Card, Badge, Button, Textarea, EmptyState, Skeleton, Select } from "@/components/ui";
import { cn, formatDateTime, formatRelative, initials, isOverdue } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  TODO: "gray",
  IN_PROGRESS: "blue",
  BLOCKED: "red",
  COMPLETED: "green",
  CANCELLED: "gray",
} as const;

export function TaskDetailClient({ userId }: { userId: string }) {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<any>(null);
  const [error, setError] = useState("");
  const [newComment, setNewComment] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const res = await fetch(`/api/tasks/${id}`);
    const d = await res.json();
    if (!d.success) setError(d.message || "Failed to load task");
    else setTask(d.data.task);
  }

  if (error) return <Card><EmptyState title="Task unavailable" description={error} /></Card>;
  if (!task) return <Skeleton className="h-96" />;

  async function changeStatus(status: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const d = await res.json();
    if (res.ok) { setTask(d.data.task); setToast({ msg: "Status updated", type: "ok" }); }
    else setToast({ msg: d.message || "Failed", type: "err" });
    setTimeout(() => setToast(null), 3000);
  }

  async function postComment() {
    if (newComment.trim().length < 2) return;
    const res = await fetch(`/api/tasks/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newComment }),
    });
    const d = await res.json();
    if (res.ok) { setNewComment(""); load(); }
    else setToast({ msg: d.message || "Failed", type: "err" });
  }

  const isAssignee = task.assignee?.id === userId;

  return (
    <div>
      <Link href="/tasks" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-4 w-4" /> Back to Tasks
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
                <h1 className="text-lg font-bold text-slate-900">{task.title}</h1>
                <p className="mt-1 text-sm text-slate-500">Created by {task.createdBy?.name} · {formatRelative(task.createdAt)}</p>
              </div>
              <Badge color={STATUS_COLORS[task.status] as any}>{task.status.replace(/_/g, " ")}</Badge>
            </div>
            {task.description && <p className="mt-4 text-sm leading-relaxed text-slate-600">{task.description}</p>}
            <div className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-400">Assignee</p>
                <p className="flex items-center gap-1.5 font-medium text-slate-800">
                  <User2 className="h-3.5 w-3.5" /> {task.assignee?.name}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Department</p>
                <p className="font-medium text-slate-800">{task.department?.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Priority</p>
                <p className="flex items-center gap-1.5 font-medium text-slate-800">
                  <Flag className="h-3.5 w-3.5" /> {task.priority}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Due Date</p>
                <p className={cn("flex items-center gap-1.5 font-medium", task.dueDate && isOverdue(task.dueDate) && task.status !== "COMPLETED" ? "text-red-600" : "text-slate-800")}>
                  <CalendarClock className="h-3.5 w-3.5" /> {formatDateTime(task.dueDate)}
                </p>
              </div>
            </div>
            {isAssignee && ["TODO", "IN_PROGRESS", "BLOCKED"].includes(task.status) && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <Select value={task.status} onChange={(e) => changeStatus(e.target.value)} className="max-w-xs">
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="COMPLETED">Complete Task</option>
                </Select>
              </div>
            )}
            {task.request && (
              <div className="mt-4 rounded-lg border border-slate-100 p-3 text-sm">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
                  <GitBranch className="h-3 w-3" /> Linked Request
                </p>
                <Link href={`/requests/${task.request.id}`} className="mt-1 flex items-center gap-1.5 font-medium text-indigo-600 hover:underline">
                  <FileText className="h-3.5 w-3.5" /> {task.request.requestNumber} — {task.request.title}
                </Link>
              </div>
            )}
          </Card>

          <Card title={`Comments (${task.comments?.length || 0})`}>
            <div className="space-y-4 p-5">
              {task.comments?.length === 0 && <p className="text-sm text-slate-500">No comments yet.</p>}
              {task.comments?.map((c: any) => (
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
                <Textarea rows={2} placeholder="Write a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} />
                <Button onClick={postComment} className="shrink-0 self-end"><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}