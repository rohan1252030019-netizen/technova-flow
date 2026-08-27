"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Plus, Pencil, ChevronRight, Users, FileText, GitBranch } from "lucide-react";
import { Card, Button, Input, Textarea, Badge, EmptyState, PageHeader, Skeleton, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";

export function DepartmentsClient() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    load();
    fetch("/api/users?pageSize=100").then((r) => r.json()).then((d) => setUsers(d.data?.users ?? [])).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/departments");
      const d = await res.json();
      setDepartments(d.data?.departments ?? []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Organizational structure and department workflows"
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New Department</Button>}
      />

      {toast && (
        <div className={cn("mb-4 rounded-lg border px-4 py-3 text-sm", toast.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700")}>
          {toast.msg}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : departments.length === 0 ? (
        <Card>
          <EmptyState icon={<Building2 className="h-10 w-10" />} title="No departments" description="Create your first department." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <Card key={d.id} className="group p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <Link href={`/departments/${d.id}`} className="text-sm font-semibold text-slate-900 hover:text-indigo-600">
                      {d.name}
                    </Link>
                    <p className="text-xs text-slate-400">{d.code}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600" onClick={() => setEditTarget(d)}>
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Head: <span className="font-medium text-slate-700">{d.head?.name || "—"}</span>
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                <div>
                  <p className="text-sm font-bold text-slate-800">{d._count?.users || 0}</p>
                  <p className="flex items-center justify-center gap-1 text-[10px] text-slate-400"><Users className="h-3 w-3" /> Employees</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{d._count?.requests || 0}</p>
                  <p className="flex items-center justify-center gap-1 text-[10px] text-slate-400"><FileText className="h-3 w-3" /> Requests</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{d._count?.workflows || 0}</p>
                  <p className="flex items-center justify-center gap-1 text-[10px] text-slate-400"><GitBranch className="h-3 w-3" /> Workflows</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <DepartmentFormModal
        open={createOpen || !!editTarget}
        onClose={() => { setCreateOpen(false); setEditTarget(null); }}
        target={editTarget}
        users={users}
        onSaved={(msg) => { setCreateOpen(false); setEditTarget(null); load(); setToast({ msg, type: "ok" }); setTimeout(() => setToast(null), 3000); }}
      />
    </div>
  );
}

function DepartmentFormModal({ open, onClose, target, users, onSaved }: {
  open: boolean;
  onClose: () => void;
  target: any;
  users: any[];
  onSaved: (msg: string) => void;
}) {
  const [form, setForm] = useState({ name: "", code: "", description: "", headId: "", isActive: true });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setError("");
      setForm(target ? {
        name: target.name || "",
        code: target.code || "",
        description: target.description || "",
        headId: target.headId || "",
        isActive: target.isActive ?? true,
      } : { name: "", code: "", description: "", headId: "", isActive: true });
    }
  }, [open, target]);

  async function save() {
    setError("");
    if (!form.name.trim() || !form.code.trim()) {
      setError("Name and code are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(target ? `/api/departments/${target.id}` : "/api/departments", {
        method: target ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.message || "Failed to save");
        return;
      }
      onSaved(d.message || (target ? "Department updated" : "Department created"));
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
      title={target ? `Edit ${target.name}` : "New Department"}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>{target ? "Save Changes" : "Create"}</Button></>}
    >
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Department Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Engineering" />
          <Input label="Code *" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="ENG" />
        </div>
        <Textarea label="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          value={form.headId}
          onChange={(e) => setForm({ ...form, headId: e.target.value })}
        >
          <option value="">— No head —</option>
          {users.filter((u) => ["DEPARTMENT_HEAD", "MANAGER", "HR_ADMIN", "SUPER_ADMIN"].includes(u.role)).map((u) => (
            <option key={u.id} value={u.id}>{u.name} ({u.designation || u.role})</option>
          ))}
        </select>
      </div>
    </Modal>
  );
}