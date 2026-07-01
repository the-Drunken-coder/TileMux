# TileMux Architecture

## Request Flow

Cloudflare Workers static assets serve the Vite React app from `dist`. Wrangler
is configured with `run_worker_first` for `/api/*`, `/tiles/*`, `/styles/*`,
`/tilejson/*`, and `/sources.json`, so those paths always hit the Worker before
asset fallback.

The Worker uses a small explicit router:

1. `/api/health` is public.
2. `/api/*` routes, except health, check `TILEMUX_API_KEY` from
   `Authorization: Bearer <key>` or `?key=<key>`.
3. Browser routes use public `/sources.json`, `/styles/*`, `/tilejson/*`, and
   `/tiles/*`.
4. Source/style/tile routes resolve an enabled source from
   `src/worker/sources.ts`.
5. Tile requests dispatch to a provider adapter by `source.provider.kind`.

## Source Registry Model

V0 source config lives in TypeScript. This keeps the first version simple and
reviewable. A source is the user-facing map option; its nested `provider`
describes where tiles come from. The supported provider kinds are:

- `debug-grid`: generated SVG/PNG raster tiles.
- `remote-xyz`: server-side proxy for upstream XYZ templates.
- `r2-xyz`: object lookup through the `TILE_BUCKET` R2 binding.
- `pmtiles-r2`: typed placeholder returning `501`.

Remote sources such as OpenStreetMap and OpenTopoMap are ordinary `remote-xyz`
provider instances, not bespoke adapters. Add a new provider adapter only when
the retrieval mechanics change.

For providers that require real browser request headers, a source can define
`provider.browserTileTemplate`. Generated browser styles and TileJSON then point
at the public upstream tile URL directly, while TileMux still keeps provider
secrets out of public source metadata.

Disabled sources are not returned by `/sources.json` or `/api/sources` and
behave like unknown sources on public routes.

## Auth Model

TileMux has one private API key, `TILEMUX_API_KEY`. It protects `/api/*`
routes only. The React shell, browser source catalog, TileJSON, generated
styles, and tiles are public so the browser version works without a key.

Provider secrets are separate environment secrets referenced by source placeholders. They are resolved only inside the Worker and are not returned to the frontend.

## Caching Model

Each source defines `cachePolicy` as `none`, `respect-upstream`, or `ttl`. Tile responses set `Cache-Control`, `X-TileMux-Source`, and `X-TileMux-Cache-Policy`. Remote XYZ requests pass Cloudflare fetch cache hints only for `ttl` sources.

The debug-grid source uses a long TTL because its output is deterministic.

## Why D1 Is Not Used Yet

V0 is config-file-driven. D1 would add migrations, admin workflows, and source CRUD before the gateway behavior is proven. A database can be added later if source management becomes a real workflow.

## Future Work

- Add short-lived scoped tokens or signed URLs for clients that cannot send
  `Authorization` headers.
- Add a transform pipeline for raster operations such as invert, grayscale, or
  tint.
- Implement a PMTiles R2 adapter with byte-range reads.
- Rewrite external style JSON safely without exposing provider secrets.
- Add glyph and sprite proxying for vector styles.
- Add a source management UI only after the source registry shape stabilizes.
