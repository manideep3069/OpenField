import { query, queryOne } from "../db/client.js";
import type { Region, CreateRegionBody } from "../types.js";

export async function list(): Promise<Region[]> {
  const rows = await query<Region>(
    `SELECT id, name, description, bbox, created_at, updated_at FROM regions ORDER BY updated_at DESC`
  );
  return rows.map((r) => ({ ...r, bbox: r.bbox as [number, number, number, number] }));
}

export async function getById(id: string): Promise<Region | null> {
  const row = await queryOne<Region>(
    `SELECT id, name, description, bbox, created_at, updated_at FROM regions WHERE id = $1`,
    [id]
  );
  if (!row) return null;
  return { ...row, bbox: row.bbox as [number, number, number, number] };
}

export async function create(body: CreateRegionBody): Promise<Region> {
  const { name, description = null, bbox } = body;
  const row = await queryOne<Region>(
    `INSERT INTO regions (name, description, bbox) VALUES ($1, $2, $3)
     RETURNING id, name, description, bbox, created_at, updated_at`,
    [name, description, JSON.stringify(bbox)]
  );
  if (!row) throw new Error("Insert failed");
  return { ...row, bbox: row.bbox as [number, number, number, number] };
}

export async function update(
  id: string,
  body: Partial<CreateRegionBody>
): Promise<Region | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (body.name !== undefined) {
    updates.push(`name = $${i++}`);
    values.push(body.name);
  }
  if (body.description !== undefined) {
    updates.push(`description = $${i++}`);
    values.push(body.description);
  }
  if (body.bbox !== undefined) {
    updates.push(`bbox = $${i++}`);
    values.push(JSON.stringify(body.bbox));
  }
  if (updates.length === 0) return getById(id);
  updates.push(`updated_at = now()`);
  values.push(id);
  const row = await queryOne<Region>(
    `UPDATE regions SET ${updates.join(", ")} WHERE id = $${i} RETURNING id, name, description, bbox, created_at, updated_at`,
    values
  );
  if (!row) return null;
  return { ...row, bbox: row.bbox as [number, number, number, number] };
}

export async function remove(id: string): Promise<boolean> {
  const result = await query<{ id: string }>(`DELETE FROM regions WHERE id = $1 RETURNING id`, [id]);
  return result.length > 0;
}
