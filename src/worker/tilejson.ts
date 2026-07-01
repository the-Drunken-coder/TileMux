import type { TileSource } from "./sources";
import { substituteTemplate } from "./utils/http";

function browserTileTemplate(source: TileSource, ext: string): string | null {
  return source.provider.kind === "remote-xyz" &&
    source.provider.browserTileTemplate
    ? substituteTemplate(source.provider.browserTileTemplate, { ext })
    : null;
}

export function tileUrlForRequest(
  request: Request,
  source: TileSource,
  ext = source.ext,
): string {
  const browserTemplate = browserTileTemplate(source, ext);
  if (browserTemplate) {
    return browserTemplate;
  }

  const url = new URL(request.url);
  return `${url.origin}/tiles/${encodeURIComponent(source.id)}/{z}/{x}/{y}.${ext}`;
}

export function tileJsonForSource(request: Request, source: TileSource) {
  const ext = source.provider.kind === "debug-grid" ? "png" : source.ext;
  const sourceMaxzoom = source.sourceMaxzoom ?? source.maxzoom;

  return {
    tilejson: "3.0.0",
    name: source.name,
    tiles: [tileUrlForRequest(request, source, ext)],
    minzoom: source.minzoom,
    maxzoom: sourceMaxzoom,
    source_maxzoom: sourceMaxzoom,
    fillzoom: sourceMaxzoom,
    exposed_maxzoom: source.maxzoom,
    bounds: [-180, -85.051129, 180, 85.051129],
    attribution: source.attribution || "",
  };
}
