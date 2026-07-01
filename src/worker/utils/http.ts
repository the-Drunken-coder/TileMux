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

export function redactUrl(input: string): string {
  try {
    const isAbsolute = /^[a-z][a-z0-9+.-]*:/i.test(input);
    const url = new URL(input, "https://tilemux.local");

    for (const key of Array.from(url.searchParams.keys())) {
      if (SECRET_PARAM_PATTERN.test(key)) {
        url.searchParams.set(key, REDACTED_VALUE);
      }
    }

    return isAbsolute
      ? url.toString()
      : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return input.replace(
      /([?&][^=]*(?:key|token|secret|signature|credential|access_token)[^=]*=)[^&\s]+/gi,
      `$1${REDACTED_VALUE}`,
    );
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
