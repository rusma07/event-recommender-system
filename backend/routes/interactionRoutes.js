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

    // Prevent duplicate 'view' within 10 seconds
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

    // Handle tag clicks (upsert)
    if (interaction_type === "tag_click") {
      const existing = await pool.query(
        `SELECT meta FROM public."User_Event"
         WHERE user_id=$1 AND interaction_type='tag_click'`,
        [user_id]
      );

      let newMeta = meta ? meta.tags || [] : [];
      if (existing.rows.length > 0) {
        const currentTags = existing.rows[0].meta ? existing.rows[0].meta.tags : [];
        newMeta = Array.from(new Set([...currentTags, ...newMeta]));
        const update = await pool.query(
          `UPDATE public."User_Event"
           SET meta = $1, interaction_time = NOW()
           WHERE user_id=$2 AND interaction_type='tag_click'
           RETURNING *`,
          [JSON.stringify({ tags: newMeta }), user_id]
        );
        return res.status(200).json({ success: true, interaction: update.rows[0] });
      } else {
        const insert = await pool.query(
          `INSERT INTO public."User_Event" (user_id, event_id, interaction_type, meta)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [user_id, null, interaction_type, JSON.stringify({ tags: newMeta })]
        );
        return res.status(201).json({ success: true, interaction: insert.rows[0] });
      }
    }

    // ✅ Handle search interaction
    if (interaction_type === "search") {
      const insert = await pool.query(
        `INSERT INTO public."User_Event" (user_id, event_id, interaction_type, meta)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [user_id, null, "search", JSON.stringify(meta)]
      );
      return res.status(201).json({ success: true, interaction: insert.rows[0] });
    }

    // Default insert (view, register, etc.)
    const result = await pool.query(
      `INSERT INTO public."User_Event" (user_id, event_id, interaction_type, meta)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, event_id, interaction_type, meta ? JSON.stringify(meta) : null]
    );

    return res.status(201).json({ success: true, interaction: result.rows[0] });
  } catch (err) {
    console.error("Error logging interaction:", err);
    return res.status(500).json({ error: "Failed to log interaction" });
  }
});

// Onboarding status (new user if no tag_click)
router.get("/:userId/onboarding-status", async (req, res) => {
  const { userId } = req.params;
  const q = `
    SELECT NOT EXISTS(
      SELECT 1 FROM public."User_Event"
      WHERE user_id=$1 AND interaction_type='tag_click'
    ) AS "isNewUser"
  `;
  const { rows } = await pool.query(q, [userId]);
  res.json({ isNewUser: rows[0]?.isNewUser ?? true });
});


export default router;
