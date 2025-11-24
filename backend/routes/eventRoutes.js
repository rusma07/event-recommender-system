import express from 'express';
import {
  createEvent,
  deleteEvent,
  getAllEvents,
   searchEvents,
  getEventsByUserTags,
  getEventsByTags,
  updateEvent
} from '../controllers/eventController.js';
import auth from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminOnly.js';

const router = express.Router();

router.get('/', getAllEvents);

// put /search BEFORE /:userId/tags
router.get('/search', searchEvents);
router.get('/:userId/tags', getEventsByUserTags);
router.get("/by-tags", getEventsByTags);

router.post('/', auth, adminOnly, createEvent);
router.put('/:eventId', auth, adminOnly, updateEvent);
router.delete('/:eventId', auth, adminOnly, deleteEvent);

export default router;
