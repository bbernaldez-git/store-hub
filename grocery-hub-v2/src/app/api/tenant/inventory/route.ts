import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth";
import { getProducts } from "@/lib/data";
import { parseInventoryBody, upsertInventory } from "@/lib/inventory";

/** Set price/stock for a product in the signed-in store (adds it if the store doesn't carry it yet). */
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

  const parsed = parseInventoryBody(await req.json().catch(() => ({})));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  const products = await getProducts();
  if (!products.some((p) => p.product_id === parsed.product_id)) {
    return NextResponse.json({ error: "Product is not in the shared catalog" }, { status: 404 });
  }

  try {
    // tenantId always comes from the signed session, never from the request body
    await upsertInventory(session.tenantId, parsed);
    revalidateTag("inventory");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not save. Try again in a moment." }, { status: 503 });
  }
}
