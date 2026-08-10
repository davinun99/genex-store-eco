import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const tokenInput = z.object({ accessToken: z.string().min(1) });
const updateInput = tokenInput.extend({
  orderId: z.string().uuid(),
  status: z.enum(["pendiente", "verificado", "rechazado"]),
});

async function requireInventoryAdmin(accessToken: string) {
  const url =
    import.meta.env.VITE_INVENTARIO_SUPABASE_URL || process.env.VITE_INVENTARIO_SUPABASE_URL;
  const key =
    import.meta.env.VITE_INVENTARIO_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_INVENTARIO_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("La conexión administrativa no está configurada.");
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) throw new Error("Tu sesión administrativa venció.");
}

export const getAdminOrders = createServerFn({ method: "POST" })
  .inputValidator(tokenInput)
  .handler(async ({ data }) => {
    await requireInventoryAdmin(data.accessToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    return Promise.all(
      (orders ?? []).map(async (order) => {
        if (!order.receipt_url) return { ...order, receipt_signed_url: null };
        const { data: signed } = await supabaseAdmin.storage
          .from("comprobantes")
          .createSignedUrl(order.receipt_url, 60 * 15);
        return { ...order, receipt_signed_url: signed?.signedUrl ?? null };
      }),
    );
  });

export const updateAdminOrderStatus = createServerFn({ method: "POST" })
  .inputValidator(updateInput)
  .handler(async ({ data }) => {
    await requireInventoryAdmin(data.accessToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.orderId);
    if (error) throw error;
    return { ok: true };
  });
