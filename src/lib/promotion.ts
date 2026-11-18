import type { InventarioProduct } from "@/integrations/inventario/client";
import { roundPriceUpToThousand } from "@/lib/format";

export const PROMOTION = {
  active: true,
  headline: "BLACK FRIDAY · HASTA 30% OFF EN PRODUCTOS SELECCIONADOS",
  discountPercent: 30,
} as const;

export type PromotionPrice = {
  originalPrice: number;
  price: number;
  discountPercent: number;
  isPromoted: boolean;
  isPriceCorrection: boolean;
};

export function getPromotionPrice(
  product: Pick<
    InventarioProduct,
    "sale_price" | "discount_percent" | "original_unit_price" | "final_price" | "unit_price"
  >,
): PromotionPrice {
  const listPrice = Number(product.original_unit_price ?? product.sale_price);
  const backendPrice = Number(product.final_price ?? product.unit_price ?? listPrice);
  const originalPrice = roundPriceUpToThousand(Number.isFinite(listPrice) ? listPrice : 0);
  const price = roundPriceUpToThousand(
    Number.isFinite(backendPrice) ? backendPrice : Number.isFinite(listPrice) ? listPrice : 0,
  );
  const isPriceCorrection = price > originalPrice;
  const isPromoted = price < originalPrice;
  const discountPercent = isPromoted
    ? Math.round((1 - price / originalPrice) * 10_000) / 100
    : 0;

  return {
    originalPrice,
    price,
    discountPercent,
    isPromoted,
    isPriceCorrection,
  };
}
