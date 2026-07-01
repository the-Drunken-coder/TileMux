import { useMemo, useState } from "react";
import {
  redactUrl,
  type SanitizedSource,
  testTileUrl,
  tileForView,
  tileUrl,
  type TileTestResult,
  type ViewState,
} from "../api";

type DebugPanelProps = {
  apiKey: string;
  leftSource?: SanitizedSource;
  rightSource?: SanitizedSource;
  leftView: ViewState;
  rightView: ViewState;
  onError: (message: string) => void;
};

type Side = "left" | "right";

function formatView(view: ViewState): string {
  return `${view.center[0].toFixed(5)}, ${view.center[1].toFixed(5)} z${view.zoom.toFixed(
    2,
  )} bearing ${view.bearing.toFixed(1)} pitch ${view.pitch.toFixed(1)}`;
}

function ResultLine({ result }: { result?: TileTestResult }) {
  if (!result) {
    return <span>Not tested</span>;
  }

  return (
    <span>
      {result.status} / {result.contentType} / {result.bytes} bytes /{" "}
      {result.elapsedMs} ms
    </span>
  );
}

export function DebugPanel({
  apiKey,
  leftSource,
  rightSource,
  leftView,
  rightView,
  onError,
}: DebugPanelProps) {
  const [results, setResults] = useState<Partial<Record<Side, TileTestResult>>>({});
  const sampleUrls = useMemo(() => {
    return {
      left:
        leftSource && apiKey
          ? tileUrl(leftSource, tileForView(leftView), apiKey)
          : "",
      right:
        rightSource && apiKey
          ? tileUrl(rightSource, tileForView(rightView), apiKey)
          : "",
    };
  }, [apiKey, leftSource, leftView, rightSource, rightView]);

  async function runTileTest(side: Side) {
    const url = sampleUrls[side];
    if (!url) {
      return;
    }

    try {
      const result = await testTileUrl(url);
      setResults((current) => ({ ...current, [side]: result }));
      onError("");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Tile test failed");
    }
  }

  return (
    <section className="debug-panel" aria-label="Debug panel">
      <div>
        <h2>Debug</h2>
        <p>Left: {leftSource?.id || "none"}</p>
        <p>Right: {rightSource?.id || "none"}</p>
      </div>
      <div>
        <h3>View</h3>
        <p>Left {formatView(leftView)}</p>
        <p>Right {formatView(rightView)}</p>
      </div>
      <div className="sample-grid">
        <div>
          <h3>Left sample tile</h3>
          <code>{sampleUrls.left ? redactUrl(sampleUrls.left) : "No sample"}</code>
          <button
            type="button"
            onClick={() => void runTileTest("left")}
            disabled={!sampleUrls.left}
          >
            Test sample tile
          </button>
          <p>
            <ResultLine result={results.left} />
          </p>
        </div>
        <div>
          <h3>Right sample tile</h3>
          <code>{sampleUrls.right ? redactUrl(sampleUrls.right) : "No sample"}</code>
          <button
            type="button"
            onClick={() => void runTileTest("right")}
            disabled={!sampleUrls.right}
          >
            Test sample tile
          </button>
          <p>
            <ResultLine result={results.right} />
          </p>
        </div>
      </div>
    </section>
  );
}
