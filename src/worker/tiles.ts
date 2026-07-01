import type { RuntimeEnv } from "./env";
import {
  getEnabledSource,
  type DebugGridSource,
  type PmtilesR2Source,
  type R2XyzSource,
  type RemoteXyzSource,
  type TileSource,
} from "./sources";
import { debugGridResponse } from "./providers/debugGrid";
import { remoteXyzResponse } from "./providers/remoteXyz";
import { r2XyzResponse } from "./providers/r2Xyz";
import { pmtilesTodoResponse } from "./providers/pmtilesTodo";
import { HttpError } from "./utils/http";
import { parseTilePath, validateZxy } from "./utils/zxy";

function isDebugGridSource(source: TileSource): source is DebugGridSource {
  return source.provider.kind === "debug-grid";
}

function isRemoteXyzSource(source: TileSource): source is RemoteXyzSource {
  return source.provider.kind === "remote-xyz";
}

function isR2XyzSource(source: TileSource): source is R2XyzSource {
  return source.provider.kind === "r2-xyz";
}

function isPmtilesR2Source(source: TileSource): source is PmtilesR2Source {
  return source.provider.kind === "pmtiles-r2";
}

function allowedTileExtensions(source: ReturnType<typeof getEnabledSource>): string[] {
  if (!source) {
    return [];
  }

  return source.provider.kind === "debug-grid" ? [source.ext, "png"] : [source.ext];
}

export async function tileResponse(
  request: Request,
  env: RuntimeEnv,
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    throw new HttpError(405, "Method not allowed");
  }

  const url = new URL(request.url);
  const parsed = parseTilePath(url.pathname);
  if (!parsed) {
    throw new HttpError(404, "Tile route not found");
  }

  const source = getEnabledSource(parsed.sourceId);
  if (!source) {
    throw new HttpError(404, "Unknown source");
  }

  const validation = validateZxy(parsed, {
    minzoom: source.minzoom,
    maxzoom: source.maxzoom,
    ext: allowedTileExtensions(source),
  });
  if (!validation.ok) {
    throw new HttpError(400, validation.message);
  }

  if (isDebugGridSource(source)) {
    return debugGridResponse(request, source, validation.coordinate);
  }
  if (isRemoteXyzSource(source)) {
    return remoteXyzResponse(request, env, source, validation.coordinate);
  }
  if (isR2XyzSource(source)) {
    return r2XyzResponse(request, env, source, validation.coordinate);
  }
  if (isPmtilesR2Source(source)) {
    return pmtilesTodoResponse(source);
  }

  throw new HttpError(500, "Unsupported source provider");
}
