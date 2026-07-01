import { describe, expect, it } from "vitest";
import { SOURCES, listEnabledSources, sanitizeSource } from "./sources";

const ENABLED_SOURCE_IDS = [
  "debug-grid",
  "osm-standard",
  "cartoRaster",
  "esri-world-imagery",
  "google-maps",
  "google-satellite",
  "google-hybrid",
  "google-terrain",
  "bing-aerial",
  "bing-roads",
  "mapbox-streets",
  "mapbox-satellite",
  "mapbox-outdoors",
  "mapbox-dark",
  "usgs-topo",
  "thunderforest-landscape",
  "thunderforest-outdoors",
  "thunderforest-transport-dark",
  "thunderforest-spinal-map",
  "thunderforest-pioneer",
  "maptiler-satellite",
  "maptiler-osm-dark",
  "openmaps-opentopomap",
  "openmaps-openhikingmap",
  "local-r2",
  "osm-standard-dark",
];

describe("sources", () => {
  it("omits disabled sources from enabled list", () => {
    expect(listEnabledSources().map((source) => source.id)).toEqual(
      ENABLED_SOURCE_IDS,
    );
  });

  it("sanitizes source metadata", () => {
    const sanitized = sanitizeSource(SOURCES["example-remote"]);

    expect(sanitized).toMatchObject({
      id: "example-remote",
      name: "Example Remote XYZ",
      kind: "remote-xyz",
      supportsTileJson: true,
      supportsGeneratedStyle: true,
    });
    expect("provider" in sanitized).toBe(false);
    expect("template" in sanitized).toBe(false);
    expect("secretPlaceholders" in sanitized).toBe(false);
    expect("requestHeaders" in sanitized).toBe(false);
    expect(sanitized.browserTileTemplate).toBeUndefined();
  });

  it("keeps provider secret mappings out of sanitized source metadata", () => {
    const sanitized = sanitizeSource(SOURCES["google-maps"]);

    expect(sanitized).toMatchObject({
      id: "google-maps",
      sourceMaxzoom: 20,
      maxzoom: 22,
    });
    expect("provider" in sanitized).toBe(false);
    expect("secretPlaceholders" in sanitized).toBe(false);
    expect("template" in sanitized).toBe(false);
  });

  it("keeps MapTiler OpenStreetMap Dark keyless in public metadata", () => {
    const sanitized = sanitizeSource(SOURCES["maptiler-osm-dark"]);

    expect(sanitized).toMatchObject({
      id: "maptiler-osm-dark",
      name: "MapTiler OpenStreetMap Dark",
      kind: "remote-xyz",
      maxzoom: 22,
    });
    expect("provider" in sanitized).toBe(false);
    expect("secretPlaceholders" in sanitized).toBe(false);
    expect("template" in sanitized).toBe(false);
  });

  it("exposes explicit browser tile templates for direct browser sources", () => {
    const sanitized = sanitizeSource(SOURCES["openmaps-opentopomap"]);

    expect(sanitized.browserTileTemplate).toBe(
      "https://tile.openmaps.fr/opentopomap/{z}/{x}/{y}.png",
    );
    expect("provider" in sanitized).toBe(false);
    expect("requestHeaders" in sanitized).toBe(false);
  });

  it("identifies TileMux to public remote tile providers", () => {
    for (const source of listEnabledSources()) {
      if (source.provider.kind !== "remote-xyz") continue;

      expect(source.provider.requestHeaders?.["User-Agent"]).toContain(
        "TileMux/0.0",
      );
    }
  });

  it("exposes bounded R2 metadata for OpenStreetMap Standard Dark", () => {
    const sanitized = sanitizeSource(SOURCES["osm-standard-dark"]);

    expect(sanitized).toMatchObject({
      id: "osm-standard-dark",
      kind: "r2-xyz",
      minzoom: 12,
      maxzoom: 16,
      bounds: [-77.04, 38.889, -76.995, 38.91],
      supportsTileJson: true,
      supportsGeneratedStyle: true,
    });
  });
});
