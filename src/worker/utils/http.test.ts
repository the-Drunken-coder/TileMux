import { describe, expect, it } from "vitest";
import { redactUrl, substituteTemplate } from "./http";

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
});
