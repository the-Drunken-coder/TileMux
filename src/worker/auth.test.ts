import { describe, expect, it } from "vitest";
import { extractApiKey, isAuthorized, timingSafeEqual } from "./auth";
import type { RuntimeEnv } from "./env";

describe("auth", () => {
  it("extracts bearer API keys", () => {
    const request = new Request("https://tilemux.test/api/sources", {
      headers: { Authorization: "Bearer secret-key" },
    });

    expect(extractApiKey(request)).toBe("secret-key");
  });

  it("extracts query API keys", () => {
    const request = new Request("https://tilemux.test/api/sources?key=query-key");

    expect(extractApiKey(request)).toBe("query-key");
  });

  it("checks API keys without plain direct equality", () => {
    const env = { TILEMUX_API_KEY: "expected-key" } as RuntimeEnv;

    expect(
      isAuthorized(
        new Request("https://tilemux.test/api/sources?key=expected-key"),
        env,
      ),
    ).toBe(true);
    expect(
      isAuthorized(new Request("https://tilemux.test/api/sources?key=nope"), env),
    ).toBe(false);
    expect(timingSafeEqual("same", "same")).toBe(true);
    expect(timingSafeEqual("same", "different")).toBe(false);
  });
});
