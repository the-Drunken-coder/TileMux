import { useEffect, useMemo, useState } from "react";
import { DebugPanel } from "./components/DebugPanel";
import { MapPane } from "./components/MapPane";
import { SourcePicker } from "./components/SourcePicker";
import {
  fetchSources,
  type SanitizedSource,
  type ViewState,
} from "./api";
import { clampViewZoom, comparisonMaxZoom, sourceMaxZoom } from "./zoom";

const initialView: ViewState = {
  center: [0, 0],
  zoom: 1,
  bearing: 0,
  pitch: 0,
};

type Side = "left" | "right";

export default function App() {
  const [sources, setSources] = useState<SanitizedSource[]>([]);
  const [leftSourceId, setLeftSourceId] = useState("");
  const [rightSourceId, setRightSourceId] = useState("");
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [views, setViews] = useState<Record<Side, ViewState>>({
    left: initialView,
    right: initialView,
  });
  const [lastError, setLastError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSources() {
      try {
        const loaded = await fetchSources();
        if (cancelled) return;
        const defaultSource =
          loaded.find((source) => source.id === "debug-grid") || loaded[0];

        setSources(loaded);
        setLeftSourceId((current) =>
          loaded.some((source) => source.id === current)
            ? current
            : defaultSource?.id || "",
        );
        setRightSourceId((current) =>
          loaded.some((source) => source.id === current)
            ? current
            : defaultSource?.id || "",
        );
        setLastError("");
      } catch (error) {
        if (cancelled) return;
        setSources([]);
        setLastError(error instanceof Error ? error.message : "Failed to load sources");
      }
    }

    void loadSources();
    return () => {
      cancelled = true;
    };
  }, []);

  const sourceById = useMemo(() => {
    return new Map(sources.map((source) => [source.id, source]));
  }, [sources]);

  const leftSource = sourceById.get(leftSourceId);
  const rightSource = sourceById.get(rightSourceId);
  const syncedMaxZoom = comparisonMaxZoom(leftSource, rightSource);
  const leftMaxZoom = syncEnabled ? syncedMaxZoom : sourceMaxZoom(leftSource);
  const rightMaxZoom = syncEnabled ? syncedMaxZoom : sourceMaxZoom(rightSource);

  useEffect(() => {
    setViews((current) => {
      const left = clampViewZoom(current.left, leftMaxZoom);
      const right = clampViewZoom(current.right, rightMaxZoom);

      return left === current.left && right === current.right
        ? current
        : { left, right };
    });
  }, [leftMaxZoom, rightMaxZoom]);

  function updateView(side: Side, nextView: ViewState) {
    const maxZoom = side === "left" ? leftMaxZoom : rightMaxZoom;
    const boundedView = clampViewZoom(nextView, maxZoom);

    setViews((current) => {
      if (syncEnabled) {
        return { left: boundedView, right: boundedView };
      }

      return { ...current, [side]: boundedView };
    });
  }

  function toggleSync() {
    if (!syncEnabled) {
      setViews((current) => {
        const view = clampViewZoom(current.left, syncedMaxZoom);
        return { left: view, right: view };
      });
    }
    setSyncEnabled((current) => !current);
  }

  function swapSources() {
    setLeftSourceId(rightSourceId);
    setRightSourceId(leftSourceId);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>TileMux</h1>
          <p>Tile gateway and comparison tool</p>
        </div>
      </header>

      <section className="toolbar" aria-label="Map controls">
        <SourcePicker
          label="Left source"
          sources={sources}
          value={leftSourceId}
          onChange={setLeftSourceId}
        />
        <SourcePicker
          label="Right source"
          sources={sources}
          value={rightSourceId}
          onChange={setRightSourceId}
        />
        <button type="button" onClick={swapSources} disabled={!leftSource || !rightSource}>
          Swap
        </button>
        <label className="toggle">
          <input type="checkbox" checked={syncEnabled} onChange={toggleSync} />
          Sync maps
        </label>
      </section>

      {lastError ? <div className="error-banner">{lastError}</div> : null}

      <section className="compare-grid">
        <MapPane
          title="Left"
          sourceId={leftSourceId}
          maxZoom={leftMaxZoom}
          view={views.left}
          onViewChange={(view) => updateView("left", view)}
        />
        <MapPane
          title="Right"
          sourceId={rightSourceId}
          maxZoom={rightMaxZoom}
          view={views.right}
          onViewChange={(view) => updateView("right", view)}
        />
      </section>

      <DebugPanel
        leftSource={leftSource}
        rightSource={rightSource}
        leftView={views.left}
        rightView={views.right}
        onError={setLastError}
      />
    </main>
  );
}
