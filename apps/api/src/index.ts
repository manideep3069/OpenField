import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { regionsRouter } from "./routes/regions.js";
import { fieldsRouter } from "./routes/fields.js";
import { pool } from "./db/client.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/regions", regionsRouter);
app.use("/api/fields", fieldsRouter);

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: true });
  } catch {
    res.json({ ok: true, db: false });
  }
});

app.listen(config.port, () => {
  console.log(`API http://localhost:${config.port}`);
});
