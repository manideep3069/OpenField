import { useState, useCallback, useEffect } from "react";
import { MapView } from "./components/MapView";
import { FieldList } from "./components/FieldList";
import { api } from "./api/client";
import type { Field, Region } from "./types";
import "maplibre-gl/dist/maplibre-gl.css";

const DEFAULT_BBOX: [number, number, number, number] = [-10, 35, 40, 70];

export default function App() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRegions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.regions.list();
      setRegions(list);
      if (list.length > 0) setSelectedRegionId((prev) => prev || list[0].id);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFields = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.fields.list(selectedRegionId ?? undefined);
      setFields(list);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [selectedRegionId]);

  useEffect(() => {
    loadRegions();
  }, []);

  useEffect(() => {
    loadFields();
  }, [loadFields]);

  const ensureRegion = useCallback(async (): Promise<string> => {
    if (selectedRegionId) return selectedRegionId;
    const created = await api.regions.create({
      name: "Default region",
      bbox: DEFAULT_BBOX,
    });
    setRegions((r) => [created, ...r]);
    setSelectedRegionId(created.id);
    return created.id;
  }, [selectedRegionId]);

  const handleDrawComplete = useCallback(
    async (coordinates: number[][][]) => {
      setError(null);
      try {
        const regionId = await ensureRegion();
        const name = `Field ${fields.length + 1}`;
        const boundary = { type: "Polygon" as const, coordinates };
        await api.fields.create({ region_id: regionId, name, boundary });
        await loadFields();
        setDrawing(false);
      } catch (e) {
        setError(String(e));
      }
    },
    [ensureRegion, fields.length, loadFields]
  );

  const handleDeleteField = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await api.fields.delete(id);
        await loadFields();
      } catch (e) {
        setError(String(e));
      }
    },
    [loadFields]
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>OpenField</h1>
        <div className="app-actions">
          <button type="button" onClick={loadRegions}>
            Load regions
          </button>
          <button type="button" onClick={loadFields}>
            Load fields
          </button>
          <button
            type="button"
            className={drawing ? "active" : ""}
            onClick={() => setDrawing((d) => !d)}
          >
            {drawing ? "Cancel draw" : "Draw field"}
          </button>
        </div>
      </header>
      {error && <div className="error">{error}</div>}
      {loading && <div className="loading">Loading…</div>}
      <div className="app-body">
        <aside className="sidebar">
          <h2>Fields</h2>
          <FieldList
            fields={fields}
            onDelete={handleDeleteField}
          />
        </aside>
        <main className="map-main">
          <MapView
            fields={fields}
            drawing={drawing}
            onDrawComplete={handleDrawComplete}
          />
        </main>
      </div>
    </div>
  );
}
