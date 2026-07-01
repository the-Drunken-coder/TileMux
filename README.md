# TileMux

TileMux is a Cloudflare Worker app for map tile hosting, map tile proxying, and tile/style comparison. One Worker serves both a public React comparison UI and a private API.

V0 is intentionally small: a TypeScript source registry, one API key for `/api/*`, static Worker assets, R2-backed tiles, remote XYZ proxying, and a debug-grid source that works without external services.

Important v0 boundary: TileMux currently handles raster-style XYZ providers well. Full vector provider gateway support usually needs style JSON rewriting, glyph proxying, sprite proxying, and vector tile conventions that are intentionally left for later.

## What V0 Supports

- `debug-grid` generated SVG/PNG raster tiles.
- `remote-xyz` tile proxying with server-side provider secret substitution.
- `invert-raster` transformed raster sources, including inverted OpenStreetMap.
- TileRelay raster sources, including keyed Google, Azure Maps, Mapbox, Thunderforest, and MapTiler sources.
- `r2-xyz` tiles from an R2 bucket through the `TILE_BUCKET` binding.
- TileJSON and generated MapLibre raster styles.
- `/compare` with two synchronized MapLibre maps.

## Not Included

- DEM or elevation support.
- Dark-mode OSM generation.
- Billing.
- Multi-user accounts.
- Source-management UI.
- D1-backed source storage.
- PMTiles serving beyond the typed TODO adapter.

## Local Setup

```bash
npm install
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and set:

```bash
TILEMUX_API_KEY=your-local-key
ALLOWED_ORIGINS=self
```

`TILEMUX_API_KEY` is only required for private `/api/*` routes. The browser UI,
public source catalog, styles, TileJSON, and tiles load without a key.

`self` allows browser requests from the Worker app's own origin. Use a
comma-separated origin list for other trusted frontends; reserve `*` for local
experiments where a wildcard is intentional.

Start local dev:

```bash
npm run dev
```

Open `http://localhost:8787/compare`.

If port `8787` is already in use:

```bash
npm run dev -- --port 8788
```

## Verification

```bash
npm run typecheck
npm run test
npm run build
curl http://localhost:8787/api/health
curl http://localhost:8787/sources.json
curl http://localhost:8787/styles/debug-grid.json
curl http://localhost:8787/tilejson/debug-grid.json
curl http://localhost:8787/tiles/debug-grid/0/0/0.svg
curl "http://localhost:8787/api/sources?key=your-local-key"
curl "http://localhost:8787/api/tilejson/debug-grid.json?key=your-local-key"
curl "http://localhost:8787/api/styles/debug-grid.json?key=your-local-key"
```

Missing or wrong keys should return `401` for private `/api/*` routes.

## Adding A Remote XYZ Source

Edit `src/worker/sources.ts`:

```ts
"my-provider": {
  id: "my-provider",
  name: "My Provider",
  provider: {
    kind: "remote-xyz",
    template: "https://provider.example/tiles/{z}/{x}/{y}.{ext}?token={PROVIDER_TOKEN}",
    browserTileTemplate: "https://provider.example/tiles/{z}/{x}/{y}.{ext}",
    secretPlaceholders: {
      PROVIDER_TOKEN: "CUSTOM_PROVIDER_KEY",
    },
  },
  format: "raster",
  tileSize: 256,
  minzoom: 0,
  maxzoom: 19,
  sourceMaxzoom: 19,
  ext: "png",
  attribution: "Provider attribution",
  cachePolicy: "respect-upstream",
  enabled: true,
}
```

Set provider secrets with Wrangler:

```bash
npx wrangler secret put CUSTOM_PROVIDER_KEY
```

TileMux never forwards `TILEMUX_API_KEY` upstream and never returns provider secrets in `/sources.json` or `/api/sources`.

Use `browserTileTemplate` only for public provider URLs that are safe for the
browser to request directly. Leave it unset when TileMux must proxy the tile.

The shipped `example-remote` source is disabled by default so local setup does not depend on a real provider. To test the remote gateway path:

1. Replace the example URL template with your provider's XYZ template.
2. Map the template's provider token placeholder to a Worker secret in `secretPlaceholders`.
3. Set that secret in `.dev.vars` locally or with `npx wrangler secret put CUSTOM_PROVIDER_KEY`.
4. Set `enabled: true`.
5. Pick `cachePolicy: "respect-upstream"` to keep provider cache headers, or `cachePolicy: "ttl"` plus `cacheTtlSeconds` to force a TileMux TTL.

For migrated TileRelay sources, set these Worker secrets when those providers are enabled:

```bash
npx wrangler secret put GOOGLE_MAPS_KEY
npx wrangler secret put AZURE_MAPS_KEY
npx wrangler secret put MAPBOX_TOKEN
npx wrangler secret put THUNDERFOREST_KEY
npx wrangler secret put MAPTILER_KEY
```

## Adding An R2 XYZ Source

Create or choose an R2 bucket, then update `wrangler.jsonc` if the bucket is not named `tilemux-tiles`:

```jsonc
"r2_buckets": [
  { "binding": "TILE_BUCKET", "bucket_name": "tilemux-tiles" }
]
```

Add a source in `src/worker/sources.ts`:

```ts
"private-raster": {
  id: "private-raster",
  name: "Private Raster",
  provider: {
    kind: "r2-xyz",
    r2KeyTemplate: "tiles/private-raster/{z}/{x}/{y}.png",
  },
  format: "raster",
  tileSize: 256,
  minzoom: 0,
  maxzoom: 22,
  ext: "png",
  attribution: "Private tiles",
  cachePolicy: "ttl",
  cacheTtlSeconds: 31536000,
  enabled: true,
}
```

Upload objects with keys matching the template.

## Cache Policy

Each source has a `cachePolicy`:

- `"none"` returns `Cache-Control: no-store`.
- `"respect-upstream"` preserves upstream or object metadata cache headers when available.
- `"ttl"` sets `Cache-Control: public, max-age=<cacheTtlSeconds>` and enables Cloudflare fetch cache hints for remote XYZ sources.

## Deploy

```bash
npm run build
npx wrangler secret put TILEMUX_API_KEY
npx wrangler secret put CUSTOM_PROVIDER_KEY # optional, if a source needs it
npm run deploy
```

Provider terms and caching rules vary. Keep `cachePolicy` and `cacheTtlSeconds` aligned with the upstream provider's terms.
