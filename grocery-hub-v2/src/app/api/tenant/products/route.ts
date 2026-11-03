import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { normalize } from "@/lib/normalize";
import { parseInventoryBody, upsertInventory } from "@/lib/inventory";

async function findDuplicate(barcode: string, nameKey: string, unitKey: string) {
  const rows = await query`
    select product_id, coalesce(barcode, '') as barcode, product_name, category, unit_size, image_url
    from products
    where (${barcode} <> '' and barcode = ${barcode})
       or (name_normalized = ${nameKey} and unit_normalized = ${unitKey})
    limit 1`;
  return rows[0];
}

/**
 * Create a new shared product (and list it in the signed-in store).
 * If the same barcode, or same name + size, already exists, nothing is created
 * and the existing product is returned with 409 so the UI can offer to add it instead.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.product_name ?? "").trim().slice(0, 120);
  const barcode = String(body.barcode ?? "").replace(/\s/g, "").slice(0, 32);
  const category = String(body.category ?? "").trim().slice(0, 60);
  const unit = String(body.unit_size ?? "").trim().slice(0, 40);
  const image = String(body.image_url ?? "").trim().slice(0, 500);

  if (name.length < 2) return NextResponse.json({ error: "Enter a product name" }, { status: 400 });
  if (barcode && !/^[0-9A-Za-z-]+$/.test(barcode)) {
    return NextResponse.json({ error: "Barcode can only contain letters, numbers and dashes" }, { status: 400 });
  }
  if (image && !/^https?:\/\//i.test(image)) {
    return NextResponse.json({ error: "Image link must start with http:// or https://" }, { status: 400 });
  }
  const inv = parseInventoryBody({ ...body, product_id: "pending" });
  if (typeof inv === "string") return NextResponse.json({ error: inv }, { status: 400 });

  const nameKey = normalize(name);
  const unitKey = normalize(unit);

  try {
    const dup = await findDuplicate(barcode, nameKey, unitKey);
    if (dup) return NextResponse.json({ duplicate: true, product: dup }, { status: 409 });

    const product_id = `P-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    try {
      await query`
        insert into products (product_id, barcode, product_name, name_normalized, category,
                              unit_size, unit_normalized, image_url, created_by_tenant_id)
        values (${product_id}, nullif(${barcode}, ''), ${name}, ${nameKey}, ${category},
                ${unit}, ${unitKey}, ${image}, ${session.tenantId})`;
    } catch (e: any) {
      // Two stores added the same item at the same moment: the database blocked the second one
      if (e?.code === "23505") {
        const again = await findDuplicate(barcode, nameKey, unitKey);
        if (again) return NextResponse.json({ duplicate: true, product: again }, { status: 409 });
      }
      throw e;
    }

    await upsertInventory(session.tenantId, { ...inv, product_id });
    revalidateTag("products");
    revalidateTag("inventory");
    return NextResponse.json({ ok: true, product_id }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not save. Try again in a moment." }, { status: 503 });
  }
}
