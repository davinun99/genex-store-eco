import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/header";
import { CheckCircle2, Home, MessageCircle } from "lucide-react";
import { STORE } from "@/lib/store-config";

export const Route = createFileRoute("/gracias/$orderNumber")({
  component: ThankYou,
});

function ThankYou() {
  const { orderNumber } = Route.useParams();
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
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:opacity-90"
          >
            <Home className="size-4" /> Volver al inicio
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
