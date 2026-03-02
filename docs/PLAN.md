# OpenField — Crop Field Investment Tracker (3D)

Detailed plan for a web/mobile app that tracks crop field investments with realistic 3D terrain, field borders, and financial metrics — using only open-source data.

---

## 1. Tech Stack

### 1.1 Frontend (Web-first, mobile-responsive)

| Layer | Choice | Why |
|-------|--------|-----|
| **Framework** | React (or Next.js for SSR/SEO) | Ecosystem, 3D libs support, mobile via PWA or React Native later |
| **3D / Map** | **Cesium.js** or **Mapbox GL JS** | Cesium: full 3D globe, terrain, best for “realistic” feel. Mapbox: great 2D/2.5D, simpler. Pick one as primary. |
| **Fallback 2D** | MapLibre GL JS | Open fork of Mapbox GL; good for 2D overview and low-end devices |
| **UI** | Tailwind + shadcn/ui (or similar) | Fast, accessible, works on mobile |
| **State** | React Query + Zustand (or Context) | Server state (fields, finances) + minimal client state |
| **Charts** | Recharts or Chart.js | Profit, margin, time series per field |

**Recommendation:** Start with **Cesium.js** for the “proper 3D” experience; use MapLibre for a 2D list/map view and as fallback on weak devices.

### 1.2 Mobile

- **Phase 1:** PWA (same React app, installable, works offline for viewing).
- **Phase 2 (optional):** React Native or Capacitor if you need native maps/3D or app store presence.

### 1.3 Backend

| Layer | Choice | Why |
|-------|--------|-----|
| **Runtime** | Node.js (Express/Fastify) or Python (FastAPI) | Either is fine; pick by team comfort |
| **API** | REST or tRPC | REST: simple, wide client support. tRPC: nice if full-stack TypeScript |
| **Database** | PostgreSQL + PostGIS | PostGIS for geometries (field polygons, bounds), JSON for flexible financial fields |
| **Auth** | NextAuth, Auth.js, or Supabase Auth | Email + OAuth; keep it simple at first |
| **File/Blob** | Local or S3-compatible (Minio, Cloudflare R2) | Store processed tiles, cached terrain, user uploads (e.g. boundary files) |

### 1.4 3D Terrain & Tiles Pipeline

- **Input:** Open elevation + imagery (see §2).
- **Processing:** Scripts (Python or Node) to generate terrain tiles (e.g. Cesium quantized-mesh or Mapbox terrain-rgb) and image tiles (TMS/XYZ).
- **Serving:** Static files on CDN or same backend; optional tile server (e.g. Martin, Tipper) for vector boundaries.

---

## 2. Open-Source Data Sources

### 2.1 Elevation (3D terrain)

| Source | Resolution | Coverage | Format | Notes |
|--------|------------|----------|--------|--------|
| **SRTM** (NASA) | 30 m (1 arc-sec ~30 m) | Global ±60° lat | GeoTIFF | Reliable, one-time download per region |
| **ASTER GDEM** | 30 m | Global | GeoTIFF | Alternative to SRTM |
| **EU-DEM** | 25 m | Europe | GeoTIFF | Better in Europe |
| **OpenTopography** | Variable | Many regions | Various | High-res where available |

**Usage:** Download DEM for your target regions → convert to Cesium quantized-mesh (e.g. with [cesium-terrain-builder](https://github.com/geo-data/cesium-terrain-builder)) or to Mapbox terrain-rgb → serve as tiles.

### 2.2 Satellite / Aerial Imagery

| Source | Resolution | Use case |
|--------|------------|----------|
| **Sentinel-2** (ESA) | 10–60 m | Base imagery, NDVI-style layers |
| **Landsat** (USGS) | 15–30 m | Alternative base layer |
| **OpenAerialMap** | Variable | Community imagery |
| **ESRI World Imagery (open)** | Variable | Check license for your use |

**Usage:** Pre-generate XYZ/TMS tiles for regions of interest, or use a WMS/WMTS if you run one (e.g. MapProxy, QGIS Server).

### 2.3 Field Boundaries / Parcels

| Source | Type | Coverage | Notes |
|--------|------|----------|--------|
| **OpenStreetMap** | `landuse=farmland`, etc. | Global, patchy | Good for hints, not always field-level |
| **National/state open data** | Parcel or agricultural datasets | Varies by country | e.g. US (county parcels), IN (state GIS), EU (INSPIRE) |
| **User-drawn** | Polygon drawing on map | Anywhere | Primary mechanism where no open parcels exist |

**Strategy:** Prefer user-drawn polygons; optionally suggest boundaries from OSM or open parcel data where available.

### 2.4 Optional (weather, soil, etc.)

- **Weather:** Open-Meteo API (free).
- **Soil:** FAO Soil Grids, national open soil data.
- **Crop type / land cover:** ESA WorldCover, national ag datasets.

Use in later phases for “context” and analytics, not required for v1.

---

## 3. Data Model

### 3.1 Core Entities

```
User
  └── optional: Organization (for multi-user/teams later)

Region
  - id, name, description
  - bbox (lat/lon bounds)
  - terrain_tiles_url, imagery_tiles_url (or config pointing to your tile set)
  - created_at, updated_at

Field
  - id, region_id, name
  - boundary (PostGIS geometry: polygon in WGS84)
  - area_ha (derived or stored)
  - created_at, updated_at

FieldFinancials (or yearly snapshot)
  - id, field_id
  - year, season (optional)
  - investment_amount, revenue, costs_breakdown (JSON)
  - profit = revenue - total_costs
  - margin = profit / revenue
  - currency
  - notes
```

### 3.2 Field Boundary Storage

- Store as **GeoJSON** or **PostGIS geometry (polygon)**.
- Index with PostGIS (GIST) for “fields in this viewport” queries.
- Support: draw on map, upload GeoJSON/KML, or (later) import from parcel data.

### 3.3 Financial Tracking

- Keep a **simple schema** per field per year (or per season): investment, revenue, cost categories.
- Derive profit and margin in DB or API.
- Optional: link to “activities” (planting, harvest, inputs) for more detail later.

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Web App (React + Cesium/MapLibre)                               │
│  - 3D/2D map, field drawing, dashboards, charts                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────┐
│  Backend API (Node or Python)                                    │
│  - Auth, CRUD regions/fields/financials                          │
│  - Serve tile metadata / tile URLs                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  PostgreSQL   │   │  Tile storage  │   │  Auth provider│
│  + PostGIS    │   │  (terrain,    │   │  (e.g.       │
│               │   │   imagery)    │   │   Supabase)   │
└───────────────┘   └───────────────┘   └───────────────┘
```

**Offline / PWA:** Cache tile sets and field list for selected regions; store edits in IndexedDB and sync when online.

---

## 5. User Flows (UX)

### 5.1 First-time: Define a region

1. User picks a place (search or map click).
2. App shows 2D map; user sets a bounding box (or we use a default zoom).
3. Backend (or pre-run job) ensures terrain + imagery tiles exist for that bbox (or we use a global low-res set and refine later).
4. User saves “Region” (name, bounds). 3D view loads for that region.

### 5.2 3D view

1. Globe/camera focuses on region; terrain + imagery load.
2. User can orbit, zoom, tilt (Cesium).
3. Field boundaries (polygons) are overlaid and clickable.
4. Click field → sidebar or popup: name, area, financial summary, link to detail.

### 5.3 Create / edit field

1. “Add field” → drawing mode: user draws polygon on 2D or 3D (Cesium supports drawing).
2. Save → boundary stored, area computed.
3. User can edit boundary (add/remove points) or delete.

### 5.4 Financial tracking

1. From field detail or list: “Add year” / “Edit financials”.
2. Form: investment, revenue, cost categories (optional breakdown).
3. Show profit, margin; charts over time and per field.

### 5.5 Dashboards

- List of fields (table) with key metrics.
- Map (2D) with fields colored by profit/margin.
- 3D view as the “wow” view and for orientation.

---

## 6. Implementation Phases

### Phase 1 — Foundation (4–6 weeks)

- [ ] Project setup: monorepo or separate front/back; DB migrations (e.g. Flyway, or Node/Python migrator).
- [ ] Backend: auth, regions CRUD, fields CRUD (with PostGIS), financials CRUD.
- [ ] Frontend: 2D map (MapLibre) with region bbox and field polygons; no 3D yet.
- [ ] Tile pipeline: download SRTM for one test region, generate terrain + imagery tiles, serve statically or via simple endpoint.
- [ ] Draw one field on 2D map and save boundary; show in list and on map.

### Phase 2 — 3D and one full region (3–4 weeks)

- [ ] Integrate Cesium; load terrain + imagery for one region.
- [ ] Show field polygons on 3D; click to highlight and show summary.
- [ ] Field drawing in 3D (or switch to 2D for drawing, then show in 3D).
- [ ] Financial form and basic charts per field.

### Phase 3 — Polish and scale (3–4 weeks)

- [ ] Multiple regions; region selector and lazy-load tiles.
- [ ] Dashboards: table view, 2D map colored by metric, 3D as default “explore” view.
- [ ] PWA: offline list + cached tiles for selected regions; sync queue for edits.
- [ ] Performance: LOD for many fields, simplify polygons for small scale.

### Phase 4 — Optional enhancements

- [ ] Import boundaries from OSM or open parcel data.
- [ ] Weather/soil layers; export reports (PDF/CSV).
- [ ] Mobile app (React Native/Capacitor) if needed.

---

## 7. Key Technical Decisions to Make Now

1. **Cesium vs Mapbox GL:** Cesium = full 3D globe and best “realistic” feel; Mapbox = great 2D/2.5D and often easier. Decide based on “must have 3D” vs “2.5D is enough”.
2. **Terrain tile format:** Cesium quantized-mesh (e.g. from cesium-terrain-builder) vs Mapbox terrain-rgb; depends on Cesium vs Mapbox choice.
3. **Single region vs multi-region at launch:** Start with one hardcoded region to validate pipeline, then add region CRUD.
4. **Hosting:** Vercel (frontend) + Railway/Render/Fly.io (API + DB) or all-in-one; tile hosting on R2 or same server.

---

## 8. Worldview Takeaways

*Reference: Ex-Google Maps PM “vibe coded” [Worldview](https://www.youtube.com/watch?v=rXvU7bPJ8n4) in ~3 days — a Google Earth × Palantir-style 3D globe with real-time layers (satellites, flights, military, traffic, CCTV, earthquakes). Below are patterns we can reuse; note his 3D base is **Google 3D Tiles** (proprietary), so for open-only we keep Cesium + open DEM + imagery.*

### 8.1 Camera framing with OSM

- He uses **OpenStreetMap** (or similar) to get the **3D bounds/volume of landmarks** so the camera frames them correctly instead of naively using lat/lon (which can leave the target off-center).
- **Apply for OpenField:** When user picks “focus on this field” or “go to region,” compute the **bounding volume** of the field/region (from PostGIS or OSM) and set Cesium camera to that extent so the field is centered in view.

### 8.2 Layer + click-to-track UX

- Toggle layers on/off (satellites, flights, military, traffic, etc.); click an entity to **track** it (e.g. orbit line, follow mode).
- **Apply for OpenField:** Use the same pattern: layers for “fields,” “boundaries,” “metrics overlay”; **click a field** to select it, show summary panel and optionally “focus camera on this field” or highlight boundary.

### 8.3 Sequential / progressive loading

- He hit browser crashes from **too many particles** at once. Fix: **sequential loading** — e.g. load main roads first, then arterial roads; same idea for other heavy layers.
- **Apply for OpenField:** When loading many fields or large polygons, **load by priority**: e.g. fields in viewport first, then adjacent; simplify polygons at low zoom (LOD); avoid loading every field at once.

### 8.4 Style presets and post-processing

- He has multiple visual modes (CRT, night vision, thermal) and post-processing (bloom, sharpen, LUT-like filters) **all in the browser**, implemented by describing to AI agents.
- **Apply for OpenField:** Optional “presentation” or “demo” mode with subtle post-processing (e.g. bloom, slight color grade) to make 3D fields look more polished; keep default clean for data work.

### 8.5 Build workflow

- He used multiple AI agents (Gemini, Claude, Cursor) via **terminal/CLI**, with different agents owning different areas (e.g. one for shaders, one for data integration). Iterate by talking to the system and fixing issues (e.g. “do sequential loading”) rather than hand-writing everything.
- **Apply for OpenField:** Same workflow: use AI for tile pipeline scripts, Cesium integration, and PostGIS queries; keep domain logic (financials, field CRUD) clear and testable.

---

## 9. File / Repo Structure (Suggested)

```
openfield/
├── apps/
│   ├── web/                 # React app (Cesium + MapLibre)
│   └── api/                 # Node or Python API
├── packages/
│   └── tiles/               # Scripts: download DEM/imagen, build tiles
├── docs/                    # This plan, API spec, data sources
├── docker-compose.yml       # PostGIS + optional Minio
└── README.md
```

---

## 10. Success Criteria for v1

- User can define a region and see it in 3D with real terrain and imagery (open data).
- User can draw and save field boundaries and see them on 2D and 3D.
- User can enter investment/revenue/costs per field per year and see profit/margin.
- All data sources and tooling are open-source; no paid map/terrain APIs required.
- Feels interactive and “almost realistic” for at least one demo region.

If you tell me your preferences (e.g. Cesium vs Mapbox, Node vs Python, single region first), the next step can be a concrete “Phase 1 task list” and initial project scaffold.
