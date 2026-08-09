import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { inventario, type InventarioProduct } from "@/integrations/inventario/client";
import { Header } from "@/components/header";
import { StoreError, StoreLoader } from "@/components/store-feedback";
import { friendlyErrorMessage } from "@/lib/store-errors";
import { useCart } from "@/contexts/cart-context";
import { formatGs } from "@/lib/format";
import { STORE } from "@/lib/store-config";
import { ArrowLeft, Minus, Plus, ShoppingBag, PackageCheck, PackageX } from "lucide-react";
import { useState } from "react";
import {
  calculateDecantPrice,
  DECANT_SIZES,
  getBottleVolumeMl,
  isPerfumeProduct,
} from "@/lib/perfume-decants";

async function fetchProduct(id: string): Promise<InventarioProduct | null> {
  const { data, error } = await inventario
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .gt("current_stock", 0)
    .maybeSingle();
  if (error) throw error;
  return data as InventarioProduct | null;
}

export const Route = createFileRoute("/producto/$id")({
  loader: async ({ params }) => fetchProduct(params.id),
  head: ({ loaderData: product, params }) => {
    const url = `${STORE.url}/producto/${params.id}`;

    if (!product) {
      return {
        meta: [
          { title: `Producto no disponible — ${STORE.name}` },
          { name: "robots", content: "noindex" },
        ],
      };
    }

    const title = `${product.name} — ${STORE.name}`;
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
        { property: "product:price:amount", content: String(product.sale_price) },
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
              price: product.sale_price,
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
  const selectedPrice = product
    ? selectedSizeMl
      ? calculateDecantPrice(Number(product.sale_price), bottleVolumeMl, selectedSizeMl)
      : Number(product.sale_price)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:h-[calc(100dvh-72px)] lg:px-8 lg:py-5">
        <button
          onClick={() => navigate({ to: "/" })}
          className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Volver al catálogo
        </button>

        {!product ? (
          <StoreError
            title="Este producto ya no está disponible"
            message="Puede haberse agotado o dejado de estar disponible. Volvé al catálogo para ver otras opciones."
            onRetry={() => navigate({ to: "/" })}
            actionLabel="Volver al catálogo"
          />
        ) : (
          <div className="grid gap-7 lg:h-[calc(100%-36px)] lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
            <div className="flex h-[min(42dvh,360px)] items-center justify-center overflow-hidden bg-white lg:aspect-square lg:h-auto lg:max-h-[500px] lg:self-center">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="font-display text-[10rem] font-bold text-black/10">
                  {product.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex flex-col lg:justify-center">
              <h1 className="font-display text-3xl font-bold uppercase leading-[0.98] tracking-[-0.055em] sm:text-4xl xl:text-5xl">
                {product.name}
              </h1>
              <div className="mt-4 font-display text-3xl font-bold xl:text-4xl">
                {formatGs(selectedPrice)}
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
                          price={Number(product.sale_price)}
                          selected={selectedSizeMl === null}
                          onClick={() => setSelectedSizeMl(null)}
                        />
                        {DECANT_SIZES.map((sizeMl) => (
                          <PresentationButton
                            key={sizeMl}
                            label={`${sizeMl} ml`}
                            price={calculateDecantPrice(
                              Number(product.sale_price),
                              bottleVolumeMl,
                              sizeMl,
                            )}
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
