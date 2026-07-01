import { useEffect, useMemo, useState } from "react";
import { DebugPanel } from "./components/DebugPanel";
import { MapPane } from "./components/MapPane";
import { SourcePicker } from "./components/SourcePicker";
import { TileDocs } from "./components/TileDocs";
import {
  fetchSources,
  type SanitizedSource,
  type ViewState,
} from "./api";
import {
  clampViewZoom,
  comparisonMaxZoom,
  comparisonMinZoom,
  sourceMaxZoom,
  sourceMinZoom,
  viewForSelectedSource,
} from "./zoom";

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
  const syncedMinZoom = comparisonMinZoom(leftSource, rightSource);
  const syncedMaxZoom = comparisonMaxZoom(leftSource, rightSource);
  const leftMinZoom = syncEnabled ? syncedMinZoom : sourceMinZoom(leftSource);
  const rightMinZoom = syncEnabled ? syncedMinZoom : sourceMinZoom(rightSource);
  const leftMaxZoom = syncEnabled ? syncedMaxZoom : sourceMaxZoom(leftSource);
  const rightMaxZoom = syncEnabled ? syncedMaxZoom : sourceMaxZoom(rightSource);
  const syncedBounds = syncEnabled
    ? focusSourceForSync(undefined, leftSource, rightSource)?.bounds
    : undefined;
  const leftBounds = syncEnabled ? syncedBounds : leftSource?.bounds;
  const rightBounds = syncEnabled ? syncedBounds : rightSource?.bounds;

  useEffect(() => {
    setViews((current) => {
      if (syncEnabled) {
        const sourceToFocus = focusSourceForSync(undefined, leftSource, rightSource);
        const view = viewForSelectedSource(
          sourceToFocus,
          current.left,
          leftMinZoom,
          leftMaxZoom,
        );

        return view === current.left && view === current.right
          ? current
          : { left: view, right: view };
      }

      const left = viewForSelectedSource(
        leftSource,
        current.left,
        leftMinZoom,
        leftMaxZoom,
      );
      const right = viewForSelectedSource(
        rightSource,
        current.right,
        rightMinZoom,
        rightMaxZoom,
      );

      return left === current.left && right === current.right
        ? current
        : { left, right };
    });
  }, [
    leftSourceId,
    rightSourceId,
    syncEnabled,
    leftMinZoom,
    leftMaxZoom,
    rightMinZoom,
    rightMaxZoom,
  ]);

  function updateView(side: Side, nextView: ViewState) {
    const minZoom = side === "left" ? leftMinZoom : rightMinZoom;
    const maxZoom = side === "left" ? leftMaxZoom : rightMaxZoom;
    const boundedView = clampViewZoom(nextView, minZoom, maxZoom);

    setViews((current) => {
      if (syncEnabled) {
        return { left: boundedView, right: boundedView };
      }

      return { ...current, [side]: boundedView };
    });
  }

  function focusSourceForSync(
    selectedSource: SanitizedSource | undefined,
    nextLeftSource: SanitizedSource | undefined,
    nextRightSource: SanitizedSource | undefined,
  ): SanitizedSource | undefined {
    return (
      (selectedSource?.bounds ? selectedSource : undefined) ||
      (nextLeftSource?.bounds ? nextLeftSource : undefined) ||
      (nextRightSource?.bounds ? nextRightSource : undefined) ||
      selectedSource
    );
  }

  function changeSource(side: Side, sourceId: string) {
    const selectedSource = sourceById.get(sourceId);
    const nextLeftSource = side === "left" ? selectedSource : leftSource;
    const nextRightSource = side === "right" ? selectedSource : rightSource;
    const nextMinZoom = syncEnabled
      ? comparisonMinZoom(nextLeftSource, nextRightSource)
      : sourceMinZoom(selectedSource);
    const nextMaxZoom = syncEnabled
      ? comparisonMaxZoom(nextLeftSource, nextRightSource)
      : sourceMaxZoom(selectedSource);
    const sourceToFocus = syncEnabled
      ? focusSourceForSync(selectedSource, nextLeftSource, nextRightSource)
      : selectedSource;

    if (side === "left") {
      setLeftSourceId(sourceId);
    } else {
      setRightSourceId(sourceId);
    }

    setViews((current) => {
      const nextView = viewForSelectedSource(
        sourceToFocus,
        current[side],
        nextMinZoom,
        nextMaxZoom,
      );

      if (syncEnabled) {
        return { left: nextView, right: nextView };
      }

      return { ...current, [side]: nextView };
    });
  }

  function toggleSync() {
    if (!syncEnabled) {
      setViews((current) => {
        const view = clampViewZoom(current.left, syncedMinZoom, syncedMaxZoom);
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
          onChange={(sourceId) => changeSource("left", sourceId)}
        />
        <SourcePicker
          label="Right source"
          sources={sources}
          value={rightSourceId}
          onChange={(sourceId) => changeSource("right", sourceId)}
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
          minZoom={leftMinZoom}
          maxZoom={leftMaxZoom}
          bounds={leftBounds}
          view={views.left}
          onViewChange={(view) => updateView("left", view)}
        />
        <MapPane
          title="Right"
          sourceId={rightSourceId}
          minZoom={rightMinZoom}
          maxZoom={rightMaxZoom}
          bounds={rightBounds}
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

      <TileDocs source={leftSource} view={views.left} />
    </main>
  );
}
