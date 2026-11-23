import { Server } from 'socket.io';
import { verifyToken } from '../config/clerk.js';
import { Membership } from '../models/Membership.js';
import { User } from '../models/User.js';
import { SOCKET_EVENTS } from '@wedding/shared';

let ioInstance = null;

export function setupSocketIO(httpServer, clientUrl) {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Seamlessly allow client URL, Vercel deployments, and local dev
        callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  ioInstance = io;

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const payload = await verifyToken(token);
      let user = await User.findOne({ clerkUserId: payload.userId });
      if (!user) {
        user = await User.create({
          clerkUserId: payload.userId,
          name: payload.name || 'Royal Guest',
          email: payload.email || '',
          avatar: payload.avatar || '',
        });
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Socket authentication failed: ' + err.message));
    }
  });

  io.on('connection', (socket) => {
    // Join wedding room with strict membership verification
    socket.on(SOCKET_EVENTS.JOIN_WEDDING, async ({ weddingId }) => {
      try {
        if (!weddingId || !socket.user) return;

        // Verify that the user has an active membership in this wedding
        const membership = await Membership.findOne({
          weddingId,
          userId: socket.user._id,
          status: 'active',
        });

        if (!membership) {
          socket.emit('error', { message: 'Unauthorized: You are not a member of this wedding.' });
          return;
        }

        const room = `wedding:${weddingId}`;
        socket.join(room);
        socket.currentWeddingId = weddingId;

        // Notify presence
        socket.to(room).emit(SOCKET_EVENTS.GUEST_JOINED, {
          userId: socket.user._id,
          name: socket.user.name,
          joinedAt: new Date(),
        });
      } catch (err) {
        console.error('[Socket Join Error]', err);
      }
    });

    socket.on(SOCKET_EVENTS.LEAVE_WEDDING, ({ weddingId }) => {
      if (weddingId) {
        socket.leave(`wedding:${weddingId}`);
      }
    });

    socket.on('disconnect', () => {
      // Cleanup
    });
  });

  return io;
}

/**
 * Emit an event to all authorized guests inside a specific wedding room
 */
export function broadcastToWedding(weddingId, eventName, payload) {
  if (ioInstance && weddingId) {
    ioInstance.to(`wedding:${weddingId}`).emit(eventName, payload);
  }
}

export function getIO() {
  return ioInstance;
}
