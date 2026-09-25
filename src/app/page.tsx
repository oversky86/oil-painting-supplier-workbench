"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", username, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Login failed");
      }
      router.replace("/orders");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-[12px] border border-[#dccfbc] bg-white p-8 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#806e5a]">
          ViewBrush Studio
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[#241c16]">
          Supplier login
        </h1>
        <p className="mt-2 text-sm text-[#6c6054]">
          Sign in with the studio admin account to manage portraits and shipping.
        </p>

        <label className="mt-8 block text-sm font-medium text-[#241c16]">
          Username
          <input
            className="mt-2 w-full rounded-[8px] border border-[#dccfbc] bg-[#fbf8f3] px-3 py-3 outline-none focus:border-[#31271f]"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-[#241c16]">
          Password
          <input
            type="password"
            className="mt-2 w-full rounded-[8px] border border-[#dccfbc] bg-[#fbf8f3] px-3 py-3 outline-none focus:border-[#31271f]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error ? (
          <p className="mt-4 rounded-[8px] border border-[#f0c2be] bg-[#fff5f4] px-3 py-2 text-sm text-[#a33b35]">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-[8px] bg-[#31271f] px-5 text-[15px] font-semibold text-white hover:bg-[#241c16]"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
