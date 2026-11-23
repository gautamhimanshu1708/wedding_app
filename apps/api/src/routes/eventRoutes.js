import { Router } from 'express';
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/eventController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWeddingMember, requireEventManager } from '../middleware/membership.js';

const router = Router();

router.use(requireAuth);

router.get('/:weddingId/events', requireWeddingMember(), getEvents);
router.post('/:weddingId/events', requireEventManager, createEvent);
router.put('/:weddingId/events/:eventId', requireEventManager, updateEvent);
router.delete('/:weddingId/events/:eventId', requireEventManager, deleteEvent);

export default router;
