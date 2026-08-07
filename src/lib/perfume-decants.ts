const DEFAULT_BOTTLE_ML = 100;
const DECANT_MARGIN = 0.5;
const PRICE_ROUNDING = 1_000;

export const DECANT_SIZES = [5, 10] as const;

export function isPerfumeProduct(categoryName: string | undefined, productName: string): boolean {
  return /perfume|fragancia/i.test(`${categoryName ?? ""} ${productName}`);
}

export function getBottleVolumeMl(name: string, description: string | null): number {
  const match = `${name} ${description ?? ""}`.match(/(\d+(?:[.,]\d+)?)\s*ml\b/i);
  if (!match) return DEFAULT_BOTTLE_ML;

  const volume = Number(match[1].replace(",", "."));
  return Number.isFinite(volume) && volume > 0 ? volume : DEFAULT_BOTTLE_ML;
}

export function calculateDecantPrice(
  bottlePrice: number,
  bottleVolumeMl: number,
  decantVolumeMl: number,
): number {
  const proportionalPrice = (bottlePrice / bottleVolumeMl) * decantVolumeMl;
  return Math.ceil((proportionalPrice * (1 + DECANT_MARGIN)) / PRICE_ROUNDING) * PRICE_ROUNDING;
}
