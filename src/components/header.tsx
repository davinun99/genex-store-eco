import { Link } from "@tanstack/react-router";
import { ShoppingBag, Search } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { STORE } from "@/lib/store-config";

interface HeaderProps {
  onSearch?: (v: string) => void;
  searchValue?: string;
}

export function Header({ onSearch, searchValue }: HeaderProps) {
  const { totalItems, setOpen } = useCart();
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="group leading-none" aria-label={`${STORE.name}, inicio`}>
          <div className="font-display text-2xl font-bold tracking-[-0.08em] transition-opacity group-hover:opacity-60">
            GENEX
            <span className="ml-1 inline-block size-1.5 rounded-full bg-black" />
          </div>
          <div className="mt-1 text-center text-[8px] font-semibold uppercase tracking-[0.48em]">
            Store
          </div>
        </Link>

        {onSearch && (
          <div className="relative ml-auto hidden max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchValue ?? ""}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar productos..."
              className="h-10 w-full rounded-none border-0 border-b border-black/20 bg-transparent pl-9 pr-4 text-sm outline-none transition placeholder:text-black/40 focus:border-black"
            />
          </div>
        )}

        <button
          onClick={() => setOpen(true)}
          className={`relative ml-auto inline-flex h-10 items-center gap-2 border border-black bg-black px-4 text-sm font-semibold text-white transition hover:bg-white hover:text-black ${onSearch ? "md:ml-0" : ""}`}
        >
          <ShoppingBag className="size-4" />
          <span className="hidden sm:inline">Carrito</span>
          {totalItems > 0 && (
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-black">
              {totalItems}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
