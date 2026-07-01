export type SanitizedSource = {
  id: string;
  name: string;
  kind: string;
  format: "raster" | "vector";
  tileSize: number;
  minzoom: number;
  maxzoom: number;
  sourceMaxzoom?: number;
  ext: string;
  attribution?: string;
  browserTileTemplate?: string;
  supportsTileJson: boolean;
  supportsGeneratedStyle: boolean;
};

export type ViewState = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
};

export type TileTestResult = {
  status: number;
  contentType: string;
  bytes: number;
  elapsedMs: number;
};

export async function fetchSources(): Promise<SanitizedSource[]> {
  const response = await fetch("/sources.json");

  if (!response.ok) {
    throw new Error(`Source request failed with ${response.status}`);
  }

  const payload = (await response.json()) as { sources: SanitizedSource[] };
  return payload.sources;
}

export function styleUrl(sourceId: string): string {
  return `/styles/${encodeURIComponent(sourceId)}.json`;
}

export function tileUrl(
  source: SanitizedSource,
  tile: { z: number; x: number; y: number },
): string {
  if (source.browserTileTemplate) {
    return source.browserTileTemplate.replace(
      /\{([A-Za-z0-9_]+)\}/g,
      (match, key: string) => {
        const values: Record<string, string | number> = {
          sourceId: source.id,
          z: tile.z,
          x: tile.x,
          y: tile.y,
          ext: source.ext,
        };
        return values[key] === undefined
          ? match
          : encodeURIComponent(String(values[key]));
      },
    );
  }

  return `/tiles/${encodeURIComponent(source.id)}/${tile.z}/${tile.x}/${tile.y}.${
    source.ext
  }`;
}

export function tileForView(view: ViewState): { z: number; x: number; y: number } {
  const z = Math.max(0, Math.floor(view.zoom));
  const tileCount = 2 ** z;
  const longitude = view.center[0];
  const latitude = Math.max(-85.051129, Math.min(85.051129, view.center[1]));
  const latRad = (latitude * Math.PI) / 180;
  const x = Math.floor(((longitude + 180) / 360) * tileCount);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      tileCount,
  );

  return {
    z,
    x: Math.max(0, Math.min(tileCount - 1, x)),
    y: Math.max(0, Math.min(tileCount - 1, y)),
  };
}

export function redactUrl(input: string): string {
  const url = new URL(input, window.location.origin);
  for (const key of Array.from(url.searchParams.keys())) {
    if (/(key|token|secret|signature|credential|access_token)/i.test(key)) {
      url.searchParams.set(key, "REDACTED");
    }
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export async function testTileUrl(
  url: string,
): Promise<TileTestResult> {
  const start = performance.now();
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();

  return {
    status: response.status,
    contentType: response.headers.get("Content-Type") || "unknown",
    bytes: buffer.byteLength,
    elapsedMs: Math.round(performance.now() - start),
  };
}
