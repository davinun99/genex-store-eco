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
      <div className="bg-[#ff3b30] px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white sm:text-xs">
        Hasta 30% OFF en toda la tienda · Por tiempo limitado
      </div>
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex h-[42px] w-[130px] shrink-0 items-center transition-opacity hover:opacity-60"
          aria-label={`${STORE.name}, inicio`}
        >
          <img
            src="/icons/genex_logo.svg"
            alt="Genex Store"
            width="130"
            height="42"
            className="pointer-events-none h-auto w-full select-none"
          />
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
