import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  ImagePlus,
  Images,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  Percent,
  Search,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { inventario } from "@/integrations/inventario/client";
import { formatGs } from "@/lib/format";
import {
  getAdminEcommerceOrders,
  getEcommerceMe,
  getEcommerceProducts,
  updateEcommerceOrderStatus,
} from "@/integrations/inventario/ecommerce-api";

type AdminProduct = {
  id: string;
  name: string;
  sku: string;
  image_url: string | null;
};

type AdminDiscountProduct = AdminProduct & {
  purchase_price: number;
  sale_price: number;
  discount_percent: number | null;
};

type AdminSection = "orders" | "discounts" | "images";

export const Route = createFileRoute("/admin/productos")({
  component: AdminProductsPage,
});

function AdminProductsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    void inventario.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data } = inventario.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setCheckingSession(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (checkingSession) {
    return <CenteredMessage message="Verificando sesión…" />;
  }

  if (!session) {
    return <AdminLogin />;
  }

  return <AdminPanel session={session} />;
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const { error } = await inventario.auth.signInWithPassword({ email, password });
    if (error) setError("No pudimos iniciar sesión. Verificá tu correo y contraseña.");
    setSubmitting(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f4f2] px-4">
      <div className="w-full max-w-md border border-black/10 bg-white p-7 shadow-sm sm:p-10">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black/55 hover:text-black"
        >
          <ArrowLeft className="size-4" /> Volver a la tienda
        </Link>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-black/45">
          Acceso privado
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
          Panel administrativo
        </h1>
        <p className="mt-2 text-sm text-black/55">Ingresá con tu usuario de Inventario Amigo.</p>
        <form onSubmit={login} className="mt-7 space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider">
            Correo
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-11 w-full border border-black/20 px-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-black"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider">
            Contraseña
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-11 w-full border border-black/20 px-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-black"
            />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            disabled={submitting}
            className="h-11 w-full bg-black text-sm font-semibold text-white transition hover:bg-black/80 disabled:opacity-50"
          >
            {submitting ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}

function AdminPanel({ session }: { session: Session }) {
  const [section, setSection] = useState<AdminSection>("orders");
  const permissionsQuery = useQuery({
    queryKey: ["ecommerce-me", session.user.id],
    queryFn: () => getEcommerceMe(session),
  });
  const access = permissionsQuery.data;
  const canManageOrders = Boolean(
    access?.roles.some((role) => ["admin", "ecommerce_manager"].includes(role)) ||
    access?.permissions.includes("ecommerce.orders.read") ||
    access?.sections.some((value) => /pedido|order/i.test(value)),
  );
  const canManageImages = Boolean(
    access?.roles.some((role) =>
      ["admin", "ecommerce_manager", "vendedor", "seller"].includes(role),
    ) ||
    access?.permissions.includes("products.images.manage") ||
    access?.sections.some((value) => /imagen|image|foto|product/i.test(value)),
  );
  const canManageDiscounts = Boolean(
    access?.roles.some((role) => ["admin", "ecommerce_manager"].includes(role)) ||
    access?.permissions.some((value) => /product.*(price|discount|update)/i.test(value)) ||
    access?.sections.some((value) => /precio|descuento|discount/i.test(value)),
  );

  useEffect(() => {
    if (!access || canManageOrders) return;
    if (canManageDiscounts) setSection("discounts");
    else if (canManageImages) setSection("images");
  }, [access, canManageDiscounts, canManageImages, canManageOrders]);

  if (permissionsQuery.isLoading) return <CenteredMessage message="Cargando permisos…" />;
  if (permissionsQuery.error || (!canManageOrders && !canManageDiscounts && !canManageImages)) {
    return (
      <CenteredMessage message="Tu usuario no tiene permisos para acceder al panel del e-commerce." />
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f4f2]">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-black/45">
              Panel administrativo
            </p>
            <h1 className="font-display text-2xl font-bold">GENEX Store</h1>
          </div>
          <button
            onClick={() => void inventario.auth.signOut()}
            className="inline-flex items-center gap-2 border border-black/20 px-3 py-2 text-xs font-semibold hover:border-black"
          >
            <LogOut className="size-4" /> Salir
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav
          className="mb-7 grid grid-cols-2 gap-2 border border-black/10 bg-white p-1.5 sm:flex sm:w-fit"
          aria-label="Secciones administrativas"
        >
          {canManageOrders && (
            <AdminNavButton
              active={section === "orders"}
              onClick={() => setSection("orders")}
              icon={<LayoutDashboard className="size-4" />}
              label="Pedidos"
            />
          )}
          {canManageImages && (
            <AdminNavButton
              active={section === "images"}
              onClick={() => setSection("images")}
              icon={<Images className="size-4" />}
              label="Cargar fotos"
            />
          )}
          {canManageDiscounts && (
            <AdminNavButton
              active={section === "discounts"}
              onClick={() => setSection("discounts")}
              icon={<Percent className="size-4" />}
              label="Descuentos"
            />
          )}
        </nav>
        {section === "orders" && canManageOrders ? (
          <OrdersDashboard session={session} />
        ) : section === "discounts" && canManageDiscounts ? (
          <ProductDiscountManager />
        ) : (
          <ProductImageManager email={session.user.email ?? "Admin"} />
        )}
      </div>
    </main>
  );
}

function AdminNavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold transition ${active ? "bg-black text-white" : "text-black/55 hover:bg-black/5 hover:text-black"}`}
    >
      {icon}
      {label}
    </button>
  );
}

function OrdersDashboard({ session }: { session: Session }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("todos");
  const ordersQuery = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => getAdminEcommerceOrders(session),
  });
  const statusMutation = useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: string;
      status: "pendiente" | "verificado" | "rechazado";
    }) => updateEcommerceOrderStatus(session, orderId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
  });
  const orders = ordersQuery.data ?? [];
  const filtered =
    statusFilter === "todos" ? orders : orders.filter((order) => order.status === statusFilter);
  const pending = orders.filter((order) => order.status === "pendiente").length;
  const verified = orders.filter((order) => order.status === "verificado").length;

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm text-black/50">
          Revisá comprobantes y confirmá el estado de cada compra.
        </p>
        <h2 className="mt-1 font-display text-3xl font-bold tracking-tight">
          Verificación de pedidos
        </h2>
      </div>
      <div className="mb-7 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Pendientes"
          value={pending}
          icon={<Clock3 className="size-5" />}
          tone="bg-amber-50 text-amber-900"
        />
        <SummaryCard
          label="Verificados"
          value={verified}
          icon={<CheckCircle2 className="size-5" />}
          tone="bg-emerald-50 text-emerald-900"
        />
        <SummaryCard
          label="Total de pedidos"
          value={orders.length}
          icon={<PackageCheck className="size-5" />}
          tone="bg-white text-black"
        />
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {[
          ["todos", "Todos"],
          ["pendiente", "Pendientes"],
          ["verificado", "Verificados"],
          ["rechazado", "Rechazados"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`shrink-0 border px-3 py-2 text-xs font-semibold ${statusFilter === value ? "border-black bg-black text-white" : "border-black/15 bg-white"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {ordersQuery.isLoading ? (
        <CenteredMessage message="Cargando pedidos…" />
      ) : ordersQuery.error ? (
        <CenteredMessage
          message={
            ordersQuery.error instanceof Error && ordersQuery.error.message.includes("JWT")
              ? "Tu sesión administrativa venció. Volvé a iniciar sesión."
              : "No se pudieron cargar los pedidos. Intentá nuevamente."
          }
        />
      ) : filtered.length === 0 ? (
        <CenteredMessage message="No hay pedidos en esta sección." />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const items = Array.isArray(order.items)
              ? (order.items as Array<Record<string, unknown>>)
              : [];
            return (
              <article key={order.id} className="border border-black/10 bg-white p-4 sm:p-5">
                <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr_auto] lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-bold">#{order.order_number}</h3>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-2 text-sm font-semibold">{order.customer_name}</p>
                    <p className="text-xs leading-5 text-black/50">
                      {order.customer_phone}
                      <br />
                      {order.customer_email}
                    </p>
                    {order.customer_address && (
                      <p className="mt-2 text-xs text-black/60">{order.customer_address}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
                      Productos
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {items.map((item, index) => {
                        const quantity = Number(item.quantity ?? 1);
                        const unitPrice = Number(item.unit_price);
                        const originalUnitPrice = Number(item.original_unit_price);
                        const hasFinalPrice = Number.isFinite(unitPrice) && unitPrice >= 0;
                        const finalSubtotal = hasFinalPrice
                          ? unitPrice * quantity
                          : Number(item.subtotal ?? 0);
                        const hasDiscount =
                          hasFinalPrice &&
                          Number.isFinite(originalUnitPrice) &&
                          originalUnitPrice > unitPrice;

                        return (
                          <li key={index} className="flex justify-between gap-4">
                            <span>
                              {quantity}× {String(item.product_name ?? item.name ?? "Producto")}
                              {item.presentation_ml ? ` · ${String(item.presentation_ml)} ml` : ""}
                              {hasFinalPrice && (
                                <span className="mt-0.5 block text-xs text-black/45">
                                  {formatGs(unitPrice)} c/u
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 text-right">
                              {hasDiscount && (
                                <span className="block text-xs text-black/40 line-through">
                                  {formatGs(originalUnitPrice * quantity)}
                                </span>
                              )}
                              <span
                                className={
                                  hasDiscount ? "font-semibold text-red-700" : "text-black/50"
                                }
                              >
                                {formatGs(finalSubtotal)}
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-3 flex items-center justify-between border-t border-black/10 pt-3 text-sm font-bold">
                      <span>Total</span>
                      <span>{formatGs(order.total_amount)}</span>
                    </div>
                    <p className="mt-2 text-xs text-black/45">
                      {new Date(order.created_at).toLocaleString("es-PY", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      · {order.payment_method}
                    </p>
                  </div>
                  <div className="flex min-w-40 flex-col gap-2">
                    {order.receipt_url ? (
                      <a
                        href={order.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 border border-black px-3 py-2.5 text-xs font-semibold hover:bg-black hover:text-white"
                      >
                        <ExternalLink className="size-4" /> Ver comprobante
                      </a>
                    ) : (
                      <span className="border border-dashed border-black/20 px-3 py-2.5 text-center text-xs text-black/45">
                        Sin comprobante
                      </span>
                    )}
                    <button
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({ orderId: order.id, status: "verificado" })
                      }
                      className="inline-flex items-center justify-center gap-2 bg-emerald-700 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      <CheckCircle2 className="size-4" /> Verificar
                    </button>
                    <button
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({ orderId: order.id, status: "rechazado" })
                      }
                      className="inline-flex items-center justify-center gap-2 border border-red-200 px-3 py-2.5 text-xs font-semibold text-red-700 disabled:opacity-50"
                    >
                      <XCircle className="size-4" /> Rechazar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className={`border border-black/10 p-5 ${tone}`}>
      <div className="flex items-center justify-between">
        {icon}
        <span className="font-display text-3xl font-bold">{value}</span>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider">{label}</p>
    </div>
  );
}
function StatusBadge({ status }: { status: string }) {
  const style =
    status === "verificado"
      ? "bg-emerald-100 text-emerald-800"
      : status === "rechazado"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800";
  return (
    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${style}`}>
      {status}
    </span>
  );
}

const MAX_DISCOUNT_PERCENT = 30;
const MIN_PROFIT_PERCENT = 10;
const PRICE_ROUNDING = 1_000;

function calculateDiscountProposal(product: AdminDiscountProduct) {
  const salePrice = Number(product.sale_price);
  const purchasePrice = Number(product.purchase_price);
  if (!Number.isFinite(salePrice) || salePrice <= 0) return null;
  if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) return null;

  const generalPromotionPrice =
    Math.ceil((salePrice * (1 - MAX_DISCOUNT_PERCENT / 100)) / PRICE_ROUNDING) * PRICE_ROUNDING;
  const minimumProfitablePrice =
    Math.ceil((purchasePrice * (1 + MIN_PROFIT_PERCENT / 100)) / PRICE_ROUNDING) * PRICE_ROUNDING;
  const finalPrice = Math.max(generalPromotionPrice, minimumProfitablePrice);
  if (finalPrice >= salePrice) return null;

  return {
    finalPrice,
    // La columna del backend conserva dos decimales; usamos la misma precisión
    // para que una propuesta guardada no vuelva a aparecer como pendiente.
    discountPercent: Math.round((1 - finalPrice / salePrice) * 10_000) / 100,
  };
}

function ProductDiscountManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const productsQuery = useQuery({
    queryKey: ["admin-products-discounts"],
    queryFn: async () => {
      const { data, error } = await inventario
        .from("products")
        .select("id,name,sku,image_url,purchase_price,sale_price,discount_percent")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AdminDiscountProduct[];
    },
  });
  const updateDiscount = useMutation({
    mutationFn: async ({
      product,
      discountPercent,
    }: {
      product: AdminDiscountProduct;
      discountPercent: number;
    }) => {
      const { error } = await inventario
        .from("products")
        .update({ discount_percent: discountPercent })
        .eq("id", product.id);
      if (error) throw error;
      return product;
    },
    onSuccess: async (product) => {
      setNotice(`Descuento de ${product.name} aprobado y publicado.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-products-discounts"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["featured-products-by-discount"] }),
      ]);
    },
  });

  const products = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return (productsQuery.data ?? []).filter(
      (product) =>
        !term ||
        product.name.toLocaleLowerCase().includes(term) ||
        product.sku.toLocaleLowerCase().includes(term),
    );
  }, [productsQuery.data, search]);
  const pendingProposals = useMemo(
    () =>
      (productsQuery.data ?? []).flatMap((product) => {
        const proposal = calculateDiscountProposal(product);
        const currentDiscount = Number(product.discount_percent ?? 0);
        if (!proposal || Math.abs(currentDiscount - proposal.discountPercent) < 0.005) return [];
        return [{ product, discountPercent: proposal.discountPercent }];
      }),
    [productsQuery.data],
  );
  const bulkUpdateDiscounts = useMutation({
    mutationFn: async (
      approvals: Array<{ product: AdminDiscountProduct; discountPercent: number }>,
    ) => {
      const batchSize = 10;
      for (let start = 0; start < approvals.length; start += batchSize) {
        const batch = approvals.slice(start, start + batchSize);
        await Promise.all(
          batch.map(async ({ product, discountPercent }) => {
            const { error } = await inventario
              .from("products")
              .update({ discount_percent: discountPercent })
              .eq("id", product.id);
            if (error) throw error;
          }),
        );
      }
      return approvals.length;
    },
    onSuccess: (approvedCount) => {
      setNotice(`${approvedCount} descuentos aprobados y publicados correctamente.`);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-products-discounts"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["featured-products-by-discount"] }),
      ]);
    },
  });

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Propuestas de descuento
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-black/55">
            Calculadas con hasta 30% OFF, redondeo a Gs. 1.000 y al menos 10% de margen sobre el
            costo. Solo se publican cuando las aprobás.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <label className="relative block w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/40" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar producto o SKU…"
              className="h-11 w-full border border-black/15 bg-white pl-10 pr-3 text-sm outline-none focus:border-black"
            />
          </label>
          <button
            disabled={
              pendingProposals.length === 0 ||
              bulkUpdateDiscounts.isPending ||
              updateDiscount.isPending
            }
            onClick={() => {
              const confirmed = window.confirm(
                `¿Aprobar y publicar las ${pendingProposals.length} propuestas pendientes?`,
              );
              if (!confirmed) return;
              setNotice("");
              updateDiscount.reset();
              bulkUpdateDiscounts.mutate(pendingProposals);
            }}
            className="h-11 bg-black px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            {bulkUpdateDiscounts.isPending
              ? "Publicando todos…"
              : `Aprobar todos (${pendingProposals.length})`}
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-5 border border-green-700/20 bg-green-50 p-3 text-sm text-green-800">
          {notice}
        </div>
      )}
      {(updateDiscount.error || bulkUpdateDiscounts.error) && (
        <div className="mb-5 border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
          No se pudieron guardar todos los descuentos. Se actualizó la lista para reflejar cuáles
          quedaron aprobados. Verificá tus permisos antes de volver a intentar.
        </div>
      )}

      {productsQuery.isLoading ? (
        <CenteredMessage message="Calculando propuestas…" />
      ) : productsQuery.error ? (
        <CenteredMessage message="No se pudieron cargar costos y precios. Verificá tus permisos." />
      ) : (
        <div className="overflow-x-auto border border-black/10 bg-white">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-black/10 bg-black/[0.03] text-[10px] uppercase tracking-[0.16em] text-black/50">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Costo</th>
                <th className="px-4 py-3">Precio lista</th>
                <th className="px-4 py-3">Propuesta</th>
                <th className="px-4 py-3">Descuento</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {products.map((product) => {
                const proposal = calculateDiscountProposal(product);
                const currentDiscount = Number(product.discount_percent ?? 0);
                const isApproved =
                  proposal && Math.abs(currentDiscount - proposal.discountPercent) < 0.005;
                const isPending =
                  updateDiscount.isPending && updateDiscount.variables?.product.id === product.id;

                return (
                  <tr key={product.id}>
                    <td className="px-4 py-4">
                      <span className="block font-semibold">{product.name}</span>
                      <span className="text-xs text-black/45">{product.sku}</span>
                    </td>
                    <td className="px-4 py-4">{formatGs(Number(product.purchase_price))}</td>
                    <td className="px-4 py-4">{formatGs(Number(product.sale_price))}</td>
                    <td className="px-4 py-4 font-semibold">
                      {proposal ? formatGs(proposal.finalPrice) : "Sin margen"}
                    </td>
                    <td className="px-4 py-4">
                      {proposal ? `${proposal.discountPercent.toFixed(0)}% OFF` : "—"}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="size-4" /> Aprobado
                        </span>
                      ) : (
                        <button
                          disabled={!proposal || isPending || bulkUpdateDiscounts.isPending}
                          onClick={() => {
                            if (!proposal) return;
                            setNotice("");
                            bulkUpdateDiscounts.reset();
                            updateDiscount.mutate({
                              product,
                              discountPercent: proposal.discountPercent,
                            });
                          }}
                          className="bg-black px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          {isPending ? "Publicando…" : "Aprobar"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {products.length === 0 && <CenteredMessage message="No encontramos productos." />}
        </div>
      )}
    </section>
  );
}

function ProductImageManager({ email }: { email: string }) {
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const productsQuery = useQuery({
    queryKey: ["admin-products-images"],
    queryFn: async () => {
      const { items } = await getEcommerceProducts({ page: 1, limit: 500 });
      return items as AdminProduct[];
    },
  });

  const products = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    const filtered = term
      ? (productsQuery.data ?? []).filter(
          (product) =>
            product.name.toLocaleLowerCase().includes(term) ||
            product.sku.toLocaleLowerCase().includes(term),
        )
      : (productsQuery.data ?? []);

    return [...filtered].sort(
      (first, second) =>
        Number(Boolean(first.image_url?.trim())) - Number(Boolean(second.image_url?.trim())),
    );
  }, [productsQuery.data, search]);

  const uploadImage = async (product: AdminProduct, file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen no puede superar los 2 MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Formato no permitido. Usá JPG, PNG o WebP.");
      return;
    }
    setBusyId(product.id);
    setError("");
    setNotice("");
    const body = new FormData();
    body.append("file", file);
    body.append("product_id", product.id);
    const { error } = await inventario.functions.invoke("upload-product-image", { body });
    if (error)
      setError(`No se pudo subir la imagen de ${product.name}. Tu usuario debe tener rol admin.`);
    else {
      setNotice(`Imagen de ${product.name} guardada correctamente.`);
      await productsQuery.refetch();
    }
    setBusyId(null);
  };

  const deleteImage = async (product: AdminProduct) => {
    if (!window.confirm(`¿Eliminar la imagen de ${product.name}?`)) return;
    setBusyId(product.id);
    setError("");
    setNotice("");
    const { error } = await inventario.functions.invoke("delete-product-image", {
      body: { product_id: product.id },
    });
    if (error) setError(`No se pudo eliminar la imagen de ${product.name}.`);
    else {
      setNotice(`Imagen de ${product.name} eliminada.`);
      await productsQuery.refetch();
    }
    setBusyId(null);
  };

  return (
    <section>
      <div>
        <h2 className="font-display text-3xl font-bold tracking-tight">Imágenes de productos</h2>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-black/55">Sesión iniciada como {email}</p>
            <p className="mt-1 text-xs text-black/45">
              JPG, PNG o WebP · máximo 2 MB · una imagen por producto
            </p>
          </div>
          <label className="relative block w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/40" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar producto o SKU…"
              className="h-11 w-full border border-black/15 bg-white pl-10 pr-3 text-sm outline-none focus:border-black"
            />
          </label>
        </div>
        {notice && (
          <div className="mb-5 border border-green-700/20 bg-green-50 p-3 text-sm text-green-800">
            {notice}
          </div>
        )}
        {error && (
          <div className="mb-5 border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {productsQuery.isLoading ? (
          <CenteredMessage message="Cargando productos…" />
        ) : productsQuery.error ? (
          <CenteredMessage message="No se pudieron cargar los productos." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <article key={product.id} className="flex gap-4 border border-black/10 bg-white p-4">
                <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden bg-[#f4f4f2]">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <ImagePlus className="size-8 text-black/20" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-2 text-sm font-semibold leading-snug">
                    {product.name}
                  </h2>
                  <p className="mt-1 text-xs text-black/45">
                    {product.image_url ? "Con imagen" : "Sin imagen"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <label
                      className={`inline-flex cursor-pointer items-center gap-1.5 bg-black px-3 py-2 text-xs font-semibold text-white ${busyId === product.id ? "pointer-events-none opacity-50" : ""}`}
                    >
                      {product.image_url ? (
                        <Upload className="size-3.5" />
                      ) : (
                        <ImagePlus className="size-3.5" />
                      )}
                      {product.image_url ? "Reemplazar" : "Subir"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadImage(product, file);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    {product.image_url && (
                      <button
                        disabled={busyId === product.id}
                        onClick={() => void deleteImage(product)}
                        className="inline-flex items-center gap-1.5 border border-black/15 px-3 py-2 text-xs font-semibold hover:border-destructive hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" /> Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CenteredMessage({ message }: { message: string }) {
  return (
    <div className="flex min-h-52 items-center justify-center text-sm text-black/50">{message}</div>
  );
}
