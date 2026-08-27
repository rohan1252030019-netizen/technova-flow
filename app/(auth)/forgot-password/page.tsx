"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setState("done");
        setMessage(data.message || "Reset link generated.");
        if (data.data?.resetUrl) setResetUrl(data.data.resetUrl);
      } else {
        setState("error");
        setMessage(data.message || "Something went wrong.");
      }
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white">
            TF
          </div>
          <h1 className="text-2xl font-bold text-white">Forgot Password</h1>
          <p className="mt-1 text-sm text-slate-400">We&apos;ll generate a password reset link for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
          {state === "done" && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p>{message}</p>
                {resetUrl && (
                  <a href={resetUrl} className="mt-1 block break-all font-mono text-xs underline">
                    {resetUrl}
                  </a>
                )}
                <p className="mt-1 text-xs text-emerald-400/70">(In production this link is sent by email.)</p>
              </div>
            </div>
          )}
          {state === "error" && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <Input
            label="Work Email"
            type="email"
            required
            placeholder="you@technova.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
          />
          <Button type="submit" loading={state === "loading"} className="mt-4 w-full py-2.5">
            Send Reset Link
          </Button>
          <p className="mt-4 text-center text-sm text-slate-400">
            Remembered it?{" "}
            <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}