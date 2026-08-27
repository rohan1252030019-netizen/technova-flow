"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, KeyRound, Mail, Phone, Building2, CalendarDays, User2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, Badge, Button, Input, PageHeader, Skeleton } from "@/components/ui";
import { cn, formatDate, initials } from "@/lib/utils";

export function ProfileClient() {
  const [profile, setProfile] = useState<any>(null);
  const [pass, setPass] = useState({ current: "", next: "", confirm: "" });
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.user) {
          fetch(`/api/users/${d.data.user.id}`)
            .then((r) => r.json())
            .then((res) => setProfile(res.data?.profile ?? d.data.user))
            .catch(() => setProfile(d.data.user));
        }
      })
      .catch(() => {});
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (pass.next.length < 8) {
      setMsg({ type: "err", text: "New password must be at least 8 characters." });
      return;
    }
    if (pass.next !== pass.confirm) {
      setMsg({ type: "err", text: "Passwords do not match." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pass.current, newPassword: pass.next }),
      });
      const d = await res.json();
      setMsg({ type: res.ok ? "ok" : "err", text: d.message || (res.ok ? "Password changed" : "Failed") });
      if (res.ok) setPass({ current: "", next: "", confirm: "" });
    } catch {
      setMsg({ type: "err", text: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return <Skeleton className="h-96" />;

  const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    HR_ADMIN: "HR Admin",
    MANAGER: "Manager",
    DEPARTMENT_HEAD: "Department Head",
    FINANCE: "Finance",
    EMPLOYEE: "Employee",
  };

  return (
    <div>
      <PageHeader title="My Profile" description="Your account information and security settings" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full text-xl font-bold text-white" style={{ backgroundColor: profile.avatarColor || "#6366f1" }}>
              {initials(profile.name)}
            </div>
            <h1 className="text-lg font-bold text-slate-900">{profile.name}</h1>
            <p className="text-sm text-slate-500">{profile.designation || "Employee"}</p>
            <div className="mt-3 flex justify-center gap-2">
              <Badge color="indigo">{ROLE_LABELS[profile.role] || profile.role}</Badge>
              <Badge color={profile.status === "ACTIVE" ? "green" : "red"}>{profile.status}</Badge>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-400">{profile.employeeId}</p>
          </div>
          <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm">
            <div className="flex items-center gap-3 text-slate-600"><Mail className="h-4 w-4 text-slate-400" /> {profile.email}</div>
            <div className="flex items-center gap-3 text-slate-600"><Phone className="h-4 w-4 text-slate-400" /> {profile.phone || "—"}</div>
            <div className="flex items-center gap-3 text-slate-600"><Building2 className="h-4 w-4 text-slate-400" /> {profile.department?.name || "—"}</div>
            <div className="flex items-center gap-3 text-slate-600"><User2 className="h-4 w-4 text-slate-400" /> Manager: {profile.manager?.name || "—"}</div>
            <div className="flex items-center gap-3 text-slate-600"><CalendarDays className="h-4 w-4 text-slate-400" /> Joined {formatDate(profile.joiningDate)}</div>
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card className="p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <KeyRound className="h-4 w-4 text-indigo-600" /> Change Password
            </h3>
            {msg && (
              <div className={cn("mt-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm", msg.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700")}>
                {msg.type === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>{msg.text}</span>
              </div>
            )}
            <form onSubmit={changePassword} className="mt-4 space-y-4">
              <Input label="Current Password" type="password" required value={pass.current} onChange={(e) => setPass({ ...pass, current: e.target.value })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="New Password" type="password" required minLength={8} value={pass.next} onChange={(e) => setPass({ ...pass, next: e.target.value })} hint="Minimum 8 characters" />
                <Input label="Confirm New Password" type="password" required minLength={8} value={pass.confirm} onChange={(e) => setPass({ ...pass, confirm: e.target.value })} />
              </div>
              <Button type="submit" loading={saving}>Update Password</Button>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-indigo-600" /> Role & Access
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Your access is governed by the <strong>{ROLE_LABELS[profile.role] || profile.role}</strong> role.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                "Create and track requests",
                "Comment and upload documents",
                "Receive workflow notifications",
                "Approve requests assigned to your role",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> {f}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}