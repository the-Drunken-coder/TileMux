import { describe, expect, it } from "vitest";
import { handleRequest } from "./index";
import type { RuntimeEnv } from "./env";

const TEST_KEY = "test-tilemux-key";

function unreachable(message: string): never {
  throw new Error(message);
}

const fakeAssets: Fetcher = {
  fetch: async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    return new Response(`asset fallback ${url.pathname}`);
  },
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

function testEnv(overrides: Partial<RuntimeEnv> = {}): RuntimeEnv {
  return {
    TILEMUX_API_KEY: TEST_KEY,
    ALLOWED_ORIGINS: "*",
    ASSETS: fakeAssets,
    TILE_BUCKET: fakeTileBucket,
    ...overrides,
  };
}

function request(path: string, init?: RequestInit): Request {
  return new Request(`https://tilemux.test${path}`, init);
}

async function fetchPath(
  path: string,
  init?: RequestInit,
  env = testEnv(),
): Promise<Response> {
  return handleRequest(request(path, init), env);
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

  it("returns public source metadata for the browser catalog", async () => {
    const response = await fetchPath("/sources.json");
    const payload = (await response.json()) as {
      sources: Array<Record<string, unknown>>;
    };

    expect(response.status).toBe(200);
    expect(payload.sources.map((source) => source.id)).toEqual([
      "debug-grid",
      "osm-standard",
      "openmaps-opentopomap",
      "openmaps-openhikingmap",
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
    expect(payload.sources[1]).not.toHaveProperty("provider");
    expect(payload.sources[1]).not.toHaveProperty("requestHeaders");
  });

  it("returns sanitized API source metadata with a valid key", async () => {
    const response = await fetchPath(`/api/sources?key=${TEST_KEY}`);
    const payload = (await response.json()) as {
      sources: Array<Record<string, unknown>>;
    };

    expect(response.status).toBe(200);
    expect(payload.sources.map((source) => source.id)).toEqual([
      "debug-grid",
      "osm-standard",
      "openmaps-opentopomap",
      "openmaps-openhikingmap",
      "local-r2",
    ]);
  });

  it("returns a generated MapLibre style for debug-grid", async () => {
    const response = await fetchPath(`/api/styles/debug-grid.json?key=${TEST_KEY}`);
    const style = (await response.json()) as {
      version: number;
      sources: Record<string, { tiles: string[] }>;
    };

    expect(response.status).toBe(200);
    expect(style.version).toBe(8);
    expect(style.sources["debug-grid"]).toBeDefined();
    expect(style.sources["debug-grid"].tiles[0]).toBe(
      "https://tilemux.test/tiles/debug-grid/{z}/{x}/{y}.png",
    );
    expect(style.sources["debug-grid"]).toMatchObject({
      minzoom: 0,
      maxzoom: 22,
    });
  });

  it("keeps generated style tile URLs keyless for bearer auth", async () => {
    const response = await fetchPath("/api/styles/debug-grid.json", {
      headers: { Authorization: `Bearer ${TEST_KEY}` },
    });
    const style = (await response.json()) as {
      sources: Record<string, { tiles: string[] }>;
    };

    expect(response.status).toBe(200);
    expect(style.sources["debug-grid"].tiles[0]).toBe(
      "https://tilemux.test/tiles/debug-grid/{z}/{x}/{y}.png",
    );
  });

  it("returns generated styles and TileJSON without a browser API key", async () => {
    const styleResponse = await fetchPath("/styles/debug-grid.json");
    const tileJsonResponse = await fetchPath("/tilejson/debug-grid.json");
    const style = (await styleResponse.json()) as {
      sources: Record<string, { tiles: string[] }>;
    };
    const tileJson = (await tileJsonResponse.json()) as {
      tiles: string[];
    };

    expect(styleResponse.status).toBe(200);
    expect(tileJsonResponse.status).toBe(200);
    expect(style.sources["debug-grid"].tiles[0]).toBe(
      "https://tilemux.test/tiles/debug-grid/{z}/{x}/{y}.png",
    );
    expect(tileJson.tiles[0]).toBe(
      "https://tilemux.test/tiles/debug-grid/{z}/{x}/{y}.png",
    );
  });

  it("keeps API style and TileJSON routes private", async () => {
    const style = await fetchPath("/api/styles/debug-grid.json");
    const tileJson = await fetchPath("/api/tilejson/debug-grid.json");

    expect(style.status).toBe(401);
    expect(tileJson.status).toBe(401);
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
      "https://tilemux.test/tiles/debug-grid/{z}/{x}/{y}.png",
    );
  });

  it("returns unknown source for missing TileJSON and style sources", async () => {
    const tileJson = await fetchPath(`/api/tilejson/missing.json?key=${TEST_KEY}`);
    const style = await fetchPath(`/api/styles/missing.json?key=${TEST_KEY}`);

    expect(tileJson.status).toBe(404);
    expect(await tileJson.json()).toEqual({ error: "Unknown source" });
    expect(style.status).toBe(404);
    expect(await style.json()).toEqual({ error: "Unknown source" });
  });

  it("serves a public debug-grid SVG tile", async () => {
    const response = await fetchPath("/tiles/debug-grid/0/0/0.svg");
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("image/svg+xml");
    expect(response.headers.get("X-TileMux-Source")).toBe("debug-grid");
    expect(body).toContain("debug-grid z0 x0 y0");
  });

  it("serves a public debug-grid PNG tile for MapLibre raster rendering", async () => {
    const response = await fetchPath("/tiles/debug-grid/0/0/0.png");
    const body = new Uint8Array(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(Array.from(body.slice(0, 8))).toEqual([
      137,
      80,
      78,
      71,
      13,
      10,
      26,
      10,
    ]);
  });

  it("rejects a wrong API key on private API routes", async () => {
    const response = await fetchPath("/api/sources?key=wrong");

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Missing or invalid API key",
    });
  });

  it("routes non-TileMux paths to static assets", async () => {
    const response = await fetchPath("/compare");

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("asset fallback /compare");
  });

  it("returns route 404 for unknown TileMux routes", async () => {
    const response = await fetchPath(`/api/unknown?key=${TEST_KEY}`);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Route not found" });
  });

  it("adds CORS headers to successful and failed TileMux responses", async () => {
    const env = testEnv({ ALLOWED_ORIGINS: "self" });
    const init = { headers: { Origin: "https://tilemux.test" } };
    const success = await fetchPath(`/api/sources?key=${TEST_KEY}`, init, env);
    const failure = await fetchPath("/api/sources?key=wrong", init, env);

    expect(success.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://tilemux.test",
    );
    expect(failure.status).toBe(401);
    expect(failure.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://tilemux.test",
    );
  });

  it("treats malformed encoded source IDs as client errors", async () => {
    const tile = await fetchPath(`/tiles/%E0%A4/0/0/0.png?key=${TEST_KEY}`);
    const tileJson = await fetchPath(`/api/tilejson/%E0%A4.json?key=${TEST_KEY}`);

    expect(tile.status).toBe(404);
    expect(await tile.json()).toEqual({ error: "Tile route not found" });
    expect(tileJson.status).toBe(404);
    expect(await tileJson.json()).toEqual({ error: "Route not found" });
  });
});
