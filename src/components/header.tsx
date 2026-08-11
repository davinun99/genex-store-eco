import { Link } from "@tanstack/react-router";
import { ShoppingCart, Search, UserRound, Menu, ChevronDown } from "lucide-react";
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
      <div className="mx-auto flex h-[74px] max-w-[1380px] items-center gap-5 px-4 sm:px-6 lg:h-[108px] lg:px-8">
        <Link
          to="/"
          className="relative block h-[46px] w-[142px] shrink-0 overflow-hidden transition-opacity hover:opacity-70 lg:h-[58px] lg:w-[190px]"
          aria-label={`${STORE.name}, inicio`}
        >
          <img
            src="/icons/genex_logo.jpeg"
            alt="Genex Store"
            className="pointer-events-none absolute left-[-14px] top-[-66px] h-auto w-[165px] max-w-none select-none lg:left-[-18px] lg:top-[-88px] lg:w-[220px]"
          />
        </Link>

        <nav className="mx-auto hidden items-center gap-10 text-[13px] font-semibold uppercase lg:flex" aria-label="Navegación principal">
          <Link to="/" className="text-[#075ee8]">Inicio</Link>
          <a href="/#catalogo" className="flex items-center gap-1.5 transition hover:text-[#075ee8]">Productos <ChevronDown className="size-3.5" /></a>
          <a href="/#categorias" className="transition hover:text-[#075ee8]">Categorías</a>
          <a href="/#destacados" className="transition hover:text-[#075ee8]">Novedades</a>
          <a href={`https://wa.me/${STORE.whatsapp}`} target="_blank" rel="noreferrer" className="transition hover:text-[#075ee8]">Contacto</a>
        </nav>

        {onSearch && (
          <div className="relative ml-auto hidden w-10 lg:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchValue ?? ""}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar"
              aria-label="Buscar productos"
              className="h-10 w-10 rounded-full border-0 bg-transparent pl-10 pr-0 text-sm outline-none transition-all placeholder:text-transparent focus:w-48 focus:bg-black/[0.035] focus:pr-4 focus:placeholder:text-black/40"
            />
          </div>
        )}

        <span className="hidden text-black lg:block" aria-hidden="true"><UserRound className="size-6" strokeWidth={1.6} /></span>

        <button
          onClick={() => setOpen(true)}
          aria-label={`Abrir carrito, ${totalItems} productos`}
          className="relative ml-auto inline-flex size-10 items-center justify-center bg-transparent text-black transition hover:text-[#075ee8] lg:ml-0"
        >
          <ShoppingCart className="size-6" strokeWidth={1.7} />
          {totalItems > 0 && (
            <span className="absolute right-0 top-0 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#075ee8] px-1 text-[10px] font-bold text-white">
              {totalItems}
            </span>
          )}
        </button>
        <a href="#catalogo" className="grid size-10 place-items-center lg:hidden" aria-label="Abrir menú"><Menu className="size-6" /></a>
      </div>
    </header>
  );
}
