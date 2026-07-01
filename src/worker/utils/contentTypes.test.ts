import { describe, expect, it } from "vitest";
import { contentTypeForExtension } from "./contentTypes";

describe("content types", () => {
  it("maps known tile extensions", () => {
    expect(contentTypeForExtension("svg")).toBe("image/svg+xml; charset=utf-8");
    expect(contentTypeForExtension("png")).toBe("image/png");
    expect(contentTypeForExtension("mvt")).toBe("application/vnd.mapbox-vector-tile");
  });

  it("falls back for unknown extensions", () => {
    expect(contentTypeForExtension("bin")).toBe("application/octet-stream");
  });
});
