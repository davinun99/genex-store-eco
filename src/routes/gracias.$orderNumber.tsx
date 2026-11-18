import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { CheckCircle2, Home, MessageCircle, Printer } from "lucide-react";
import { STORE } from "@/lib/store-config";
import { formatGs } from "@/lib/format";
import { inventario } from "@/integrations/inventario/client";
import { getMyEcommerceOrders } from "@/integrations/inventario/ecommerce-api";

type ReceiptData = {
  customer_name?: string;
  customer_email?: string;
  items?: Array<Record<string, unknown>>;
  total_amount?: number;
  payment_method?: string;
  receipt_uploaded?: boolean;
  receipt_url?: string | null;
  status?: string;
  created_at?: string;
};

export const Route = createFileRoute("/gracias/$orderNumber")({
  component: ThankYou,
});

function ThankYou() {
  const { orderNumber } = Route.useParams();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`genex_order_${orderNumber}`);
      if (saved) setReceipt(JSON.parse(saved) as ReceiptData);
    } catch {
      // Se puede mostrar la confirmación aunque no haya datos locales del recibo.
    }
    void inventario.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      try {
        const orders = await getMyEcommerceOrders(data.session);
        const order = orders.find((item) => item.order_number === orderNumber);
        if (order) setReceipt(order);
      } catch {
        // El número del pedido sigue visible aunque el historial no esté disponible.
      }
    });
  }, [orderNumber]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto inline-flex size-16 items-center justify-center rounded-full bg-[var(--color-brand)]/30">
          <CheckCircle2 className="size-9 text-[var(--color-ink)]" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">Recibimos tu pedido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Número de pedido:{" "}
          <span className="font-mono font-semibold text-foreground">#{orderNumber}</span>
        </p>
        <p className="mx-auto mt-6 max-w-md text-sm text-muted-foreground">
          Vamos a verificar el comprobante y nos comunicaremos por WhatsApp o correo electrónico
          para coordinar la entrega. Guardá este número como referencia.
        </p>
        {receipt && (
          <section className="mx-auto mt-8 max-w-xl border border-border bg-[var(--color-surface)] p-5 text-left print:border-black print:bg-white">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Recibo de compra
                </p>
                {receipt.customer_name && (
                  <p className="mt-1 font-semibold">{receipt.customer_name}</p>
                )}
                {receipt.customer_email && (
                  <p className="text-xs text-muted-foreground">{receipt.customer_email}</p>
                )}
              </div>
              {receipt.status && (
                <span className="border border-border px-2 py-1 text-xs capitalize">
                  {receipt.status}
                </span>
              )}
            </div>
            <ul className="divide-y divide-border">
              {(receipt.items ?? []).map((item, index) => {
                const quantity = Number(item.quantity ?? 1);
                const unitPrice = Number(item.unit_price ?? 0);
                return (
                  <li key={index} className="flex justify-between gap-3 py-3 text-sm">
                    <span>
                      {quantity} × {String(item.product_name ?? item.name ?? "Producto")}
                      {item.presentation_ml ? ` · ${String(item.presentation_ml)} ml` : ""}
                    </span>
                    <span className="shrink-0">{formatGs(quantity * unitPrice)}</span>
                  </li>
                );
              })}
            </ul>
            {typeof receipt.total_amount === "number" && (
              <div className="flex justify-between border-t border-border pt-3 font-bold">
                <span>Total pagado por transferencia</span>
                <span>{formatGs(receipt.total_amount)}</span>
              </div>
            )}
            {receipt.receipt_uploaded !== undefined && (
              <p className="mt-3 text-xs text-muted-foreground">
                {receipt.receipt_uploaded
                  ? "Comprobante adjuntado al pedido."
                  : "El comprobante no se adjuntó; podés enviarlo por WhatsApp."}
              </p>
            )}
            <button
              onClick={() => window.print()}
              className="mt-4 inline-flex items-center gap-2 border border-border px-3 py-2 text-xs font-semibold hover:border-foreground print:hidden"
            >
              <Printer className="size-4" /> Imprimir recibo
            </button>
          </section>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            replace
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:opacity-90"
          >
            <Home className="size-4" /> Volver al inicio
          </Link>
          <Link
            to="/cuenta"
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold transition hover:bg-[var(--color-surface-strong)]"
          >
            Ver mis pedidos
          </Link>
          <a
            href={`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(`¡Hola! Acabo de hacer el pedido #${orderNumber} en ${STORE.name}.`)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold transition hover:bg-[var(--color-surface-strong)]"
          >
            <MessageCircle className="size-4" /> Avisar por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
