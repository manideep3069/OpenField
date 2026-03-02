import type { Region, Field } from "../types";

const BASE = "/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, options);
  } catch {
    throw new Error("Cannot reach API server");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function get<T>(path: string) {
  return request<T>(path);
}

function post<T>(path: string, body: unknown) {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patch<T>(path: string, body: unknown) {
  return request<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function del(path: string) {
  return request<void>(path, { method: "DELETE" });
}

export const api = {
  health: async (): Promise<{ ok: boolean; db: boolean }> => {
    try {
      return await get<{ ok: boolean; db: boolean }>("/health");
    } catch {
      return { ok: false, db: false };
    }
  },

  regions: {
    list: () => get<Region[]>("/regions"),
    get: (id: string) => get<Region>(`/regions/${id}`),
    create: (body: {
      name: string;
      description?: string;
      bbox: [number, number, number, number];
    }) => post<Region>("/regions", body),
  },
  fields: {
    list: (regionId?: string) =>
      get<Field[]>(regionId ? `/fields?region_id=${regionId}` : "/fields"),
    get: (id: string) => get<Field>(`/fields/${id}`),
    create: (body: {
      region_id: string;
      name: string;
      boundary: Field["boundary"];
    }) => post<Field>("/fields", body),
    update: (
      id: string,
      body: { name?: string; boundary?: Field["boundary"] }
    ) => patch<Field>(`/fields/${id}`, body),
    delete: (id: string) => del(`/fields/${id}`),
  },
};
