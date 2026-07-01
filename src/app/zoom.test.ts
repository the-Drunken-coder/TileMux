import { describe, expect, it } from "vitest";
import type { SanitizedSource, ViewState } from "./api";
import { clampViewZoom, comparisonMaxZoom, sourceMaxZoom } from "./zoom";

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

  it("uses the lower source max when maps are synchronized", () => {
    expect(
      comparisonMaxZoom(
        { ...baseSource, id: "left", sourceMaxzoom: 20 },
        { ...baseSource, id: "right", sourceMaxzoom: 16 },
      ),
    ).toBe(16);
  });

  it("clamps views above the selected max zoom", () => {
    const view: ViewState = {
      center: [0, 0],
      zoom: 22,
      bearing: 0,
      pitch: 0,
    };

    expect(clampViewZoom(view, 19)).toEqual({ ...view, zoom: 19 });
    expect(clampViewZoom(view, 23)).toBe(view);
  });
});
