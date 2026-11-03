import { query } from "./db";

export type InventoryInput = {
  product_id: string;
  price: number;
  stock: number;
  is_available: boolean;
};

/** Insert or update one store's row for a product. */
export async function upsertInventory(tenantId: string, v: InventoryInput) {
  await query`
    insert into inventory (tenant_id, product_id, price, stock, is_available, updated_at)
    values (${tenantId}, ${v.product_id}, ${v.price}, ${v.stock}, ${v.is_available}, now())
    on conflict (tenant_id, product_id) do update
      set price = excluded.price, stock = excluded.stock,
          is_available = excluded.is_available, updated_at = now()`;
}

export function parseInventoryBody(body: any): InventoryInput | string {
  const product_id = String(body?.product_id ?? "").trim();
  const price = Number(body?.price);
  const stock = Number(body?.stock);
  if (!product_id) return "product_id is required";
  if (!Number.isFinite(price) || price < 0 || price > 9999999) return "price must be 0 or more";
  if (!Number.isInteger(stock) || stock < 0 || stock > 1000000) return "stock must be a whole number, 0 or more";
  return { product_id, price: Math.round(price * 100) / 100, stock, is_available: body?.is_available !== false };
}
