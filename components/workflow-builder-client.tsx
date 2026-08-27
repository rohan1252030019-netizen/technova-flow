"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, Plus, Trash2, ArrowUp, Save, CheckCircle2, GitBranch, ChevronLeft } from "lucide-react";
import { Card, Button, Input, Select, Textarea, Badge, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import Link from "next/link";

type StepForm = {
  id?: string;
  name: string;
  description?: string;
  stepType: "APPROVAL" | "PROCESSING" | "TASK";
  assigneeType: "ROLE" | "DEPARTMENT" | "USER";
  assignedRole: string;
  assignedDepartmentId: string;
  assignedUserId: string;
  requiresApproval: boolean;
  allowRejection: boolean;
  requiresComment: boolean;
  slaHours: string;
  escalationHours: string;
  escalationRole: string;
  isFinal: boolean;
};

const ROLE_OPTIONS = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "HR_ADMIN", label: "HR Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "DEPARTMENT_HEAD", label: "Department Head" },
  { value: "FINANCE", label: "Finance" },
  { value: "EMPLOYEE", label: "Employee" },
];

const EMPTY_STEP: StepForm = {
  name: "",
  description: "",
  stepType: "APPROVAL",
  assigneeType: "ROLE",
  assignedRole: "MANAGER",
  assignedDepartmentId: "",
  assignedUserId: "",
  requiresApproval: true,
  allowRejection: true,
  requiresComment: false,
  slaHours: "24",
  escalationHours: "48",
  escalationRole: "DEPARTMENT_HEAD",
  isFinal: false,
};

export function WorkflowBuilderClient({ workflowId }: { workflowId?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("CUSTOM");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [steps, setSteps] = useState<StepForm[]>([{ ...EMPTY_STEP, name: "Submit Request", stepType: "PROCESSING", assigneeType: "ROLE", requiresApproval: false }]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(!!workflowId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/departments").then((r) => r.json()).catch(() => ({ data: { departments: [] } })),
      fetch("/api/users?pageSize=100").then((r) => r.json()).catch(() => ({ data: { users: [] } })),
    ]).then(([d, u]) => {
      setDepartments(d.data?.departments ?? []);
      setEmployees(u.data?.users ?? []);
    });
  }, []);

  useEffect(() => {
    if (!workflowId) return;
    fetch(`/api/workflows/${workflowId}`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) return;
        const w = res.data.workflow;
        setName(w.name);
        setDescription(w.description || "");
        setTrigger(w.trigger);
        setDepartmentId(w.departmentId || "");
        setStatus(w.status);
        setSteps(
          w.steps.length
            ? w.steps.map((s: any) => ({
                id: s.id,
                name: s.name,
                description: s.description || "",
                stepType: s.stepType,
                assigneeType: s.assigneeType,
                assignedRole: s.assignedRole || "",
                assignedDepartmentId: s.assignedDepartmentId || "",
                assignedUserId: s.assignedUserId || "",
                requiresApproval: s.requiresApproval,
                allowRejection: s.allowRejection,
                requiresComment: s.requiresComment,
                slaHours: s.slaHours != null ? String(s.slaHours) : "",
                escalationHours: s.escalationHours != null ? String(s.escalationHours) : "",
                escalationRole: s.escalationRole || "DEPARTMENT_HEAD",
                isFinal: s.isFinal,
              }))
            : [{ ...EMPTY_STEP, name: "Submit Request", stepType: "PROCESSING", requiresApproval: false }]
        );
      })
      .catch(() => setError("Failed to load workflow"))
      .finally(() => setLoading(false));
  }, [workflowId]);

  function updateStep(index: number, patch: Partial<StepForm>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addStep() {
    setSteps((prev) => [...prev, { ...EMPTY_STEP, name: `Step ${prev.length + 1}` }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function moveStep(index: number, dir: -1 | 1) {
    setSteps((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save(publish: boolean) {
    setError("");
    if (!name.trim()) {
      setError("Workflow name is required.");
      return;
    }
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].name.trim()) {
        setError(`Step ${i + 1} needs a name.`);
        return;
      }
    }
    setSaving(true);
    try {
      const url = workflowId ? `/api/workflows/${workflowId}` : "/api/workflows";
      const res = await fetch(url, {
        method: workflowId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          trigger,
          departmentId: departmentId || null,
          status: publish ? "ACTIVE" : status,
          steps: steps.map((s) => ({
            ...s,
            slaHours: s.slaHours ? Number(s.slaHours) : null,
            escalationHours: s.escalationHours ? Number(s.escalationHours) : null,
          })),
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.message || "Failed to save");
        return;
      }
      setToast({ msg: publish ? "Workflow published successfully" : "Workflow saved", type: "ok" });
      setTimeout(() => router.push("/workflows"), 800);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}</div>;
  }

  return (
    <div>
      <Link href="/workflows" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
        <ChevronLeft className="h-4 w-4" /> Back to Workflows
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{workflowId ? "Edit Workflow" : "New Workflow"}</h1>
          <p className="mt-1 text-sm text-slate-500">Design the approval chain and configure each step</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save(false)} loading={saving}>
            <Save className="h-4 w-4" /> Save Draft
          </Button>
          <Button onClick={() => save(true)} loading={saving}>
            <CheckCircle2 className="h-4 w-4" /> Publish
          </Button>
        </div>
      </div>

      {toast && (
        <div className={cn("mb-4 rounded-lg border px-4 py-3 text-sm", toast.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700")}>
          {toast.msg}
        </div>
      )}
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Card className="mb-4 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Workflow Name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Travel Approval Workflow" />
          <Select label="Trigger (Request Type)" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
            <option value="LEAVE">Leave Request</option>
            <option value="EXPENSE">Expense Reimbursement</option>
            <option value="PURCHASE">Purchase Request</option>
            <option value="IT_SERVICE">IT Service Request</option>
            <option value="DOCUMENT_APPROVAL">Document Approval</option>
            <option value="CUSTOM">Custom</option>
          </Select>
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this workflow handle?" className="md:col-span-2" rows={2} />
          <Select label="Department (optional)" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
      </Card>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <StepEditor
            key={step.id || index}
            index={index}
            step={step}
            departments={departments}
            employees={employees}
            total={steps.length}
            onUpdate={(patch) => updateStep(index, patch)}
            onRemove={() => removeStep(index)}
            onMove={(dir) => moveStep(index, dir)}
          />
        ))}
      </div>

      <Button variant="outline" onClick={addStep} className="mt-4 w-full border-dashed py-3">
        <Plus className="h-4 w-4" /> Add Step
      </Button>

      <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
        <p className="text-sm font-medium text-indigo-900">Workflow preview</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium", s.stepType === "APPROVAL" ? "border-amber-200 bg-amber-50 text-amber-700" : s.stepType === "TASK" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700")}>
                {s.name || `Step ${i + 1}`}
              </div>
              {i < steps.length - 1 && <ArrowDown className="h-4 w-4 text-slate-400" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepEditor({ index, step, departments, employees, total, onUpdate, onRemove, onMove }: {
  index: number;
  step: StepForm;
  departments: any[];
  employees: any[];
  total: number;
  onUpdate: (patch: Partial<StepForm>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="p-0">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white",
          step.stepType === "APPROVAL" ? "bg-amber-500" : step.stepType === "TASK" ? "bg-blue-500" : "bg-slate-500"
        )}>
          {index + 1}
        </div>
        <button className="min-w-0 flex-1 text-left" onClick={() => setExpanded(!expanded)}>
          <p className="truncate text-sm font-semibold text-slate-800">{step.name || `Step ${index + 1}`}</p>
          <p className="text-xs text-slate-500">
            {step.stepType} · {step.assigneeType === "ROLE" ? ROLE_OPTIONS.find((r) => r.value === step.assignedRole)?.label || "Any role" : step.assigneeType === "DEPARTMENT" ? "Department" : "Specific user"}
            {step.slaHours ? ` · SLA ${step.slaHours}h` : ""}
          </p>
        </button>
        <div className="flex items-center gap-1">
          <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp className="h-4 w-4" /></button>
          <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30" disabled={index === total - 1} onClick={() => onMove(1)}><ArrowDown className="h-4 w-4" /></button>
          <button className="rounded-md p-1.5 text-red-500 hover:bg-red-50" onClick={onRemove}><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      {expanded && (
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Step Name *" value={step.name} onChange={(e) => onUpdate({ name: e.target.value })} placeholder="e.g. Manager Approval" />
          <Input label="Description" value={step.description || ""} onChange={(e) => onUpdate({ description: e.target.value })} placeholder="What happens in this step?" />
          <Select label="Step Type" value={step.stepType} onChange={(e) => onUpdate({ stepType: e.target.value as any })}>
            <option value="APPROVAL">Approval</option>
            <option value="PROCESSING">Processing</option>
            <option value="TASK">Task</option>
          </Select>
          <Select label="Assignee Type" value={step.assigneeType} onChange={(e) => onUpdate({ assigneeType: e.target.value as any })}>
            <option value="ROLE">By Role</option>
            <option value="DEPARTMENT">By Department</option>
            <option value="USER">Specific User</option>
          </Select>
          {step.assigneeType === "ROLE" && (
            <Select label="Assigned Role" value={step.assignedRole} onChange={(e) => onUpdate({ assignedRole: e.target.value })}>
              {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Select>
          )}
          {step.assigneeType === "DEPARTMENT" && (
            <Select label="Assigned Department" value={step.assignedDepartmentId} onChange={(e) => onUpdate({ assignedDepartmentId: e.target.value })}>
              <option value="">— Select —</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          )}
          {step.assigneeType === "USER" && (
            <Select label="Assigned User" value={step.assignedUserId} onChange={(e) => onUpdate({ assignedUserId: e.target.value })}>
              <option value="">— Select —</option>
              {employees.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.employeeId})</option>)}
            </Select>
          )}
          <Input label="SLA (hours)" type="number" min={1} value={step.slaHours} onChange={(e) => onUpdate({ slaHours: e.target.value })} placeholder="24" />
          <Input label="Escalation (hours)" type="number" min={1} value={step.escalationHours} onChange={(e) => onUpdate({ escalationHours: e.target.value })} placeholder="48" />
          <Select label="Escalate To" value={step.escalationRole} onChange={(e) => onUpdate({ escalationRole: e.target.value })}>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>

          <div className="flex flex-wrap gap-4 sm:col-span-2 lg:col-span-3">
            <Toggle label="Requires approval" checked={step.requiresApproval} onChange={(v) => onUpdate({ requiresApproval: v })} />
            <Toggle label="Allows rejection" checked={step.allowRejection} onChange={(v) => onUpdate({ allowRejection: v })} />
            <Toggle label="Comment required" checked={step.requiresComment} onChange={(v) => onUpdate({ requiresComment: v })} />
            <Toggle label="Final step" checked={step.isFinal} onChange={(v) => onUpdate({ isFinal: v })} />
          </div>
        </div>
      )}
    </Card>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn("relative h-5 w-9 rounded-full transition-colors", checked ? "bg-indigo-600" : "bg-slate-300")}
      >
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", checked ? "left-4.5" : "left-0.5")} />
      </button>
      {label}
    </label>
  );
}