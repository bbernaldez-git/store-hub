import { NextResponse } from "next/server";
import { getProducts } from "@/lib/data";
import type { SearchItem } from "@/lib/types";

export async function GET() {
  try {
    const products = await getProducts();
    const items: SearchItem[] = products.map((p) => ({
      id: p.product_id,
      name: p.product_name,
      barcode: p.barcode,
      category: p.category,
      unit: p.unit_size,
    }));
    return NextResponse.json(items, {
      headers: {
        // CDN serves instantly for 5 min, refreshes in background
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not load products" }, { status: 500 });
  }
}
