import { describe, expect, it } from "vitest";
import { handleRequest } from "./index";
import type { RuntimeEnv } from "./env";

const TEST_KEY = "test-tilemux-key";

function unreachable(message: string): never {
  throw new Error(message);
}

const fakeAssets: Fetcher = {
  fetch: async () => new Response("asset fallback"),
  connect: () => unreachable("ASSETS.connect is not used in route tests"),
};

const fakeMultipartUpload: R2MultipartUpload = {
  key: "unused",
  uploadId: "unused",
  uploadPart: async () => unreachable("R2 multipart upload is not used in route tests"),
  abort: async () => undefined,
  complete: async () => unreachable("R2 multipart complete is not used in route tests"),
};

const fakeTileBucket: R2Bucket = {
  head: async () => null,
  get: async () => null,
  put: async () => unreachable("R2 put is not used in route tests"),
  createMultipartUpload: async () => fakeMultipartUpload,
  resumeMultipartUpload: () => fakeMultipartUpload,
  delete: async () => undefined,
  list: async () => ({
    objects: [],
    delimitedPrefixes: [],
    truncated: false,
  }),
};

function testEnv(): RuntimeEnv {
  return {
    TILEMUX_API_KEY: TEST_KEY,
    ALLOWED_ORIGINS: "*",
    ASSETS: fakeAssets,
    TILE_BUCKET: fakeTileBucket,
  };
}

function request(path: string): Request {
  return new Request(`https://tilemux.test${path}`);
}

async function fetchPath(path: string): Promise<Response> {
  return handleRequest(request(path), testEnv());
}

describe("Worker routes", () => {
  it("serves public health", async () => {
    const response = await fetchPath("/api/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, name: "TileMux" });
  });

  it("requires an API key for source metadata", async () => {
    const response = await fetchPath("/api/sources");

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Missing or invalid API key",
    });
  });

  it("returns sanitized source metadata with a valid key", async () => {
    const response = await fetchPath(`/api/sources?key=${TEST_KEY}`);
    const payload = (await response.json()) as {
      sources: Array<Record<string, unknown>>;
    };

    expect(response.status).toBe(200);
    expect(payload.sources.map((source) => source.id)).toEqual([
      "debug-grid",
      "local-r2",
    ]);
    expect(payload.sources[0]).toMatchObject({
      id: "debug-grid",
      cachePolicy: "ttl",
      supportsTileJson: true,
      supportsGeneratedStyle: true,
    });
    expect(payload.sources[0]).not.toHaveProperty("template");
    expect(payload.sources[0]).not.toHaveProperty("secretPlaceholders");
  });

  it("returns a generated MapLibre style for debug-grid", async () => {
    const response = await fetchPath(`/api/styles/debug-grid.json?key=${TEST_KEY}`);
    const style = (await response.json()) as {
      version: number;
      sources: Record<string, unknown>;
    };

    expect(response.status).toBe(200);
    expect(style.version).toBe(8);
    expect(style.sources["debug-grid"]).toBeDefined();
  });

  it("returns TileJSON for debug-grid", async () => {
    const response = await fetchPath(
      `/api/tilejson/debug-grid.json?key=${TEST_KEY}`,
    );
    const tileJson = (await response.json()) as {
      tilejson: string;
      tiles: string[];
    };

    expect(response.status).toBe(200);
    expect(tileJson.tilejson).toBe("3.0.0");
    expect(tileJson.tiles[0]).toBe(
      `https://tilemux.test/tiles/debug-grid/{z}/{x}/{y}.svg?key=${TEST_KEY}`,
    );
  });

  it("serves a debug-grid SVG tile", async () => {
    const response = await fetchPath(`/tiles/debug-grid/0/0/0.svg?key=${TEST_KEY}`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("image/svg+xml");
    expect(response.headers.get("X-TileMux-Source")).toBe("debug-grid");
    expect(body).toContain("debug-grid z0 x0 y0");
  });

  it("rejects a wrong API key", async () => {
    const response = await fetchPath("/tiles/debug-grid/0/0/0.svg?key=wrong");

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Missing or invalid API key",
    });
  });
});
