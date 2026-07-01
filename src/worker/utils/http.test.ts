import { describe, expect, it } from "vitest";
import {
  cacheControlHeader,
  cachePolicyHeader,
  redactUrl,
  substituteTemplate,
} from "./http";

describe("http utilities", () => {
  it("substitutes URL templates", () => {
    expect(
      substituteTemplate("https://tiles.test/{z}/{x}/{y}.{ext}?token={TOKEN}", {
        z: 3,
        x: 4,
        y: 5,
        ext: "png",
        TOKEN: "abc 123",
      }),
    ).toBe("https://tiles.test/3/4/5.png?token=abc%20123");
  });

  it("redacts key-like URL params", () => {
    expect(redactUrl("https://tiles.test/1/2/3.png?key=secret&style=default")).toBe(
      "https://tiles.test/1/2/3.png?key=REDACTED&style=default",
    );
    expect(redactUrl("/tiles/1/2/3.png?token=secret")).toBe(
      "/tiles/1/2/3.png?token=REDACTED",
    );
  });

  it("redacts URL credentials and known secret values outside query params", () => {
    expect(redactUrl("https://user:pass@tiles.test/1/2/3.png")).toBe(
      "https://REDACTED:REDACTED@tiles.test/1/2/3.png",
    );
    expect(
      redactUrl("https://tiles.test/provider%20secret/1/2/3.png", [
        "provider secret",
      ]),
    ).toBe("https://tiles.test/REDACTED/1/2/3.png");
  });

  it("builds cache headers from source policy", () => {
    expect(cacheControlHeader("none", 60)).toBe("no-store");
    expect(cacheControlHeader("ttl", 60)).toBe("public, max-age=60");
    expect(cachePolicyHeader("ttl", 60)).toBe("ttl=60");
    expect(cacheControlHeader("respect-upstream", undefined, "max-age=30")).toBe(
      "max-age=30",
    );
    expect(cacheControlHeader("respect-upstream")).toBe("no-store");
  });
});
