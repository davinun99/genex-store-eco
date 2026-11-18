import { inventario } from "@/integrations/inventario/client";
import { STORE } from "@/lib/store-config";
import { isStorefrontProduct } from "@/lib/storefront-product";
import { getProductRouteParam } from "@/lib/product-url";

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function generateSitemapXml(): Promise<string> {
  const urls: { loc: string; lastmod?: string }[] = [{ loc: `${STORE.url}/` }];

  try {
    const { data, error } = await inventario
      .from("products")
      .select("id,name,sku,updated_at")
      .eq("is_active", true)
      .gt("current_stock", 0)
      .order("id");
    if (error) throw error;
    const seenProductUrls = new Set<string>();
    for (const product of data ?? []) {
      if (!isStorefrontProduct(product)) continue;
      const loc = `${STORE.url}/producto/${getProductRouteParam(product.name)}`;
      if (seenProductUrls.has(loc)) continue;
      seenProductUrls.add(loc);
      urls.push({
        loc,
        lastmod: product.updated_at ? new Date(product.updated_at).toISOString() : undefined,
      });
    }
  } catch (error) {
    console.error("No se pudo completar el sitemap con productos:", error);
  }

  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${escapeXml(u.loc)}</loc>${
          u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""
        }\n  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
