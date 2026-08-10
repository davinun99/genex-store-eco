import type { InventarioProduct } from "@/integrations/inventario/client";

export const PROMOTION = {
  active: true,
  headline: "HASTA 30% OFF EN TODA LA TIENDA",
  discountPercent: 30,
} as const;

const PRICE_ROUNDING = 1_000;

// Precios revisados contra costo. Estos SKU no soportan el 30% completo.
const SAFE_PRICE_BY_SKU: Record<string, number> = {
  "SAM-701": 7_300_000,
  "IPH-700": 7_000_000,
  "PER-027": 260_000,
  "TEL-004": 620_000,
  "TEL-002": 725_000,
  "TEL-003": 865_000,
  "PER-102": 180_000,
  "PER-013": 279_000,
  "PER-025": 162_000,
  // Estos precios estaban por debajo del costo y se corrigen en la tienda.
  "ELE-080": 800_000,
  "OTR-009": 30_000,
};

// No se promocionan hasta que tengan un costo real cargado en inventario.
const EXCLUDED_SKUS = new Set(["HER-002", "HER-001", "pru-010", "MOU-700"]);

export type PromotionPrice = {
  originalPrice: number;
  price: number;
  discountPercent: number;
  isPromoted: boolean;
  isPriceCorrection: boolean;
};

export function getPromotionPrice(
  product: Pick<InventarioProduct, "sku" | "sale_price">,
): PromotionPrice {
  const originalPrice = Number(product.sale_price);
  if (!PROMOTION.active || EXCLUDED_SKUS.has(product.sku)) {
    return {
      originalPrice,
      price: originalPrice,
      discountPercent: 0,
      isPromoted: false,
      isPriceCorrection: false,
    };
  }

  const generalPrice = Math.ceil((originalPrice * 0.7) / PRICE_ROUNDING) * PRICE_ROUNDING;
  const price = SAFE_PRICE_BY_SKU[product.sku] ?? generalPrice;
  const isPriceCorrection = price >= originalPrice;
  const discountPercent = isPriceCorrection ? 0 : Math.floor((1 - price / originalPrice) * 100);

  return {
    originalPrice,
    price,
    discountPercent,
    isPromoted: price < originalPrice,
    isPriceCorrection,
  };
}
