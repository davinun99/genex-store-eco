import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useState, useEffect, useRef } from "react";
import {
  inventario,
  type InventarioCategory,
  type InventarioProduct,
} from "@/integrations/inventario/client";
import { Header } from "@/components/header";
import { ProductCard } from "@/components/product-card";
import { StoreError, StoreLoader } from "@/components/store-feedback";
import { friendlyErrorMessage } from "@/lib/store-errors";
import { STORE } from "@/lib/store-config";
import {
  ArrowRight,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  MapPin,
} from "lucide-react";

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
          "id,name,sku,description,current_stock,min_stock,purchase_price,sale_price,is_active,category_id,created_at,updated_at,image_url",
          { count: "exact" },
        )
        .eq("is_active", true)
        .gt("current_stock", 0)
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
    navigate({
      search: (prev: SearchParams) => ({ ...prev, cat: newCat, page: 1 }),
      resetScroll: false,
    });
  const setPage = (newPage: number) => {
    navigate({
      search: (prev: SearchParams) => ({ ...prev, page: newPage }),
      resetScroll: false,
    });
    window.setTimeout(() => {
      document.getElementById("catalogo")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };
  const selectShowcaseCategory = (newCat: string) => {
    setCat(newCat);
    window.setTimeout(() => {
      document.getElementById("catalogo")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

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

      <CategoryShowcase
        categories={categories}
        isLoading={categoriesQuery.isLoading}
        activeCategory={cat}
        onSelect={selectShowcaseCategory}
        products={(productsQuery.data?.items ?? []).filter((product) =>
          Boolean(product.image_url?.trim()),
        )}
        productsLoading={productsQuery.isLoading}
        categoryName={categoryName}
      />

      {/* Catalog */}
      <section
        id="catalogo"
        className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-5 border-b border-black/10 pb-6">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              {cat === "all" ? "Todos los productos" : "Categoría seleccionada"}
            </p>
            <h2 className="font-display text-3xl font-bold uppercase tracking-[-0.045em] sm:text-4xl">
              {cat === "all" ? "Catálogo" : (categoryName(cat) ?? "Catálogo")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {productsQuery.isLoading
                ? "Cargando productos..."
                : `${total} producto(s) con stock · página ${page} de ${totalPages}`}
            </p>
          </div>
          <a
            href="#categorias"
            className="inline-flex items-center gap-2 border border-black bg-white px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition hover:bg-black hover:text-white"
          >
            {cat === "all" ? "Explorar categorías" : "Cambiar categoría"}
            <ArrowRight className="size-3.5" />
          </a>
        </div>

        {/* Mobile search */}
        <div className="mb-4 mt-6 md:hidden">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar productos..."
            className="h-11 w-full border-0 border-b border-black/20 bg-white px-1 text-sm outline-none focus:border-black"
          />
        </div>

        {error && (
          <div className="mt-6">
            <StoreError
              title="El catálogo no está disponible"
              message={friendlyErrorMessage(error)}
              onRetry={() => {
                void categoriesQuery.refetch();
                void productsQuery.refetch();
              }}
            />
          </div>
        )}

        {productsQuery.isLoading ? (
          <StoreLoader message="Cargando productos" />
        ) : (productsQuery.data?.items.length ?? 0) === 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-[var(--color-surface)] p-10 text-center text-sm text-muted-foreground">
            No encontramos productos para tu busqueda.
          </div>
        ) : (
          <>
            <div
              className={`mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${productsQuery.isFetching ? "opacity-60" : ""}`}
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

      <footer className="border-t border-white/10 bg-black py-14 text-white sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-2 md:items-end lg:px-8">
          <div className="text-center md:text-left">
            <div className="font-display text-3xl font-bold tracking-[-0.06em] text-white">
              GENEX STORE
            </div>
            <p className="mt-2 text-sm text-white/55 sm:text-base">{STORE.tagline}</p>
            <a
              href={`https://wa.me/${STORE.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm text-white/75 transition hover:text-white sm:text-base"
            >
              <MessageCircle className="size-4" />
              <span>WhatsApp</span>
              <span className="font-medium text-white">0984 849 454</span>
            </a>
            <div className="mt-5">
              <Link
                to="/checkout"
                className="text-sm text-white/60 underline decoration-white/25 underline-offset-4 transition hover:text-white sm:text-base"
              >
                Finalizar compra
              </Link>
            </div>
          </div>

          <div className="text-center md:text-right">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
              Ubicación de la tienda
            </p>
            <a
              href={STORE.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-md items-center justify-center gap-3 text-base font-medium leading-relaxed text-white transition hover:text-white/65 sm:text-lg md:justify-end"
            >
              <MapPin className="size-6 shrink-0" />
              <span className="underline decoration-white/30 underline-offset-4">
                {STORE.address}
              </span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CategoryShowcase({
  categories,
  isLoading,
  activeCategory,
  onSelect,
  products,
  productsLoading,
  categoryName,
}: {
  categories: InventarioCategory[];
  isLoading: boolean;
  activeCategory: string;
  onSelect: (category: string) => void;
  products: InventarioProduct[];
  productsLoading: boolean;
  categoryName: (category: string) => string | undefined;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const productTrackRef = useRef<HTMLDivElement>(null);
  const visibleCategories = categories.filter(
    (category) => category.id !== "35995509-7b9d-48e8-a00d-6d63bbd02fd4",
  );
  const scroll = (direction: -1 | 1) => {
    trackRef.current?.scrollBy({
      left: direction * Math.min(trackRef.current.clientWidth * 0.8, 720),
      behavior: "smooth",
    });
  };
  const scrollProducts = (direction: -1 | 1) => {
    productTrackRef.current?.scrollBy({
      left: direction * Math.min(productTrackRef.current.clientWidth * 0.8, 720),
      behavior: "smooth",
    });
  };

  return (
    <section className="overflow-hidden border-b border-black bg-white py-12 sm:py-16">
      <div className="mx-auto flex max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <div
          id="categorias"
          className="order-4 mb-7 mt-12 flex scroll-mt-20 items-end justify-between gap-4 border-t border-black/10 pt-10"
        >
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Explorá por categoría
            </p>
            <h2 className="font-display text-3xl font-bold uppercase tracking-[-0.045em] sm:text-4xl">
              Encontrá lo tuyo
            </h2>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scroll(-1)}
              className="grid size-11 place-items-center border border-black bg-white transition hover:bg-black hover:text-white"
              aria-label="Ver categorías anteriores"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              className="grid size-11 place-items-center border border-black bg-black text-white transition hover:bg-white hover:text-black"
              aria-label="Ver categorías siguientes"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          className="category-track order-5 -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
          aria-label="Categorías de productos"
        >
          {isLoading ? (
            <div className="w-full">
              <StoreLoader message="Cargando categorías" compact />
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onSelect("all")}
                className={`group relative flex h-44 w-[78vw] max-w-[300px] shrink-0 snap-start flex-col justify-between overflow-hidden border p-5 text-left transition sm:h-48 ${
                  activeCategory === "all"
                    ? "border-black bg-black text-white"
                    : "border-black bg-white hover:bg-black hover:text-white"
                }`}
              >
                <LayoutGrid className="size-6" strokeWidth={1.5} />
                <div>
                  <span className="font-display text-2xl font-bold uppercase tracking-[-0.04em]">
                    Todos
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-xs opacity-60">
                    Ver catálogo completo <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </button>

              {visibleCategories.map((category, index) => {
                const isActive =
                  (OTROS_IDS.includes(activeCategory) && category.id === OTROS_PRIMARY_ID) ||
                  activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onSelect(category.id)}
                    className={`group relative flex h-44 w-[78vw] max-w-[300px] shrink-0 snap-start flex-col justify-between overflow-hidden border p-5 text-left transition sm:h-48 ${
                      isActive
                        ? "border-black bg-black text-white"
                        : "border-black bg-white hover:bg-black hover:text-white"
                    }`}
                  >
                    <span className="font-display text-5xl font-bold tracking-[-0.08em] opacity-15">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <span className="line-clamp-2 font-display text-2xl font-bold uppercase leading-none tracking-[-0.04em]">
                        {category.name}
                      </span>
                      <span className="mt-2 flex items-center gap-2 text-xs opacity-60">
                        Ver productos{" "}
                        <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
        <p className="order-6 mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:hidden">
          Deslizá para explorar
        </p>

        <div className="order-1 mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Productos
            </p>
            <h3 className="font-display text-2xl font-bold uppercase tracking-[-0.04em] sm:text-3xl">
              {activeCategory === "all"
                ? "Destacados"
                : (categoryName(activeCategory) ?? "Destacados")}
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => scrollProducts(-1)}
              className="grid size-10 place-items-center border border-black bg-white transition hover:bg-black hover:text-white"
              aria-label="Ver productos anteriores"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollProducts(1)}
              className="grid size-10 place-items-center border border-black bg-black text-white transition hover:bg-white hover:text-black"
              aria-label="Ver productos siguientes"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>

        <div
          ref={productTrackRef}
          className="category-track order-2 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
          aria-label="Productos destacados"
        >
          {productsLoading ? (
            <div className="w-full">
              <StoreLoader message="Buscando destacados" compact />
            </div>
          ) : products.length > 0 ? (
            products.map((product) => (
              <div
                key={product.id}
                className="w-[72vw] max-w-[270px] shrink-0 snap-start sm:w-[260px]"
              >
                <ProductCard product={product} categoryName={categoryName(product.category_id)} />
              </div>
            ))
          ) : (
            <div className="w-full border border-black/10 p-8 text-center text-sm text-muted-foreground">
              No hay productos disponibles en esta categoría.
            </div>
          )}
        </div>

        <div className="order-3 mt-5 flex justify-end">
          <a
            href="#catalogo"
            className="inline-flex items-center gap-2 border-b border-black pb-1 text-xs font-semibold uppercase tracking-[0.14em]"
          >
            Ver catálogo completo <ArrowRight className="size-4" />
          </a>
        </div>
      </div>
    </section>
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
