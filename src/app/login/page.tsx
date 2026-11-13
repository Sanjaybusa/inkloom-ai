"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@inkloom.ai");
  const [name, setName] = useState("Demo Reviewer");
  const [role, setRole] = useState("reviewer");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, role }),
      });

      if (!response.ok) {
        throw new Error("Unable to sign in");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (loginError) {
      console.error(loginError);
      setError("Sign-in failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-50">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur-sm">
        <div className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">Inkloom AI</p>
          <h1 className="text-3xl font-semibold">Content governance sign in</h1>
          <p className="mt-2 text-sm text-slate-300">Access the campaign review workspace with a reviewer profile.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-300">Full name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-50 outline-none transition focus:border-cyan-500"
              placeholder="Demo Reviewer"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-300">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-50 outline-none transition focus:border-cyan-500"
              placeholder="demo@inkloom.ai"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block text-slate-300">Role</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-50 outline-none transition focus:border-cyan-500"
            >
              <option value="reviewer">Reviewer</option>
              <option value="brand_manager">Brand Manager</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Signing in..." : "Continue to workspace"}
          </button>
        </form>
      </section>
    </main>
  );
}
