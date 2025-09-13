import { pool } from "./db.js";

// Log a user interaction
export const logInteraction = async (userId, interactionType, eventId = null, searchQuery = null) => {
  try {
    const query = `
      INSERT INTO public."User_Event" (user_id, event_id, interaction_type, search_query)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [userId, eventId, interactionType, searchQuery];
    const res = await pool.query(query, values);
    return res.rows[0];
  } catch (err) {
    console.error("DB Error (logInteraction):", err);
    throw err;
  }
};
