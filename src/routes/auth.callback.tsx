import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { StoreLoader } from "@/components/store-feedback";
import { inventario } from "@/integrations/inventario/client";
import {
  getPostLoginPath,
  POST_LOGIN_PATH_KEY,
} from "@/integrations/inventario/auth";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Ingresando — Genex Store" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  useEffect(() => {
    let active = true;

    const finishSignIn = async () => {
      try {
        const { data, error } = await inventario.auth.getSession();
        if (error) console.error("No se pudo confirmar la sesión de Google:", error);
        if (!data.session && !error) {
          console.warn("Google volvió a la tienda sin una sesión activa.");
        }
        if (!active) return;
      } catch (error) {
        console.error("No se pudo completar el ingreso con Google:", error);
      }

      if (!active) return;
      // getSession procesa la respuesta OAuth antes de devolver la sesión.
      const destination = getPostLoginPath();
      sessionStorage.removeItem(POST_LOGIN_PATH_KEY);
      window.location.replace(destination);
    };

    void finishSignIn();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <StoreLoader message="Confirmando tu ingreso" />
    </main>
  );
}
