import type { SanitizedSource, ViewState } from "./api";

export const FALLBACK_MAX_ZOOM = 22;

export function sourceMaxZoom(source?: SanitizedSource): number {
  return source?.sourceMaxzoom ?? source?.maxzoom ?? FALLBACK_MAX_ZOOM;
}

export function comparisonMaxZoom(
  leftSource: SanitizedSource | undefined,
  rightSource: SanitizedSource | undefined,
): number {
  return Math.min(sourceMaxZoom(leftSource), sourceMaxZoom(rightSource));
}

export function clampViewZoom(view: ViewState, maxZoom: number): ViewState {
  if (view.zoom <= maxZoom) {
    return view;
  }

  return { ...view, zoom: maxZoom };
}
