import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { regionsRouter } from "./routes/regions.js";
import { fieldsRouter } from "./routes/fields.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/regions", regionsRouter);
app.use("/api/fields", fieldsRouter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(config.port, () => {
  console.log(`API http://localhost:${config.port}`);
});
