"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // Read as text first: a failed request can return an empty or HTML body,
      // and calling res.json() on it would throw and mask the real status.
      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!res.ok || !data?.success) {
        setError(data?.message || `Login failed (server returned ${res.status})`);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Cannot reach the server. Check that the app and database are running, then try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-purple-600/10 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-lg shadow-indigo-600/30">
            TF
          </div>
          <h1 className="text-2xl font-bold text-white">{process.env.NEXT_PUBLIC_APP_NAME || "TechNova Flow"}</h1>
          <p className="mt-1 text-sm text-slate-400">Enterprise Workflow Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Sign in to your account</h2>
          <p className="mb-5 mt-0.5 text-sm text-slate-400">Welcome back to TechNova Global.</p>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Work Email"
              type="email"
              required
              placeholder="you@technova.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-400">
                <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-800" />
                Remember me
              </label>
              <Link href="/forgot-password" className="font-medium text-indigo-400 hover:text-indigo-300">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" loading={loading} className="w-full py-2.5">
              Sign In
            </Button>
          </div>
        </form>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-center text-xs font-medium uppercase tracking-wider text-slate-500">Demo Accounts</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs text-slate-400">
            <button type="button" onClick={() => { setEmail("admin@technova.com"); setPassword("Password@123"); }} className="rounded-lg border border-slate-700 px-2 py-1.5 hover:border-indigo-500 hover:text-indigo-300">admin@technova.com</button>
            <button type="button" onClick={() => { setEmail("hr@technova.com"); setPassword("Password@123"); }} className="rounded-lg border border-slate-700 px-2 py-1.5 hover:border-indigo-500 hover:text-indigo-300">hr@technova.com</button>
            <button type="button" onClick={() => { setEmail("finance@technova.com"); setPassword("Password@123"); }} className="rounded-lg border border-slate-700 px-2 py-1.5 hover:border-indigo-500 hover:text-indigo-300">finance@technova.com</button>
            <button type="button" onClick={() => { setEmail("rahul.kumar@technova.com"); setPassword("Password@123"); }} className="rounded-lg border border-slate-700 px-2 py-1.5 hover:border-indigo-500 hover:text-indigo-300">rahul.kumar@technova.com</button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">All demo accounts use password: <span className="font-mono text-slate-400">Password@123</span></p>
        </div>
      </div>
    </div>
  );
}