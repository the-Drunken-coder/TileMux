import { jsonResponse } from "./utils/http";
import { tileUrlForRequest } from "./tilejson";
import type { TileSource } from "./sources";

export function styleResponseForSource(
  request: Request,
  source: TileSource,
): Response {
  if (source.style) {
    return jsonResponse(source.style);
  }

  if (source.format !== "raster") {
    return jsonResponse(
      { error: "Generated styles for vector sources are not implemented in v0" },
      { status: 501 },
    );
  }

  // MapLibre's raster pipeline may reject SVG image tiles, so generated debug
  // styles use the PNG debug-grid variant while TileJSON/sample URLs stay SVG.
  const tileExtension = source.provider.kind === "debug-grid" ? "png" : source.ext;

  return jsonResponse({
    version: 8,
    sources: {
      [source.id]: {
        type: "raster",
        tiles: [tileUrlForRequest(request, source, tileExtension)],
        tileSize: source.tileSize,
        minzoom: source.minzoom,
        maxzoom: source.maxzoom,
        attribution: source.attribution || "",
      },
    },
    layers: [
      {
        id: `${source.id}-raster`,
        type: "raster",
        source: source.id,
      },
    ],
  });
}
