// eventController.js - FIXED IMPORT
import { pool } from "../db.js";
import { upsertEventToIndexer, deleteEventFromIndexer } from "../utils/indexerClient.js";

// ===============================
// 🔹 Get all events
// ===============================
export const getAllEvents = async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM public."Event" ORDER BY event_id ASC`);
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

    const tagResult = await pool.query(
      `SELECT meta FROM public."User_Event"
       WHERE user_id = $1 AND interaction_type = 'tag_click'
       LIMIT 1`,
      [userId]
    );

    if (tagResult.rows.length === 0) {
      return res.json({ events: [], message: "No user preferences found" });
    }

    let tags = [];
    try {
      const meta = typeof tagResult.rows[0].meta === "string"
        ? JSON.parse(tagResult.rows[0].meta)
        : tagResult.rows[0].meta;
      tags = Array.isArray(meta.tags) ? meta.tags.map(String) : [];
    } catch {
      return res.json({ events: [], message: "Error parsing user preferences" });
    }

    if (tags.length === 0) {
      return res.json({ events: [], message: "No tags found in preferences" });
    }

    const loweredTags = tags.map((t) => `%${t.trim().toLowerCase()}%`);
    const eventResult = await pool.query(
      `
      SELECT event_id, title, image, start_date, end_date, location, tags, price, url
      FROM public."Event"
      WHERE EXISTS (
        SELECT 1 FROM unnest(tags) AS t
        WHERE LOWER(TRIM(t)) ILIKE ANY($1::text[])
      )
      ORDER BY start_date DESC
      LIMIT 50;
      `,
      [loweredTags]
    );

    return res.json({
      events: eventResult.rows,
      userTags: tags,
      total: eventResult.rows.length,
    });
  } catch (err) {
    console.error("❌ Error in getEventsByUserTags:", err.message);
    res.status(500).json({ error: "Failed to fetch events", details: err.message });
  }
};

// ===============================
// 🔹 Create event (Admin)
// ===============================
export const createEvent = async (req, res) => {
  try {
    const {
      title,
      image = null,
      start_date,
      end_date = null,
      location = null,
      tags = [],
      price = null,
      url = null,// if you have it
    } = req.body;

    if (!title || !start_date) {
      return res.status(400).json({ error: "title and start_date are required" });
    }

    const tagsArr = Array.isArray(tags)
      ? tags.map(String)
      : String(tags || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

    const priceNum =
      price === null || price === undefined || price === "" ? null : Number(price);

    const sql = `
      INSERT INTO public."Event"
        (title, image, start_date, end_date, location, tags, price, url, description)
      VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8, $9)
      RETURNING event_id, title, image, start_date, end_date, location, tags, price, url, description
    `;

    const { rows } = await pool.query(sql, [
      title,
      image,
      start_date,
      end_date,
      location,
      tagsArr,
      priceNum,
      url,
    ]);

    const created = rows[0];

    // 🚀 Non-blocking indexer call
    upsertEventToIndexer(created);

    return res.status(201).json({ message: "Event created", event: created });
  } catch (err) {
    console.error("❌ createEvent error:", err);
    return res.status(500).json({ error: "Failed to create event" });
  }
};

// ===============================
// 🔹 Update event (Admin, partial)
// ===============================
export const updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const {
      title = null,
      image = null,
      start_date = null,
      end_date = null,
      location = null,
      tags = null,
      price = null,
      url = null,
    } = req.body;

    const tagsArr =
      tags == null
        ? null
        : Array.isArray(tags)
        ? tags.map(String)
        : String(tags)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);

    const priceNum =
      price === null || price === undefined || price === "" ? null : Number(price);

    const sql = `
      UPDATE public."Event"
      SET
        title      = COALESCE($2, title),
        image      = COALESCE($3, image),
        start_date = COALESCE($4, start_date),
        end_date   = COALESCE($5, end_date),
        location   = COALESCE($6, location),
        tags       = COALESCE($7::text[], tags),
        price      = COALESCE($8, price),
        url        = COALESCE($9, url),
      WHERE event_id = $1
      RETURNING event_id, title, image, start_date, end_date, location, tags, price, url, description
    `;

    const { rows } = await pool.query(sql, [
      eventId,
      title,
      image,
      start_date,
      end_date,
      location,
      tagsArr,
      priceNum,
      url,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const updated = rows[0];

    // 🚀 Non-blocking indexer call
    upsertEventToIndexer(updated);

    return res.json({ message: "Event updated", event: updated });
  } catch (err) {
    console.error("❌ updateEvent error:", err);
    return res.status(500).json({ error: "Failed to update event" });
  }
};

// ===============================
// 🔹 Delete event (Admin)
// ===============================
export const deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { rowCount } = await pool.query(
      `DELETE FROM public."Event" WHERE event_id = $1`,
      [eventId]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    // 🚀 Non-blocking indexer delete
    deleteEventFromIndexer(eventId);

    return res.json({ message: "Event deleted" });
  } catch (err) {
    console.error("❌ deleteEvent error:", err);
    return res.status(500).json({ error: "Failed to delete event" });
  }
};
