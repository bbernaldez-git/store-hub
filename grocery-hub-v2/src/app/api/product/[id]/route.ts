import { NextResponse } from "next/server";
import { getAllInventory, getProducts, getTenants } from "@/lib/data";
import type { Offer } from "@/lib/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [products, inventory, tenants] = await Promise.all([getProducts(), getAllInventory(), getTenants()]);
    const product = products.find((p) => p.product_id === id);
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const byTenant = new Map(tenants.map((t) => [t.tenant_id, t]));
    const offers: Offer[] = inventory
      .filter((i) => i.product_id === id && i.is_available && i.stock > 0 && byTenant.has(i.tenant_id))
      .map((i) => {
        const t = byTenant.get(i.tenant_id)!;
        return {
          tenant_id: t.tenant_id,
          tenant_name: t.tenant_name,
          location: t.location,
          price: i.price,
          stock: i.stock,
          updated_at: i.updated_at,
        };
      })
      .sort((a, b) => a.price - b.price);

    return NextResponse.json(
      { product, offers },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not load product" }, { status: 500 });
  }
}
