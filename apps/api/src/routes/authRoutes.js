import { Router } from 'express';
import { getMe, syncUser, devGuestLogin, clerkSync } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/me', requireAuth, getMe);
router.post('/sync', requireAuth, syncUser);
router.post('/clerk-sync', requireAuth, clerkSync);  // Called after Clerk sign-in
router.post('/guest-demo-login', devGuestLogin);

export default router;
