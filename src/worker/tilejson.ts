import type { TileSource } from "./sources";

export function tileUrlForRequest(
  request: Request,
  source: TileSource,
  ext = source.ext,
): string {
  const url = new URL(request.url);
  return `${url.origin}/tiles/${encodeURIComponent(source.id)}/{z}/{x}/{y}.${ext}`;
}

export function tileJsonForSource(request: Request, source: TileSource) {
  const ext = source.provider.kind === "debug-grid" ? "png" : source.ext;

  return {
    tilejson: "3.0.0",
    name: source.name,
    tiles: [tileUrlForRequest(request, source, ext)],
    minzoom: source.minzoom,
    maxzoom: source.maxzoom,
    bounds: [-180, -85.051129, 180, 85.051129],
    attribution: source.attribution || "",
  };
}
