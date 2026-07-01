import type { RuntimeEnv } from "./env";
import { getEnabledSource } from "./sources";
import { debugGridResponse } from "./providers/debugGrid";
import { remoteXyzResponse } from "./providers/remoteXyz";
import { r2XyzResponse } from "./providers/r2Xyz";
import { pmtilesTodoResponse } from "./providers/pmtilesTodo";
import { HttpError } from "./utils/http";
import { parseTilePath, validateZxy } from "./utils/zxy";

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

  const validation = validateZxy(parsed, source);
  if (!validation.ok) {
    throw new HttpError(400, validation.message);
  }

  switch (source.kind) {
    case "debug-grid":
      return debugGridResponse(request, source, validation.coordinate);
    case "remote-xyz":
      return remoteXyzResponse(request, env, source, validation.coordinate);
    case "r2-xyz":
      return r2XyzResponse(request, env, source, validation.coordinate);
    case "pmtiles-r2":
      return pmtilesTodoResponse(source);
  }
}
