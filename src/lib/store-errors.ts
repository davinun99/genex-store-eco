export function friendlyErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("fetch") || message.includes("network") || message.includes("conex")) {
    return "No pudimos conectarnos. Revisá tu internet y volvé a intentarlo.";
  }
  if (message.includes("timeout") || message.includes("tiempo")) {
    return "La respuesta está tardando más de lo normal. Probá nuevamente en unos segundos.";
  }
  return "Ocurrió algo inesperado. No te preocupes: podés intentarlo nuevamente.";
}
