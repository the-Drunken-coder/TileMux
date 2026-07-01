# TileMux Sources

TileMux sources are defined in `src/worker/sources.ts`. V0 intentionally uses TypeScript config instead of a database.

## Supported Kinds

- `debug-grid`: generated SVG tiles for routing and UI testing.
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
  template: "https://example.com/tiles/{z}/{x}/{y}.png?token={PROVIDER_TOKEN}",
  secretPlaceholders: {
    PROVIDER_TOKEN: "CUSTOM_PROVIDER_KEY",
  },
  attribution: "Example provider",
  cacheTtlSeconds: 86400,
  enabled: false,
}
```

Template placeholders `{z}`, `{x}`, `{y}`, and `{ext}` come from the tile request. Secret placeholders are mapped to Worker env secret names.

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
  cacheTtlSeconds: 31536000,
  enabled: true,
}
```

The R2 key template supports `{sourceId}`, `{z}`, `{x}`, `{y}`, and `{ext}`.

## Common Mistakes

- Forgetting to set `TILEMUX_API_KEY` in `.dev.vars` or Wrangler secrets.
- Enabling a remote source before setting the provider secret it references.
- Returning provider API keys in source metadata. Do not add secret fields to sanitized API responses.
- Mismatching the requested extension and source `ext`.
- Uploading R2 objects under a path that does not match `r2KeyTemplate`.
