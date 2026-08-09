export function getCartItemKey(item: { id: string; sizeMl?: number }): string {
  return `${item.id}:${item.sizeMl ?? "completo"}`;
}
