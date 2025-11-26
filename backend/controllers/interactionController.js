import { pool } from "../db.js";

class InteractionController {
  constructor(pool) {
    this.pool = pool;
  }

  // POST /api/interactions
  logInteraction = async (req, res) => {
    try {
      const {
        user_id,
        event_id = null,
        interaction_type,
        meta = null,
      } = req.body;

      if (!user_id || !interaction_type) {
        return res
          .status(400)
          .json({ error: "user_id and interaction_type are required" });
      }

      // Prevent duplicate 'view' within 10 seconds
      if (interaction_type === "view" && event_id) {
        const check = await this.pool.query(
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
        const existing = await this.pool.query(
          `SELECT meta FROM public."User_Event"
           WHERE user_id=$1 AND interaction_type='tag_click'`,
          [user_id]
        );

        // 1️⃣ Normalize incoming tags:
        //    - ensure array
        //    - toString + trim
        //    - remove ALL spaces (e.g. "Data Analysis" -> "DataAnalysis")
        let newTags = [];
        if (meta && Array.isArray(meta.tags)) {
          newTags = meta.tags
            .map((t) => String(t || "").trim())
            .filter(Boolean)
            .map((t) => t.replace(/\s+/g, "")); // remove spaces
        }

        if (existing.rows.length > 0) {
          // meta might be JSON or string, handle both
          let currentMeta = existing.rows[0].meta;
          if (typeof currentMeta === "string") {
            try {
              currentMeta = JSON.parse(currentMeta);
            } catch {
              currentMeta = {};
            }
          }

          let currentTags = Array.isArray(currentMeta?.tags)
            ? currentMeta.tags
            : [];

          // 2️⃣ Normalize existing tags the same way (trim + remove spaces)
          currentTags = currentTags
            .map((t) => String(t || "").trim())
            .filter(Boolean)
            .map((t) => t.replace(/\s+/g, "")); // remove spaces

          // 3️⃣ Merge + dedupe
          const mergedTags = Array.from(new Set([...currentTags, ...newTags]));

          const update = await this.pool.query(
            `UPDATE public."User_Event"
             SET meta = $1, interaction_time = NOW()
             WHERE user_id=$2 AND interaction_type='tag_click'
             RETURNING *`,
            [JSON.stringify({ tags: mergedTags }), user_id]
          );

          return res
            .status(200)
            .json({ success: true, interaction: update.rows[0] });
        } else {
          // First time tag_click for this user
          const insert = await this.pool.query(
            `INSERT INTO public."User_Event" (user_id, event_id, interaction_type, meta)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [
              user_id,
              null,
              interaction_type,
              JSON.stringify({ tags: newTags }), // already normalized
            ]
          );

          return res
            .status(201)
            .json({ success: true, interaction: insert.rows[0] });
        }
      }

      // Handle search interaction
      if (interaction_type === "search") {
        const insert = await this.pool.query(
          `INSERT INTO public."User_Event" (user_id, event_id, interaction_type, meta)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [user_id, null, "search", JSON.stringify(meta)]
        );
        return res
          .status(201)
          .json({ success: true, interaction: insert.rows[0] });
      }

      // Default insert (view, register, etc.)
      const result = await this.pool.query(
        `INSERT INTO public."User_Event" (user_id, event_id, interaction_type, meta)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          user_id,
          event_id,
          interaction_type,
          meta ? JSON.stringify(meta) : null,
        ]
      );

      return res
        .status(201)
        .json({ success: true, interaction: result.rows[0] });
    } catch (err) {
      console.error("Error logging interaction:", err);
      return res.status(500).json({ error: "Failed to log interaction" });
    }
  };

  // GET /api/interactions/:userId/onboarding-status
  getOnboardingStatus = async (req, res) => {
    try {
      const { userId } = req.params;
      const q = `
        SELECT NOT EXISTS(
          SELECT 1 FROM public."User_Event"
          WHERE user_id=$1 AND interaction_type='tag_click'
        ) AS "isNewUser"
      `;
      const { rows } = await this.pool.query(q, [userId]);
      res.json({ isNewUser: rows[0]?.isNewUser ?? true });
    } catch (err) {
      console.error("Error fetching onboarding status:", err);
      res.status(500).json({ error: "Failed to fetch onboarding status" });
    }
  };
}

const interactionController = new InteractionController(pool);

// Named exports for routes
export const logInteraction = interactionController.logInteraction;
export const getOnboardingStatus = interactionController.getOnboardingStatus;

// Optional default export of the instance
export default interactionController;
