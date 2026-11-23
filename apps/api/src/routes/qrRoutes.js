import { Router } from 'express';
import {
  getEventQRCodes,
  createEventQRCode,
  toggleQRCodeStatus,
  deleteQRCode,
  verifyScannedQR,
} from '../controllers/qrController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireEventManager } from '../middleware/membership.js';

const router = Router();

// Public QR verification endpoint (scanned via camera or link)
router.get('/verify/:token', verifyScannedQR);

// Protected Admin / Event Manager QR management endpoints
router.get('/weddings/:weddingId/events/:eventId/qrcodes', requireAuth, requireEventManager, getEventQRCodes);
router.post('/weddings/:weddingId/events/:eventId/qrcodes', requireAuth, requireEventManager, createEventQRCode);
router.patch('/weddings/:weddingId/events/:eventId/qrcodes/:qrId/toggle', requireAuth, requireEventManager, toggleQRCodeStatus);
router.delete('/weddings/:weddingId/events/:eventId/qrcodes/:qrId', requireAuth, requireEventManager, deleteQRCode);

export default router;
