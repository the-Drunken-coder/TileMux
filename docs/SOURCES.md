# TileMux Sources

TileMux sources are defined in `src/worker/sources.ts`. V0 intentionally uses
TypeScript config instead of a database.

A source is the user-facing map option. Its `provider` describes where tiles
come from, and future `transforms` can describe how tiles are changed before
TileMux returns them.

## Supported Kinds

- `debug-grid`: generated SVG/PNG tiles for routing and UI testing.
- `remote-xyz`: proxies an upstream XYZ URL template.
- `r2-xyz`: serves objects from R2 using a key template.
- `pmtiles-r2`: reserved type for a future PMTiles adapter.

## Bundled Open Sources

- `osm-standard`: OpenStreetMap Standard raster tiles.
- `cartoRaster`: CARTO Voyager raster tiles.
- `esri-world-imagery`: Esri World Imagery raster tiles.
- `usgs-topo`: USGS Topo raster tiles.
- `openmaps-opentopomap`: OpenTopoMap raster tiles served through openmaps.fr.
- `openmaps-openhikingmap`: OpenHikingMap raster tiles served through openmaps.fr.

## Bundled Keyed Sources

- Google: `google-maps`, `google-satellite`, `google-hybrid`, `google-terrain`.
- Azure Maps/Microsoft: `bing-aerial`, `bing-roads`.
- Mapbox: `mapbox-streets`, `mapbox-satellite`, `mapbox-outdoors`, `mapbox-dark`.
- Thunderforest: `thunderforest-landscape`, `thunderforest-outdoors`, `thunderforest-transport-dark`, `thunderforest-spinal-map`, `thunderforest-pioneer`.
- MapTiler: `maptiler-satellite`.

These are enabled by default so the app has real basemaps immediately. Each
source uses `cachePolicy: "respect-upstream"` so TileMux forwards upstream cache
behavior instead of inventing its own cache lifetime.

Some public providers require normal browser request headers for interactive map
use. Those sources can set `provider.browserTileTemplate`; generated browser
styles and TileJSON will use that public upstream URL directly, while TileMux
keeps provider secrets and non-public templates out of `/sources.json`.

## Remote XYZ Example

```ts
"example-remote": {
  id: "example-remote",
  name: "Example Remote XYZ",
  provider: {
    kind: "remote-xyz",
    template: "https://example.com/tiles/{z}/{x}/{y}.{ext}?token={PROVIDER_TOKEN}",
    browserTileTemplate: "https://provider.example/tiles/{z}/{x}/{y}.{ext}",
    secretPlaceholders: {
      PROVIDER_TOKEN: "CUSTOM_PROVIDER_KEY",
    },
  },
  format: "raster",
  tileSize: 256,
  minzoom: 0,
  maxzoom: 22,
  sourceMaxzoom: 19,
  ext: "png",
  attribution: "Example provider",
  cachePolicy: "respect-upstream",
  enabled: false,
}
```

Template placeholders `{z}`, `{x}`, `{y}`, and `{ext}` come from the tile request. Secret placeholders are mapped to Worker env secret names. When `sourceMaxzoom` is lower than `maxzoom`, TileMux accepts the requested zoom but fetches the matching parent tile from upstream.

The bundled `example-remote` source stays disabled by default. To enable it, replace the URL template with a real provider URL, set the provider secret locally or through Wrangler, choose a cache policy, and change `enabled` to `true`.

Migrated TileRelay sources use these Worker secret names:

- `GOOGLE_MAPS_KEY`
- `AZURE_MAPS_KEY`
- `MAPBOX_TOKEN`
- `THUNDERFOREST_KEY`
- `MAPTILER_KEY`

## R2 XYZ Example

```ts
"local-r2": {
  id: "local-r2",
  name: "Local R2 Tiles",
  provider: {
    kind: "r2-xyz",
    r2KeyTemplate: "tiles/local-r2/{z}/{x}/{y}.png",
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

The R2 key template supports `{sourceId}`, `{z}`, `{x}`, `{y}`, and `{ext}`.

## Cache Policy

Every source has a `cachePolicy`:

- `none`: send `Cache-Control: no-store`.
- `respect-upstream`: preserve upstream cache headers or R2 object metadata cache headers when present.
- `ttl`: send `public, max-age=<cacheTtlSeconds>` and use Cloudflare fetch cache hints for remote XYZ sources.

Use `respect-upstream` when provider terms control tile caching. Use `ttl` for private/generated assets where TileMux owns the cache lifetime.

## Common Mistakes

- Forgetting to set `TILEMUX_API_KEY` when using private `/api/*` routes.
- Enabling a remote source before setting the provider secret it references.
- Returning provider API keys in source metadata. Do not add secret fields to sanitized API responses.
- Mismatching the requested extension and source `ext`.
- Uploading R2 objects under a path that does not match `r2KeyTemplate`.
- Setting `cachePolicy: "ttl"` without confirming the provider allows that cache lifetime.
