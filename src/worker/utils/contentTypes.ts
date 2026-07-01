const CONTENT_TYPES: Record<string, string> = {
  avif: "image/avif",
  gif: "image/gif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  json: "application/json; charset=utf-8",
  mvt: "application/vnd.mapbox-vector-tile",
  pbf: "application/x-protobuf",
  png: "image/png",
  svg: "image/svg+xml; charset=utf-8",
  webp: "image/webp",
};

export function contentTypeForExtension(extension: string): string {
  return CONTENT_TYPES[extension.toLowerCase()] || "application/octet-stream";
}
