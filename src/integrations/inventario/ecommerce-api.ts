import type { Session } from "@supabase/supabase-js";
import type { InventarioProduct } from "./client";

const INVENTARIO_URL =
  import.meta.env.VITE_INVENTARIO_SUPABASE_URL || process.env.VITE_INVENTARIO_SUPABASE_URL;
const INVENTARIO_KEY =
  import.meta.env.VITE_INVENTARIO_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_INVENTARIO_SUPABASE_PUBLISHABLE_KEY;

if (!INVENTARIO_URL || !INVENTARIO_KEY) {
  throw new Error("Falta configurar la conexión con Inventario Amigo.");
}

const FUNCTIONS_URL = `${INVENTARIO_URL}/functions/v1`;

type ApiOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  session?: Session;
  body?: unknown;
};

async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers({ apikey: INVENTARIO_KEY! });
  if (options.session) headers.set("Authorization", `Bearer ${options.session.access_token}`);
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${FUNCTIONS_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body:
      options.body instanceof FormData
        ? options.body
        : options.body === undefined
          ? undefined
          : JSON.stringify(options.body),
  });
  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `Error ${response.status}`;
    throw new Error(detail);
  }
  return payload as T;
}

function getArray<T>(payload: unknown, keys: string[]): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== "object") return [];
  for (const key of keys) {
    const value = (payload as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value as T[];
  }
  const data = (payload as Record<string, unknown>).data;
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") return getArray<T>(data, keys);
  return [];
}

function getTotal(payload: unknown, fallback: number): number {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  const pagination = record.pagination as Record<string, unknown> | undefined;
  const value = record.total ?? record.count ?? pagination?.total;
  return typeof value === "number" ? value : fallback;
}

export async function getEcommerceProducts(params: {
  search?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("category_id", params.categoryId);
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 12));
  const payload = await apiRequest<unknown>(`/ecommerce-products?${query}`);
  const items = getArray<InventarioProduct>(payload, ["products", "items"]);
  return { items, total: getTotal(payload, items.length) };
}

export async function getEcommerceProduct(id: string) {
  const payload = await apiRequest<unknown>(`/ecommerce-products/${encodeURIComponent(id)}`);
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  return (record.product ?? record.data ?? payload) as InventarioProduct | null;
}

export async function uploadOrderReceipt(file: File) {
  const body = new FormData();
  body.append("file", file);
  const payload = await apiRequest<Record<string, unknown>>("/ecommerce-orders/receipt", {
    method: "POST",
    body,
  });
  const data = payload.data as Record<string, unknown> | undefined;
  const receiptPath = payload.receipt_path ?? data?.receipt_path;
  if (!receiptPath) throw new Error("El backend no devolvió la ubicación del comprobante.");
  return String(receiptPath);
}

export async function createEcommerceOrder(body: Record<string, unknown>) {
  const payload = await apiRequest<Record<string, unknown>>("/ecommerce-orders", {
    method: "POST",
    body,
  });
  const data = payload.data as Record<string, unknown> | undefined;
  const order = (payload.order ?? data ?? payload) as Record<string, unknown>;
  if (!order.order_number) throw new Error("El backend no devolvió el número del pedido.");
  return order as { id?: string; order_number: string; status?: string; total_amount?: number };
}

export type EcommerceMe = {
  roles: string[];
  permissions: string[];
  sections: string[];
};

export async function getEcommerceMe(session: Session): Promise<EcommerceMe> {
  const payload = await apiRequest<Record<string, unknown>>("/ecommerce-me", { session });
  const source = (payload.data ?? payload) as Record<string, unknown>;
  const rawRoles = source.roles ?? source.role;
  const rawPermissions = source.permissions ?? source.permisos;
  const rawSections = source.sections ?? source.visible_sections ?? source.secciones;
  const toStrings = (value: unknown) =>
    Array.isArray(value) ? value.map(String) : typeof value === "string" ? [value] : [];
  return {
    roles: toStrings(rawRoles),
    permissions: toStrings(rawPermissions),
    sections: toStrings(rawSections),
  };
}

export type EcommerceOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string | null;
  customer_notes?: string | null;
  payment_method: string;
  total_amount: number;
  receipt_url: string | null;
  status: string;
  created_at: string;
  items: Array<Record<string, unknown>>;
};

export async function getAdminEcommerceOrders(session: Session, status?: string) {
  const query = new URLSearchParams({ page: "1", limit: "100" });
  if (status && status !== "todos") query.set("status", status);
  const payload = await apiRequest<unknown>(`/admin-ecommerce-orders?${query}`, { session });
  return getArray<EcommerceOrder>(payload, ["orders", "items"]);
}

export async function updateEcommerceOrderStatus(
  session: Session,
  orderId: string,
  status: string,
  notes?: string,
) {
  return apiRequest(`/admin-ecommerce-orders/${encodeURIComponent(orderId)}/status`, {
    method: "PATCH",
    session,
    body: { status, ...(notes ? { notes } : {}) },
  });
}

export type EcommerceSyncIssue = "inactivo" | "sin_stock" | "sin_imagen";

export type EcommerceSyncProduct = {
  id: string;
  name: string;
  sku: string;
  is_active: boolean;
  available_stock: number;
  available_volume_ml: number;
  image_url: string | null;
  issues: EcommerceSyncIssue[];
  visible_in_store: boolean;
};

export type EcommerceSyncSummary = {
  total: number;
  inactivo: number;
  sin_stock: number;
  sin_imagen: number;
  publicados_ok: number;
};

export type EcommerceSyncResponse = {
  data: EcommerceSyncProduct[];
  summary: EcommerceSyncSummary;
};

export async function getEcommerceSyncProducts(
  session: Session,
  params: {
    issue?: EcommerceSyncIssue;
    search?: string;
    onlyIssues?: boolean;
  } = {},
) {
  const query = new URLSearchParams();
  if (params.issue) query.set("issue", params.issue);
  if (params.search) query.set("search", params.search);
  if (params.onlyIssues === false) query.set("only_issues", "false");
  const suffix = query.size ? `?${query}` : "";
  return apiRequest<EcommerceSyncResponse>(`/ecommerce-sync${suffix}`, { session });
}

export async function updateEcommerceSyncProducts(
  session: Session,
  productIds: string[],
  publish: boolean,
) {
  return apiRequest<EcommerceSyncResponse>("/ecommerce-sync", {
    method: "POST",
    session,
    body: { product_ids: productIds, publish },
  });
}
