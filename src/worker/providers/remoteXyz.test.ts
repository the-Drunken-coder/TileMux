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
    const fetchMock = vi.fn(async () => new Response("missing", { status: 404 }));
    vi.stubGlobal(
      "fetch",
      fetchMock,
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

  it("normalizes generic upstream content types from the source extension", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("tile", {
            headers: { "Content-Type": "application/octet-stream" },
          }),
      ),
    );

    const response = await remoteXyzResponse(
      new Request("https://tilemux.test/tiles/openmaps-opentopomap/1/0/1.png"),
      {} as RuntimeEnv,
      SOURCES["openmaps-opentopomap"],
      { z: 1, x: 0, y: 1, ext: "png" },
    );

    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("sends configured upstream request headers", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response("tile"),
    );
    vi.stubGlobal("fetch", fetchMock);

    await remoteXyzResponse(
      new Request("https://tilemux.test/tiles/osm-standard/1/0/1.png"),
      {} as RuntimeEnv,
      SOURCES["osm-standard"],
      { z: 1, x: 0, y: 1, ext: "png" },
    );

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = new Headers(init?.headers);

    expect(headers.get("User-Agent")).toContain("TileMux/0.0");
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
      provider: {
        ...SOURCES["example-remote"].provider,
        template:
          "https://user:{PROVIDER_TOKEN}@example.com/{PROVIDER_TOKEN}/{z}/{x}/{y}.{ext}",
      },
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
