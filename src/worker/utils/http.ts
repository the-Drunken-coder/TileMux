const REDACTED_VALUE = "REDACTED";
const SECRET_PARAM_PATTERN = /(key|token|secret|signature|credential|access_token)/i;

export type CachePolicy = "none" | "respect-upstream" | "ttl";

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function jsonResponse(
  body: unknown,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers,
  });
}

export function errorResponse(status: number, message: string): Response {
  return jsonResponse({ error: message }, { status });
}

export function cacheControlHeader(
  cachePolicy: CachePolicy,
  ttlSeconds?: number,
  upstreamCacheControl?: string | null,
): string {
  if (cachePolicy === "respect-upstream" && upstreamCacheControl) {
    return upstreamCacheControl;
  }

  if (cachePolicy === "ttl" && ttlSeconds && ttlSeconds > 0) {
    return `public, max-age=${Math.floor(ttlSeconds)}`;
  }

  return "no-store";
}

export function cachePolicyHeader(
  cachePolicy: CachePolicy,
  ttlSeconds?: number,
): string {
  if (cachePolicy === "ttl" && ttlSeconds && ttlSeconds > 0) {
    return `ttl=${Math.floor(ttlSeconds)}`;
  }

  return cachePolicy;
}

function redactSensitiveValues(input: string, sensitiveValues: readonly string[]): string {
  let redacted = input;

  for (const value of sensitiveValues) {
    if (!value) continue;
    for (const variant of new Set([value, encodeURIComponent(value)])) {
      redacted = redacted.split(variant).join(REDACTED_VALUE);
    }
  }

  return redacted;
}

export function redactUrl(
  input: string,
  sensitiveValues: readonly string[] = [],
): string {
  try {
    const isAbsolute = /^[a-z][a-z0-9+.-]*:/i.test(input);
    const url = new URL(input, "https://tilemux.local");
    if (url.username) url.username = REDACTED_VALUE;
    if (url.password) url.password = REDACTED_VALUE;

    for (const key of Array.from(url.searchParams.keys())) {
      if (SECRET_PARAM_PATTERN.test(key)) {
        url.searchParams.set(key, REDACTED_VALUE);
      }
    }

    const output = isAbsolute
      ? url.toString()
      : `${url.pathname}${url.search}${url.hash}`;
    return redactSensitiveValues(output, sensitiveValues);
  } catch {
    const output = input.replace(
      /([?&][^=]*(?:key|token|secret|signature|credential|access_token)[^=]*=)[^&\s]+/gi,
      `$1${REDACTED_VALUE}`,
    );
    return redactSensitiveValues(output, sensitiveValues);
  }
}

export function substituteTemplate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : encodeURIComponent(String(value));
  });
}
