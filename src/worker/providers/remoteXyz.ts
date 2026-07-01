import type { ProviderSecretName, RuntimeEnv } from "../env";
import type { RemoteXyzSource } from "../sources";
import type { TileCoordinate } from "../utils/zxy";
import { contentTypeForExtension } from "../utils/contentTypes";
import {
  cacheControlHeader,
  cachePolicyHeader,
  HttpError,
  redactUrl,
  substituteTemplate,
} from "../utils/http";

export function resolveRemoteTileUrl(
  source: RemoteXyzSource,
  coordinate: TileCoordinate,
  env: RuntimeEnv,
): string {
  return resolveRemoteTileUrlWithSecrets(source, coordinate, env).url;
}

function resolveRemoteTileUrlWithSecrets(
  source: RemoteXyzSource,
  coordinate: TileCoordinate,
  env: RuntimeEnv,
): { url: string; sensitiveValues: string[] } {
  const upstreamCoordinate = source.sourceMaxzoom
    ? sourceTileCoordinate(coordinate, source.sourceMaxzoom)
    : coordinate;
  const values: Record<string, string | number> = {
    z: upstreamCoordinate.z,
    x: upstreamCoordinate.x,
    y: upstreamCoordinate.y,
    ext: upstreamCoordinate.ext,
  };
  const providerSecrets: Record<ProviderSecretName, string | undefined> = {
    AZURE_MAPS_KEY: env.AZURE_MAPS_KEY,
    GEOAPIFY_KEY: env.GEOAPIFY_KEY,
    GOOGLE_MAPS_KEY: env.GOOGLE_MAPS_KEY,
    MAPBOX_TOKEN: env.MAPBOX_TOKEN,
    MAPTILER_KEY: env.MAPTILER_KEY,
    STADIA_KEY: env.STADIA_KEY,
    THUNDERFOREST_KEY: env.THUNDERFOREST_KEY,
    CUSTOM_PROVIDER_KEY: env.CUSTOM_PROVIDER_KEY,
  };
  const sensitiveValues: string[] = [];

  for (const [placeholder, secretName] of Object.entries(
    source.provider.secretPlaceholders || {},
  )) {
    const secret = providerSecrets[secretName];
    if (!secret) {
      throw new HttpError(
        500,
        `Missing provider secret ${secretName} for source ${source.id}`,
      );
    }
    values[placeholder] = secret;
    sensitiveValues.push(secret);
  }

  return {
    url: substituteTemplate(source.provider.template, values),
    sensitiveValues,
  };
}

function sourceTileCoordinate(
  coordinate: TileCoordinate,
  sourceMaxzoom: number,
): TileCoordinate {
  if (coordinate.z <= sourceMaxzoom) {
    return coordinate;
  }

  const factor = 2 ** (coordinate.z - sourceMaxzoom);
  return {
    ...coordinate,
    z: sourceMaxzoom,
    x: Math.floor(coordinate.x / factor),
    y: Math.floor(coordinate.y / factor),
  };
}

function safeUpstreamHeaders(request: Request, source: RemoteXyzSource): Headers {
  const headers = new Headers();
  const requestUrl = new URL(request.url);
  const accept = request.headers.get("Accept");
  const ifNoneMatch = request.headers.get("If-None-Match");
  const ifModifiedSince = request.headers.get("If-Modified-Since");

  for (const [name, value] of Object.entries(
    source.provider.requestHeaders || {},
  )) {
    headers.set(name, value);
  }

  if (!headers.has("Referer")) {
    headers.set("Referer", `${requestUrl.origin}/`);
  }

  if (accept) headers.set("Accept", accept);
  if (ifNoneMatch) headers.set("If-None-Match", ifNoneMatch);
  if (ifModifiedSince) headers.set("If-Modified-Since", ifModifiedSince);

  return headers;
}

function responseContentType(source: RemoteXyzSource, upstream: Response): string {
  const contentType = upstream.headers.get("Content-Type");

  return contentType && contentType !== "application/octet-stream"
    ? contentType
    : contentTypeForExtension(source.ext);
}

export async function remoteXyzResponse(
  request: Request,
  env: RuntimeEnv,
  source: RemoteXyzSource,
  coordinate: TileCoordinate,
): Promise<Response> {
  const { url: upstreamUrl, sensitiveValues } = resolveRemoteTileUrlWithSecrets(
    source,
    coordinate,
    env,
  );
  let upstream: Response;

  try {
    upstream = await fetch(upstreamUrl, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers: safeUpstreamHeaders(request, source),
      cf: source.cachePolicy === "ttl" && source.cacheTtlSeconds
        ? { cacheEverything: true, cacheTtl: source.cacheTtlSeconds }
        : undefined,
    });
  } catch {
    throw new HttpError(
      502,
      `Upstream provider failure for ${source.id}: ${redactUrl(
        upstreamUrl,
        sensitiveValues,
      )}`,
    );
  }

  const headers = new Headers({
    "Content-Type": responseContentType(source, upstream),
    "Cache-Control": cacheControlHeader(
      source.cachePolicy,
      source.cacheTtlSeconds,
      upstream.headers.get("Cache-Control"),
    ),
    "X-TileMux-Source": source.id,
    "X-TileMux-Cache-Policy": cachePolicyHeader(
      source.cachePolicy,
      source.cacheTtlSeconds,
    ),
  });
  const etag = upstream.headers.get("ETag");
  const lastModified = upstream.headers.get("Last-Modified");

  if (etag) headers.set("ETag", etag);
  if (lastModified) headers.set("Last-Modified", lastModified);

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
}
