import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Header } from "@/components/header";
import { StoreSpinner } from "@/components/store-feedback";
import { friendlyErrorMessage } from "@/lib/store-errors";
import { useCart } from "@/contexts/cart-context";
import { formatGs } from "@/lib/format";
import { getCartItemKey } from "@/lib/cart-item";
import { BANK_ACCOUNTS, QUICK_ALIAS, STORE } from "@/lib/store-config";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Building2, Copy, Upload, CheckCircle2, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [{ title: `Finalizar pedido — ${STORE.name}` }],
  }),
  component: Checkout,
});

const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre completo").max(120),
  email: z.string().trim().email("Email invalido").max(160),
  phone: z.string().trim().min(6, "Telefono invalido").max(40),
  address: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["continental", "tufinancia", "alias-telefono", "alias-cedula"]),
});

function Checkout() {
  const { items, totalAmount, clear } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [whatsAppFallbackUrl, setWhatsAppFallbackUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (v: string) => {
    navigator.clipboard?.writeText(v);
    setCopied(v);
    setTimeout(() => setCopied(null), 1500);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setWhatsAppFallbackUrl(null);
    if (items.length === 0) {
      setErrorMsg("Tu carrito esta vacio.");
      return;
    }
    if (!file) {
      setErrorMsg("Adjunta el comprobante de transferencia.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg("El comprobante no puede superar 8 MB.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const parsed = checkoutSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      address: formData.get("address") || undefined,
      notes: formData.get("notes") || undefined,
      paymentMethod: formData.get("paymentMethod"),
    });
    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message ?? "Revisa los datos del formulario.");
      return;
    }

    setSubmitting(true);
    let orderFallbackUrl: string | null = null;
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const uploadRes = await supabase.storage.from("comprobantes").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (uploadRes.error)
        throw new Error("No pudimos subir el comprobante: " + uploadRes.error.message);

      orderFallbackUrl = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(
        `Hola! Tuve un problema al registrar mi pedido en ${STORE.name}, pero el comprobante se subió correctamente.\n\n` +
          `Nombre: ${parsed.data.name}\n` +
          `Teléfono: ${parsed.data.phone}\n` +
          `Email: ${parsed.data.email}\n` +
          (parsed.data.address ? `Dirección: ${parsed.data.address}\n` : "") +
          `Total: ${formatGs(totalAmount)}\n\n` +
          `Productos:\n${items.map((i) => `• ${i.quantity}x ${i.name}${i.sizeMl ? ` (${i.sizeMl} ml)` : ""}`).join("\n")}\n\n` +
          "Voy a adjuntar nuevamente el comprobante en este chat.",
      )}`;

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_name: parsed.data.name,
          customer_email: parsed.data.email,
          customer_phone: parsed.data.phone,
          customer_address: parsed.data.address ?? null,
          customer_notes: parsed.data.notes ?? null,
          payment_method: parsed.data.paymentMethod,
          total_amount: totalAmount,
          receipt_url: uploadRes.data.path,
          items: items.map((i) => ({
            id: i.id,
            sku: i.sku,
            name: i.name,
            ...(i.sizeMl ? { presentation_ml: i.sizeMl } : {}),
            quantity: i.quantity,
            unit_price: i.price,
            subtotal: i.price * i.quantity,
          })),
        })
        .select("order_number")
        .single();
      if (orderErr || !order)
        throw new Error("No pudimos registrar el pedido: " + (orderErr?.message ?? ""));

      clear();
      navigate({ to: "/gracias/$orderNumber", params: { orderNumber: order.order_number } });
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : "";
      if (detail.includes("subir el comprobante")) {
        setErrorMsg("No pudimos subir tu comprobante. Revisá tu conexión y volvé a seleccionarlo.");
      } else if (detail.includes("registrar el pedido")) {
        setErrorMsg(
          "El comprobante se subió, pero tuvimos un problema al registrar el pedido. Continuá por WhatsApp para que podamos procesarlo.",
        );
        setWhatsAppFallbackUrl(orderFallbackUrl);
      } else {
        setErrorMsg(friendlyErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Seguir comprando
        </Link>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Finalizar pedido</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Transfieri al banco, adjunta el comprobante y nosotros confirmamos.
        </p>

        {items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-[var(--color-surface)] p-10 text-center">
            <p className="text-sm text-muted-foreground">Tu carrito esta vacio.</p>
            <Link
              to="/"
              className="mt-4 inline-flex rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)]"
            >
              Ver catalogo
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
            {/* Left: form */}
            <div className="space-y-6">
              {/* Datos */}
              <section className="rounded-2xl border border-border bg-[var(--color-surface)] p-6">
                <h2 className="font-display text-lg font-bold">1. Tus datos</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Nombre completo *" name="name" required maxLength={120} />
                  <Field label="Email *" name="email" type="email" required maxLength={160} />
                  <Field label="Telefono / WhatsApp *" name="phone" required maxLength={40} />
                  <Field label="Direccion (opcional)" name="address" maxLength={300} />
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Notas (opcional)
                    </label>
                    <textarea name="notes" maxLength={500} rows={3} className={inputCls} />
                  </div>
                </div>
              </section>

              {/* Pago */}
              <section className="rounded-2xl border border-border bg-[var(--color-surface)] p-6">
                <h2 className="font-display text-lg font-bold">2. Elegi a donde transferir</h2>
                <div className="mt-4 space-y-3">
                  {BANK_ACCOUNTS.map((acc, idx) => {
                    const id = idx === 0 ? "continental" : "tufinancia";
                    return (
                      <label
                        key={acc.number}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition has-[:checked]:border-[var(--color-primary)] has-[:checked]:bg-[var(--color-surface-strong)]"
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={id}
                          defaultChecked={idx === 0}
                          className="mt-1 size-4 accent-[var(--color-primary)]"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-semibold">
                            <Building2 className="size-4" /> {acc.entity}
                          </div>
                          <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                            <div>
                              <div className="text-[11px] uppercase tracking-widest">Cuenta</div>
                              <div className="flex items-center gap-2 font-mono text-foreground">
                                {acc.number}
                                <button
                                  type="button"
                                  onClick={() => copy(acc.number)}
                                  className="rounded p-1 hover:bg-[var(--color-surface)]"
                                  aria-label="Copiar"
                                >
                                  {copied === acc.number ? (
                                    <CheckCircle2 className="size-3.5 text-green-600" />
                                  ) : (
                                    <Copy className="size-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] uppercase tracking-widest">Titular</div>
                              <div className="text-foreground">{acc.holder}</div>
                              <div>{acc.document}</div>
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}

                  <div className="rounded-xl border border-dashed border-border p-4">
                    <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Cuentas rapidas (Alias)
                    </div>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      {QUICK_ALIAS.map((a, idx) => {
                        const id = idx === 0 ? "alias-telefono" : "alias-cedula";
                        return (
                          <label
                            key={a.value}
                            className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-[var(--color-surface)] p-3 transition has-[:checked]:border-[var(--color-primary)]"
                          >
                            <input
                              type="radio"
                              name="paymentMethod"
                              value={id}
                              className="mt-1 size-4 accent-[var(--color-primary)]"
                            />
                            <div className="flex-1">
                              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                                {a.label}
                              </div>
                              <div className="flex items-center gap-2 font-mono text-sm font-semibold">
                                {a.value}
                                <button
                                  type="button"
                                  onClick={() => copy(a.value)}
                                  className="rounded p-1 hover:bg-[var(--color-surface-strong)]"
                                  aria-label="Copiar"
                                >
                                  {copied === a.value ? (
                                    <CheckCircle2 className="size-3.5 text-green-600" />
                                  ) : (
                                    <Copy className="size-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              {/* Comprobante */}
              <section className="rounded-2xl border border-border bg-[var(--color-surface)] p-6">
                <h2 className="font-display text-lg font-bold">3. Adjunta el comprobante</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Subi la captura o PDF de la transferencia (hasta 8 MB).
                </p>
                <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center transition hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-strong)]">
                  <Upload className="size-6 text-muted-foreground" />
                  {file ? (
                    <div className="text-sm">
                      <div className="font-semibold">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB · Hace clic para cambiar
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm">
                      <div className="font-semibold">Subir comprobante</div>
                      <div className="text-xs text-muted-foreground">JPG, PNG o PDF</div>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </section>
            </div>

            {/* Right: summary */}
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <div className="rounded-2xl border border-border bg-[var(--color-surface)] p-6">
                <h2 className="font-display text-lg font-bold">Resumen</h2>
                <ul className="mt-4 divide-y divide-border">
                  {items.map((i) => (
                    <li
                      key={getCartItemKey(i)}
                      className="flex items-start justify-between gap-3 py-3 text-sm"
                    >
                      <div>
                        <div className="font-semibold leading-snug">{i.name}</div>
                        {i.sizeMl && (
                          <div className="text-xs font-medium text-muted-foreground">
                            {i.sizeMl} ml
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {i.quantity} × {formatGs(i.price)}
                        </div>
                      </div>
                      <div className="font-semibold">{formatGs(i.price * i.quantity)}</div>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-display text-2xl font-bold">{formatGs(totalAmount)}</span>
                </div>

                {errorMsg && (
                  <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                    {errorMsg}
                    {whatsAppFallbackUrl && (
                      <a
                        href={whatsAppFallbackUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                      >
                        <MessageCircle className="size-4" /> Continuar por WhatsApp
                      </a>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-4 w-full rounded-full bg-[var(--color-primary)] py-3 text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <StoreSpinner /> Confirmando tu pedido
                    </span>
                  ) : (
                    "Confirmar pedido"
                  )}
                </button>
                <a
                  href={`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(
                    `Hola! Quiero hacer un pedido en ${STORE.name} por ${formatGs(totalAmount)}:\n` +
                      items
                        .map(
                          (i) => `• ${i.quantity}x ${i.name}${i.sizeMl ? ` (${i.sizeMl} ml)` : ""}`,
                        )
                        .join("\n"),
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-border py-3 text-sm font-semibold transition hover:bg-[var(--color-surface-strong)]"
                >
                  <MessageCircle className="size-4" /> Pedir por WhatsApp
                </a>
              </div>
            </aside>
          </form>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-ring)] focus:ring-2 focus:ring-[var(--color-ring)]/30";

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <input {...rest} className={inputCls} />
    </div>
  );
}
