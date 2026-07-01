import { jsonResponse } from "./utils/http";
import { tileUrlForRequest } from "./tilejson";
import type { TileSource } from "./sources";

type StyleSource = Record<string, unknown> & {
  tiles?: unknown;
};

type StyleDocument = Record<string, unknown> & {
  sources?: Record<string, StyleSource>;
};

function absoluteTileUrl(request: Request, tileUrl: string): string {
  return tileUrl.startsWith("/")
    ? `${new URL(request.url).origin}${tileUrl}`
    : tileUrl;
}

function styleWithAbsoluteTileUrls(
  request: Request,
  style: Record<string, unknown>,
): Record<string, unknown> {
  const document = style as StyleDocument;
  if (!document.sources) {
    return style;
  }

  return {
    ...document,
    sources: Object.fromEntries(
      Object.entries(document.sources).map(([sourceId, styleSource]) => [
        sourceId,
        {
          ...styleSource,
          tiles: Array.isArray(styleSource.tiles)
            ? styleSource.tiles.map((tileUrl) =>
                typeof tileUrl === "string"
                  ? absoluteTileUrl(request, tileUrl)
                  : tileUrl,
              )
            : styleSource.tiles,
        },
      ]),
    ),
  };
}

export function styleResponseForSource(
  request: Request,
  source: TileSource,
): Response {
  if (source.style) {
    return jsonResponse(styleWithAbsoluteTileUrls(request, source.style));
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
  const sourceMaxzoom = source.sourceMaxzoom ?? source.maxzoom;

  return jsonResponse({
    version: 8,
    sources: {
      [source.id]: {
        type: "raster",
        tiles: [tileUrlForRequest(request, source, tileExtension)],
        tileSize: source.tileSize,
        minzoom: source.minzoom,
        maxzoom: sourceMaxzoom,
        ...(source.bounds ? { bounds: source.bounds } : {}),
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
