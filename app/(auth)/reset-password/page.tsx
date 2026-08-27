"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { CheckCircle2, AlertCircle } from "lucide-react";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setState("error");
      setMessage("Reset token is missing. Use the link from your email.");
      return;
    }
    if (password.length < 8) {
      setState("error");
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setState("error");
      setMessage("Passwords do not match.");
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setState("done");
        setMessage("Password reset successful.");
        setTimeout(() => router.push("/login"), 1500);
      } else {
        setState("error");
        setMessage(data.message || "Reset failed.");
      }
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
      {state === "done" && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message} Redirecting to sign in...</span>
        </div>
      )}
      {state === "error" && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="space-y-4">
        <Input
          label="New Password"
          type="password"
          required
          minLength={8}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
        />
        <Input
          label="Confirm Password"
          type="password"
          required
          minLength={8}
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
        />
        <Button type="submit" loading={state === "loading"} className="w-full py-2.5">
          Reset Password
        </Button>
        <p className="text-center text-sm text-slate-400">
          <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
            Back to sign in
          </Link>
        </p>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white">
            TF
          </div>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="mt-1 text-sm text-slate-400">Choose a new password for your account.</p>
        </div>
        <Suspense fallback={<p className="text-center text-sm text-slate-400">Loading...</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}