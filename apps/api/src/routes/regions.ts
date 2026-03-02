import { Router } from "express";
import * as regionsService from "../services/regions.js";

export const regionsRouter = Router();

regionsRouter.get("/", async (_req, res) => {
  try {
    const rows = await regionsService.list();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

regionsRouter.get("/:id", async (req, res) => {
  try {
    const row = await regionsService.getById(req.params.id);
    if (!row) return res.status(404).json({ error: "Region not found" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

regionsRouter.post("/", async (req, res) => {
  try {
    const { name, description, bbox } = req.body;
    if (!name || !bbox || !Array.isArray(bbox) || bbox.length !== 4) {
      return res.status(400).json({ error: "name and bbox [west,south,east,north] required" });
    }
    const row = await regionsService.create({ name, description, bbox });
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

regionsRouter.patch("/:id", async (req, res) => {
  try {
    const row = await regionsService.update(req.params.id, req.body);
    if (!row) return res.status(404).json({ error: "Region not found" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

regionsRouter.delete("/:id", async (req, res) => {
  try {
    const ok = await regionsService.remove(req.params.id);
    if (!ok) return res.status(404).json({ error: "Region not found" });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
