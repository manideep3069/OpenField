import { pool } from "./client.js";

const SQL = `
-- Regions: bounding box for a map region
CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  bbox JSONB NOT NULL CHECK (
    jsonb_array_length(bbox) = 4 AND
    bbox->>0 IS NOT NULL AND bbox->>1 IS NOT NULL AND
    bbox->>2 IS NOT NULL AND bbox->>3 IS NOT NULL
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fields: polygon boundary (PostGIS)
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  boundary GEOMETRY(Polygon, 4326) NOT NULL,
  area_ha NUMERIC GENERATED ALWAYS AS (ST_Area(boundary::geography) / 10000) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fields_region ON fields(region_id);
CREATE INDEX IF NOT EXISTS idx_fields_boundary ON fields USING GIST(boundary);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(SQL);
    console.log("Migrations applied.");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
