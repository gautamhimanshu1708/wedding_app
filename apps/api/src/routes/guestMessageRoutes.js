import { Router } from 'express';
import { getMessages, createMessage } from '../controllers/guestMessageController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWeddingMember } from '../middleware/membership.js';

const router = Router();

router.use(requireAuth);

router.get('/:weddingId/messages', requireWeddingMember(), getMessages);
router.post('/:weddingId/messages', requireWeddingMember(), createMessage);

export default router;
