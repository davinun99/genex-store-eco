# Cloudflare Pages Deployment

This app builds for Cloudflare Pages through Nitro's `cloudflare-pages` preset.

## Cloudflare Pages Settings

- Project name: `genex-store-eco`
- Build command: `bun install --frozen-lockfile && bun run build`
- Build output directory: `dist`
- Runtime: Pages Functions, generated at `dist/_worker.js`

Because this repo uses Bun’s text lockfile (`bun.lock`), classic Pages may not detect Bun and fall back to npm. Set env var `SKIP_DEPENDENCY_INSTALL=true` and use the build command above so install + build both run with Bun.

`wrangler.toml` sets `pages_build_output_dir = "dist"`. Local deploys can still use `bun run deploy` (Wrangler).

## Local Commands

```sh
bun run build
bun run pages:dev
bun run deploy
```

`pages:dev` and `deploy` use `bunx wrangler`, so Wrangler does not need to be installed as a direct project dependency.

## Environment Variables

Set these in Cloudflare Pages under **Settings > Environment variables**.

Build-time public variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_INVENTARIO_SUPABASE_URL`
- `VITE_INVENTARIO_SUPABASE_PUBLISHABLE_KEY`

Runtime server variables:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_INVENTARIO_SUPABASE_URL`
- `VITE_INVENTARIO_SUPABASE_PUBLISHABLE_KEY`

Use Cloudflare's encrypted variables for any service role key or private runtime value.
