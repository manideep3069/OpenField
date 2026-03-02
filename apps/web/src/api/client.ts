import type { Region, Field } from "../types";

const BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

export const api = {
  regions: {
    list: () => get<Region[]>("/regions"),
    get: (id: string) => get<Region>(`/regions/${id}`),
    create: (body: { name: string; description?: string; bbox: [number, number, number, number] }) =>
      post<Region>("/regions", body),
  },
  fields: {
    list: (regionId?: string) =>
      get<Field[]>(regionId ? `/fields?region_id=${regionId}` : "/fields"),
    get: (id: string) => get<Field>(`/fields/${id}`),
    create: (body: { region_id: string; name: string; boundary: Field["boundary"] }) =>
      post<Field>("/fields", body),
    update: (id: string, body: { name?: string; boundary?: Field["boundary"] }) =>
      patch<Field>(`/fields/${id}`, body),
    delete: (id: string) => del(`/fields/${id}`),
  },
};
