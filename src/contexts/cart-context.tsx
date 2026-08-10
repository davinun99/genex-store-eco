import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getEcommerceProduct } from "@/integrations/inventario/ecommerce-api";
import { getCartItemKey } from "@/lib/cart-item";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  sku: string;
  imageUrl?: string | null;
  sizeMl?: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, qty: number) => void;
  clear: () => void;
  totalItems: number;
  totalAmount: number;
  isOpen: boolean;
  setOpen: (v: boolean) => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "genex_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const imagesUpdated = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // El carrito puede seguir funcionando aunque el almacenamiento esté bloqueado.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Algunos navegadores bloquean localStorage en modo privado.
    }
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated || imagesUpdated.current) return;
    imagesUpdated.current = true;
    const missingIds = items.filter((item) => !item.imageUrl).map((item) => item.id);
    if (missingIds.length === 0) return;

    void Promise.all(missingIds.map((id) => getEcommerceProduct(id)))
      .then((products) => {
        const images = new Map(
          products
            .filter((product) => product !== null)
            .map((product) => [product.id, product.image_url]),
        );
        setItems((current) =>
          current.map((item) =>
            images.has(item.id) ? { ...item, imageUrl: images.get(item.id) } : item,
          ),
        );
      })
      .catch(() => {
        // Las imágenes son opcionales; el carrito sigue disponible si la actualización falla.
      });
  }, [hydrated, items]);

  const value = useMemo<CartContextValue>(() => {
    const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);
    const totalAmount = items.reduce((acc, i) => acc + i.quantity * i.price, 0);
    return {
      items,
      isOpen,
      setOpen,
      totalItems,
      totalAmount,
      addItem: (incoming, qty = 1) => {
        setItems((prev) => {
          const incomingKey = getCartItemKey(incoming);
          const existing = prev.find((p) => getCartItemKey(p) === incomingKey);
          const max = incoming.stock;
          if (existing) {
            const nextQty = Math.min(existing.quantity + qty, max);
            return prev.map((p) =>
              getCartItemKey(p) === incomingKey ? { ...p, ...incoming, quantity: nextQty } : p,
            );
          }
          return [...prev, { ...incoming, quantity: Math.min(qty, max) }];
        });
      },
      removeItem: (id) => setItems((prev) => prev.filter((p) => getCartItemKey(p) !== id)),
      setQuantity: (id, qty) =>
        setItems((prev) =>
          prev.map((p) =>
            getCartItemKey(p) === id ? { ...p, quantity: Math.max(1, Math.min(qty, p.stock)) } : p,
          ),
        ),
      clear: () => setItems([]),
    };
  }, [items, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart fuera del CartProvider");
  return ctx;
}
