import type { DebugGridSource } from "../sources";
import type { TileCoordinate } from "../utils/zxy";
import { cacheControlHeader } from "../utils/http";

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "\"":
        return "&quot;";
      default:
        return "&apos;";
    }
  });
}

export function debugGridSvg(
  source: DebugGridSource,
  coordinate: TileCoordinate,
): string {
  const label = escapeXml(`${source.id} z${coordinate.z} x${coordinate.x} y${coordinate.y}`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="#f8fafc"/>
  <path d="M0 0H256V256H0Z" fill="none" stroke="#0f172a" stroke-width="4"/>
  <path d="M64 0V256M128 0V256M192 0V256M0 64H256M0 128H256M0 192H256" stroke="#94a3b8" stroke-width="1"/>
  <path d="M0 128H256M128 0V256" stroke="#475569" stroke-width="2"/>
  <rect x="16" y="94" width="224" height="68" rx="6" fill="#ffffff" fill-opacity="0.88" stroke="#cbd5e1"/>
  <text x="128" y="119" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="18" fill="#0f172a">TileMux</text>
  <text x="128" y="145" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" fill="#334155">${label}</text>
</svg>`;
}

export function debugGridResponse(
  request: Request,
  source: DebugGridSource,
  coordinate: TileCoordinate,
): Response {
  const headers = new Headers({
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control": cacheControlHeader(source.cacheTtlSeconds),
    "X-TileMux-Source": source.id,
    "X-TileMux-Cache-Policy": source.cacheTtlSeconds
      ? `ttl=${source.cacheTtlSeconds}`
      : "no-store",
  });

  return new Response(
    request.method === "HEAD" ? null : debugGridSvg(source, coordinate),
    { headers },
  );
}
