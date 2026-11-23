import { Router } from 'express';
import multer from 'multer';
import {
  getPhotos,
  uploadDirect,
  toggleLike,
  reportPhoto,
  getMyUploads,
} from '../controllers/photoController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWeddingMember } from '../middleware/membership.js';
import { MAX_UPLOAD_FILE_SIZE_BYTES } from '@wedding/shared';

const router = Router();

// Configure Multer for in-memory buffer handling prior to Sharp processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_FILE_SIZE_BYTES, // 25MB per file
    files: 10, // up to 10 photos per batch upload
  },
});

router.use(requireAuth);

// Photo feed & current user uploads
router.get('/:weddingId/photos', requireWeddingMember(), getPhotos);
router.get('/:weddingId/photos/my', requireWeddingMember(), getMyUploads);

// Direct photo upload with automatic Sharp optimization and publishing
router.post(
  '/:weddingId/photos/upload',
  requireWeddingMember(),
  upload.array('photos', 10),
  uploadDirect
);

// Photo interactions (Likes & Moderation reports)
router.post('/:weddingId/photos/:photoId/like', requireWeddingMember(), toggleLike);
router.post('/:weddingId/photos/:photoId/report', requireWeddingMember(), reportPhoto);

export default router;
