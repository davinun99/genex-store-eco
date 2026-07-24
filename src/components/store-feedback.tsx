import { AlertTriangle, RefreshCw } from "lucide-react";

export function StoreLoader({
  message = "Estamos preparando todo para vos",
  compact = false,
}: {
  message?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? "min-h-36" : "min-h-64"}`}
      role="status"
      aria-live="polite"
    >
      <div className="genex-loader" aria-hidden="true">
        <span>G</span>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {message}
      </p>
      <span className="sr-only">Cargando</span>
    </div>
  );
}

export function StoreSpinner() {
  return <span className="genex-spinner" aria-hidden="true" />;
}

export function StoreError({
  title = "No pudimos cargar esta parte",
  message = "Parece que la conexión tuvo un problema. Tus datos están seguros.",
  onRetry,
  actionLabel = "Intentar de nuevo",
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="border border-black/15 bg-white p-8 text-center sm:p-10" role="alert">
      <AlertTriangle className="mx-auto size-8" strokeWidth={1.5} />
      <h2 className="mt-4 font-display text-2xl font-bold uppercase tracking-[-0.04em]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 border border-black bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
        >
          <RefreshCw className="size-4" /> {actionLabel}
        </button>
      )}
    </div>
  );
}
