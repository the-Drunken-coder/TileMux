import { describe, expect, it } from "vitest";
import { SOURCES, listEnabledSources, sanitizeSource } from "./sources";

describe("sources", () => {
  it("omits disabled sources from enabled list", () => {
    expect(listEnabledSources().map((source) => source.id)).toEqual([
      "debug-grid",
      "osm-standard",
      "openmaps-opentopomap",
      "openmaps-openhikingmap",
      "local-r2",
    ]);
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
  });
});
