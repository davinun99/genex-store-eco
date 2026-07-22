import { Link } from "@tanstack/react-router";
import { Plus, PackageX } from "lucide-react";
import type { InventarioProduct } from "@/integrations/inventario/client";
import { useCart } from "@/contexts/cart-context";
import { formatGs } from "@/lib/format";

export function ProductCard({
  product,
  categoryName,
}: {
  product: InventarioProduct;
  categoryName?: string;
}) {
  const { addItem, setOpen } = useCart();
  const outOfStock = product.current_stock <= 0;

  return (
    <article className="group flex flex-col overflow-hidden border border-black/10 bg-white transition hover:border-black">
      <Link
        to="/producto/$id"
        params={{ id: product.id }}
        className="relative flex aspect-square items-center justify-center bg-[#f4f4f2]"
      >
        <span className="font-display text-6xl font-bold text-black/10 transition-transform duration-300 group-hover:scale-110">
          {product.name.charAt(0).toUpperCase()}
        </span>
        {categoryName && (
          <span className="absolute left-3 top-3 bg-white px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-black/60">
            {categoryName}
          </span>
        )}
        {outOfStock && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-destructive px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-destructive-foreground">
            <PackageX className="size-3" /> Sin stock
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
        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="font-display text-lg font-bold">{formatGs(product.sale_price)}</div>
          <button
            disabled={outOfStock}
            onClick={() => {
              addItem({
                id: product.id,
                name: product.name,
                price: Number(product.sale_price),
                stock: product.current_stock,
                sku: product.sku,
              });
              setOpen(true);
            }}
            className="inline-flex h-9 items-center gap-1 border border-black bg-black px-3 text-xs font-semibold text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:border-black/10 disabled:bg-muted disabled:text-muted-foreground"
          >
            <Plus className="size-3.5" /> Agregar
          </button>
        </div>
      </div>
    </article>
  );
}
