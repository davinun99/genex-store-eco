// Cliente Supabase para LEER productos/categorias del proyecto Inventario Amigo.
// Solo lectura. Las escrituras (pedidos, comprobantes) viven en el backend propio.
import { createClient } from "@supabase/supabase-js";

const INVENTARIO_URL =
  import.meta.env.VITE_INVENTARIO_SUPABASE_URL ||
  process.env.VITE_INVENTARIO_SUPABASE_URL;
const INVENTARIO_KEY =
  import.meta.env.VITE_INVENTARIO_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_INVENTARIO_SUPABASE_PUBLISHABLE_KEY;

export const inventario = createClient(INVENTARIO_URL!, INVENTARIO_KEY!, {
  auth: {
    storage: typeof window !== "undefined" ? localStorage : undefined,
    persistSession: typeof window !== "undefined",
    autoRefreshToken: typeof window !== "undefined",
  },
});

export interface InventarioProduct {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  current_stock: number;
  min_stock: number;
  purchase_price: number;
  sale_price: number;
  is_active: boolean;
  category_id: string;
  created_at: string;
  updated_at: string;
  image_url: string | null;
}

export interface InventarioCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}
