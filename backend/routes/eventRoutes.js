// routes/eventRoutes.js
import express from 'express';
import { createEvent, deleteEvent, getAllEvents, getEventsByUserTags, searchEvents, updateEvent } from '../controllers/eventController.js';
import auth from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';

const router = express.Router();
router.get('/', getAllEvents);
router.get("/:userId/tags", getEventsByUserTags);
router.get('/search', searchEvents);

router.post("/", auth, adminOnly, createEvent);
router.put("/:eventId", auth, adminOnly, updateEvent);
router.delete("/:eventId", auth, adminOnly, deleteEvent);

export default router;
