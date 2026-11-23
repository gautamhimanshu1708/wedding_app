import { Router } from 'express';
import authRoutes from './authRoutes.js';
import weddingRoutes from './weddingRoutes.js';
import eventRoutes from './eventRoutes.js';
import invitationRoutes from './invitationRoutes.js';
import photoRoutes from './photoRoutes.js';
import moderationRoutes from './moderationRoutes.js';
import guestMessageRoutes from './guestMessageRoutes.js';

const apiRouter = Router();

// Versioned routes under /api/v1
apiRouter.use('/auth', authRoutes);
apiRouter.use('/weddings', weddingRoutes);
apiRouter.use('/weddings', eventRoutes);
apiRouter.use('/weddings', photoRoutes);
apiRouter.use('/weddings', moderationRoutes);
apiRouter.use('/weddings', guestMessageRoutes);
apiRouter.use('/invitations', invitationRoutes);

export default apiRouter;
