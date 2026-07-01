import { useMemo, useState } from "react";
import {
  styleUrl,
  tileForView,
  tileUrl,
  type SanitizedSource,
  type ViewState,
} from "../api";

type TileDocsProps = {
  source?: SanitizedSource;
  view: ViewState;
};

type EndpointExample = {
  label: string;
  value: string;
  note: string;
};

function absoluteUrl(pathOrUrl: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${window.location.origin}${
    pathOrUrl.startsWith("/") ? "" : "/"
  }${pathOrUrl}`;
}

function redactedEndpointUrl(input: string): string {
  return input.replace(
    /([?&][^=&#]*(?:key|token|secret|signature|credential|access_token)[^=&#]*=)[^&#]*/gi,
    "$1REDACTED",
  );
}

function tileRouteTemplate(source: SanitizedSource): string {
  return absoluteUrl(
    `/tiles/${encodeURIComponent(source.id)}/{z}/{x}/{y}.${source.ext}`,
  );
}

function sourceZoomText(source: SanitizedSource): string {
  const sourceMax = source.sourceMaxzoom ?? source.maxzoom;
  const exposed =
    sourceMax === source.maxzoom ? "" : `, exposed to z${source.maxzoom}`;

  return `z${source.minzoom}-z${sourceMax}${exposed}`;
}

function EndpointRow({ example }: { example: EndpointExample }) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    await navigator.clipboard.writeText(example.value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="endpoint-row">
      <div>
        <h3>{example.label}</h3>
        <p>{example.note}</p>
      </div>
      <div className="endpoint-value">
        <code>{redactedEndpointUrl(example.value)}</code>
        <button type="button" className="secondary" onClick={() => void copyValue()}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function TileDocs({ source, view }: TileDocsProps) {
  const examples = useMemo<EndpointExample[]>(() => {
    const base: EndpointExample[] = [
      {
        label: "Source catalog",
        value: absoluteUrl("/sources.json"),
        note: "Lists every public source id, format, extension, bounds, and zoom range.",
      },
    ];

    if (!source) {
      return base;
    }

    const sampleTile = tileForView(view);

    return [
      ...base,
      {
        label: "MapLibre style",
        value: absoluteUrl(styleUrl(source.id)),
        note: "Use this as the style URL in MapLibre GL or MapLibre Native.",
      },
      {
        label: "TileJSON",
        value: absoluteUrl(`/tilejson/${encodeURIComponent(source.id)}.json`),
        note: "Use this for clients that understand TileJSON metadata.",
      },
      {
        label: "Tile route template",
        value: tileRouteTemplate(source),
        note: "Replace z, x, and y with XYZ slippy-map tile coordinates.",
      },
      {
        label: "Current sample tile",
        value: absoluteUrl(tileUrl(source, sampleTile)),
        note: `A concrete tile for the current left map view: z${sampleTile.z}/${sampleTile.x}/${sampleTile.y}.`,
      },
    ];
  }, [source, view]);

  return (
    <section className="tile-docs" aria-label="Tile endpoint documentation">
      <div className="tile-docs-header">
        <div>
          <h2>Use These Tiles</h2>
          <p>
            Browser endpoints are public.{" "}
            <span className="inline-code">TILEMUX_API_KEY</span> is only for
            private <span className="inline-code">/api/*</span> routes.
          </p>
        </div>
        {source ? (
          <dl className="source-summary">
            <div>
              <dt>Source</dt>
              <dd>{source.id}</dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd>
                {source.format} .{source.ext}
              </dd>
            </div>
            <div>
              <dt>Zoom</dt>
              <dd>{sourceZoomText(source)}</dd>
            </div>
          </dl>
        ) : null}
      </div>

      <div className="endpoint-list">
        {examples.map((example) => (
          <EndpointRow key={example.label} example={example} />
        ))}
      </div>

      <p className="docs-note">
        Prefer the style or TileJSON URL when embedding a map. They include the
        correct tile URL for each source, including sources that need direct
        browser tile requests.
      </p>
    </section>
  );
}
