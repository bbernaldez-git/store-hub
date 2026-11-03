"use client";

import Fuse from "fuse.js";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { InventoryItem, Product } from "@/lib/types";

type Props = { tenantName: string; products: Product[]; inventory: InventoryItem[] };

async function send(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export default function Dashboard({ tenantName, products, inventory }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"inventory" | "add">("inventory");
  const byId = useMemo(() => new Map(products.map((p) => [p.product_id, p])), [products]);

  async function logout() {
    await send("/api/auth/logout", "POST", {});
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <div className="dash-head">
        <div>
          <h1>{tenantName}</h1>
          <p className="muted" style={{ margin: 0 }}>{inventory.length} products in your store</p>
        </div>
        <button className="btn ghost" onClick={logout}>Sign out</button>
      </div>

      <div className="tabs" role="tablist">
        <button className="tab" role="tab" aria-selected={tab === "inventory"} onClick={() => setTab("inventory")}>My inventory</button>
        <button className="tab" role="tab" aria-selected={tab === "add"} onClick={() => setTab("add")}>Add products</button>
      </div>

      {tab === "inventory" ? (
        <div className="card">
          {inventory.length === 0 && (
            <p className="empty" style={{ border: 0, padding: 0 }}>
              Your store has no products yet. Open “Add products” to pick items from the shared catalog.
            </p>
          )}
          {inventory.map((item) => (
            <InventoryRow key={item.product_id} item={item} product={byId.get(item.product_id)} />
          ))}
        </div>
      ) : (
        <AddProducts products={products} inventory={inventory} onAdded={() => setTab("inventory")} />
      )}
    </>
  );
}

function InventoryRow({ item, product }: { item: InventoryItem; product?: Product }) {
  const router = useRouter();
  const [price, setPrice] = useState(String(item.price));
  const [stock, setStock] = useState(String(item.stock));
  const [available, setAvailable] = useState(item.is_available);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = Number(price) !== item.price || Number(stock) !== item.stock || available !== item.is_available;

  async function save() {
    setBusy(true);
    setMsg(null);
    const r = await send("/api/tenant/inventory", "PUT", {
      product_id: item.product_id,
      price: Number(price),
      stock: Number(stock),
      is_available: available,
    });
    setBusy(false);
    if (r.ok) {
      setMsg({ ok: true, text: "Saved" });
      router.refresh();
    } else {
      setMsg({ ok: false, text: r.data.error ?? "Could not save" });
    }
  }

  return (
    <div className="inv-row">
      <div className="name">
        <b>{product?.product_name ?? item.product_id}</b> <span className="muted">{product?.unit_size}</span>
        {msg && <p className={msg.ok ? "ok" : "error"} style={{ margin: 0 }}>{msg.text}</p>}
      </div>
      <label>
        Price (₱)
        <input type="number" min="0" step="0.25" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
      </label>
      <label>
        Stock
        <input type="number" min="0" step="1" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
      </label>
      <label className="check">
        <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
        For sale
      </label>
      <button className="btn" disabled={!dirty || busy} onClick={save}>{busy ? "Saving…" : "Save changes"}</button>
    </div>
  );
}

function LinkForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const router = useRouter();
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await send("/api/tenant/inventory", "PUT", {
      product_id: product.product_id,
      price: Number(price),
      stock: Number(stock),
      is_available: true,
    });
    setBusy(false);
    if (r.ok) {
      router.refresh();
      onDone();
    } else setError(r.data.error ?? "Could not save");
  }

  return (
    <form onSubmit={submit} className="stack" style={{ marginTop: 10 }}>
      <div className="grid2">
        <label>Price (₱)<input type="number" min="0" step="0.25" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} required /></label>
        <label>Stock<input type="number" min="0" step="1" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} required /></label>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div><button className="btn" disabled={busy}>{busy ? "Adding…" : "Add to my store"}</button></div>
    </form>
  );
}

function AddProducts({ products, inventory, onAdded }: { products: Product[]; inventory: InventoryItem[]; onAdded: () => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const mine = useMemo(() => new Set(inventory.map((i) => i.product_id)), [inventory]);
  const available = useMemo(() => products.filter((p) => !mine.has(p.product_id)), [products, mine]);
  const fuse = useMemo(
    () => new Fuse(available, { keys: ["product_name", "barcode", "category"], threshold: 0.35, ignoreLocation: true }),
    [available]
  );
  const results = q.trim() ? fuse.search(q.trim(), { limit: 10 }).map((r) => r.item) : available.slice(0, 6);

  return (
    <div className="stack">
      <div className="card stack">
        <h2 style={{ fontSize: "1.2rem" }}>Pick from the shared catalog</h2>
        <input type="text" placeholder="Search by name or barcode" aria-label="Search catalog" value={q} onChange={(e) => setQ(e.target.value)} />
        {results.length === 0 && <p className="muted">Nothing found. Create it below.</p>}
        {results.map((p) => (
          <div key={p.product_id} style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <span><b>{p.product_name}</b> <span className="muted">{p.unit_size} · {p.category}</span></span>
              <button className="btn ghost" onClick={() => setOpen(open === p.product_id ? null : p.product_id)}>
                {open === p.product_id ? "Cancel" : "Add"}
              </button>
            </div>
            {open === p.product_id && <LinkForm product={p} onDone={onAdded} />}
          </div>
        ))}
      </div>
      <NewProduct onAdded={onAdded} categories={[...new Set(products.map((p) => p.category).filter(Boolean))]} inCatalogMine={mine} />
    </div>
  );
}

function NewProduct({ onAdded, categories, inCatalogMine }: { onAdded: () => void; categories: string[]; inCatalogMine: Set<string> }) {
  const router = useRouter();
  const empty = { product_name: "", barcode: "", category: "", unit_size: "", image_url: "", price: "", stock: "" };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dupe, setDupe] = useState<Product | null>(null);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setDupe(null);
    const r = await send("/api/tenant/products", "POST", { ...f, price: Number(f.price), stock: Number(f.stock) });
    setBusy(false);
    if (r.status === 409 && r.data.product) {
      setDupe(r.data.product);
    } else if (r.ok) {
      setF(empty);
      router.refresh();
      onAdded();
    } else setError(r.data.error ?? "Could not save");
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <h2 style={{ fontSize: "1.2rem" }}>Can’t find it? Create a new product</h2>
      <p className="muted" style={{ margin: 0 }}>New products join the shared catalog, so every store can sell them.</p>
      <label>Product name<input type="text" value={f.product_name} onChange={set("product_name")} placeholder="Instant Noodles Beef" required /></label>
      <div className="grid2">
        <label>Size or variant<input type="text" value={f.unit_size} onChange={set("unit_size")} placeholder="55g" /></label>
        <label>Barcode (if any)<input type="text" inputMode="numeric" value={f.barcode} onChange={set("barcode")} /></label>
      </div>
      <div className="grid2">
        <label>Category<input type="text" list="cats" value={f.category} onChange={set("category")} /></label>
        <label>Image link (optional)<input type="url" value={f.image_url} onChange={set("image_url")} /></label>
      </div>
      <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      <div className="grid2">
        <label>Your price (₱)<input type="number" min="0" step="0.25" inputMode="decimal" value={f.price} onChange={set("price")} required /></label>
        <label>Your stock<input type="number" min="0" step="1" inputMode="numeric" value={f.stock} onChange={set("stock")} required /></label>
      </div>

      {dupe && (
        <div className="card" style={{ background: "#fff8e0", borderColor: "var(--tag)" }}>
          <p style={{ margin: 0 }}>
            <b>{dupe.product_name} {dupe.unit_size}</b> is already in the catalog.{" "}
            {inCatalogMine.has(dupe.product_id)
              ? "It is already in your inventory. Edit it under My inventory."
              : "Add that one to your store instead:"}
          </p>
          {!inCatalogMine.has(dupe.product_id) && <LinkForm product={dupe} onDone={onAdded} />}
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <div><button className="btn" disabled={busy}>{busy ? "Creating…" : "Create product"}</button></div>
    </form>
  );
}
