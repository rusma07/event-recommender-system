// eventController.js - FIXED IMPORT
import { pool } from "../db.js"; // ✅ Import named export

// ===============================
// 🔹 Get all events
// ===============================
export const getAllEvents = async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM public."Events" ORDER BY event_id ASC`);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching all events:", err.message);
    res.status(500).json({ error: "Database error" });
  }
};

// ======================================================
// 🔹 SEARCH EVENTS (Unified Logic for Title + Tags)
// ======================================================
export const searchEvents = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).json({ error: "Search query is required" });
    }

    const searchQuery = query.trim().toLowerCase();
    const searchTerm = `%${searchQuery}%`;

    console.log(`🔍 Searching events for: "${searchQuery}"`);

    const sql = `
      SELECT event_id, title, image, start_date, end_date, location, tags, price, url
      FROM public."Event"
      WHERE 
        LOWER(title) LIKE $1
        OR EXISTS (
          SELECT 1 FROM unnest(tags) AS tag
          WHERE LOWER(tag) LIKE $1
        )
      ORDER BY
        CASE 
          WHEN LOWER(title) = $2 THEN 1
          WHEN LOWER(title) LIKE $1 THEN 2
          ELSE 3
        END,
        start_date DESC
      LIMIT 50;
    `;

    const { rows } = await pool.query(sql, [searchTerm, searchQuery]);
    console.log(`✅ Found ${rows.length} event(s)`);

    if (rows.length === 0) {
      const sample = await pool.query('SELECT title FROM public."Event" LIMIT 5');
      console.log("📭 No results. Sample DB titles:", sample.rows.map((e) => e.title));
    } else {
      console.log("📋 Sample matches:", rows.slice(0, 3).map((e) => e.title));
    }

    res.json(rows);
  } catch (err) {
    console.error("❌ Error in searchEvents:", err.message);
    res.status(500).json({ error: "Failed to search events" });
  }
};

// ===============================
// 🔹 Get events based on user's clicked tags
// ===============================
export const getEventsByUserTags = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🔍 Fetching events for user: ${userId}`);
    console.log(`🔧 Using pool?`, !!pool);

    // 1️⃣ Fetch tag_click meta using RAW POOL QUERY
    const tagQuery = `
      SELECT meta
      FROM public."User_Event"
      WHERE user_id = $1 AND interaction_type = 'tag_click'
      LIMIT 1
    `;
    
    console.log(`📊 Executing tag query for user ${userId}`);
    const tagResult = await pool.query(tagQuery, [userId]);
    
    if (tagResult.rows.length === 0) {
      console.log(`❌ No tag_click found for user: ${userId}`);
      return res.json({ events: [], message: "No user preferences found" });
    }

    // 2️⃣ Extract and parse tags
    let tags = [];
    try {
      const row = tagResult.rows[0];
      const meta = typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta;
      tags = Array.isArray(meta.tags) ? meta.tags.map(String) : [];
      console.log(`✅ Extracted tags:`, tags);
    } catch (err) {
      console.error("❌ Error parsing meta JSON:", err);
      return res.json({ events: [], message: "Error parsing user preferences" });
    }

    if (tags.length === 0) {
      console.log(`📭 No tags found for user: ${userId}`);
      return res.json({ events: [], message: "No tags found in preferences" });
    }

    // 3️⃣ Query events using RAW POOL QUERY
    const eventQuery = `
      SELECT event_id, title, image, start_date, end_date, location, tags, price, url
      FROM public."Event"
      WHERE tags && $1::text[]
      ORDER BY start_date DESC
      LIMIT 50
    `;
    
    console.log(`🎯 Querying events with tags:`, tags);
    const eventResult = await pool.query(eventQuery, [tags]);
    
    console.log(`✅ Found ${eventResult.rows.length} events for user ${userId}`);
    return res.json({ 
      events: eventResult.rows,
      userTags: tags,
      total: eventResult.rows.length 
    });
    
  } catch (err) {
    console.error("❌ Error in getEventsByUserTags:", err.message);
    console.error("Stack trace:", err.stack);
    
    res.status(500).json({ 
      error: "Failed to fetch events",
      details: err.message 
    });
  }
};