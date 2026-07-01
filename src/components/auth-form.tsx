"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui";
import { apiFetch } from "@/lib/client-api";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(event.currentTarget);

    try {
      await apiFetch(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
          displayName: String(form.get("displayName") ?? "") || undefined
        })
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-parchment-base px-5 py-10 text-on-surface">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-memory-border bg-white p-6 soft-shadow">
        <p className="ui-label mb-2 text-intelligence-teal">Codex Story AI</p>
        <h1 className="headline-serif text-3xl text-primary">{isSignup ? "Create your local account" : "Welcome back"}</h1>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          {isSignup ? "The first account claims existing local stories." : "Sign in to continue writing."}
        </p>

        {error ? <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</div> : null}

        {isSignup ? (
          <label className="mt-5 block">
            <span className="ui-label mb-2 block text-on-surface-variant">Display Name</span>
            <input name="displayName" className="w-full rounded-md border border-outline-variant px-3 py-3 outline-none focus:border-intelligence-teal" />
          </label>
        ) : null}

        <label className="mt-5 block">
          <span className="ui-label mb-2 block text-on-surface-variant">Email</span>
          <input required name="email" type="email" className="w-full rounded-md border border-outline-variant px-3 py-3 outline-none focus:border-intelligence-teal" />
        </label>

        <label className="mt-5 block">
          <span className="ui-label mb-2 block text-on-surface-variant">Password</span>
          <input required name="password" type="password" minLength={isSignup ? 8 : 1} className="w-full rounded-md border border-outline-variant px-3 py-3 outline-none focus:border-intelligence-teal" />
        </label>

        <Button variant="teal" className="mt-6 w-full py-3" disabled={busy}>
          {busy ? "Working..." : isSignup ? "Create Account" : "Sign In"}
        </Button>

        <p className="mt-5 text-center text-sm text-on-surface-variant">
          {isSignup ? "Already have an account?" : "Setting up this local app?"}{" "}
          <Link className="font-bold text-intelligence-teal" href={isSignup ? "/login" : "/signup"}>
            {isSignup ? "Sign in" : "Create the first account"}
          </Link>
        </p>
      </form>
    </main>
  );
}
