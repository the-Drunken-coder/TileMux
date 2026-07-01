# TileMux Architecture

## Request Flow

Cloudflare Workers static assets serve the Vite React app from `dist`. Wrangler is configured with `run_worker_first` for `/api/*`, `/tiles/*`, `/styles/*`, and `/tilejson/*`, so those paths always hit the Worker before asset fallback.

The Worker uses a small explicit router:

1. `/api/health` is public.
2. Private routes check `TILEMUX_API_KEY` from `Authorization: Bearer <key>` or `?key=<key>`.
3. Source/style/tile routes resolve an enabled source from `src/worker/sources.ts`.
4. Tile requests dispatch to a provider adapter by `source.kind`.

## Source Registry Model

V0 source config lives in TypeScript. This keeps the first version simple and reviewable. The supported kinds are:

- `debug-grid`: generated SVG/PNG raster tiles.
- `remote-xyz`: server-side proxy for upstream XYZ templates.
- `r2-xyz`: object lookup through the `TILE_BUCKET` R2 binding.
- `pmtiles-r2`: typed placeholder returning `501`.

Disabled sources are not returned by `/api/sources` and behave like unknown sources on public routes.

## Auth Model

TileMux has one private app key, `TILEMUX_API_KEY`. The React shell is public, but metadata, TileJSON, generated styles, and tiles are private.

Provider secrets are separate environment secrets referenced by source placeholders. They are resolved only inside the Worker and are not returned to the frontend.

## Caching Model

Each source defines `cachePolicy` as `none`, `respect-upstream`, or `ttl`. Tile responses set `Cache-Control`, `X-TileMux-Source`, and `X-TileMux-Cache-Policy`. Remote XYZ requests pass Cloudflare fetch cache hints only for `ttl` sources.

The debug-grid source uses a long TTL because its output is deterministic.

## Why D1 Is Not Used Yet

V0 is config-file-driven. D1 would add migrations, admin workflows, and source CRUD before the gateway behavior is proven. A database can be added later if source management becomes a real workflow.

## Future Work

- Add short-lived scoped tokens or signed URLs for clients that cannot send
  `Authorization` headers.
- Implement a PMTiles R2 adapter with byte-range reads.
- Rewrite external style JSON safely without exposing provider secrets.
- Add glyph and sprite proxying for vector styles.
- Add a source management UI only after the source registry shape stabilizes.
