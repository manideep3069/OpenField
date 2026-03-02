import { Router } from "express";
import * as fieldsService from "../services/fields.js";

export const fieldsRouter = Router();

fieldsRouter.get("/", async (req, res) => {
  try {
    const regionId = req.query.region_id as string | undefined;
    const rows = regionId
      ? await fieldsService.listByRegion(regionId)
      : await fieldsService.list();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

fieldsRouter.get("/:id", async (req, res) => {
  try {
    const row = await fieldsService.getById(req.params.id);
    if (!row) return res.status(404).json({ error: "Field not found" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

fieldsRouter.post("/", async (req, res) => {
  try {
    const { region_id, name, boundary } = req.body;
    if (!region_id || !name || !boundary?.type || boundary.type !== "Polygon") {
      return res
        .status(400)
        .json({ error: "region_id, name, and boundary (GeoJSON Polygon) required" });
    }
    const row = await fieldsService.create({ region_id, name, boundary });
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

fieldsRouter.patch("/:id", async (req, res) => {
  try {
    const row = await fieldsService.update(req.params.id, req.body);
    if (!row) return res.status(404).json({ error: "Field not found" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

fieldsRouter.delete("/:id", async (req, res) => {
  try {
    const ok = await fieldsService.remove(req.params.id);
    if (!ok) return res.status(404).json({ error: "Field not found" });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
