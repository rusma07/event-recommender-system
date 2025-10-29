// routes/eventRoutes.js
import express from 'express';
import { getAllEvents, getEventsByUserTags, searchEvents } from '../controllers/eventController.js';

const router = express.Router();
router.get('/', getAllEvents);
router.get("/:userId/tags", getEventsByUserTags);
router.get('/search', searchEvents);
export default router;
