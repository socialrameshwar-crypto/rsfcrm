import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_TYPES } from "./proposal-catalog";

export interface ProductCategory {
  id: string;
  user_id: string;
  name: string;
  slug: string | null;
  sort_order: number;
  hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbMachine {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  code: string | null;
  image_url: string | null;
  capacity: string | null;
  material: string | null;
  motor: string | null;
  power_kw: number | null;
  dimensions: string | null;
  weight: string | null;
  description: string | null;
  features: string[];
  applications: string[];
  std_accessories: string[];
  optional_accessories: { name: string; price: number }[];
  warranty: string | null;
  base_price: number;
  dealer_price: number;
  customer_price: number;
  export_price: number;
  discount_pct: number;
  currency: string;
  tax_pct: number;
  freight_pct: number;
  packing_pct: number;
  install_pct: number;
  commissioning_pct: number;
  archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export async function fetchCategories(): Promise<ProductCategory[]> {
  const { data, error } = await (supabase as any)
    .from("product_categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProductCategory[];
}

export async function fetchMachines(categoryId?: string): Promise<DbMachine[]> {
  let q = (supabase as any).from("machines").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true });
  if (categoryId) q = q.eq("category_id", categoryId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DbMachine[];
}

// Seed the current user's catalog with the default categories from the hardcoded PRODUCT_TYPES list.
export async function seedDefaultCategories(userId: string) {
  const existing = await fetchCategories();
  if (existing.length) return existing;
  const rows = PRODUCT_TYPES.map((p, i) => ({
    user_id: userId,
    name: p.label,
    slug: p.value,
    sort_order: i,
  }));
  const { data, error } = await (supabase as any).from("product_categories").insert(rows).select("*");
  if (error) throw error;
  return data as ProductCategory[];
}

export function emptyMachine(userId: string, categoryId: string | null): Partial<DbMachine> {
  return {
    user_id: userId,
    category_id: categoryId,
    name: "",
    code: "",
    capacity: "",
    material: "SS304",
    motor: "",
    features: [],
    applications: [],
    std_accessories: [],
    optional_accessories: [],
    base_price: 0,
    dealer_price: 0,
    customer_price: 0,
    export_price: 0,
    discount_pct: 0,
    currency: "INR",
    tax_pct: 18,
    freight_pct: 3,
    packing_pct: 1.5,
    install_pct: 5,
    commissioning_pct: 3,
    archived: false,
    sort_order: 0,
  };
}
