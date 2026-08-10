import type { InventarioProduct } from "@/integrations/inventario/client";

export const PROMOTION = {
  active: true,
  headline: "HASTA 30% OFF EN TODA LA TIENDA",
  discountPercent: 30,
} as const;

const PRICE_ROUNDING = 1_000;

// Precios revisados contra costo. Conservan como mínimo 10% de ganancia sobre el costo.
const SAFE_PRICE_BY_SKU: Record<string, number> = {
  "CEL-099": 660_000,
  "ELE-080": 880_000,
  "ELE-084": 72_000,
  "IPH-001": 1_870_000,
  "IPH-005": 2_310_000,
  "IPH-010": 2_585_000,
  "IPH-020": 2_970_000,
  "IPH-700": 8_580_000,
  "OTR-009": 33_000,
  "PER-003": 245_000,
  "PER-009": 550_000,
  "PER-013": 307_000,
  "PER-024": 211_000,
  "PER-025": 178_000,
  "PER-027": 286_000,
  "PER-028": 256_000,
  "PER-029": 327_000,
  "PER-030": 196_000,
  "PER-091": 237_000,
  "PER-098": 176_000,
  "PER-099": 176_000,
  "PER-102": 198_000,
  "PER-103": 187_000,
  "PER-104": 253_000,
  "REL-002": 186_000,
  "SAM-701": 8_030_000,
  "TEL-001": 561_000,
  "TEL-002": 798_000,
  "TEL-003": 952_000,
  "TEL-004": 682_000,
  "TEL-005": 1_430_000,
  "TEL-020": 220_000,
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
