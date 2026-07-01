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
  const values: Record<string, string | number> = {
    z: coordinate.z,
    x: coordinate.x,
    y: coordinate.y,
    ext: coordinate.ext,
  };
  const providerSecrets: Record<ProviderSecretName, string | undefined> = {
    MAPBOX_TOKEN: env.MAPBOX_TOKEN,
    MAPTILER_KEY: env.MAPTILER_KEY,
    STADIA_KEY: env.STADIA_KEY,
    CUSTOM_PROVIDER_KEY: env.CUSTOM_PROVIDER_KEY,
  };

  for (const [placeholder, secretName] of Object.entries(
    source.secretPlaceholders || {},
  )) {
    const secret = providerSecrets[secretName];
    if (!secret) {
      throw new HttpError(
        500,
        `Missing provider secret ${secretName} for source ${source.id}`,
      );
    }
    values[placeholder] = secret;
  }

  return substituteTemplate(source.template, values);
}

function safeUpstreamHeaders(request: Request): Headers {
  const headers = new Headers();
  const accept = request.headers.get("Accept");
  const ifNoneMatch = request.headers.get("If-None-Match");
  const ifModifiedSince = request.headers.get("If-Modified-Since");

  if (accept) headers.set("Accept", accept);
  if (ifNoneMatch) headers.set("If-None-Match", ifNoneMatch);
  if (ifModifiedSince) headers.set("If-Modified-Since", ifModifiedSince);

  return headers;
}

export async function remoteXyzResponse(
  request: Request,
  env: RuntimeEnv,
  source: RemoteXyzSource,
  coordinate: TileCoordinate,
): Promise<Response> {
  const upstreamUrl = resolveRemoteTileUrl(source, coordinate, env);
  let upstream: Response;

  try {
    upstream = await fetch(upstreamUrl, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers: safeUpstreamHeaders(request),
      cf: source.cachePolicy === "ttl" && source.cacheTtlSeconds
        ? { cacheEverything: true, cacheTtl: source.cacheTtlSeconds }
        : undefined,
    });
  } catch {
    throw new HttpError(
      502,
      `Upstream provider failure for ${source.id}: ${redactUrl(upstreamUrl)}`,
    );
  }

  if (!upstream.ok && upstream.status !== 304) {
    throw new HttpError(
      502,
      `Upstream provider returned ${upstream.status} for ${source.id}: ${redactUrl(
        upstreamUrl,
      )}`,
    );
  }

  const headers = new Headers({
    "Content-Type":
      upstream.headers.get("Content-Type") || contentTypeForExtension(source.ext),
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
