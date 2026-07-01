import type { RuntimeEnv } from "../env";
import type { R2XyzSource } from "../sources";
import type { TileCoordinate } from "../utils/zxy";
import { contentTypeForExtension } from "../utils/contentTypes";
import {
  cacheControlHeader,
  cachePolicyHeader,
  substituteTemplate,
} from "../utils/http";

export function resolveR2Key(
  source: R2XyzSource,
  coordinate: TileCoordinate,
): string {
  return substituteTemplate(source.provider.r2KeyTemplate, {
    sourceId: source.id,
    z: coordinate.z,
    x: coordinate.x,
    y: coordinate.y,
    ext: coordinate.ext,
  });
}

function headersForR2Object(
  source: R2XyzSource,
  object: R2Object,
): Headers {
  const headers = new Headers({
    "Content-Type": contentTypeForExtension(source.ext),
    "X-TileMux-Source": source.id,
    "X-TileMux-Cache-Policy": cachePolicyHeader(
      source.cachePolicy,
      source.cacheTtlSeconds,
    ),
  });

  object.writeHttpMetadata(headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", contentTypeForExtension(source.ext));
  }
  headers.set(
    "Cache-Control",
    cacheControlHeader(
      source.cachePolicy,
      source.cacheTtlSeconds,
      headers.get("Cache-Control"),
    ),
  );
  headers.set("ETag", object.httpEtag);
  return headers;
}

export async function r2XyzResponse(
  request: Request,
  env: RuntimeEnv,
  source: R2XyzSource,
  coordinate: TileCoordinate,
): Promise<Response> {
  const key = resolveR2Key(source, coordinate);

  if (request.method === "HEAD") {
    const object = await env.TILE_BUCKET.head(key);
    if (!object) {
      return new Response("Tile not found", { status: 404 });
    }

    return new Response(null, {
      headers: headersForR2Object(source, object),
    });
  }

  const object = await env.TILE_BUCKET.get(key);
  if (!object) {
    return new Response("Tile not found", { status: 404 });
  }

  return new Response(object.body, {
    headers: headersForR2Object(source, object),
  });
}
