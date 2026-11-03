"use client";

import Fuse from "fuse.js";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Offer, Product, SearchItem } from "@/lib/types";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const LOW_STOCK = 5;

type Detail = { product: Product; offers: Offer[] };

export default function SearchClient() {
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SearchItem | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailState, setDetailState] = useState<"idle" | "loading" | "error">("idle");
  const reqId = useRef(0);

  // Load the lightweight index once; all searching after this runs locally
  useEffect(() => {
    fetch("/api/search-index")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setItems)
      .catch(() => setLoadError(true));
  }, []);

  const fuse = useMemo(
    () =>
      items
        ? new Fuse(items, {
            keys: [
              { name: "name", weight: 3 },
              { name: "category", weight: 1 },
              { name: "barcode", weight: 2 },
              { name: "unit", weight: 0.5 },
            ],
            threshold: 0.35,
            ignoreLocation: true,
          })
        : null,
    [items]
  );

  const results = useMemo(() => {
    if (!items) return [];
    const q = query.trim();
    if (!q) return items.slice(0, 12);
    return fuse ? fuse.search(q, { limit: 20 }).map((r) => r.item) : [];
  }, [items, fuse, query]);

  async function pick(item: SearchItem) {
    setSelected(item);
    setDetail(null);
    setDetailState("loading");
    const id = ++reqId.current;
    try {
      const res = await fetch(`/api/product/${encodeURIComponent(item.id)}`);
      if (!res.ok) throw new Error();
      const data: Detail = await res.json();
      if (id === reqId.current) {
        setDetail(data);
        setDetailState("idle");
      }
    } catch {
      if (id === reqId.current) setDetailState("error");
    }
  }

  return (
    <>
      <section className="hero">
        <h1>Check the price and stock before you walk over.</h1>
        <p>Search any grocery item and see which neighborhood stores have it, cheapest first.</p>
        <input
          className="search"
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder="Try “noodles”, “sugar” or a barcode"
          aria-label="Search products"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </section>

      {loadError && <p className="error" role="alert" style={{ marginTop: 16 }}>Products could not be loaded. Refresh the page to try again.</p>}
      {!items && !loadError && <p className="muted" style={{ marginTop: 16 }}>Loading products…</p>}

      {items && (
        <>
          <ul className="results" aria-label="Matching products">
            {results.map((it) => (
              <li key={it.id}>
                <button className="result" aria-pressed={selected?.id === it.id} onClick={() => pick(it)}>
                  <span>
                    <b>{it.name}</b> {it.unit && <span className="muted">{it.unit}</span>}
                  </span>
                  <span className="muted">{it.category}</span>
                </button>
              </li>
            ))}
          </ul>
          {query.trim() && results.length === 0 && (
            <p className="empty" style={{ marginTop: 16 }}>No products match “{query.trim()}”. Check the spelling, or ask your store to add it.</p>
          )}
        </>
      )}

      {selected && (
        <section aria-live="polite">
          <h2 className="section-title">
            Where to find {selected.name} {selected.unit}
          </h2>
          {detailState === "loading" && <p className="muted">Checking stores…</p>}
          {detailState === "error" && <p className="error">Could not load stores. Select the product again.</p>}
          {detail && detail.offers.length === 0 && (
            <p className="empty">No store has this in stock right now.</p>
          )}
          {detail && detail.offers.length > 0 && (
            <div className="offers">
              {detail.offers.map((o, i) => (
                <article className="offer" key={o.tenant_id}>
                  <h3>{o.tenant_name}</h3>
                  <span className="pricetag" aria-label={`Price ${peso.format(o.price)}`}>{peso.format(o.price)}</span>
                  <p className="muted" style={{ margin: 0 }}>
                    {o.location && <>{o.location} · </>}
                    {o.stock <= LOW_STOCK ? <span className="low">Only {o.stock} left</span> : <>{o.stock} in stock</>}
                    {i === 0 && detail.offers.length > 1 && <> · <span className="best">Lowest price</span></>}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
