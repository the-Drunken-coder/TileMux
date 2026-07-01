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
- `osm-standard-dark`: OpenStreetMap Standard Dark raster tiles served from R2.
  The current tile set is the District of Columbia sample from
  `https://github.com/the-Drunken-coder/osm-standard-dark`, covering bounds
  `[-77.04, 38.889, -76.995, 38.91]` at zooms 12-16.
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
- MapTiler: `maptiler-satellite`, `maptiler-osm-dark`, `openmaptiles-dark-matter`.

These are enabled by default so the app has real basemaps immediately. Each
source uses `cachePolicy: "respect-upstream"` so TileMux forwards upstream cache
behavior instead of inventing its own cache lifetime.

`openmaptiles-dark-matter` vendors the open OpenMapTiles Dark Matter style JSON.
The style points vector tiles at TileMux's `/tiles/openmaptiles-dark-matter/*`
route, which substitutes the server-side `MAPTILER_KEY` before requesting
MapTiler's `v3-openmaptiles` vector tiles. Glyphs and sprites use the public
OpenMapTiles-hosted URLs from the upstream style.

## Configured Disabled Sources

- `stadia-alidade-smooth-dark`: Stadia Maps Alidade Smooth Dark raster XYZ tiles.
  Enable after setting `STADIA_KEY`.
- `geoapify-dark-matter-dark-grey`: Geoapify Dark Matter Dark Grey raster XYZ
  tiles. Enable after setting `GEOAPIFY_KEY`.

These are defined in `src/worker/sources.ts` but are not included in the public
catalog until their Worker secrets are available. Keeping them disabled avoids
showing browser users sources that can only return missing-secret errors.

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
- `STADIA_KEY`
- `GEOAPIFY_KEY`

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

## OpenStreetMap Standard Dark R2 Handoff

The `osm-standard-dark` source expects PNG objects in the `tilemux-tiles` R2
bucket using this key shape:

```text
tiles/osm-standard-dark/{z}/{x}/{y}.png
```

The source repo renders the same layout under `out/tiles/dark/{z}/{x}/{y}.png`.
Upload or sync that directory into the R2 prefix above after rendering a new
sample or downloading the GitHub Actions artifact.

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
