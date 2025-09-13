// routes/events.js
import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.get("/:eventId", async (req, res) => {
  const { eventId } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM public."Event" WHERE event_id = $1`, [eventId]);
    if (!result.rows.length) return res.status(404).json({ error: "Event not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

export default router;
