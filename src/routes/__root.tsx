import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CartProvider } from "@/contexts/cart-context";
import { CartDrawer } from "@/components/cart-drawer";
import { STORE } from "@/lib/store-config";
import { StoreError, StoreLoader } from "@/components/store-feedback";
import { friendlyErrorMessage } from "@/lib/store-errors";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md border border-black/15 p-8 text-center sm:p-10">
        <p className="font-display text-7xl font-bold tracking-[-0.08em]">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold uppercase tracking-[-0.04em]">
          Esta página no existe
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          El enlace puede estar vencido, pero la tienda sigue disponible.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center border border-black bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg">
        <StoreError
          title="GENEX tuvo un inconveniente"
          message={friendlyErrorMessage(error)}
          onRetry={() => {
            router.invalidate();
            reset();
          }}
        />
        <div className="mt-3 text-center">
          <a href="/" className="text-sm text-muted-foreground underline underline-offset-4">
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${STORE.name} — ${STORE.tagline}` },
      {
        name: "description",
        content: `${STORE.name}: tienda online con pago por transferencia bancaria y envio de comprobante.`,
      },
      { property: "og:title", content: STORE.name },
      { property: "og:description", content: STORE.tagline },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Genex Store" },
      { property: "og:title", content: "Genex Store" },
      { name: "twitter:title", content: "Genex Store" },
      { name: "description", content: "Tu tienda de accesorios y tecnologia" },
      { property: "og:description", content: "Tu tienda de accesorios y tecnologia" },
      { name: "twitter:description", content: "Tu tienda de accesorios y tecnologia" },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/PKe8uW2JULbKZF7te5WoKu6h1y73/social-images/social-1782328368721-genex_store.webp",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/PKe8uW2JULbKZF7te5WoKu6h1y73/social-images/social-1782328368721-genex_store.webp",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "shortcut icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icons/genex_logo.jpeg" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <StoreLoader message="Abriendo GENEX Store" />
    </div>
  ),
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <Outlet />
        <CartDrawer />
      </CartProvider>
    </QueryClientProvider>
  );
}
