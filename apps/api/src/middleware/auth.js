import { verifyToken } from '../config/clerk.js';
import { User } from '../models/User.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Missing or malformed Authorization header.',
      });
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token);

    // Find or synchronize the user record in database
    let user = await User.findOne({ clerkUserId: payload.userId });
    if (!user) {
      user = await User.create({
        clerkUserId: payload.userId,
        name: payload.name || 'Royal Guest',
        email: payload.email || '',
        avatar: payload.avatar || '',
      });
    } else if (payload.name && user.name !== payload.name) {
      user.name = payload.name;
      if (payload.avatar) user.avatar = payload.avatar;
      await user.save();
    }

    req.user = user;
    req.auth = payload;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired credentials: ' + err.message,
    });
  }
}

/**
 * Optional authentication middleware: if token is present, sets req.user; otherwise continues.
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = await verifyToken(token);
      const user = await User.findOne({ clerkUserId: payload.userId });
      if (user) {
        req.user = user;
        req.auth = payload;
      }
    }
  } catch (err) {
    // Ignore error for optional auth
  }
  next();
}
