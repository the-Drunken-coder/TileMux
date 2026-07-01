import type { SanitizedSource, ViewState } from "./api";

export const FALLBACK_MAX_ZOOM = 22;
export const FALLBACK_MIN_ZOOM = 0;

export function sourceMaxZoom(source?: SanitizedSource): number {
  return source?.sourceMaxzoom ?? source?.maxzoom ?? FALLBACK_MAX_ZOOM;
}

export function sourceMinZoom(source?: SanitizedSource): number {
  return source?.minzoom ?? FALLBACK_MIN_ZOOM;
}

export function comparisonMaxZoom(
  leftSource: SanitizedSource | undefined,
  rightSource: SanitizedSource | undefined,
): number {
  return Math.min(sourceMaxZoom(leftSource), sourceMaxZoom(rightSource));
}

export function comparisonMinZoom(
  leftSource: SanitizedSource | undefined,
  rightSource: SanitizedSource | undefined,
): number {
  return Math.max(sourceMinZoom(leftSource), sourceMinZoom(rightSource));
}

export function clampViewZoom(
  view: ViewState,
  minZoom: number,
  maxZoom: number,
): ViewState {
  const zoom = Math.max(minZoom, Math.min(maxZoom, view.zoom));

  if (zoom === view.zoom) {
    return view;
  }

  return { ...view, zoom };
}

export function boundsCenter(
  bounds: [number, number, number, number],
): [number, number] {
  return [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
}

export function isViewInsideSourceBounds(
  view: ViewState,
  source?: SanitizedSource,
): boolean {
  if (!source?.bounds) {
    return true;
  }

  const [west, south, east, north] = source.bounds;
  const [longitude, latitude] = view.center;
  return (
    longitude >= west &&
    longitude <= east &&
    latitude >= south &&
    latitude <= north
  );
}

export function viewForSelectedSource(
  source: SanitizedSource | undefined,
  view: ViewState,
  minZoom: number,
  maxZoom: number,
): ViewState {
  const clamped = clampViewZoom(view, minZoom, maxZoom);
  if (!source?.bounds || isViewInsideSourceBounds(clamped, source)) {
    return clamped;
  }

  return {
    ...clamped,
    center: boundsCenter(source.bounds),
    zoom: Math.max(clamped.zoom, source.minzoom),
  };
}
