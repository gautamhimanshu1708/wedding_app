import { Router } from 'express';
import {
  getReports,
  updatePhotoStatus,
  getMembers,
  updateMember,
} from '../controllers/moderationController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/membership.js';

const router = Router();

router.use(requireAuth);

router.get('/:weddingId/moderation/reports', requireAdmin, getReports);
router.patch('/:weddingId/moderation/photos/:photoId', requireAdmin, updatePhotoStatus);
router.get('/:weddingId/moderation/members', requireAdmin, getMembers);
router.patch('/:weddingId/moderation/members/:memberId', requireAdmin, updateMember);

export default router;
