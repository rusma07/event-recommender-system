import express from "express";
import { pool } from "../db.js";

const router = express.Router();

/**
 * POST /interactions
 * Body: { user_id, event_id?, interaction_type, meta? }
 */
router.post("/", async (req, res) => {
  try {
    const { user_id, event_id = null, interaction_type, meta = null } = req.body;

    if (!user_id || !interaction_type) {
      return res.status(400).json({ error: "user_id and interaction_type are required" });
    }

    // ✅ Prevent duplicate 'view' within 10 seconds
    if (interaction_type === "view" && event_id) {
      const check = await pool.query(
        `SELECT 1 FROM public."User_Event" 
         WHERE user_id=$1 AND event_id=$2 AND interaction_type='view' 
           AND interaction_time > NOW() - interval '10 seconds'`,
        [user_id, event_id]
      );
      if (check.rows.length > 0) {
        return res.status(200).json({ success: true, skipped: true });
      }
    }

    const query = `
      INSERT INTO public."User_Event" (user_id, event_id, interaction_type, meta)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [user_id, event_id, interaction_type, meta ? JSON.stringify(meta) : null];
    const result = await pool.query(query, values);

    return res.status(201).json({ success: true, interaction: result.rows[0] });
  } catch (err) {
    console.error("Error logging interaction:", err);
    return res.status(500).json({ error: "Failed to log interaction" });
  }
});

export default router;
