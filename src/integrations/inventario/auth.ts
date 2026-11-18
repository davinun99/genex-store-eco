import { inventario } from "@/integrations/inventario/client";

export const POST_LOGIN_PATH_KEY = "genex_post_login_path";

export type PostLoginPath = "/cuenta" | "/checkout";

export function getPostLoginPath(): PostLoginPath {
  const savedPath = sessionStorage.getItem(POST_LOGIN_PATH_KEY);
  return savedPath === "/checkout" ? "/checkout" : "/cuenta";
}

export async function signInWithGoogle(returnPath: PostLoginPath) {
  sessionStorage.setItem(POST_LOGIN_PATH_KEY, returnPath);

  const { error } = await inventario.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    sessionStorage.removeItem(POST_LOGIN_PATH_KEY);
    throw error;
  }
}
