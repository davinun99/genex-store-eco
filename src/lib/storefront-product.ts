export function isStorefrontProduct(product: { name: string; sku: string }): boolean {
  const name = product.name.trim().toLocaleLowerCase("es");
  const sku = product.sku.trim().toLocaleLowerCase("es");
  const isTestProduct = sku === "pru-010" || name === "pru" || name === "prueba";

  if (!isTestProduct) return true;

  if (typeof window !== "undefined") {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  }

  // Durante el render del servidor local todavía no existe window.
  return import.meta.env.DEV;
}
