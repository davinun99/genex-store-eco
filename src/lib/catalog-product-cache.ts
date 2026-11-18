import type { InventarioProduct } from "@/integrations/inventario/client";
import { slugifyProductName } from "@/lib/product-url";

const productsBySlug = new Map<string, InventarioProduct>();

export function cacheCatalogProduct(product: InventarioProduct) {
  const slug = slugifyProductName(product.name);
  const existing = productsBySlug.get(slug);

  // Keep URL resolution deterministic if different names produce the same slug.
  if (!existing || product.id.localeCompare(existing.id) <= 0) {
    productsBySlug.set(slug, product);
  }
}

export function getCachedCatalogProduct(slug: string) {
  return productsBySlug.get(slug);
}
