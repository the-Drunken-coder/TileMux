# TileMux Sources

TileMux sources are defined in `src/worker/sources.ts`. V0 intentionally uses TypeScript config instead of a database.

## Supported Kinds

- `debug-grid`: generated SVG/PNG tiles for routing and UI testing.
- `remote-xyz`: proxies an upstream XYZ URL template.
- `r2-xyz`: serves objects from R2 using a key template.
- `pmtiles-r2`: reserved type for a future PMTiles adapter.

## Remote XYZ Example

```ts
"example-remote": {
  id: "example-remote",
  name: "Example Remote XYZ",
  kind: "remote-xyz",
  format: "raster",
  tileSize: 256,
  minzoom: 0,
  maxzoom: 19,
  ext: "png",
  template: "https://example.com/tiles/{z}/{x}/{y}.{ext}?token={PROVIDER_TOKEN}",
  secretPlaceholders: {
    PROVIDER_TOKEN: "CUSTOM_PROVIDER_KEY",
  },
  attribution: "Example provider",
  cachePolicy: "respect-upstream",
  enabled: false,
}
```

Template placeholders `{z}`, `{x}`, `{y}`, and `{ext}` come from the tile request. Secret placeholders are mapped to Worker env secret names.

The bundled `example-remote` source stays disabled by default. To enable it, replace the URL template with a real provider URL, set the provider secret locally or through Wrangler, choose a cache policy, and change `enabled` to `true`.

## R2 XYZ Example

```ts
"local-r2": {
  id: "local-r2",
  name: "Local R2 Tiles",
  kind: "r2-xyz",
  format: "raster",
  tileSize: 256,
  minzoom: 0,
  maxzoom: 22,
  ext: "png",
  r2KeyTemplate: "tiles/local-r2/{z}/{x}/{y}.png",
  attribution: "Private tiles",
  cachePolicy: "ttl",
  cacheTtlSeconds: 31536000,
  enabled: true,
}
```

The R2 key template supports `{sourceId}`, `{z}`, `{x}`, `{y}`, and `{ext}`.

## Cache Policy

Every source has a `cachePolicy`:

- `none`: send `Cache-Control: no-store`.
- `respect-upstream`: preserve upstream cache headers or R2 object metadata cache headers when present.
- `ttl`: send `public, max-age=<cacheTtlSeconds>` and use Cloudflare fetch cache hints for remote XYZ sources.

Use `respect-upstream` when provider terms control tile caching. Use `ttl` for private/generated assets where TileMux owns the cache lifetime.

## Common Mistakes

- Forgetting to set `TILEMUX_API_KEY` in `.dev.vars` or Wrangler secrets.
- Enabling a remote source before setting the provider secret it references.
- Returning provider API keys in source metadata. Do not add secret fields to sanitized API responses.
- Mismatching the requested extension and source `ext`.
- Uploading R2 objects under a path that does not match `r2KeyTemplate`.
- Setting `cachePolicy: "ttl"` without confirming the provider allows that cache lifetime.
