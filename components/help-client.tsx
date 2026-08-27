"use client";

import { GitBranch, FileText, CheckSquare, Bell, ShieldCheck, BarChart3, BookOpen, UserPlus, AlertTriangle } from "lucide-react";
import { Card, Badge, PageHeader } from "@/components/ui";

const FAQS = [
  {
    q: "How do I create a request?",
    a: "Go to Requests → New Request, choose a type (leave, expense, purchase, IT service, document), fill in the details and submit. The request automatically follows the configured workflow for that type.",
  },
  {
    q: "How do approvals work?",
    a: "When a request reaches an approval step, it appears in the Approvals page of the approver assigned to that step (by role, department, or specific user). Approve, reject (reason required), send back, request changes, delegate, or escalate.",
  },
  {
    q: "What happens when an SLA is breached?",
    a: "When a step's SLA expires, the requester and approver are notified. If the step has an escalation window configured and it passes, the request is formally escalated to the configured escalation role and marked as ESCALATED.",
  },
  {
    q: "Can I cancel a request?",
    a: "Yes — the requester (or a manager) can cancel a request while it's still in progress. Cancelled requests are recorded in the audit log.",
  },
  {
    q: "How are workflows configured?",
    a: "Admins use the Workflow Builder to create a sequence of steps (approval, processing, task), configure the assignee per step, SLA hours, escalation rules, and publish. Multiple workflows can be active for different request types.",
  },
  {
    q: "Who can see analytics?",
    a: "Analytics and reports are available to roles with the analytics.view and reports.export permissions — Super Admin, HR Admin, Managers, and Finance.",
  },
];

const STEPS = [
  "Submit Request",
  "Manager Approval",
  "Department Head Approval",
  "Finance Approval",
  "HR Processing",
  "Completed",
];

export function HelpClient() {
  return (
    <div>
      <PageHeader title="Help & Documentation" description="Learn how TechNova Flow works" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <GitBranch className="h-4 w-4 text-indigo-600" /> How workflows work
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Every request type is bound to a configurable workflow. When a request is submitted, it starts at the
            first step and advances through each step as actions are completed. Approval steps can be handled by a
            role, a department, or a specific user. Each step can carry an SLA (service level agreement) and an
            escalation rule.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">{s}</span>
                {i < STEPS.length - 1 && <span className="text-slate-300">→</span>}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <BookOpen className="h-4 w-4 text-indigo-600" /> Quick start
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> Submit your first request</li>
            <li className="flex items-start gap-2"><CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> Complete assigned tasks</li>
            <li className="flex items-start gap-2"><Bell className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> Track notifications</li>
            <li className="flex items-start gap-2"><BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> Review analytics</li>
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Frequently Asked Questions" className="lg:col-span-2">
          <div className="divide-y divide-slate-100">
            {FAQS.map((f) => (
              <div key={f.q} className="px-5 py-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <span className="text-indigo-500">Q.</span> {f.q}
                </p>
                <p className="mt-1 pl-6 text-sm text-slate-600">{f.a}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-indigo-600" /> Security model
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Passwords are hashed with bcrypt, sessions use signed JWT cookies, all API endpoints verify
              authentication and authorization server-side, and every action is recorded in an immutable audit log.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge color="green">RBAC</Badge>
              <Badge color="blue">Audit Logs</Badge>
              <Badge color="purple">Rate Limited</Badge>
              <Badge color="amber">SLA Engine</Badge>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <UserPlus className="h-4 w-4 text-indigo-600" /> Need help?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Contact your department head or the HR admin for account issues. Super Admin can access the full
              audit trail at any time.
            </p>
          </Card>

          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-700">
              <AlertTriangle className="h-4 w-4" /> SLA awareness
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Each approval step has a service-level agreement. Watch the due dates on your pending approvals to
              avoid breaches and escalations.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}