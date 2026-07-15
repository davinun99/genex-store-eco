import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useState, useEffect } from "react";
import {
  inventario,
  type InventarioCategory,
  type InventarioProduct,
} from "@/integrations/inventario/client";
import { Header } from "@/components/header";
import { ProductCard } from "@/components/product-card";
import { STORE } from "@/lib/store-config";
import { ArrowRight, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 12;

const OTROS_IDS = ["684e85ce-139e-4272-8251-b08150768e3a", "35995509-7b9d-48e8-a00d-6d63bbd02fd4"];
const OTROS_PRIMARY_ID = "684e85ce-139e-4272-8251-b08150768e3a";

const searchSchema = z.object({
  cat: fallback(z.string(), "all").default("all"),
  page: fallback(z.number().int().min(1), 1).default(1),
  q: fallback(z.string(), "").default(""),
});
type SearchParams = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: `${STORE.name} — Comprar online en Paraguay` },
      {
        name: "description",
        content: `Catalogo de ${STORE.name}: accesorios, vidrios, perfumes y mas. Pedidos online con pago por transferencia.`,
      },
      { property: "og:title", content: STORE.name },
      { property: "og:description", content: STORE.tagline },
    ],
  }),
  component: Home,
});

function Home() {
  const { cat, page, q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [searchInput, setSearchInput] = useState(q);

  // Debounce search input -> URL
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== q) {
        navigate({ search: (prev: SearchParams) => ({ ...prev, q: searchInput, page: 1 }) });
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await inventario
        .from("categories")
        .select("id,name,description,is_active")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as InventarioCategory[];
    },
  });

  const productsQuery = useQuery({
    queryKey: ["products", cat, page, q],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = inventario
        .from("products")
        .select(
          "id,name,sku,description,current_stock,min_stock,purchase_price,sale_price,is_active,category_id,created_at,updated_at",
          { count: "exact" },
        )
        .eq("is_active", true)
        .order("name", { ascending: true })
        .range(from, to);
      if (cat !== "all") {
        if (OTROS_IDS.includes(cat)) {
          query = query.in("category_id", OTROS_IDS);
        } else {
          query = query.eq("category_id", cat);
        }
      }
      if (q.trim()) query = query.or(`name.ilike.%${q.trim()}%,sku.ilike.%${q.trim()}%`);
      const { data, error, count } = await query;
      if (error) throw error;
      return { items: (data ?? []) as InventarioProduct[], total: count ?? 0 };
    },
  });

  const total = productsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const categories = categoriesQuery.data ?? [];
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name;
  const error = productsQuery.error || categoriesQuery.error;

  const setCat = (newCat: string) =>
    navigate({ search: (prev: SearchParams) => ({ ...prev, cat: newCat, page: 1 }) });
  const setPage = (newPage: number) =>
    navigate({ search: (prev: SearchParams) => ({ ...prev, page: newPage }) });

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={setSearchInput} searchValue={searchInput} />

      <section className="border-b border-black bg-black text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="max-w-4xl">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/55">
              Tienda online · Paraguay
            </p>
            <h1 className="font-display text-5xl font-bold leading-[0.92] tracking-[-0.065em] sm:text-7xl lg:text-8xl">
              LO QUE BUSCÁS.
              <br />
              SIN COMPLICACIONES.
            </h1>
            <p className="mt-7 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
              Tecnología y accesorios con stock real. Elegí, agregá al carrito y coordinamos la
              entrega.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#catalogo"
                className="inline-flex items-center gap-2 border border-white bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
              >
                Ver catálogo <ArrowRight className="size-4" />
              </a>
              <a
                href={`https://wa.me/${STORE.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border border-white/35 px-5 py-3 text-sm font-semibold transition hover:border-white"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section id="catalogo" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-6">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Productos
            </p>
            <h2 className="font-display text-3xl font-bold uppercase tracking-[-0.045em] sm:text-4xl">
              {cat === "all" ? "Catálogo" : (categoryName(cat) ?? "Catálogo")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {productsQuery.isLoading
                ? "Cargando productos..."
                : `${total} producto(s) · pagina ${page} de ${totalPages}`}
            </p>
          </div>
        </div>

        {/* Mobile search */}
        <div className="mb-4 md:hidden">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar productos..."
            className="h-11 w-full border-0 border-b border-black/20 bg-white px-1 text-sm outline-none focus:border-black"
          />
        </div>

        {/* Category tabs */}
        <div className="mb-6 -mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-2 sm:flex-wrap sm:overflow-visible">
          <button
            onClick={() => setCat("all")}
            className={`shrink-0 border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider transition ${
              cat === "all"
                ? "border-transparent bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "border-border bg-[var(--color-surface)] hover:bg-[var(--color-surface-strong)]"
            }`}
          >
            Todos
          </button>
          {categories
            .filter((c) => c.id !== "35995509-7b9d-48e8-a00d-6d63bbd02fd4")
            .map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id === OTROS_PRIMARY_ID ? OTROS_PRIMARY_ID : c.id)}
                className={`shrink-0 border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider transition ${
                  (OTROS_IDS.includes(cat) && c.id === OTROS_PRIMARY_ID) ||
                  (cat === c.id && !OTROS_IDS.includes(cat))
                    ? "border-transparent bg-(--color-primary) text-(--color-primary-foreground)"
                    : "border-border bg-(--color-surface) hover:bg-(--color-surface-strong)"
                }`}
              >
                {c.name}
              </button>
            ))}
        </div>

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            No pudimos cargar los productos. Verifica que la base de Inventario Amigo permita
            lectura publica para visitantes.
          </div>
        )}

        {productsQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse rounded-2xl bg-[var(--color-surface-strong)]"
              />
            ))}
          </div>
        ) : (productsQuery.data?.items.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-border bg-[var(--color-surface)] p-10 text-center text-sm text-muted-foreground">
            No encontramos productos para tu busqueda.
          </div>
        ) : (
          <>
            <div
              className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${productsQuery.isFetching ? "opacity-60" : ""}`}
            >
              {productsQuery.data!.items.map((p) => (
                <ProductCard key={p.id} product={p} categoryName={categoryName(p.category_id)} />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            )}
          </>
        )}
      </section>

      <footer className="border-t border-white/10 bg-black py-12 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-white/50 sm:px-6 lg:px-8">
          <div className="font-display text-2xl font-bold tracking-[-0.08em] text-white">
            GENEX.
          </div>
          <div className="mt-1">
            {STORE.tagline} · WhatsApp +{STORE.whatsapp}
          </div>
          <div className="mt-3">
            <Link to="/checkout" className="underline-offset-2 hover:underline">
              Finalizar compra
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const pages: (number | "...")[] = [];
  const push = (n: number | "...") => pages.push(n);
  const window = 1;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - window && i <= page + window)) {
      push(i);
    } else if (pages[pages.length - 1] !== "...") {
      push("...");
    }
  }

  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="Paginacion">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-[var(--color-surface)] px-3 text-xs font-semibold transition hover:bg-[var(--color-surface-strong)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft className="size-3.5" /> Anterior
      </button>
      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`e-${idx}`} className="px-2 text-xs text-muted-foreground">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`h-9 min-w-9 rounded-full border px-3 text-xs font-semibold transition ${
              p === page
                ? "border-transparent bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "border-border bg-[var(--color-surface)] hover:bg-[var(--color-surface-strong)]"
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-[var(--color-surface)] px-3 text-xs font-semibold transition hover:bg-[var(--color-surface-strong)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Siguiente <ChevronRight className="size-3.5" />
      </button>
    </nav>
  );
}
