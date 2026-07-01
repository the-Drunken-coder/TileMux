import type { RuntimeEnv } from "./env";

const encoder = new TextEncoder();

export function extractApiKey(request: Request): string | null {
  const authorization = request.headers.get("Authorization");
  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  const url = new URL(request.url);
  const queryKey = url.searchParams.get("key");
  return queryKey && queryKey.length > 0 ? queryKey : null;
}

export function timingSafeEqual(left: string, right: string): boolean {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return diff === 0;
}

export function isAuthorized(request: Request, env: RuntimeEnv): boolean {
  const expected = env.TILEMUX_API_KEY;
  const provided = extractApiKey(request);

  if (!expected || !provided) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}
