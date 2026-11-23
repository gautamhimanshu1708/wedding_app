import crypto from 'crypto';
import { Invitation } from '../models/Invitation.js';
import { Membership } from '../models/Membership.js';
import { Wedding } from '../models/Wedding.js';
import { WeddingEvent } from '../models/Event.js';
import { createInvitationSchema, ROLES } from '@wedding/shared';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createInvitation(req, res, next) {
  try {
    const validated = createInvitationSchema.parse(req.body);
    const { eventId } = req.body;

    // Check optional event if provided
    if (eventId) {
      const eventExists = await WeddingEvent.findOne({ _id: eventId, weddingId: req.wedding._id });
      if (!eventExists) {
        return res.status(404).json({ success: false, error: 'Specified event not found in this wedding' });
      }
    }

    // Generate 32-byte cryptographic random secret token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (validated.expiresInDays || 30));

    const invitation = await Invitation.create({
      weddingId: req.wedding._id,
      tokenHash,
      role: validated.role || ROLES.GUEST,
      eventId: eventId || null,
      expiresAt,
      maxUses: validated.maxUses || 500,
      usedCount: 0,
      status: 'active',
    });

    res.status(201).json({
      success: true,
      data: {
        id: invitation._id,
        rawToken, // Provided ONCE to the creator to embed in QR / URL
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        eventId: invitation.eventId,
        weddingSlug: req.wedding.slug,
        inviteUrl: `/invite/${rawToken}`,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function validateInvitation(req, res, next) {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Invitation token is required' });
    }

    const tokenHash = hashToken(token);
    const invitation = await Invitation.findOne({ tokenHash, status: 'active' })
      .populate('weddingId', 'title slug coupleNames weddingDate venue coverImage welcomeMessage status')
      .populate('eventId', 'name date coverImage');

    if (!invitation) {
      return res.status(404).json({ success: false, error: 'Invalid or revoked invitation' });
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'expired';
      await invitation.save();
      return res.status(410).json({ success: false, error: 'This wedding invitation has expired' });
    }

    if (invitation.usedCount >= invitation.maxUses) {
      return res.status(410).json({ success: false, error: 'This invitation has reached its maximum usage limit' });
    }

    res.json({
      success: true,
      data: {
        wedding: invitation.weddingId,
        event: invitation.eventId,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function acceptInvitation(req, res, next) {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const tokenHash = hashToken(token);
    const invitation = await Invitation.findOne({ tokenHash, status: 'active' });

    if (!invitation) {
      return res.status(404).json({ success: false, error: 'Invalid or revoked invitation' });
    }

    if (new Date() > invitation.expiresAt) {
      return res.status(410).json({ success: false, error: 'Invitation expired' });
    }

    // Check or create membership
    let membership = await Membership.findOne({
      weddingId: invitation.weddingId,
      userId: req.user._id,
    });

    if (membership) {
      if (membership.status === 'blocked') {
        return res.status(403).json({ success: false, error: 'Your access to this wedding has been restricted.' });
      }
      // If already active, return existing membership
    } else {
      membership = await Membership.create({
        weddingId: invitation.weddingId,
        userId: req.user._id,
        role: invitation.role || ROLES.GUEST,
        status: 'active',
      });

      // Increment invitation usage
      invitation.usedCount += 1;
      await invitation.save();
    }

    const wedding = await Wedding.findById(invitation.weddingId);

    res.json({
      success: true,
      message: 'Successfully joined wedding',
      data: {
        weddingId: invitation.weddingId,
        weddingSlug: wedding.slug,
        eventId: invitation.eventId,
        role: membership.role,
      },
    });
  } catch (err) {
    next(err);
  }
}
