import { unstable_cache } from "next/cache";
import { query } from "./db";
import type { InventoryItem, Product, Tenant } from "./types";

/** Shared catalog. Cached; purged with revalidateTag("products"). */
export const getProducts = unstable_cache(
  async (): Promise<Product[]> => {
    const rows = await query`
      select product_id, coalesce(barcode, '') as barcode, product_name, category, unit_size, image_url
      from products where status = 'active' order by product_name`;
    return rows as Product[];
  },
  ["products-v2"],
  { tags: ["products"], revalidate: 300 }
);

/** All store inventories. Cached briefly; purged with revalidateTag("inventory"). */
export const getAllInventory = unstable_cache(
  async (): Promise<InventoryItem[]> => {
    const rows = await query`
      select tenant_id, product_id, price::float8 as price, stock, is_available, updated_at::text as updated_at
      from inventory`;
    return rows as InventoryItem[];
  },
  ["inventory-v2"],
  { tags: ["inventory"], revalidate: 60 }
);

/** Public store info only. Never includes password_hash. */
export const getTenants = unstable_cache(
  async (): Promise<Tenant[]> => {
    const rows = await query`select tenant_id, tenant_name, location from tenants order by tenant_name`;
    return rows as Tenant[];
  },
  ["tenants-v2"],
  { tags: ["tenants"], revalidate: 300 }
);
