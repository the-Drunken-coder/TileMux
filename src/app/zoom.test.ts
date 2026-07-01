import { describe, expect, it } from "vitest";
import type { SanitizedSource, ViewState } from "./api";
import {
  boundsCenter,
  clampViewZoom,
  comparisonMaxZoom,
  comparisonMinZoom,
  isViewInsideSourceBounds,
  sourceMaxZoom,
  sourceMinZoom,
  viewForSelectedSource,
} from "./zoom";

const baseSource: SanitizedSource = {
  id: "source",
  name: "Source",
  kind: "remote-xyz",
  format: "raster",
  tileSize: 256,
  minzoom: 0,
  maxzoom: 22,
  ext: "png",
  supportsTileJson: true,
  supportsGeneratedStyle: true,
};

describe("zoom helpers", () => {
  it("prefers a provider source max over the exposed app max", () => {
    expect(sourceMaxZoom({ ...baseSource, sourceMaxzoom: 19 })).toBe(19);
  });

  it("uses the source minimum zoom", () => {
    expect(sourceMinZoom({ ...baseSource, minzoom: 12 })).toBe(12);
    expect(sourceMinZoom(undefined)).toBe(0);
  });

  it("uses the lower source max when maps are synchronized", () => {
    expect(
      comparisonMaxZoom(
        { ...baseSource, id: "left", sourceMaxzoom: 20 },
        { ...baseSource, id: "right", sourceMaxzoom: 16 },
      ),
    ).toBe(16);
  });

  it("uses the higher source min when maps are synchronized", () => {
    expect(
      comparisonMinZoom(
        { ...baseSource, id: "left", minzoom: 0 },
        { ...baseSource, id: "right", minzoom: 12 },
      ),
    ).toBe(12);
  });

  it("clamps views outside the selected zoom range", () => {
    const view: ViewState = {
      center: [0, 0],
      zoom: 22,
      bearing: 0,
      pitch: 0,
    };

    expect(clampViewZoom(view, 0, 19)).toEqual({ ...view, zoom: 19 });
    expect(clampViewZoom({ ...view, zoom: 1 }, 12, 19)).toEqual({
      ...view,
      zoom: 12,
    });
    expect(clampViewZoom(view, 0, 23)).toBe(view);
  });

  it("calculates a bounded source center", () => {
    const center = boundsCenter([-77.04, 38.889, -76.995, 38.91]);

    expect(center[0]).toBeCloseTo(-77.0175);
    expect(center[1]).toBeCloseTo(38.8995);
  });

  it("detects whether a view is inside source bounds", () => {
    const source = {
      ...baseSource,
      bounds: [-77.04, 38.889, -76.995, 38.91] as [
        number,
        number,
        number,
        number,
      ],
    };

    expect(
      isViewInsideSourceBounds(
        { center: [-77.0175, 38.8995], zoom: 12, bearing: 0, pitch: 0 },
        source,
      ),
    ).toBe(true);
    expect(isViewInsideSourceBounds(initialView(), source)).toBe(false);
  });

  it("moves a bounded source view into coverage", () => {
    const source = {
      ...baseSource,
      minzoom: 12,
      maxzoom: 16,
      bounds: [-77.04, 38.889, -76.995, 38.91] as [
        number,
        number,
        number,
        number,
      ],
    };

    const view = viewForSelectedSource(source, initialView(), 12, 16);

    expect(view.center[0]).toBeCloseTo(-77.0175);
    expect(view.center[1]).toBeCloseTo(38.8995);
    expect(view).toMatchObject({
      zoom: 12,
      bearing: 0,
      pitch: 0,
    });
  });
});

function initialView(): ViewState {
  return {
    center: [0, 0],
    zoom: 1,
    bearing: 0,
    pitch: 0,
  };
}
