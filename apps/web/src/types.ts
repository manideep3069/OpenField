export interface Region {
  id: string;
  name: string;
  description: string | null;
  bbox: [number, number, number, number];
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
