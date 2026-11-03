"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, password }),
    });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setError((await res.json().catch(() => ({}))).error ?? "Could not sign in");
      setBusy(false);
    }
  }

  return (
    <div className="shell" style={{ maxWidth: 440 }}>
      <header className="topbar">
        <Link href="/" className="brand">Grocery Hub</Link>
      </header>
      <h1 style={{ margin: "16px 0 18px" }}>Store sign in</h1>
      <form className="card stack" onSubmit={submit}>
        <label>
          Store ID
          <input type="text" value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="STORE-001" autoCapitalize="characters" required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}
