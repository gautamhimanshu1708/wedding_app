import { createClerkClient } from '@clerk/backend';
import jwt from 'jsonwebtoken';
import { ENV } from './env.js';

export const clerkClient = ENV.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: ENV.CLERK_SECRET_KEY })
  : null;

/**
 * Verify a token (Clerk JWT or fallback platform JWT)
 */
export async function verifyToken(token) {
  if (!token) {
    throw new Error('No token provided');
  }

  // 1. If Clerk secret key is configured and token is a Clerk token
  if (clerkClient) {
    try {
      const decoded = await clerkClient.verifyToken(token);
      return {
        userId: decoded.sub,
        email: decoded.email || decoded.email_address || null,
        name: decoded.name || null,
        avatar: decoded.picture || null,
        isClerk: true,
      };
    } catch (clerkErr) {
      // Fall through to check if it's an internal signed token
    }
  }

  // 2. Fallback to platform JWT verification (used for dev/guest sessions)
  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET);
    return {
      userId: payload.userId || payload.sub,
      email: payload.email,
      name: payload.name,
      avatar: payload.avatar,
      isClerk: false,
    };
  } catch (jwtErr) {
    throw new Error('Invalid or expired authentication token');
  }
}

/**
 * Generate a platform test/guest token (useful for quick onboarding / dev)
 */
export function generateGuestToken(userData) {
  return jwt.sign(
    {
      userId: userData.clerkUserId || userData.id || `guest_${Date.now()}`,
      email: userData.email,
      name: userData.name || 'Royal Guest',
      avatar: userData.avatar,
    },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );
}
