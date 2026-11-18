import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ArrowLeft, LogOut, Package, ReceiptText } from "lucide-react";
import { Header } from "@/components/header";
import { StoreLoader } from "@/components/store-feedback";
import { formatGs } from "@/lib/format";
import { inventario } from "@/integrations/inventario/client";
import { getMyEcommerceOrders, type EcommerceOrder } from "@/integrations/inventario/ecommerce-api";
import { signInWithGoogle } from "@/integrations/inventario/auth";

export const Route = createFileRoute("/cuenta")({
  head: () => ({ meta: [{ title: "Mi cuenta — Genex Store" }] }),
  component: AccountPage,
});

function AccountPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [orders, setOrders] = useState<EcommerceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void inventario.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = inventario.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setOrders([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    void getMyEcommerceOrders(session)
      .then((result) => {
        if (active) setOrders(result);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "No pudimos cargar tu historial de compras.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const signIn = async () => {
    try {
      await signInWithGoogle("/cuenta");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "No pudimos iniciar sesión con Google.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Volver a la tienda
        </Link>
        <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Tu perfil
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold">Mi cuenta</h1>
            {session?.user.email && (
              <p className="mt-1 text-sm text-muted-foreground">{session.user.email}</p>
            )}
          </div>
          {session && (
            <button
              onClick={() => void inventario.auth.signOut()}
              className="inline-flex items-center gap-2 border border-border px-4 py-2 text-sm font-semibold hover:border-foreground"
            >
              <LogOut className="size-4" /> Cerrar sesión
            </button>
          )}
        </div>

        {!session ? (
          <section className="mt-8 border border-border bg-[var(--color-surface)] p-8 text-center">
            <Package className="mx-auto size-9 text-muted-foreground" />
            <h2 className="mt-4 font-display text-xl font-bold">Ingresá para ver tus pedidos</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Usá la misma cuenta de Google al comprar para encontrar acá tu historial y los
              recibos.
            </p>
            <button
              onClick={() => void signIn()}
              className="mt-5 bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-[var(--color-primary-foreground)] hover:opacity-90"
            >
              Continuar con Google
            </button>
          </section>
        ) : loading ? (
          <div className="py-16">
            <StoreLoader message="Cargando tus pedidos" />
          </div>
        ) : error ? (
          <div className="mt-8 border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
            No pudimos cargar tu historial. {error}
          </div>
        ) : orders.length === 0 ? (
          <section className="mt-8 border border-border bg-[var(--color-surface)] p-8 text-center">
            <Package className="mx-auto size-9 text-muted-foreground" />
            <h2 className="mt-4 font-display text-xl font-bold">Todavía no hay pedidos</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Cuando hagas una compra, aparecerá en este historial.
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-[var(--color-primary-foreground)]"
            >
              Ver productos
            </Link>
          </section>
        ) : (
          <section className="mt-8 space-y-4">
            <h2 className="font-display text-xl font-bold">Historial de compras</h2>
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

function OrderCard({ order }: { order: EcommerceOrder }) {
  const items = Array.isArray(order.items) ? order.items : [];
  return (
    <article className="border border-border bg-[var(--color-surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="font-display text-lg font-bold">Pedido #{order.order_number}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString("es-PY", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <span className="border border-border px-3 py-1 text-xs font-semibold capitalize">
          {order.status}
        </span>
      </div>
      <ul className="divide-y divide-border">
        {items.map((item, index) => {
          const quantity = Number(item.quantity ?? 1);
          const price = Number(item.unit_price ?? 0);
          return (
            <li key={index} className="flex justify-between gap-3 py-3 text-sm">
              <span>
                {quantity} × {String(item.product_name ?? item.name ?? "Producto")}
                {item.presentation_ml ? ` · ${String(item.presentation_ml)} ml` : ""}
              </span>
              <span className="shrink-0 font-medium">{formatGs(price * quantity)}</span>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between border-t border-border pt-3 font-semibold">
        <span>Total</span>
        <span>{formatGs(order.total_amount)}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          to="/gracias/$orderNumber"
          params={{ orderNumber: order.order_number }}
          className="inline-flex items-center gap-2 border border-foreground px-3 py-2 text-xs font-semibold hover:bg-foreground hover:text-background"
        >
          <ReceiptText className="size-4" /> Ver recibo
        </Link>
        {order.receipt_url && (
          <a
            href={order.receipt_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 border border-border px-3 py-2 text-xs font-semibold hover:border-foreground"
          >
            Ver comprobante enviado
          </a>
        )}
      </div>
    </article>
  );
}
