"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, FileText, AlertCircle } from "lucide-react";
import { Card, Button, Input, Select, Textarea, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";

const TYPE_META: Record<string, { label: string; fields: "none" | "amount" | "leave" }> = {
  LEAVE: { label: "Leave Request", fields: "leave" },
  EXPENSE: { label: "Expense Reimbursement", fields: "amount" },
  REIMBURSEMENT: { label: "Reimbursement", fields: "amount" },
  PURCHASE: { label: "Purchase Request", fields: "amount" },
  IT_SERVICE: { label: "IT Service Request", fields: "none" },
  DOCUMENT_APPROVAL: { label: "Document Approval", fields: "none" },
  CUSTOM: { label: "Custom Request", fields: "none" },
};

export function NewRequestClient() {
  const router = useRouter();
  const [form, setForm] = useState({
    type: "LEAVE",
    title: "",
    description: "",
    priority: "MEDIUM",
    amount: "",
    currency: "INR",
    leaveDays: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.title.trim().length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }
    if (TYPE_META[form.type]?.fields === "amount" && (!form.amount || Number(form.amount) <= 0)) {
      setError("A valid amount is required for this request type.");
      return;
    }
    if (form.type === "LEAVE" && (!form.leaveDays || Number(form.leaveDays) <= 0)) {
      setError("Number of leave days is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          title: form.title,
          description: form.description,
          priority: form.priority,
          amount: TYPE_META[form.type]?.fields === "amount" ? Number(form.amount) : undefined,
          currency: form.currency,
          metadata: form.type === "LEAVE" ? { leaveDays: Number(form.leaveDays) } : undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.message || "Failed to submit request");
        return;
      }
      router.push(`/requests/${d.data.request.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const meta = TYPE_META[form.type];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New Request" description="Submit a request to start a workflow" />

      <Card className="p-6">
        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Request Type *" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, amount: "", leaveDays: "" })}>
              {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
            <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </Select>
          </div>

          <Input label="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={`e.g. ${form.type === "LEAVE" ? "Annual Leave — Goa Trip" : form.type === "PURCHASE" ? "MacBook Pro for new hire" : form.type === "IT_SERVICE" ? "Laptop screen replacement" : "Describe your request"}`} />

          <Textarea label="Description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Provide additional details, dates, vendors, links, etc." />

          {meta.fields === "amount" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Amount *" type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="10000" />
              <Select label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </Select>
            </div>
          )}

          {meta.fields === "leave" && (
            <Input label="Number of Days *" type="number" min={0.5} step={0.5} value={form.leaveDays} onChange={(e) => setForm({ ...form, leaveDays: e.target.value })} placeholder="5" hint="Half days supported" />
          )}

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <FileText className="h-3.5 w-3.5" /> What happens next?
            </p>
            <p className="mt-1.5 text-sm text-slate-600">
              Your request will automatically follow the configured <strong>{form.type.replace(/_/g, " ").toLowerCase()}</strong> workflow, moving through each approval step until completion. You can attach documents after submission.
            </p>
          </div>

          <Button type="submit" loading={submitting} className="w-full py-2.5">
            <Send className="h-4 w-4" /> Submit Request
          </Button>
        </form>
      </Card>
    </div>
  );
}