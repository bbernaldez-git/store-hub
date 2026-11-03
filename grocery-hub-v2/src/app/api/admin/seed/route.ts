import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { query } from "@/lib/db";
import { adminError, checkAdmin } from "@/lib/admin";
import { normalize } from "@/lib/normalize";
import { SEED } from "@/lib/seed";

/** Adds a few sample products. Safe to run twice: duplicates are skipped. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const state = checkAdmin(body.admin_password);
  if (state !== "ok") {
    const { error, status } = adminError(state);
    return NextResponse.json({ error }, { status });
  }
  try {
    for (const [barcode, name, category, unit] of SEED) {
      await query`
        insert into products (product_id, barcode, product_name, name_normalized, category,
                              unit_size, unit_normalized, created_by_tenant_id)
        values (${"P-" + barcode.slice(-4)}, ${barcode}, ${name}, ${normalize(name)}, ${category},
                ${unit}, ${normalize(unit)}, 'SYSTEM')
        on conflict do nothing`;
    }
    revalidateTag("products");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not add sample products" }, { status: 500 });
  }
}
