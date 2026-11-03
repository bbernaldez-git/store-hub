"use client";

import Link from "next/link";
import { useState } from "react";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

export default function AdminPage() {
  const [adminPw, setAdminPw] = useState("");
  const [f, setF] = useState({ tenant_id: "", tenant_name: "", location: "", password: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function createStore(e: React.SyntheticEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await post("/api/admin/stores", { admin_password: adminPw, ...f });
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: `Saved. ${r.data.tenant_id} can now sign in at /login.` } : { ok: false, text: r.data.error ?? "Failed" });
    if (r.ok) setF({ tenant_id: "", tenant_name: "", location: "", password: "" });
  }

  async function seed() {
    setBusy(true);
    setMsg(null);
    const r = await post("/api/admin/seed", { admin_password: adminPw });
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: "Sample products added." } : { ok: false, text: r.data.error ?? "Failed" });
  }

  return (
    <div className="shell" style={{ maxWidth: 520 }}>
      <header className="topbar">
        <Link href="/" className="brand">Grocery Hub</Link>
      </header>
      <h1 style={{ margin: "16px 0 6px" }}>Manage stores</h1>
      <p className="muted" style={{ marginTop: 0 }}>Only you should use this page. Reusing a store ID resets that store’s password.</p>

      <form className="card stack" onSubmit={createStore}>
        <label>Admin password<input type="password" value={adminPw} onChange={(e) => setAdminPw(e.target.value)} required /></label>
        <label>Store ID<input type="text" value={f.tenant_id} onChange={set("tenant_id")} placeholder="STORE-001" required /></label>
        <label>Store name<input type="text" value={f.tenant_name} onChange={set("tenant_name")} required /></label>
        <label>Location<input type="text" value={f.location} onChange={set("location")} placeholder="Barangay 12" /></label>
        <label>Store password (8+ characters)<input type="text" value={f.password} onChange={set("password")} required /></label>
        {msg && <p className={msg.ok ? "ok" : "error"} role="status">{msg.text}</p>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" disabled={busy}>Save store</button>
          <button type="button" className="btn ghost" disabled={busy || !adminPw} onClick={seed}>Add sample products</button>
        </div>
      </form>
    </div>
  );
}
