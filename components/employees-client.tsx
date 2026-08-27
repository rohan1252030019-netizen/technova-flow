"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Users, Plus, Search, ChevronLeft, ChevronRight, Pencil, UserX, RefreshCw } from "lucide-react";
import { Card, Button, Input, Select, Badge, Table, EmptyState, Modal, ConfirmDialog, PageHeader, Skeleton } from "@/components/ui";
import { cn, formatDate, initials } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  HR_ADMIN: "HR Admin",
  MANAGER: "Manager",
  DEPARTMENT_HEAD: "Dept Head",
  FINANCE: "Finance",
  EMPLOYEE: "Employee",
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "purple",
  HR_ADMIN: "blue",
  MANAGER: "amber",
  DEPARTMENT_HEAD: "cyan",
  FINANCE: "green",
  EMPLOYEE: "gray",
} as const;

export function EmployeesClient() {
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<any>(null);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const pageSize = 12;

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (q) params.set("q", q);
      if (deptFilter) params.set("departmentId", deptFilter);
      if (roleFilter) params.set("role", roleFilter);
      const res = await fetch(`/api/users?${params}`);
      const d = await res.json();
      setUsers(d.data?.users ?? []);
      setTotal(d.data?.total ?? 0);
    } catch {
      showToast("Failed to load employees", "err");
    } finally {
      setLoading(false);
    }
  }, [page, q, deptFilter, roleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((d) => setDepartments(d.data?.departments ?? []))
      .catch(() => {});
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Manage employees, roles and reporting lines"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Add Employee
          </Button>
        }
      />

      {toast && (
        <div className={cn("mb-4 rounded-lg border px-4 py-3 text-sm", toast.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700")}>
          {toast.msg}
        </div>
      )}

      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search by name, email, employee ID..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <Select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}>
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
          <Select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="">All Roles</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title="No employees found"
            description="Try adjusting your filters or add a new employee."
            action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Add Employee</Button>}
          />
        ) : (
          <>
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((u) => (
                <div key={u.id} className="group rounded-xl border border-slate-200 p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: u.avatarColor || "#6366f1" }}>
                      {initials(u.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/employees/${u.id}`} className="truncate text-sm font-semibold text-slate-900 hover:text-indigo-600">
                        {u.name}
                      </Link>
                      <p className="truncate text-xs text-slate-500">{u.employeeId} · {u.designation || "—"}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge color={ROLE_COLORS[u.role] as any}>{ROLE_LABELS[u.role] || u.role}</Badge>
                        <Badge color={u.status === "ACTIVE" ? "green" : "gray"}>{u.status}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600" onClick={() => setEditTarget(u)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => setDeactivateTarget(u)} title="Deactivate">
                        <UserX className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                    <div>
                      <p className="text-slate-400">Department</p>
                      <p className="font-medium text-slate-700">{u.department?.name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Manager</p>
                      <p className="truncate font-medium text-slate-700">{u.manager?.name || "—"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <p className="text-xs text-slate-500">
                Showing {users.length} of {total} employees
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 text-xs text-slate-600">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <EmployeeFormModal
        open={createOpen || !!editTarget}
        onClose={() => { setCreateOpen(false); setEditTarget(null); }}
        target={editTarget}
        departments={departments}
        managers={users.filter((u) => ["MANAGER", "DEPARTMENT_HEAD", "HR_ADMIN", "SUPER_ADMIN", "FINANCE"].includes(u.role))}
        onSaved={(msg) => { setCreateOpen(false); setEditTarget(null); load(); showToast(msg); }}
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={async () => {
          if (!deactivateTarget) return;
          setActing(true);
          try {
            const res = await fetch(`/api/users/${deactivateTarget.id}`, { method: "DELETE" });
            const d = await res.json();
            if (res.ok) { showToast(d.message || "Employee deactivated"); load(); }
            else showToast(d.message || "Failed to deactivate", "err");
          } finally {
            setActing(false);
            setDeactivateTarget(null);
          }
        }}
        title="Deactivate employee"
        message={`Deactivate ${deactivateTarget?.name}? They will no longer be able to sign in, but their history is preserved.`}
        confirmText={acting ? "Deactivating..." : "Deactivate"}
        danger
      />
    </div>
  );
}

function EmployeeFormModal({ open, onClose, target, departments, managers, onSaved }: {
  open: boolean;
  onClose: () => void;
  target: any;
  departments: any[];
  managers: any[];
  onSaved: (msg: string) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", employeeId: "", phone: "", designation: "", departmentId: "", managerId: "", role: "EMPLOYEE", joiningDate: "", status: "ACTIVE" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setError("");
      setForm(target ? {
        name: target.name || "",
        email: target.email || "",
        employeeId: target.employeeId || "",
        phone: target.phone || "",
        designation: target.designation || "",
        departmentId: target.departmentId || "",
        managerId: target.managerId || "",
        role: target.role || "EMPLOYEE",
        joiningDate: target.joiningDate ? new Date(target.joiningDate).toISOString().slice(0, 10) : "",
        status: target.status || "ACTIVE",
      } : { name: "", email: "", employeeId: "", phone: "", designation: "", departmentId: "", managerId: "", role: "EMPLOYEE", joiningDate: "", status: "ACTIVE" });
    }
  }, [open, target]);

  async function save() {
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.employeeId.trim()) {
      setError("Name, email and employee ID are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(target ? `/api/users/${target.id}` : "/api/users", {
        method: target ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.message || "Failed to save");
        return;
      }
      onSaved(d.message || (target ? "Employee updated" : "Employee created"));
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
      title={target ? `Edit ${target.name}` : "Add Employee"}
      wide
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>{target ? "Save Changes" : "Create Employee"}</Button>
        </>
      }
    >
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
        <Input label="Work Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@technova.com" disabled={!!target} />
        <Input label="Employee ID *" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} placeholder="TN-0037" disabled={!!target} />
        <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
        <Input label="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Software Engineer" />
        <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select label="Department" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
          <option value="">— None —</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <Select label="Manager" value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
          <option value="">— None —</option>
          {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
        <Input label="Joining Date" type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
        <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </Select>
      </div>
      {!target && <p className="mt-4 text-xs text-slate-500">New employees receive the default password <span className="font-mono">Password@123</span> and should change it after first sign in.</p>}
    </Modal>
  );
}