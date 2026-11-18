export function slugifyProductName(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "producto";
}

export function getProductRouteParam(name: string) {
  return slugifyProductName(name);
}

export function getProductIdFromRouteParam(routeParam: string) {
  const separator = routeParam.lastIndexOf("--");
  return separator === -1 ? routeParam : routeParam.slice(separator + 2);
}
