export type Product = {
  product_id: string;
  barcode: string;
  product_name: string;
  category: string;
  unit_size: string;
  image_url: string;
};

export type InventoryItem = {
  tenant_id: string;
  product_id: string;
  price: number;
  stock: number;
  is_available: boolean;
  updated_at: string;
};

export type Tenant = {
  tenant_id: string;
  tenant_name: string;
  location: string;
};

/** Lightweight record shipped to the browser for instant search. */
export type SearchItem = {
  id: string;
  name: string;
  barcode: string;
  category: string;
  unit: string;
};

export type Offer = {
  tenant_id: string;
  tenant_name: string;
  location: string;
  price: number;
  stock: number;
  updated_at: string;
};
