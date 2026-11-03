import { neon } from "@neondatabase/serverless";

export type Row = Record<string, any>;

let client: ReturnType<typeof neon> | null = null;

function getClient() {
  if (!client) {
    const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!url) throw new Error("DATABASE_URL is missing. Connect a Neon database to this Vercel project.");
    client = neon(url);
  }
  return client;
}

async function createSchema() {
  const sql = getClient();
  await sql`create table if not exists tenants (
    tenant_id text primary key,
    tenant_name text not null,
    location text not null default '',
    password_hash text not null,
    created_at timestamptz not null default now()
  )`;
  await sql`create table if not exists products (
    product_id text primary key,
    barcode text,
    product_name text not null,
    name_normalized text not null,
    category text not null default '',
    unit_size text not null default '',
    unit_normalized text not null default '',
    image_url text not null default '',
    status text not null default 'active',
    created_by_tenant_id text,
    created_at timestamptz not null default now()
  )`;
  // The database itself refuses duplicates, even if two stores add the same item at once
  await sql`create unique index if not exists products_barcode_uq on products (barcode) where barcode is not null and barcode <> ''`;
  await sql`create unique index if not exists products_name_uq on products (name_normalized, unit_normalized)`;
  await sql`create table if not exists inventory (
    tenant_id text not null references tenants(tenant_id) on delete cascade,
    product_id text not null references products(product_id) on delete cascade,
    price numeric(10,2) not null,
    stock integer not null,
    is_available boolean not null default true,
    updated_at timestamptz not null default now(),
    primary key (tenant_id, product_id)
  )`;
  await sql`create index if not exists inventory_product_idx on inventory (product_id)`;
}

let ready: Promise<void> | null = null;

/** Creates the tables on first use, so there is no setup step. */
export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      try {
        await createSchema();
      } catch {
        // two cold starts can race on first run; one retry settles it
        await new Promise((r) => setTimeout(r, 500));
        await createSchema();
      }
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

/** Tagged-template query: await query`select * from products where product_id = ${id}` */
export async function query(strings: TemplateStringsArray, ...values: any[]): Promise<Row[]> {
  await ensureSchema();
  const sql = getClient() as any;
  return (await sql(strings, ...values)) as Row[];
}
