import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { adminError, checkAdmin } from "@/lib/admin";

/** Create a store, or reset an existing store's name/location/password. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const state = checkAdmin(body.admin_password);
  if (state !== "ok") {
    const { error, status } = adminError(state);
    return NextResponse.json({ error }, { status });
  }

  const id = String(body.tenant_id ?? "").trim().toUpperCase();
  const name = String(body.tenant_name ?? "").trim().slice(0, 80);
  const location = String(body.location ?? "").trim().slice(0, 120);
  const password = String(body.password ?? "");

  if (!/^[A-Z0-9-]{3,30}$/.test(id)) {
    return NextResponse.json({ error: "Store ID: 3 to 30 letters, numbers or dashes (example STORE-001)" }, { status: 400 });
  }
  if (!name) return NextResponse.json({ error: "Enter the store name" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Store password needs at least 8 characters" }, { status: 400 });

  try {
    const hash = await bcrypt.hash(password, 10);
    await query`
      insert into tenants (tenant_id, tenant_name, location, password_hash)
      values (${id}, ${name}, ${location}, ${hash})
      on conflict (tenant_id) do update
        set tenant_name = excluded.tenant_name, location = excluded.location, password_hash = excluded.password_hash`;
    revalidateTag("tenants");
    return NextResponse.json({ ok: true, tenant_id: id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not save the store. Check the database connection." }, { status: 500 });
  }
}
