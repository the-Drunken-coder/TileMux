import { afterEach, describe, expect, it, vi } from "vitest";
import type { RuntimeEnv } from "../env";
import { SOURCES, type RemoteXyzSource } from "../sources";
import { HttpError } from "../utils/http";
import { remoteXyzResponse, resolveRemoteTileUrl } from "./remoteXyz";

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it("preserves upstream HTTP error statuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("missing", { status: 404 })),
    );

    const response = await remoteXyzResponse(
      new Request("https://tilemux.test/tiles/example-remote/1/0/1.png"),
      { CUSTOM_PROVIDER_KEY: "provider secret" } as RuntimeEnv,
      SOURCES["example-remote"],
      { z: 1, x: 0, y: 1, ext: "png" },
    );

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("missing");
  });

  it("redacts substituted provider secrets from upstream failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network failure");
      }),
    );
    const source: RemoteXyzSource = {
      ...SOURCES["example-remote"],
      template:
        "https://user:{PROVIDER_TOKEN}@example.com/{PROVIDER_TOKEN}/{z}/{x}/{y}.{ext}",
    };

    let message = "";
    try {
      await remoteXyzResponse(
        new Request("https://tilemux.test/tiles/example-remote/1/0/1.png"),
        { CUSTOM_PROVIDER_KEY: "provider secret" } as RuntimeEnv,
        source,
        { z: 1, x: 0, y: 1, ext: "png" },
      );
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain("REDACTED");
    expect(message).not.toContain("provider secret");
    expect(message).not.toContain("provider%20secret");
  });
});
