// backend/controllers/eventController.js
import { pool } from "../db.js";

class EventController {
  constructor(pool) {
    this.pool = pool;
  }

  // Get all events
  getAllEvents = async (_req, res) => {
    try {
      const { rows } = await this.pool.query(
        `SELECT * FROM public."Event" ORDER BY start_date DESC`
      );
      res.json(rows);
    } catch (err) {
      console.error("Error fetching all events:", err.message);
      res.status(500).json({ error: "Database error" });
    }
  };

  // Search events (title + tags)
  searchEvents = async (req, res) => {
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
      const { rows } = await this.pool.query(sql, [searchTerm, searchQuery]);
      res.json(rows);
    } catch (err) {
      console.error("❌ Error in searchEvents:", err.message);
      res.status(500).json({ error: "Failed to search events" });
    }
  };

  // 🔹 NEW: Get events by selected tags (supports multiple tags)
  getEventsByTags = async (req, res) => {
    try {
      let { tags } = req.body || {};

      // also support GET /events/by-tags?tags=Ai,Tech,Chess style
      if (!tags && typeof req.query.tags === "string") {
        tags = req.query.tags.split(",").map((t) => t.trim());
      }

      if (!tags || (Array.isArray(tags) && tags.length === 0)) {
        return res.json({ events: [], selectedTags: [], total: 0 });
      }

      // normalize to array of lowercase strings
      const tagList = Array.isArray(tags) ? tags : [tags];
      const normalizedTags = tagList
        .map((t) => String(t || "").trim().toLowerCase())
        .filter(Boolean);

      if (normalizedTags.length === 0) {
        return res.json({ events: [], selectedTags: [], total: 0 });
      }

      // ANY of the selected tags (OR logic):
      // event is included if it has at least one of the selected tags
      const sql = `
        SELECT event_id, title, image, start_date, end_date, location, tags, price, url
        FROM public."Event"
        WHERE EXISTS (
          SELECT 1 FROM unnest(tags) AS t
          WHERE LOWER(TRIM(t)) = ANY($1::text[])
        )
        ORDER BY start_date DESC
        LIMIT 50;
      `;

      // If you ever want "must contain ALL tags" logic instead of ANY:
      // you would need something like HAVING COUNT(DISTINCT ...) = number of selected tags.

      const { rows } = await this.pool.query(sql, [normalizedTags]);

      return res.json({
        events: rows,
        selectedTags: normalizedTags,
        total: rows.length,
      });
    } catch (err) {
      console.error("❌ Error in getEventsByTags:", err.message);
      res.status(500).json({ error: "Failed to fetch events by tags" });
    }
  };

  // Get events by user's clicked tags (preference-based)
  getEventsByUserTags = async (req, res) => {
    try {
      const { userId } = req.params;

      const tagResult = await this.pool.query(
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
        const meta =
          typeof tagResult.rows[0].meta === "string"
            ? JSON.parse(tagResult.rows[0].meta)
            : tagResult.rows[0].meta;
        tags = Array.isArray(meta.tags) ? meta.tags.map(String) : [];
      } catch {
        return res.json({
          events: [],
          message: "Error parsing user preferences",
        });
      }

      if (tags.length === 0) {
        return res.json({ events: [], message: "No tags found in preferences" });
      }

      const loweredTags = tags.map((t) => `%${t.trim().toLowerCase()}%`);
      const eventResult = await this.pool.query(
        `
        SELECT event_id, title, image, start_date, end_date, location, tags, price, url
        FROM public."Event"
        WHERE EXISTS (
          SELECT 1 FROM unnest(tags) AS t
          WHERE TRIM(t) ILIKE ANY($1::text[])
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
      res
        .status(500)
        .json({ error: "Failed to fetch events", details: err.message });
    }
  };

  // Create event (Admin)
  createEvent = async (req, res) => {
    try {
      const {
        title,
        image = null,
        start_date,
        end_date = null,
        location = null,
        tags = [],
        price = null,
        url = null,
      } = req.body;

      if (!title || !start_date) {
        return res
          .status(400)
          .json({ error: "title and start_date are required" });
      }

      const tagsArr = Array.isArray(tags)
        ? tags.map(String)
        : String(tags || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);

      // Price normalization:
      // - "Free" (any case) => 0
      // - "" / undefined / null => null
      // - invalid number => null
      let priceNum =
        price === null || price === undefined || price === "" ? null : price;
      if (typeof priceNum === "string") {
        priceNum =
          priceNum.trim().toLowerCase() === "free" ? 0 : Number(priceNum);
      }
      if (typeof priceNum === "number" && Number.isNaN(priceNum)) priceNum = null;

      const sql = `
        INSERT INTO public."Event"
          (title, image, start_date, end_date, location, tags, price, url)
        VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8)
        RETURNING event_id, title, image, start_date, end_date, location, tags, price, url
      `;

      const { rows } = await this.pool.query(sql, [
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
      return res.status(201).json({ message: "Event created", event: created });
    } catch (err) {
      console.error("❌ createEvent error:", err);
      return res.status(500).json({ error: "Failed to create event" });
    }
  };

  // Update event (Admin, partial)
  updateEvent = async (req, res) => {
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

      // Price normalization (same rules as create)
      let priceNum =
        price === null || price === undefined || price === "" ? null : price;
      if (typeof priceNum === "string") {
        priceNum =
          priceNum.trim().toLowerCase() === "free" ? 0 : Number(priceNum);
      }
      if (typeof priceNum === "number" && Number.isNaN(priceNum)) priceNum = null;

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
          url        = COALESCE($9, url)
        WHERE event_id = $1
        RETURNING event_id, title, image, start_date, end_date, location, tags, price, url
      `;

      const { rows } = await this.pool.query(sql, [
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
      return res.json({ message: "Event updated", event: updated });
    } catch (err) {
      console.error("❌ updateEvent error:", err);
      return res.status(500).json({ error: "Failed to update event" });
    }
  };

  // Delete event (Admin)
  deleteEvent = async (req, res) => {
    try {
      const { eventId } = req.params;
      const { rowCount } = await this.pool.query(
        `DELETE FROM public."Event" WHERE event_id = $1`,
        [eventId]
      );
      if (rowCount === 0) {
        return res.status(404).json({ error: "Event not found" });
      }
      return res.json({ message: "Event deleted" });
    } catch (err) {
      console.error("❌ deleteEvent error:", err);
      return res.status(500).json({ error: "Failed to delete event" });
    }
  };
}

// Create a single controller instance
const eventController = new EventController(pool);

// Export the same function names so existing routes don't have to change
export const getAllEvents = eventController.getAllEvents;
export const searchEvents = eventController.searchEvents;
export const getEventsByTags = eventController.getEventsByTags; // 👈 NEW EXPORT
export const getEventsByUserTags = eventController.getEventsByUserTags;
export const createEvent = eventController.createEvent;
export const updateEvent = eventController.updateEvent;
export const deleteEvent = eventController.deleteEvent;

export default eventController;
