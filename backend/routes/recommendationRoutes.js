// routes/recommendations.js
import express from "express";
import { getRecommendations } from "../services/recommendService.js";
import auth from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/recommendations/:userId?top_k=15&exclude_event_id=123
 * Returns recommended events for a user
 */
router.get("/:userId", auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const topK = parseInt(req.query.top_k) || 15;
    const excludeEventId = req.query.exclude_event_id ? parseInt(req.query.exclude_event_id) : null;

    if (!userId) return res.status(400).json({ error: "Invalid userId" });

    // Call service layer (Node.js or Python backend)
    let events = await getRecommendations(userId, topK);

    // Exclude currently viewed event if provided
    if (excludeEventId) {
      events = events.filter(e => e.event_id !== excludeEventId);
    }

    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

export default router;
