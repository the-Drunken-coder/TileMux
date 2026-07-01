import { describe, expect, it } from "vitest";
import type { RuntimeEnv } from "../env";
import { SOURCES } from "../sources";
import { HttpError } from "../utils/http";
import { resolveRemoteTileUrl } from "./remoteXyz";

describe("remote XYZ provider", () => {
  it("resolves URL templates with provider secrets", () => {
    expect(
      resolveRemoteTileUrl(
        SOURCES["example-remote"],
        { z: 1, x: 0, y: 1, ext: "png" },
        { CUSTOM_PROVIDER_KEY: "provider secret" } as RuntimeEnv,
      ),
    ).toBe("https://example.com/tiles/1/0/1.png?token=provider%20secret");
  });

  it("fails clearly when a required provider secret is missing", () => {
    expect(() =>
      resolveRemoteTileUrl(
        SOURCES["example-remote"],
        { z: 1, x: 0, y: 1, ext: "png" },
        {} as RuntimeEnv,
      ),
    ).toThrow(HttpError);
  });
});
