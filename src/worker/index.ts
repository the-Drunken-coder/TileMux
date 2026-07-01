import type { RuntimeEnv } from "./env";
import { isAuthorized } from "./auth";
import { isTileMuxRoute, preflightResponse, withCors } from "./cors";
import {
  getEnabledSource,
  listEnabledSources,
  sanitizeSource,
} from "./sources";
import { styleResponseForSource } from "./styles";
import { tileJsonForSource } from "./tilejson";
import { tileResponse } from "./tiles";
import { errorResponse, HttpError, jsonResponse, redactUrl } from "./utils/http";

function sourceIdFromJsonPath(
  pathname: string,
  kind: "tilejson" | "styles",
): string | null {
  const match = new RegExp(`^/(?:api/)?${kind}/([^/]+)\\.json$`).exec(pathname);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function requiresAuth(pathname: string): boolean {
  if (pathname === "/api/health") {
    return false;
  }

  return isTileMuxRoute(pathname);
}

async function routeRequest(
  request: Request,
  env: RuntimeEnv,
): Promise<Response> {
  const url = new URL(request.url);

  if (
    url.pathname === "/api/health" &&
    (request.method === "GET" || request.method === "HEAD")
  ) {
    return request.method === "HEAD"
      ? new Response(null, {
          headers: { "Content-Type": "application/json; charset=utf-8" },
        })
      : jsonResponse({ ok: true, name: "TileMux" });
  }

  if (requiresAuth(url.pathname) && !isAuthorized(request, env)) {
    throw new HttpError(401, "Missing or invalid API key");
  }

  if (url.pathname === "/api/sources" && request.method === "GET") {
    return jsonResponse({
      sources: listEnabledSources().map(sanitizeSource),
    });
  }

  const tileJsonSourceId = sourceIdFromJsonPath(url.pathname, "tilejson");
  if (tileJsonSourceId && request.method === "GET") {
    const source = getEnabledSource(tileJsonSourceId);
    if (!source) {
      throw new HttpError(404, "Unknown source");
    }

    return jsonResponse(tileJsonForSource(request, source));
  }

  const styleSourceId = sourceIdFromJsonPath(url.pathname, "styles");
  if (styleSourceId && request.method === "GET") {
    const source = getEnabledSource(styleSourceId);
    if (!source) {
      throw new HttpError(404, "Unknown source");
    }

    return styleResponseForSource(request, source);
  }

  if (url.pathname.startsWith("/tiles/")) {
    return tileResponse(request, env);
  }

  if (isTileMuxRoute(url.pathname)) {
    throw new HttpError(404, "Route not found");
  }

  return env.ASSETS.fetch(request);
}

export async function handleRequest(
  request: Request,
  env: RuntimeEnv,
): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS" && isTileMuxRoute(url.pathname)) {
    return preflightResponse(request, env);
  }

  try {
    const response = await routeRequest(request, env);
    return isTileMuxRoute(url.pathname) ? withCors(request, env, response) : response;
  } catch (error) {
    const response =
      error instanceof HttpError
        ? errorResponse(error.status, error.message)
        : errorResponse(500, `Unexpected error for ${redactUrl(request.url)}`);

    return isTileMuxRoute(url.pathname) ? withCors(request, env, response) : response;
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    return handleRequest(request, env);
  },
} satisfies ExportedHandler<RuntimeEnv>;
