"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CheckSquare, Plus, Search, CalendarClock, Flag, User2 } from "lucide-react";
import { Card, Button, Input, Select, Badge, EmptyState, PageHeader, Skeleton, Modal, Textarea, ConfirmDialog } from "@/components/ui";
import { cn, formatDate, initials, isOverdue } from "@/lib/utils";

const COLUMNS = [
  { key: "TODO", label: "To Do", color: "bg-slate-200", dot: "bg-slate-400" },
  { key: "IN_PROGRESS", label: "In Progress", color: "bg-blue-100", dot: "bg-blue-500" },
  { key: "BLOCKED", label: "Blocked", color: "bg-red-100", dot: "bg-red-500" },
  { key: "COMPLETED", label: "Completed", color: "bg-emerald-100", dot: "bg-emerald-500" },
  { key: "CANCELLED", label: "Cancelled", color: "bg-slate-100", dot: "bg-slate-400" },
];

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "gray",
  MEDIUM: "blue",
  HIGH: "amber",
  URGENT: "red",
} as const;

export function TasksClient() {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view, pageSize: "100" });
      if (q) params.set("q", q);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/tasks?${params}`);
      const d = await res.json();
      setTasks(d.data?.tasks ?? []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [view, q, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/users?pageSize=100").then((r) => r.json()).then((d) => setUsers(d.data?.users ?? [])).catch(() => {});
  }, []);

  async function changeStatus(task: any, status: string) {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const d = await res.json();
    if (res.ok) load();
    else setToast({ msg: d.message || "Failed", type: "err" });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Track assignments across the organization"
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New Task</Button>}
      />

      {toast && (
        <div className={cn("mb-4 rounded-lg border px-4 py-3 text-sm", toast.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700")}>
          {toast.msg}
        </div>
      )}

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search tasks..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-44">
            <option value="">All Statuses</option>
            {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </Select>
          <div className="ml-auto flex rounded-lg border border-slate-200 p-0.5">
            {(["kanban", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn("rounded-md px-3 py-1.5 text-xs font-medium capitalize", view === v ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50")}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-5">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-96" />)}</div>
      ) : view === "kanban" ? (
        <div className="grid gap-4 overflow-x-auto md:grid-cols-5">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="min-w-56 rounded-xl bg-slate-100/70 p-3">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className={cn("h-2 w-2 rounded-full", col.dot)} />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{col.label}</p>
                  <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((t) => (
                    <TaskCard key={t.id} task={t} onMove={changeStatus} canMoveLeft={col.key !== "TODO"} canMoveRight={col.key !== "CANCELLED"} />
                  ))}
                  {colTasks.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <EmptyState icon={<CheckSquare className="h-10 w-10" />} title="No tasks found" description="Create a task or adjust your filters." />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {tasks.map((t) => (
              <li key={t.id}>
                <Link href={`/tasks/${t.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{t.title}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      <User2 className="h-3 w-3" /> {t.assignee?.name}
                      {t.dueDate && <><CalendarClock className="h-3 w-3" /> {formatDate(t.dueDate)} {isOverdue(t.dueDate) && t.status !== "COMPLETED" && <span className="text-red-600">(overdue)</span>}</>}
                    </p>
                  </div>
                  <Badge color={PRIORITY_COLORS[t.priority] as any}>{t.priority}</Badge>
                  <Badge color={t.status === "COMPLETED" ? "green" : t.status === "IN_PROGRESS" ? "blue" : t.status === "BLOCKED" ? "red" : "gray"}>{t.status.replace(/_/g, " ")}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <NewTaskModal open={createOpen} onClose={() => setCreateOpen(false)} users={users} onCreated={() => { setCreateOpen(false); load(); }} />
    </div>
  );
}

function TaskCard({ task, onMove, canMoveLeft, canMoveRight }: { task: any; onMove: (t: any, s: string) => void; canMoveLeft: boolean; canMoveRight: boolean }) {
  const nextStatus = (current: string) => (current === "TODO" ? "IN_PROGRESS" : current === "IN_PROGRESS" ? "BLOCKED" : current === "BLOCKED" ? "COMPLETED" : current === "COMPLETED" ? "CANCELLED" : "TODO");
  const prevStatus = (current: string) => (current === "CANCELLED" ? "COMPLETED" : current === "COMPLETED" ? "BLOCKED" : current === "BLOCKED" ? "IN_PROGRESS" : current === "IN_PROGRESS" ? "TODO" : "IN_PROGRESS");

  return (
    <div className="group rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/tasks/${task.id}`}>
        <p className="text-sm font-medium text-slate-800 hover:text-indigo-600">{task.title}</p>
        {task.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{task.description}</p>}
      </Link>
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: task.assignee?.avatarColor || "#6366f1" }}>
            {initials(task.assignee?.name || "?")}
          </div>
          <Badge color={PRIORITY_COLORS[task.priority] as any}>{task.priority}</Badge>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={!canMoveLeft} onClick={() => onMove(task, prevStatus(task.status))} title="Move left">←</button>
          <button className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={!canMoveRight} onClick={() => onMove(task, nextStatus(task.status))} title="Move right">→</button>
        </div>
      </div>
      {task.dueDate && task.status !== "COMPLETED" && task.status !== "CANCELLED" && (
        <p className={cn("mt-2 flex items-center gap-1 text-[11px]", isOverdue(task.dueDate) ? "text-red-600" : "text-slate-500")}>
          <CalendarClock className="h-3 w-3" /> {formatDate(task.dueDate)} {isOverdue(task.dueDate) && "· overdue"}
        </p>
      )}
    </div>
  );
}

function NewTaskModal({ open, onClose, users, onCreated }: { open: boolean; onClose: () => void; users: any[]; onCreated: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", assigneeId: "", priority: "MEDIUM", dueDate: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ title: "", description: "", assigneeId: "", priority: "MEDIUM", dueDate: "" });
      setError("");
    }
  }, [open]);

  async function save() {
    if (!form.title.trim()) return setError("Title is required.");
    if (!form.assigneeId) return setError("Assignee is required.");
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.message || "Failed to create task");
        return;
      }
      onCreated();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Task"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Create Task</Button></>}
    >
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        <Input label="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Prepare Q4 report" />
        <Textarea label="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Select label="Assignee *" value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
          <option value="">— Select —</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.employeeId})</option>)}
        </Select>
        <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </Select>
        <Input label="Due Date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
      </div>
    </Modal>
  );
}