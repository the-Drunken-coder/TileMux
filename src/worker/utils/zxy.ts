export type TileCoordinate = {
  z: number;
  x: number;
  y: number;
  ext: string;
};

export type TileValidationOptions = {
  minzoom: number;
  maxzoom: number;
  ext: string;
};

export type TileValidationResult =
  | { ok: true; coordinate: TileCoordinate }
  | { ok: false; message: string };

const SUPPORTED_EXTENSIONS = new Set([
  "avif",
  "gif",
  "jpg",
  "jpeg",
  "mvt",
  "pbf",
  "png",
  "svg",
  "webp",
]);

export function parseTilePath(pathname: string):
  | {
      sourceId: string;
      zRaw: string;
      xRaw: string;
      yRaw: string;
      ext: string;
    }
  | null {
  const match = /^\/tiles\/([^/]+)\/([^/]+)\/([^/]+)\/([^/.]+)\.([A-Za-z0-9]+)$/.exec(
    pathname,
  );

  if (!match) {
    return null;
  }

  return {
    sourceId: decodeURIComponent(match[1]),
    zRaw: match[2],
    xRaw: match[3],
    yRaw: match[4],
    ext: match[5].toLowerCase(),
  };
}

export function validateZxy(
  input: { zRaw: string; xRaw: string; yRaw: string; ext: string },
  options: TileValidationOptions,
): TileValidationResult {
  const z = Number(input.zRaw);
  const x = Number(input.xRaw);
  const y = Number(input.yRaw);
  const ext = input.ext.toLowerCase();

  if (
    !Number.isInteger(z) ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    z < options.minzoom ||
    z > options.maxzoom ||
    z < 0 ||
    z > 30
  ) {
    return { ok: false, message: "Invalid tile coordinate" };
  }

  const tileCount = 2 ** z;
  if (x < 0 || y < 0 || x >= tileCount || y >= tileCount) {
    return { ok: false, message: "Tile coordinate out of range" };
  }

  if (!SUPPORTED_EXTENSIONS.has(ext) || ext !== options.ext.toLowerCase()) {
    return { ok: false, message: "Invalid tile extension" };
  }

  return { ok: true, coordinate: { z, x, y, ext } };
}

export function lngLatToTile(
  longitude: number,
  latitude: number,
  zoom: number,
): { z: number; x: number; y: number } {
  const z = Math.max(0, Math.floor(zoom));
  const lat = Math.max(-85.051129, Math.min(85.051129, latitude));
  const tileCount = 2 ** z;
  const x = Math.floor(((longitude + 180) / 360) * tileCount);
  const latRad = (lat * Math.PI) / 180;
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
