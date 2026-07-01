import { extractApiKey } from "./auth";
import type { TileSource } from "./sources";

export function tileUrlForRequest(request: Request, source: TileSource): string {
  const url = new URL(request.url);
  const key = extractApiKey(request) || "";
  return `${url.origin}/tiles/${encodeURIComponent(source.id)}/{z}/{x}/{y}.${
    source.ext
  }?key=${encodeURIComponent(key)}`;
}

export function tileJsonForSource(request: Request, source: TileSource) {
  return {
    tilejson: "3.0.0",
    name: source.name,
    tiles: [tileUrlForRequest(request, source)],
    minzoom: source.minzoom,
    maxzoom: source.maxzoom,
    bounds: [-180, -85.051129, 180, 85.051129],
    attribution: source.attribution || "",
  };
}
