import type { PmtilesR2Source } from "../sources";
import { jsonResponse } from "../utils/http";

export function pmtilesTodoResponse(source: PmtilesR2Source): Response {
  return jsonResponse(
    {
      error: `PMTiles R2 adapter for ${source.id} is not implemented in v0`,
      todo: "Read byte ranges from R2 and serve vector tiles from PMTiles archives.",
    },
    { status: 501 },
  );
}
