export interface Region {
  id: string;
  name: string;
  description: string | null;
  bbox: [number, number, number, number]; // [west, south, east, north]
  created_at: string;
  updated_at: string;
}

export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface Field {
  id: string;
  region_id: string;
  name: string;
  boundary: GeoJsonPolygon;
  area_ha: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRegionBody {
  name: string;
  description?: string;
  bbox: [number, number, number, number];
}

export interface CreateFieldBody {
  region_id: string;
  name: string;
  boundary: GeoJsonPolygon;
}

export interface UpdateFieldBody {
  name?: string;
  boundary?: GeoJsonPolygon;
}
