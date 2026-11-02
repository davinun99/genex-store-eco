import { Link } from "@tanstack/react-router";
import { Plus, PackageX } from "lucide-react";
import type { InventarioProduct } from "@/integrations/inventario/client";
import { useCart } from "@/contexts/cart-context";
import { formatGs } from "@/lib/format";
import { getPromotionPrice } from "@/lib/promotion";

export function ProductCard({ product }: { product: InventarioProduct }) {
  const { addItem, setOpen } = useCart();
  const outOfStock = product.current_stock <= 0;
  const promotion = getPromotionPrice(product);

  return (
    <article className="group flex flex-col overflow-hidden border border-black/10 bg-white transition hover:border-black">
      <Link
        to="/producto/$id"
        params={{ id: product.id }}
        className="relative flex aspect-square items-center justify-center bg-[#f4f4f2]"
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="font-display text-6xl font-bold text-black/10 transition-transform duration-300 group-hover:scale-110">
            {product.name.charAt(0).toUpperCase()}
          </span>
        )}
        {outOfStock && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-destructive px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-destructive-foreground">
            <PackageX className="size-3" /> Sin stock
          </span>
        )}
        {promotion.isPromoted && !outOfStock && (
          <span className="absolute left-3 top-3 bg-[#ff3b30] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
            {promotion.discountPercent.toFixed(0)}% OFF
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link
          to="/producto/$id"
          params={{ id: product.id }}
          className="line-clamp-2 font-display text-sm font-semibold leading-snug sm:text-base"
        >
          {product.name}
        </Link>
        <div className="text-xs text-muted-foreground">Stock {product.current_stock}</div>
        <div className="mt-auto flex flex-col gap-3 pt-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            {promotion.isPromoted && (
              <div className="whitespace-nowrap text-xs text-muted-foreground line-through">
                {formatGs(promotion.originalPrice)}
              </div>
            )}
            <div className="whitespace-nowrap font-display text-lg font-bold text-[#d21f18]">
              {formatGs(promotion.price)}
            </div>
          </div>
          <button
            disabled={outOfStock}
            onClick={() => {
              addItem({
                id: product.id,
                name: product.name,
                price: promotion.price,
                originalPrice: promotion.isPromoted ? promotion.originalPrice : undefined,
                stock: product.current_stock,
                sku: product.sku,
                imageUrl: product.image_url,
              });
              setOpen(true);
            }}
            className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-1 border border-black bg-black px-3 text-xs font-semibold text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:border-black/10 disabled:bg-muted disabled:text-muted-foreground lg:w-auto"
          >
            <Plus className="size-3.5" /> Agregar
          </button>
        </div>
      </div>
    </article>
  );
}
