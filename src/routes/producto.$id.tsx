import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { inventario, type InventarioProduct } from "@/integrations/inventario/client";
import { getEcommerceProduct } from "@/integrations/inventario/ecommerce-api";
import { Header } from "@/components/header";
import { StoreError, StoreLoader } from "@/components/store-feedback";
import { friendlyErrorMessage } from "@/lib/store-errors";
import { useCart } from "@/contexts/cart-context";
import { formatGs } from "@/lib/format";
import { STORE } from "@/lib/store-config";
import { getPromotionPrice } from "@/lib/promotion";
import { isStorefrontProduct } from "@/lib/storefront-product";
import { cacheCatalogProduct, getCachedCatalogProduct } from "@/lib/catalog-product-cache";
import {
  getProductIdFromRouteParam,
  getProductRouteParam,
  slugifyProductName,
} from "@/lib/product-url";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingBag,
  PackageCheck,
  PackageX,
  ZoomIn,
} from "lucide-react";
import { useState } from "react";
import {
  calculateDecantPrice,
  DECANT_SIZES,
  getBottleVolumeMl,
  isPerfumeProduct,
} from "@/lib/perfume-decants";

async function fetchProduct(id: string): Promise<InventarioProduct | null> {
  const product = await getEcommerceProduct(id);
  return product && product.current_stock > 0 && isStorefrontProduct(product) ? product : null;
}

async function fetchProductBySlug(slug: string): Promise<InventarioProduct | null> {
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await inventario
      .from("products")
      .select("id,name,sku")
      .eq("is_active", true)
      .gt("current_stock", 0)
      .order("id")
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const match = (data ?? []).find(
      (product) => slugifyProductName(product.name) === slug && isStorefrontProduct(product),
    );
    if (match) return fetchProduct(match.id);
    if (!data || data.length < pageSize) return null;
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const Route = createFileRoute("/producto/$id")({
  loader: async ({ params }) => {
    const legacyId = getProductIdFromRouteParam(params.id);
    const isLegacyUrl = legacyId !== params.id || isUuid(params.id);
    const cachedProduct =
      !isLegacyUrl && typeof window !== "undefined"
        ? getCachedCatalogProduct(params.id)
        : undefined;
    const product = isLegacyUrl
      ? await fetchProduct(legacyId)
      : cachedProduct ?? (await fetchProductBySlug(params.id));
    if (!product) return null;

    if (typeof window !== "undefined") cacheCatalogProduct(product);

    const friendlyParam = getProductRouteParam(product.name);
    if (params.id !== friendlyParam) {
      throw redirect({
        to: "/producto/$id",
        params: { id: friendlyParam },
        replace: true,
      });
    }

    return product;
  },
  head: ({ loaderData: product, params }) => {
    const routeParam = product ? getProductRouteParam(product.name) : params.id;
    const url = `${STORE.url}/producto/${routeParam}`;

    if (!product) {
      return {
        meta: [
          { title: `Producto no disponible — ${STORE.name}` },
          { name: "robots", content: "noindex" },
        ],
      };
    }

    const title = `${product.name} — ${STORE.name}`;
    const promotion = getPromotionPrice(product);
    const description = (
      product.description?.trim() ||
      `Comprá ${product.name} en ${STORE.name}. Pago por transferencia y entrega en Paraguay.`
    ).slice(0, 160);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(product.image_url ? [{ property: "og:image", content: product.image_url }] : []),
        { name: "twitter:card", content: product.image_url ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(product.image_url ? [{ name: "twitter:image", content: product.image_url }] : []),
        { property: "product:price:amount", content: String(promotion.price) },
        { property: "product:price:currency", content: "PYG" },
        {
          "script:ld+json": {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description,
            sku: product.sku,
            ...(product.image_url ? { image: [product.image_url] } : {}),
            offers: {
              "@type": "Offer",
              url,
              priceCurrency: "PYG",
              price: promotion.price,
              availability:
                product.current_stock > 0
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
              hasMerchantReturnPolicy: {
                "@type": "MerchantReturnPolicy",
                applicableCountry: "PY",
                returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
                merchantReturnDays: STORE.returnPolicy.days,
                returnMethod: "https://schema.org/ReturnByMail",
                returnFees: STORE.returnPolicy.customerPaysReturnShipping
                  ? "https://schema.org/ReturnShippingFees"
                  : "https://schema.org/FreeReturn",
              },
              shippingDetails: {
                "@type": "OfferShippingDetails",
                shippingRate: {
                  "@type": "MonetaryAmount",
                  value: STORE.shipping.typicalCostPyg,
                  currency: "PYG",
                },
                shippingDestination: {
                  "@type": "DefinedRegion",
                  addressCountry: "PY",
                },
                deliveryTime: {
                  "@type": "ShippingDeliveryTime",
                  handlingTime: {
                    "@type": "QuantitativeValue",
                    minValue: 0,
                    maxValue: 1,
                    unitCode: "DAY",
                  },
                  transitTime: {
                    "@type": "QuantitativeValue",
                    minValue: 0,
                    maxValue: STORE.shipping.sameDay ? 0 : 1,
                    unitCode: "DAY",
                  },
                },
              },
            },
          },
        },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  pendingComponent: () => (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <StoreLoader message="Preparando el producto" />
      </div>
    </div>
  ),
  errorComponent: ({ error }) => <ProductLoadError error={error} />,
  component: ProductPage,
});

function ProductLoadError({ error }: { error: unknown }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <StoreError
          title="No pudimos abrir el producto"
          message={friendlyErrorMessage(error)}
          onRetry={() => router.invalidate()}
        />
      </div>
    </div>
  );
}

function ProductPage() {
  const product = Route.useLoaderData();
  const navigate = useNavigate();
  const { addItem, setOpen } = useCart();
  const [qty, setQty] = useState(1);
  const [selectedSizeMl, setSelectedSizeMl] = useState<number | null>(null);

  const categoryQuery = useQuery({
    queryKey: ["category", product?.category_id],
    enabled: Boolean(product?.category_id),
    queryFn: async () => {
      const { data, error } = await inventario
        .from("categories")
        .select("name")
        .eq("id", product!.category_id)
        .maybeSingle();
      if (error) throw error;
      return data?.name;
    },
  });

  const isPerfume = product ? isPerfumeProduct(categoryQuery.data, product.name) : false;
  const bottleVolumeMl = product ? getBottleVolumeMl(product.name, product.description) : 100;
  const promotion = product ? getPromotionPrice(product) : null;
  const selectedPrice = product
    ? selectedSizeMl
      ? calculateDecantPrice(promotion!.price, bottleVolumeMl, selectedSizeMl)
      : promotion!.price
    : 0;
  const selectedOriginalPrice = product
    ? selectedSizeMl
      ? calculateDecantPrice(promotion!.originalPrice, bottleVolumeMl, selectedSizeMl)
      : promotion!.originalPrice
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Link
          to="/"
          replace
          className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Volver al catálogo
        </Link>

        {!product ? (
          <StoreError
            title="Este producto ya no está disponible"
            message="Puede haberse agotado o dejado de estar disponible. Volvé al catálogo para ver otras opciones."
            onRetry={() => navigate({ to: "/" })}
            actionLabel="Volver al catálogo"
          />
        ) : (
          <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
            <div className="mx-auto w-full max-w-[620px]">
              {product.image_url ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="group relative flex aspect-square w-full items-center justify-center overflow-hidden border border-black/10 bg-[#f4f4f2]"
                      aria-label={`Ampliar imagen de ${product.name}`}
                    >
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-contain p-5 transition-transform duration-300 group-hover:scale-[1.03] sm:p-8"
                      />
                      <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 bg-white/95 px-3 py-2 text-xs font-semibold text-black shadow-sm">
                        <ZoomIn className="size-4" /> Ampliar imagen
                      </span>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl border-black/10 bg-[#f4f4f2] p-3 sm:p-6">
                    <DialogTitle className="sr-only">Imagen ampliada: {product.name}</DialogTitle>
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="max-h-[82dvh] w-full object-contain"
                    />
                  </DialogContent>
                </Dialog>
              ) : (
                <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 border border-black/10 bg-[#f4f4f2]">
                  <span className="font-display text-8xl font-bold text-black/10">
                    {product.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Imagen no disponible
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col lg:justify-center">
              <h1 className="font-display text-3xl font-bold uppercase leading-[0.98] tracking-[-0.055em] sm:text-4xl xl:text-5xl">
                {product.name}
              </h1>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <div className="font-display text-3xl font-bold text-black xl:text-4xl">
                  {formatGs(selectedPrice)}
                </div>
                {promotion?.isPromoted && (
                  <>
                    <div className="pb-1 text-base text-muted-foreground line-through">
                      {formatGs(selectedOriginalPrice)}
                    </div>
                    <span className="mb-1 bg-[#f7e600] px-2 py-1 text-xs font-bold text-black">
                      {promotion.discountPercent.toFixed(0)}% OFF
                    </span>
                  </>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm">
                {product.current_stock > 0 ? (
                  <span className="inline-flex items-center gap-2 border border-black/15 px-3 py-1.5 font-semibold">
                    <PackageCheck className="size-4" /> {product.current_stock} disponibles
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-destructive/15 px-3 py-1 font-semibold text-destructive">
                    <PackageX className="size-3.5" /> Sin stock
                  </span>
                )}
              </div>

              {product.description && (
                <p className="mt-4 line-clamp-3 border-t border-black/10 pt-4 text-sm leading-6 text-muted-foreground xl:line-clamp-4">
                  {product.description}
                </p>
              )}

              {product.current_stock > 0 && (
                <div className="mt-5 border border-black/15 p-4 xl:p-5">
                  {isPerfume && (
                    <fieldset className="mb-5 border-b border-black/10 pb-5">
                      <legend className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Elegí la presentación
                      </legend>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <PresentationButton
                          label={`Completo · ${bottleVolumeMl} ml`}
                          price={promotion!.price}
                          selected={selectedSizeMl === null}
                          onClick={() => setSelectedSizeMl(null)}
                        />
                        {DECANT_SIZES.map((sizeMl) => (
                          <PresentationButton
                            key={sizeMl}
                            label={`${sizeMl} ml`}
                            price={calculateDecantPrice(promotion!.price, bottleVolumeMl, sizeMl)}
                            selected={selectedSizeMl === sizeMl}
                            onClick={() => setSelectedSizeMl(sizeMl)}
                          />
                        ))}
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        Los tamaños de 5 ml y 10 ml se entregan fraccionados en atomizador.
                      </p>
                    </fieldset>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Cantidad
                      </p>
                      <div className="mt-2 inline-flex items-center border border-black">
                        <button
                          onClick={() => setQty((q) => Math.max(1, q - 1))}
                          className="grid size-10 place-items-center transition hover:bg-black hover:text-white"
                          aria-label="Restar una unidad"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="min-w-11 text-center text-sm font-bold">{qty}</span>
                        <button
                          onClick={() => setQty((q) => Math.min(product.current_stock, q + 1))}
                          className="grid size-10 place-items-center transition hover:bg-black hover:text-white disabled:opacity-30"
                          disabled={qty >= product.current_stock}
                          aria-label="Sumar una unidad"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Total
                      </p>
                      <p className="mt-2 font-display text-xl font-bold">
                        {formatGs(selectedPrice * qty)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      addItem(
                        {
                          id: product.id,
                          name: product.name,
                          price: selectedPrice,
                          originalPrice:
                            selectedPrice < selectedOriginalPrice
                              ? selectedOriginalPrice
                              : undefined,
                          stock: product.current_stock,
                          sku: product.sku,
                          imageUrl: product.image_url,
                          sizeMl: selectedSizeMl ?? undefined,
                        },
                        qty,
                      );
                      setOpen(true);
                    }}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 border border-black bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
                  >
                    <ShoppingBag className="size-4" /> Agregar al carrito
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PresentationButton({
  label,
  price,
  selected,
  onClick,
}: {
  label: string;
  price: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-14 border px-2 py-2 text-center transition ${
        selected ? "border-black bg-black text-white" : "border-black/20 hover:border-black"
      }`}
    >
      <span className="block text-xs font-bold">{label}</span>
      <span
        className={`mt-0.5 block text-[10px] ${selected ? "text-white/75" : "text-muted-foreground"}`}
      >
        {formatGs(price)}
      </span>
    </button>
  );
}
