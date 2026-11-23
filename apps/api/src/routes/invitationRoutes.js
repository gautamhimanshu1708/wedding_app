import { Router } from 'express';
import {
  createInvitation,
  validateInvitation,
  acceptInvitation,
} from '../controllers/invitationController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/membership.js';

const router = Router();

// Public route to inspect invitation metadata for QR intro
router.get('/validate/:token', validateInvitation);

// Authenticated route to accept/join wedding via token
router.post('/join/:token', requireAuth, acceptInvitation);

// Admin route to generate an invitation QR/token
router.post('/weddings/:weddingId', requireAuth, requireAdmin, createInvitation);

export default router;
