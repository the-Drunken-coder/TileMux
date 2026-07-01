# Deployment

Last verified: 2026-07-01

TileMux is deployed as a Cloudflare Worker.

## Production Worker

- Worker name: `tilemux`
- Production URL: `https://tilemux.laraujo123546.workers.dev`
- Cloudflare account: `Laraujo123546@gmail.com's Account`
- Account email: `laraujo123546@gmail.com`
- Account ID: `d83bad0adb8540580098830096e147dc`
- Wrangler auth: OAuth token

Latest observed deployment from `npx wrangler deployments list`:

- Created: `2026-07-01T20:14:13.050Z`
- Version ID: `99d2c327-8e1b-4d04-8c1b-ea0b6ee820e9`
- Source: `Unknown (deployment)`
- Author: `laraujo123546@gmail.com`

The confirmed deploy path is direct Wrangler deployment from this repository.
Do not assume dashboard Git integration is active unless you verify it in the
Cloudflare dashboard or via a current Cloudflare API check.

## Source Control

- GitHub repo: `https://github.com/the-Drunken-coder/TileMux`
- Default branch: `main`
- Visibility: public
- Local remote: `origin`

## Worker Configuration

The production Worker is configured from `wrangler.jsonc`:

- Worker entrypoint: `src/worker/index.ts`
- Static assets directory: `dist`
- Asset binding: `ASSETS`
- R2 binding: `TILE_BUCKET`
- R2 bucket: `tilemux-tiles`
- R2 hosted source prefix: `tiles/osm-standard-dark/`
- `ALLOWED_ORIGINS`: `self`
- Worker-first routes: `/api/*`, `/sources.json`, `/tiles/*`, `/styles/*`,
  `/tilejson/*`

The R2 bucket `tilemux-tiles` exists in Cloudflare. The `osm-standard-dark`
source serves sample tiles from `tiles/osm-standard-dark/{z}/{x}/{y}.png`.
Those objects were populated from the `osm-standard-dark` GitHub Actions
artifact `osm-standard-dark-dc-xyz-directory` from run `28538585097`.

## Secrets

Configured Worker secret names:

- `TILEMUX_API_KEY`
- `GOOGLE_MAPS_KEY`
- `AZURE_MAPS_KEY`
- `MAPBOX_TOKEN`
- `THUNDERFOREST_KEY`
- `MAPTILER_KEY`

Configured but currently disabled optional sources also reference these secret
names when they are enabled:

- `STADIA_KEY`
- `GEOAPIFY_KEY`

Do not commit or write secret values into repository files. `TILEMUX_API_KEY`
protects private `/api/*` routes only. The browser UI, source catalog, styles,
TileJSON, and public tile routes are intended to work without that API key.

## Deploy

From the repository root:

```bash
npm install
npm run typecheck
npm run test
npm run build
npm run deploy
```

`npm run deploy` runs `npm run build && wrangler deploy`.

If a provider secret must be changed, set it with Wrangler before deploying:

```bash
npx wrangler secret put TILEMUX_API_KEY
npx wrangler secret put GOOGLE_MAPS_KEY
npx wrangler secret put AZURE_MAPS_KEY
npx wrangler secret put MAPBOX_TOKEN
npx wrangler secret put THUNDERFOREST_KEY
npx wrangler secret put MAPTILER_KEY
npx wrangler secret put STADIA_KEY
npx wrangler secret put GEOAPIFY_KEY
```

## Verification

Useful checks for a new agent:

```bash
npx wrangler whoami
npx wrangler deployments list
npx wrangler secret list
npx wrangler r2 bucket info tilemux-tiles
curl -fsS https://tilemux.laraujo123546.workers.dev/api/health
curl -fsS https://tilemux.laraujo123546.workers.dev/sources.json
```

After a deploy, use `npx wrangler deployments list` to record the new version if
this document needs to be refreshed.
