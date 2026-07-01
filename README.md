# TileMux

TileMux is a private Cloudflare Worker app for map tile hosting, map tile proxying, and tile/style comparison. One Worker serves both the API and the React comparison UI.

V0 is intentionally small: a TypeScript source registry, one API key, static Worker assets, R2-backed tiles, remote XYZ proxying, and a debug-grid source that works without external services.

## What V0 Supports

- `debug-grid` generated SVG raster tiles.
- `remote-xyz` tile proxying with server-side provider secret substitution.
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
ALLOWED_ORIGINS=*
```

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
curl "http://localhost:8787/tiles/debug-grid/0/0/0.svg?key=your-local-key"
curl "http://localhost:8787/api/sources?key=your-local-key"
curl "http://localhost:8787/api/tilejson/debug-grid.json?key=your-local-key"
curl "http://localhost:8787/api/styles/debug-grid.json?key=your-local-key"
```

Missing or wrong keys should return `401` for private API and tile routes.

## Adding A Remote XYZ Source

Edit `src/worker/sources.ts`:

```ts
"my-provider": {
  id: "my-provider",
  name: "My Provider",
  kind: "remote-xyz",
  format: "raster",
  tileSize: 256,
  minzoom: 0,
  maxzoom: 19,
  ext: "png",
  template: "https://provider.example/tiles/{z}/{x}/{y}.png?token={PROVIDER_TOKEN}",
  secretPlaceholders: {
    PROVIDER_TOKEN: "CUSTOM_PROVIDER_KEY",
  },
  attribution: "Provider attribution",
  cacheTtlSeconds: 86400,
  enabled: true,
}
```

Set provider secrets with Wrangler:

```bash
npx wrangler secret put CUSTOM_PROVIDER_KEY
```

TileMux never forwards `TILEMUX_API_KEY` upstream and never returns provider secrets in `/api/sources`.

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
  kind: "r2-xyz",
  format: "raster",
  tileSize: 256,
  minzoom: 0,
  maxzoom: 22,
  ext: "png",
  r2KeyTemplate: "tiles/private-raster/{z}/{x}/{y}.png",
  attribution: "Private tiles",
  cacheTtlSeconds: 31536000,
  enabled: true,
}
```

Upload objects with keys matching the template.

## Deploy

```bash
npm run build
npx wrangler secret put TILEMUX_API_KEY
npx wrangler secret put CUSTOM_PROVIDER_KEY # optional, if a source needs it
npm run deploy
```

Provider terms and caching rules vary. Keep `cacheTtlSeconds` aligned with the upstream provider's terms.
