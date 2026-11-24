import mongoose from 'mongoose';
import { Membership } from '../models/Membership.js';
import { Wedding } from '../models/Wedding.js';
import { hasRolePermission, ROLES } from '@wedding/shared';

/**
 * Middleware that ensures the authenticated user is an active member of the wedding.
 * Attaches req.wedding and req.membership to req.
 */
export function requireWeddingMember(minRole = ROLES.GUEST) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Extract wedding identifier from params or query
      const weddingId = req.params.weddingId || req.params.id || req.body.weddingId;
      if (!weddingId) {
        return res.status(400).json({ success: false, error: 'Wedding identifier missing from request' });
      }

      // Find wedding by _id or slug safely
      let wedding = null;
      if (mongoose.Types.ObjectId.isValid(weddingId)) {
        try {
          wedding = await Wedding.findById(weddingId);
        } catch (e) {
          wedding = null;
        }
      }
      if (!wedding) {
        wedding = await Wedding.findOne({ slug: weddingId.toString().toLowerCase() });
      }
      if (!wedding) {
        // Fallback check memoryStore or default
        wedding = await Wedding.findById(weddingId);
      }
      if (!wedding) {
        return res.status(404).json({ success: false, error: 'Wedding not found' });
      }

      // Check if user is an active member or auto-join as guest for open wedding
      let membership = await Membership.findOne({
        weddingId: wedding._id,
        userId: req.user._id,
      });

      // Check if user is the designated owner of this wedding
      const isOwnerUser = Boolean(
        wedding.ownerId && (
          wedding.ownerId.toString() === req.user._id.toString() ||
          wedding.ownerId.toString() === req.user.clerkUserId?.toString()
        )
      );

      if (!membership) {
        membership = await Membership.create({
          weddingId: wedding._id,
          userId: req.user._id,
          role: isOwnerUser ? ROLES.OWNER : ROLES.GUEST,
          status: 'active',
        });
      } else if (isOwnerUser && membership.role !== ROLES.OWNER && membership.role !== ROLES.ADMIN) {
        membership.role = ROLES.OWNER;
        await membership.save();
      }

      // Check if user has sufficient role level
      if (minRole && !hasRolePermission(membership.role, minRole)) {
        return res.status(403).json({
          success: false,
          error: `Insufficient permissions. Required role: ${minRole}, your role: ${membership.role}`,
          code: 'FORBIDDEN_ROLE',
        });
      }

      req.wedding = wedding;
      req.membership = membership;
      next();
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

export const requireAdmin = requireWeddingMember(ROLES.ADMIN);
export const requireOwner = requireWeddingMember(ROLES.OWNER);
export const requireEventManager = requireWeddingMember(ROLES.EVENT_MANAGER);
