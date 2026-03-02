import { useState, useCallback, useEffect } from "react";
import { MapView } from "./components/MapView";
import { FieldList } from "./components/FieldList";
import { api } from "./api/client";
import type { Field } from "./types";

const DEFAULT_BBOX: [number, number, number, number] = [-10, 35, 40, 70];

type ViewMode = "2D" | "3D";

let Map3DViewLazy: typeof import("./components/Map3DView").Map3DView | null =
  null;

export default function App() {
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("2D");
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<{
    ok: boolean;
    db: boolean;
  } | null>(null);
  const [map3DReady, setMap3DReady] = useState(false);

  useEffect(() => {
    api.health().then((status) => {
      setApiStatus(status);
      if (status.ok && status.db) {
        loadRegions();
        loadFields();
      }
    });
  }, []);

  useEffect(() => {
    import("./components/Map3DView").then((mod) => {
      Map3DViewLazy = mod.Map3DView;
      setMap3DReady(true);
    });
  }, []);

  const loadRegions = useCallback(async () => {
    try {
      const list = await api.regions.list();
      if (list.length > 0)
        setSelectedRegionId((prev) => prev || list[0].id);
    } catch {
      // silently fail
    }
  }, []);

  const loadFields = useCallback(async () => {
    try {
      const list = await api.fields.list(selectedRegionId ?? undefined);
      setFields(list);
    } catch {
      // keep current list
    }
  }, [selectedRegionId]);

  useEffect(() => {
    if (apiStatus?.db) loadFields();
  }, [apiStatus, loadFields]);

  const ensureRegion = useCallback(async (): Promise<string> => {
    if (selectedRegionId) return selectedRegionId;
    const created = await api.regions.create({
      name: "Default region",
      bbox: DEFAULT_BBOX,
    });
    setSelectedRegionId(created.id);
    return created.id;
  }, [selectedRegionId]);

  const handleDrawComplete = useCallback(
    async (coordinates: number[][][]) => {
      if (!apiStatus?.db) {
        setError("Database is not running — cannot save fields.");
        return;
      }
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
    [apiStatus, ensureRegion, fields.length, loadFields]
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

  const switchTo3D = useCallback(() => {
    setViewMode("3D");
    setDrawing(false);
  }, []);

  const statusMessage =
    apiStatus === null
      ? null
      : !apiStatus.ok
        ? "API server is offline — map works, but saving/loading requires the API."
        : !apiStatus.db
          ? "Database is offline — map works, but saving/loading requires PostGIS."
          : null;

  return (
    <div className="app">
      <header className="app-header">
        <h1>OpenField</h1>
        <div className="app-actions">
          <button
            type="button"
            className={viewMode === "2D" ? "active" : ""}
            onClick={() => setViewMode("2D")}
          >
            2D
          </button>
          <button
            type="button"
            className={viewMode === "3D" ? "active" : ""}
            onClick={switchTo3D}
            disabled={!map3DReady}
          >
            3D
          </button>
          {viewMode === "2D" && (
            <button
              type="button"
              className={drawing ? "active" : ""}
              onClick={() => setDrawing((d) => !d)}
            >
              {drawing ? "Cancel draw" : "Draw field"}
            </button>
          )}
          {apiStatus?.db && (
            <button type="button" onClick={loadFields}>
              Refresh
            </button>
          )}
        </div>
      </header>

      {statusMessage && <div className="notice">{statusMessage}</div>}
      {error && <div className="error">{error}</div>}

      <div className="app-body">
        <aside className="sidebar">
          <h2>Fields</h2>
          {selectedField && (
            <div className="field-summary">
              <strong>{selectedField.name}</strong>
              {selectedField.area_ha != null && (
                <span>{selectedField.area_ha.toFixed(2)} ha</span>
              )}
              <button type="button" onClick={() => setSelectedField(null)}>
                Clear
              </button>
            </div>
          )}
          <FieldList
            fields={fields}
            selectedFieldId={selectedField?.id ?? null}
            onSelect={setSelectedField}
            onDelete={apiStatus?.db ? handleDeleteField : undefined}
          />
        </aside>
        <main className="map-main">
          {viewMode === "2D" && (
            <MapView
              fields={fields}
              drawing={drawing}
              onDrawComplete={handleDrawComplete}
            />
          )}
          {viewMode === "3D" && map3DReady && Map3DViewLazy && (
            <Map3DViewLazy
              fields={fields}
              selectedFieldId={selectedField?.id ?? null}
              onSelectField={setSelectedField}
            />
          )}
          {viewMode === "3D" && !map3DReady && (
            <div className="loading-3d">Loading 3D engine...</div>
          )}
        </main>
      </div>
    </div>
  );
}
