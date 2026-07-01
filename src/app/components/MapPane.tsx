import { useEffect, useRef } from "react";
import maplibregl, { type Map } from "maplibre-gl";
import { styleUrl, type ViewState } from "../api";

type MapPaneProps = {
  title: string;
  apiKey: string;
  sourceId: string;
  view: ViewState;
  onViewChange: (view: ViewState) => void;
};

function almostEqual(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.000001;
}

export function MapPane({
  title,
  apiKey,
  sourceId,
  view,
  onViewChange,
}: MapPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const applyingViewRef = useRef(false);
  const onViewChangeRef = useRef(onViewChange);

  useEffect(() => {
    onViewChangeRef.current = onViewChange;
  }, [onViewChange]);

  useEffect(() => {
    if (!containerRef.current || !apiKey || !sourceId) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl(sourceId, apiKey),
      center: view.center,
      zoom: view.zoom,
      bearing: view.bearing,
      pitch: view.pitch,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    const handleMove = () => {
      if (applyingViewRef.current) {
        return;
      }

      const center = map.getCenter();
      onViewChangeRef.current({
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
    };

    map.on("move", handleMove);
    map.on("rotate", handleMove);
    map.on("pitch", handleMove);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [apiKey, sourceId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const center = map.getCenter();
    const matches =
      almostEqual(center.lng, view.center[0]) &&
      almostEqual(center.lat, view.center[1]) &&
      almostEqual(map.getZoom(), view.zoom) &&
      almostEqual(map.getBearing(), view.bearing) &&
      almostEqual(map.getPitch(), view.pitch);

    if (matches) {
      return;
    }

    applyingViewRef.current = true;
    map.jumpTo({
      center: view.center,
      zoom: view.zoom,
      bearing: view.bearing,
      pitch: view.pitch,
    });
    requestAnimationFrame(() => {
      applyingViewRef.current = false;
    });
  }, [view]);

  return (
    <article className="map-pane">
      <div className="pane-title">
        <strong>{title}</strong>
        <span>{sourceId || "No source"}</span>
      </div>
      {apiKey && sourceId ? (
        <div ref={containerRef} className="map-container" />
      ) : (
        <div className="map-placeholder">Enter an API key and load sources.</div>
      )}
    </article>
  );
}
