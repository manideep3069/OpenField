import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { Field } from "../types";

interface MapViewProps {
  fields: Field[];
  onDrawComplete?: (coordinates: number[][][]) => void;
  drawing?: boolean;
}

export function MapView({ fields, onDrawComplete, drawing = false }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<{ lng: number; lat: number }[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [0, 20],
      zoom: 2,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.on("load", () => setMapReady(true));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Draw saved fields as fill layers
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;
    const sourceId = "fields-source";
    const layerId = "fields-fill";
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    if (fields.length === 0) return;
    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: fields.map((f) => ({
          type: "Feature" as const,
          properties: { id: f.id, name: f.name },
          geometry: f.boundary,
        })),
      },
    });
    map.addLayer({
      id: layerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": "#22c55e",
        "fill-opacity": 0.4,
        "fill-outline-color": "#15803d",
      },
    });
  }, [mapReady, fields]);

  // Drawing mode: click to add points, double-click to finish
  useEffect(() => {
    if (!mapRef.current || !mapReady || !drawing || !onDrawComplete) return;
    const map = mapRef.current;
    const cursor = "crosshair";
    map.getCanvas().style.cursor = cursor;

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      drawRef.current.push({ lng, lat });
    };

    const onDblClick = (e: maplibregl.MapMouseEvent) => {
      e.preventDefault();
      if (drawRef.current.length < 3) return;
      const ring = [...drawRef.current.map((p) => [p.lng, p.lat]), [drawRef.current[0].lng, drawRef.current[0].lat]];
      onDrawComplete([ring]);
      drawRef.current = [];
    };

    map.on("click", onClick);
    map.on("dblclick", onDblClick);
    return () => {
      map.off("click", onClick);
      map.off("dblclick", onDblClick);
      map.getCanvas().style.cursor = "";
    };
  }, [mapReady, drawing, onDrawComplete]);

  return <div ref={containerRef} className="map-container" />;
}
