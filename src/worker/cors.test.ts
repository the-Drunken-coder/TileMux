import { describe, expect, it } from "vitest";
import type { RuntimeEnv } from "./env";
import { corsHeaders, withCors } from "./cors";

function env(allowedOrigins = "self"): RuntimeEnv {
  return { ALLOWED_ORIGINS: allowedOrigins } as RuntimeEnv;
}

describe("CORS helpers", () => {
  it("allows the request origin when self is configured", () => {
    const headers = corsHeaders(
      new Request("https://tilemux.test/api/sources", {
        headers: { Origin: "https://tilemux.test" },
      }),
      env(),
    );

    expect(headers.get("Access-Control-Allow-Origin")).toBe(
      "https://tilemux.test",
    );
  });

  it("omits allow-origin for disallowed origins", () => {
    const headers = corsHeaders(
      new Request("https://tilemux.test/api/sources", {
        headers: { Origin: "https://evil.test" },
      }),
      env(),
    );

    expect(headers.has("Access-Control-Allow-Origin")).toBe(false);
  });

  it("preserves existing Vary values when adding Origin", () => {
    const response = withCors(
      new Request("https://tilemux.test/api/sources", {
        headers: { Origin: "https://tilemux.test" },
      }),
      env(),
      new Response("ok", { headers: { Vary: "Accept-Encoding" } }),
    );

    expect(response.headers.get("Vary")).toBe("Accept-Encoding, Origin");
  });
});
