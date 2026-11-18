import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { inventario } from "@/integrations/inventario/client";

export const lovable = { auth: createLovableAuth() };
export const POST_LOGIN_PATH_KEY = "genex_post_login_path";

export async function signInWithGoogle(returnPath: "/cuenta" | "/checkout") {
  sessionStorage.setItem(POST_LOGIN_PATH_KEY, returnPath);
  try {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.redirected) return;
    if (result.error) throw result.error;

    const { data, error } = await inventario.auth.setSession(result.tokens);
    if (error) throw error;
    if (!data.session) throw new Error("Google no devolvió una sesión válida.");
  } catch (error) {
    sessionStorage.removeItem(POST_LOGIN_PATH_KEY);
    throw error;
  }
}
