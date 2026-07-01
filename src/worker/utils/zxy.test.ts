import { describe, expect, it } from "vitest";
import { parseTilePath, validateZxy } from "./zxy";

describe("zxy utilities", () => {
  it("parses tile paths", () => {
    expect(parseTilePath("/tiles/debug-grid/1/0/1.svg")).toEqual({
      sourceId: "debug-grid",
      zRaw: "1",
      xRaw: "0",
      yRaw: "1",
      ext: "svg",
    });
  });

  it("validates tile bounds and extension", () => {
    expect(
      validateZxy(
        { zRaw: "1", xRaw: "0", yRaw: "1", ext: "svg" },
        { minzoom: 0, maxzoom: 22, ext: "svg" },
      ),
    ).toEqual({ ok: true, coordinate: { z: 1, x: 0, y: 1, ext: "svg" } });

    expect(
      validateZxy(
        { zRaw: "1", xRaw: "2", yRaw: "1", ext: "svg" },
        { minzoom: 0, maxzoom: 22, ext: "svg" },
      ),
    ).toEqual({ ok: false, message: "Tile coordinate out of range" });

    expect(
      validateZxy(
        { zRaw: "1", xRaw: "0", yRaw: "1", ext: "png" },
        { minzoom: 0, maxzoom: 22, ext: "svg" },
      ),
    ).toEqual({ ok: false, message: "Invalid tile extension" });
  });

  it("allows multiple configured tile extensions", () => {
    expect(
      validateZxy(
        { zRaw: "1", xRaw: "0", yRaw: "1", ext: "png" },
        { minzoom: 0, maxzoom: 22, ext: ["svg", "png"] },
      ),
    ).toEqual({ ok: true, coordinate: { z: 1, x: 0, y: 1, ext: "png" } });
  });
});
