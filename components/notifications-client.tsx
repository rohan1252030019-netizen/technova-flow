"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, RefreshCw } from "lucide-react";
import { Card, Badge, Button, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { cn, formatRelative } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  NEW_REQUEST: "blue",
  APPROVAL_REQUIRED: "amber",
  REQUEST_APPROVED: "green",
  REQUEST_REJECTED: "red",
  REQUEST_RETURNED: "amber",
  TASK_ASSIGNED: "indigo",
  TASK_DEADLINE: "amber",
  TASK_OVERDUE: "red",
  SLA_BREACHED: "red",
  ESCALATION: "red",
  WORKFLOW_COMPLETED: "green",
  REQUEST_CANCELLED: "gray",
  COMMENT_ADDED: "blue",
  SYSTEM: "gray",
} as const;

export function NotificationsClient() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/notifications?limit=50")
      .then((r) => r.json())
      .then((d) => {
        setNotifications(d.data?.notifications ?? []);
        setUnread(d.data?.unread ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function markRead(id?: string) {
    await fetch("/api/notifications/read-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={`${unread} unread notification${unread === 1 ? "" : "s"}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => markRead()} disabled={unread === 0}>
              <CheckCheck className="h-4 w-4" /> Mark All Read
            </Button>
            <Button variant="ghost" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        }
      />

      <Card>
        {loading ? (
          <div className="space-y-3 p-5">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : notifications.length === 0 ? (
          <EmptyState icon={<Bell className="h-10 w-10" />} title="No notifications" description="You're all caught up." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <li key={n.id} className={cn("flex items-start gap-3 px-5 py-3.5", !n.read && "bg-indigo-50/40")}>
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-slate-200" : "bg-indigo-600")} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("text-sm", n.read ? "text-slate-600" : "font-semibold text-slate-900")}>{n.title}</p>
                    <Badge color={(TYPE_COLORS[n.type] || "gray") as any}>{n.type.replace(/_/g, " ")}</Badge>
                  </div>
                  {n.body && <p className="mt-0.5 text-sm text-slate-500">{n.body}</p>}
                  <p className="mt-0.5 text-xs text-slate-400">{formatRelative(n.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {n.link && (
                    <Link href={n.link} className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
                      View
                    </Link>
                  )}
                  {!n.read && (
                    <button onClick={() => markRead(n.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600" title="Mark read">
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}