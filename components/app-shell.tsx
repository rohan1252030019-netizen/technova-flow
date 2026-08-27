"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  GitBranch,
  Users,
  Building2,
  BarChart3,
  Bell,
  Search,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Settings,
  User as UserIcon,
  ChevronDown,
  ClipboardList,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { hasPermission, PermissionKey } from "@/lib/rbac";
import { Role } from "@/app/generated/prisma/client";

export type NavUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId: string | null;
  isAdmin: boolean;
};

type NavItemConfig = {
  href: string;
  label: string;
  icon: any;
  permission?: PermissionKey;
};

const NAV_ITEMS: NavItemConfig[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/requests", label: "Requests", icon: FileText, permission: "requests.view" },
  { href: "/approvals", label: "Approvals", icon: ClipboardList, permission: "approvals.approve" },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, permission: "tasks.view" },
  { href: "/workflows", label: "Workflows", icon: GitBranch, permission: "workflows.view" },
  { href: "/employees", label: "Employees", icon: Users, permission: "users.view" },
  { href: "/departments", label: "Departments", icon: Building2, permission: "departments.view" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, permission: "analytics.view" },
];

const ADMIN_ITEMS: NavItemConfig[] = [
  { href: "/audit-logs", label: "Audit Logs", icon: ShieldCheck, permission: "audit.view" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings.manage" },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  HR_ADMIN: "HR Admin",
  MANAGER: "Manager",
  DEPARTMENT_HEAD: "Department Head",
  FINANCE: "Finance",
  EMPLOYEE: "Employee",
};

export function AppShell({ user, children }: { user: NavUser; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{ type: string; id: string; label: string; sub: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/notifications/unread-count")
      .then((r) => r.json())
      .then((d) => d.data && setUnread(d.data.count))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  async function doLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function runSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`);
      const d = await res.json();
      setSearchResults(d.data?.results ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function searchHref(r: { type: string; id: string }) {
    const base: Record<string, string> = {
      employee: "/employees/",
      request: "/requests/",
      task: "/tasks/",
      department: "/departments/",
      workflow: "/workflows/",
    };
    return base[r.type] ? base[r.type] + r.id : "/";
  }

  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const Sidebar = (
    <div className="flex h-full flex-col bg-slate-900">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
          TF
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{process.env.NEXT_PUBLIC_APP_NAME || "TechNova Flow"}</p>
          <p className="text-[11px] text-slate-400">Enterprise Workflows</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV_ITEMS.filter((item) => !item.permission || hasPermission(user.role as Role, item.permission)).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
        {ADMIN_ITEMS.some((item) => !item.permission || hasPermission(user.role as Role, item.permission)) && (
          <>
            <p className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Administration
            </p>
            {ADMIN_ITEMS.filter((item) => !item.permission || hasPermission(user.role as Role, item.permission)).map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  )}
                >
                  <item.icon className="h-4.5 w-4.5" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>
      <div className="border-t border-slate-800 px-3 py-3">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === "/profile" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          )}
        >
          <UserIcon className="h-4.5 w-4.5" />
          My Profile
        </Link>
        <Link
          href="/notifications"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === "/notifications" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          )}
        >
          <Bell className="h-4.5 w-4.5" />
          Notifications
          {unread > 0 && (
            <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </Link>
        <button
          onClick={doLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
        >
          <LogOut className="h-4.5 w-4.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="hidden w-60 shrink-0 lg:block">{Sidebar}</aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-2xl">{Sidebar}</aside>
          <button
            className="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative hidden flex-1 sm:block sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => runSearch(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              placeholder="Search employees, requests, tasks, workflows..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {searchOpen && (query.trim().length >= 2 || searching) && (
              <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                {searching ? (
                  <p className="px-4 py-3 text-sm text-slate-500">Searching...</p>
                ) : searchResults.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-500">No results found.</p>
                ) : (
                  <ul className="max-h-80 overflow-y-auto py-1">
                    {searchResults.map((r, i) => (
                      <li key={i}>
                        <Link
                          href={searchHref(r)}
                          className="block px-4 py-2.5 hover:bg-slate-50"
                          onClick={() => setQuery("")}
                        >
                          <p className="text-sm font-medium text-slate-800">{r.label}</p>
                          <p className="text-xs text-slate-500">
                            {r.type} · {r.sub}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setProfileOpen(false);
                }}
                className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800">Notifications</p>
                    <button
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      onClick={async () => {
                        await fetch("/api/notifications/read-all", { method: "POST" });
                        setUnread(0);
                      }}
                    >
                      Mark all read
                    </button>
                  </div>
                  <NotificationPreview onLoaded={setUnread} />
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {initials}
                </div>
                <div className="hidden text-left md:block">
                  <p className="text-sm font-medium leading-tight text-slate-800">{user.name}</p>
                  <p className="text-[11px] leading-tight text-slate-500">{ROLE_LABELS[user.role] ?? user.role}</p>
                </div>
                <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    <UserIcon className="h-4 w-4" /> My Profile
                  </Link>
                  <Link href="/notifications" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    <Bell className="h-4 w-4" /> Notifications
                  </Link>
                  <Link href="/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                  <Link href="/help" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    <HelpCircle className="h-4 w-4" /> Help & Docs
                  </Link>
                  <div className="border-t border-slate-100">
                    <button
                      onClick={doLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function NotificationPreview({ onLoaded }: { onLoaded: (n: number) => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications?limit=6")
      .then((r) => r.json())
      .then((d) => {
        setItems(d.data?.notifications ?? []);
        onLoaded(d.data?.unread ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="px-4 py-6 text-center text-sm text-slate-500">Loading...</p>;
  }
  if (items.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications yet.</p>;
  }
  return (
    <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
      {items.map((n) => (
        <li key={n.id}>
          <Link href={n.link || "/notifications"} className="block px-4 py-3 hover:bg-slate-50">
            <div className="flex items-start gap-2">
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-slate-200" : "bg-indigo-600")} />
              <div className="min-w-0">
                <p className={cn("text-sm", n.read ? "text-slate-600" : "font-medium text-slate-800")}>{n.title}</p>
                {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.body}</p>}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}