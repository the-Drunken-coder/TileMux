import type { RuntimeEnv } from "./env";

const DEFAULT_ALLOWED_ORIGINS = "self";
const ALLOWED_METHODS = "GET, HEAD, OPTIONS";
const ALLOWED_HEADERS = "Authorization, Content-Type";
const EXPOSED_HEADERS =
  "Content-Type, ETag, X-TileMux-Source, X-TileMux-Cache-Policy";

export function isTileMuxRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/tiles/") ||
    pathname.startsWith("/styles/") ||
    pathname.startsWith("/tilejson/")
  );
}

export function corsHeaders(request: Request, env: RuntimeEnv): Headers {
  const headers = new Headers();
  const origin = request.headers.get("Origin");
  const allowedOrigins = (env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const requestOrigin = new URL(request.url).origin;

  const allowOrigin =
    allowedOrigins.includes("*") || !origin
      ? "*"
      : allowedOrigins.includes(origin) ||
          (allowedOrigins.includes("self") && origin === requestOrigin)
        ? origin
        : null;

  if (allowOrigin) {
    headers.set("Access-Control-Allow-Origin", allowOrigin);
  }
  headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  headers.set("Access-Control-Expose-Headers", EXPOSED_HEADERS);
  headers.set("Vary", "Origin");
  return headers;
}

export function withCors(
  request: Request,
  env: RuntimeEnv,
  response: Response,
): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of corsHeaders(request, env)) {
    if (key.toLowerCase() === "vary" && headers.has("Vary")) {
      const vary = headers.get("Vary") || "";
      const values = vary.split(",").map((item) => item.trim().toLowerCase());
      headers.set("Vary", values.includes(value.toLowerCase()) ? vary : `${vary}, ${value}`);
    } else {
      headers.set(key, value);
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function preflightResponse(request: Request, env: RuntimeEnv): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, env),
  });
}
