import { query, queryOne } from "../db/client.js";
import type { Field, CreateFieldBody, UpdateFieldBody } from "../types.js";

function rowToField(row: Record<string, unknown>): Field {
  return {
    id: row.id as string,
    region_id: row.region_id as string,
    name: row.name as string,
    boundary: row.boundary as Field["boundary"],
    area_ha: row.area_ha != null ? Number(row.area_ha) : null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function list(): Promise<Field[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT id, region_id, name, ST_AsGeoJSON(boundary)::json AS boundary, area_ha, created_at, updated_at FROM fields ORDER BY updated_at DESC`
  );
  return rows.map(rowToField);
}

export async function listByRegion(regionId: string): Promise<Field[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT id, region_id, name, ST_AsGeoJSON(boundary)::json AS boundary, area_ha, created_at, updated_at FROM fields WHERE region_id = $1 ORDER BY updated_at DESC`,
    [regionId]
  );
  return rows.map(rowToField);
}

export async function getById(id: string): Promise<Field | null> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT id, region_id, name, ST_AsGeoJSON(boundary)::json AS boundary, area_ha, created_at, updated_at FROM fields WHERE id = $1`,
    [id]
  );
  return row ? rowToField(row) : null;
}

export async function create(body: CreateFieldBody): Promise<Field> {
  const { region_id, name, boundary } = body;
  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO fields (region_id, name, boundary) VALUES ($1, $2, ST_GeomFromGeoJSON($3))
     RETURNING id, region_id, name, ST_AsGeoJSON(boundary)::json AS boundary, area_ha, created_at, updated_at`,
    [region_id, name, JSON.stringify(boundary)]
  );
  if (!row) throw new Error("Insert failed");
  return rowToField(row);
}

export async function update(id: string, body: UpdateFieldBody): Promise<Field | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (body.name !== undefined) {
    updates.push(`name = $${i++}`);
    values.push(body.name);
  }
  if (body.boundary !== undefined) {
    updates.push(`boundary = ST_GeomFromGeoJSON($${i++})`);
    values.push(JSON.stringify(body.boundary));
  }
  if (updates.length === 0) return getById(id);
  updates.push(`updated_at = now()`);
  values.push(id);
  const row = await queryOne<Record<string, unknown>>(
    `UPDATE fields SET ${updates.join(", ")} WHERE id = $${i} RETURNING id, region_id, name, ST_AsGeoJSON(boundary)::json AS boundary, area_ha, created_at, updated_at`,
    values
  );
  return row ? rowToField(row) : null;
}

export async function remove(id: string): Promise<boolean> {
  const result = await query<{ id: string }>(`DELETE FROM fields WHERE id = $1 RETURNING id`, [id]);
  return result.length > 0;
}
