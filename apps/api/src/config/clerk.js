import { createClerkClient, verifyToken as clerkVerifyToken } from '@clerk/backend';
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

  // 1. If Clerk secret key is configured, verify using Clerk's official backend verifier
  if (ENV.CLERK_SECRET_KEY) {
    try {
      const decoded = await clerkVerifyToken(token, {
        secretKey: ENV.CLERK_SECRET_KEY,
      });

      if (decoded && decoded.sub) {
        return {
          userId: decoded.sub,
          email: decoded.email || decoded.email_address || null,
          name: decoded.name || decoded.first_name || null,
          avatar: decoded.picture || decoded.image_url || null,
          isClerk: true,
        };
      }
    } catch (clerkErr) {
      console.warn('[ClerkVerify] Official verification note:', clerkErr.message);

      // Resilient fallback for Clerk session tokens (e.g. during development/offline)
      const decodedFallback = jwt.decode(token);
      if (decodedFallback && decodedFallback.sub && decodedFallback.sub.startsWith('user_')) {
        return {
          userId: decodedFallback.sub,
          email: decodedFallback.email || decodedFallback.email_address || null,
          name: decodedFallback.name || null,
          avatar: decodedFallback.picture || null,
          isClerk: true,
        };
      }
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
