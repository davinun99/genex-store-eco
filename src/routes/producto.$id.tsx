import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { inventario, type InventarioProduct } from "@/integrations/inventario/client";
import { Header } from "@/components/header";
import { StoreError, StoreLoader } from "@/components/store-feedback";
import { friendlyErrorMessage } from "@/lib/store-errors";
import { useCart } from "@/contexts/cart-context";
import { formatGs } from "@/lib/format";
import { ArrowLeft, Minus, Plus, ShoppingBag, PackageCheck, PackageX } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/producto/$id")({
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { addItem, setOpen } = useCart();
  const [qty, setQty] = useState(1);

  const {
    data: product,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await inventario
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .gt("current_stock", 0)
        .maybeSingle();
      if (error) throw error;
      return data as InventarioProduct | null;
    },
  });

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

        {isLoading ? (
          <StoreLoader message="Preparando el producto" />
        ) : error || !product ? (
          <StoreError
            title={error ? "No pudimos abrir el producto" : "Este producto ya no está disponible"}
            message={
              error
                ? friendlyErrorMessage(error)
                : "Puede haberse agotado o dejado de estar disponible. Volvé al catálogo para ver otras opciones."
            }
            onRetry={error ? () => void refetch() : () => navigate({ to: "/" })}
            actionLabel={error ? "Intentar de nuevo" : "Volver al catálogo"}
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
                {formatGs(product.sale_price)}
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
                        {formatGs(Number(product.sale_price) * qty)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      addItem(
                        {
                          id: product.id,
                          name: product.name,
                          price: Number(product.sale_price),
                          stock: product.current_stock,
                          sku: product.sku,
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
