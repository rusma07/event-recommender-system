import express from "express";
import { runIndexerNow } from "../utils/modelJobs.js";
import fs from "fs";
import path from "path";

const router = express.Router();
router.post("/rebuild-now", async (_req, res) => {
  try {
    await runIndexerNow();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

router.get("/status", (_req, res) => {
  try {
    const statusPath = path.join(process.cwd(), "tmp", "model_last_status.json");
    if (!fs.existsSync(statusPath)) return res.json({ ok: false, message: "no status yet" });
    const data = JSON.parse(fs.readFileSync(statusPath, "utf8"));
    res.json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

export default router;
