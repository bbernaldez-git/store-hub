import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { createSession } from "@/lib/auth";

// Compared against when the store doesn't exist, so timing doesn't reveal valid ids.
const DUMMY = bcrypt.hashSync("not-a-real-password", 10);

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const tenantId = String(body.tenant_id ?? "").trim().toUpperCase();
  const password = String(body.password ?? "");
  if (!tenantId || !password) {
    return NextResponse.json({ error: "Enter your store ID and password" }, { status: 400 });
  }

  try {
    const rows = await query`select tenant_id, tenant_name, password_hash from tenants where tenant_id = ${tenantId}`;
    const tenant = rows[0];
    const ok = await bcrypt.compare(password, tenant?.password_hash || DUMMY);
    if (!tenant || !ok) {
      return NextResponse.json({ error: "Store ID or password is incorrect" }, { status: 401 });
    }
    await createSession({ tenantId: tenant.tenant_id, tenantName: tenant.tenant_name });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Login is unavailable right now" }, { status: 500 });
  }
}
