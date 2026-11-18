// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv, type Plugin } from "vite";

function lovableOAuthDevShim(projectId: string, projectEnv: string): Plugin {
  return {
    name: "lovable-oauth-dev-shim",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/~oauth/initiate", (request, response) => {
        const params = new URL(request.url ?? "", "http://localhost").searchParams;
        const redirectUri = params.get("redirect_uri");
        if (redirectUri) {
          try {
            const callbackUrl = new URL(redirectUri);
            if (callbackUrl.hostname === "localhost") {
              callbackUrl.hostname = "127.0.0.1";
              params.set("redirect_uri", callbackUrl.toString());
            }
          } catch {
            // Let the OAuth broker reject malformed callback URLs with its normal error.
          }
        }
        params.set("project_id", projectId);
        if (projectEnv) params.set("project_env", projectEnv);

        response.statusCode = 302;
        response.setHeader(
          "Location",
          `https://oauth.lovable.app/initiate?${params.toString()}`,
        );
        response.end();
      });
    },
  };
}

const env = loadEnv("development", process.cwd(), "");
const projectId =
  env.LOVABLE_PROJECT_ID || env.VITE_SUPABASE_PROJECT_ID || env.SUPABASE_PROJECT_ID;

export default defineConfig({
  plugins: projectId ? [lovableOAuthDevShim(projectId, env.LOVABLE_PROJECT_ENV ?? "")] : [],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    preset: "cloudflare-pages",
    cloudflare: {
      wrangler: {
        name: "genex-store-eco",
      },
    },
  },
});
