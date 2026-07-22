import { Link } from "@tanstack/react-router";
import { useCart } from "@/contexts/cart-context";
import { formatGs } from "@/lib/format";
import { Minus, Plus, Trash2, X, ShoppingBag } from "lucide-react";

export function CartDrawer() {
  const { items, isOpen, setOpen, setQuantity, removeItem, totalAmount, totalItems } = useCart();

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-[var(--color-surface)] shadow-2xl transition-transform ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="font-display text-lg font-bold">Tu carrito</div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-full p-2 hover:bg-[var(--color-surface-strong)]"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
            <ShoppingBag className="size-10" />
            <p className="text-sm">Todavia no agregaste productos.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3 py-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-[var(--color-surface-strong)] font-display text-lg font-bold text-muted-foreground">
                    {item.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold leading-snug">{item.name}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-full border border-border">
                        <button
                          onClick={() => setQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 hover:bg-[var(--color-surface-strong)]"
                          aria-label="Restar"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="min-w-[2rem] text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => setQuantity(item.id, item.quantity + 1)}
                          className="p-1.5 hover:bg-[var(--color-surface-strong)] disabled:opacity-40"
                          disabled={item.quantity >= item.stock}
                          aria-label="Sumar"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                      <div className="text-sm font-semibold">{formatGs(item.price * item.quantity)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="self-start rounded-full p-1.5 text-muted-foreground hover:bg-[var(--color-surface-strong)] hover:text-foreground"
                    aria-label="Quitar"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {items.length > 0 && (
          <div className="border-t border-border px-5 py-4">
            <div className="flex items-center justify-between pb-3 text-sm">
              <span className="text-muted-foreground">{totalItems} producto(s)</span>
              <span className="font-display text-xl font-bold">{formatGs(totalAmount)}</span>
            </div>
            <Link
              to="/checkout"
              onClick={() => setOpen(false)}
              className="block w-full rounded-full bg-[var(--color-primary)] py-3 text-center text-sm font-semibold text-[var(--color-primary-foreground)] transition hover:opacity-90"
            >
              Finalizar pedido
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
