export function formatGs(value: number): string {
  const v = Number(value || 0);
  return "Gs " + v.toLocaleString("es-PY", { maximumFractionDigits: 0 });
}

export function roundPriceUpToThousand(value: number): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.ceil(amount / 1_000) * 1_000 : 0;
}
