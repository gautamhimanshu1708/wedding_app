import { Router } from 'express';
import {
  createWedding,
  getMyWeddings,
  getWeddingBySlug,
  joinWeddingByQR,
  getWeddingById,
  updateWedding,
  getWeddingStats,
} from '../controllers/weddingController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWeddingMember, requireAdmin } from '../middleware/membership.js';

const router = Router();

// Public route — QR landing page metadata (no auth needed)
router.get('/slug/:slug', getWeddingBySlug);

// Protected routes
router.use(requireAuth);

router.post('/', createWedding);
router.get('/my', getMyWeddings);

// QR Auto-Join: authenticated user scans QR → instantly joins as guest
router.post('/slug/:slug/join', joinWeddingByQR);

// Member routes
router.get('/:weddingId', requireWeddingMember(), getWeddingById);
router.put('/:weddingId', requireAdmin, updateWedding);
router.get('/:weddingId/stats', requireAdmin, getWeddingStats);

export default router;
