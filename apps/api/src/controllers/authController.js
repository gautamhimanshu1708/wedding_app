import { generateGuestToken } from '../config/clerk.js';
import { clerkClient } from '../config/clerk.js';
import { User } from '../models/User.js';
import { Membership } from '../models/Membership.js';

export async function getMe(req, res, next) {
  try {
    const user = req.user;
    const memberships = await Membership.find({ userId: user._id, status: 'active' })
      .populate('weddingId', 'title slug coupleNames weddingDate venue coverImage status')
      .lean();

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          clerkUserId: user.clerkUserId,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
        memberships,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function syncUser(req, res, next) {
  try {
    const { name, email, avatar } = req.body;
    const user = req.user;

    if (name) user.name = name;
    if (email) user.email = email;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Clerk session sync — called after Clerk sign-in to upsert user in our DB.
 * Requires a valid Clerk token (passed via Authorization header).
 */
export async function clerkSync(req, res, next) {
  try {
    const user = req.user; // Set by requireAuth middleware after Clerk JWT verification

    // Pull fresh profile data from Clerk if available
    if (clerkClient && user.clerkUserId && !user.clerkUserId.startsWith('guest_')) {
      try {
        const clerkUser = await clerkClient.users.getUser(user.clerkUserId);
        const primaryEmail = clerkUser.emailAddresses?.find(
          (e) => e.id === clerkUser.primaryEmailAddressId
        );
        if (primaryEmail) user.email = primaryEmail.emailAddress;
        if (clerkUser.firstName || clerkUser.lastName) {
          user.name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ');
        }
        if (clerkUser.imageUrl) user.avatar = clerkUser.imageUrl;
        await user.save();
      } catch (clerkErr) {
        console.warn('[clerkSync] Could not fetch Clerk profile:', clerkErr.message);
      }
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          clerkUserId: user.clerkUserId,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Dev/Demo guest login helper for frictionless testing and QR scan demonstration
 */
export async function devGuestLogin(req, res, next) {
  try {
    const { name = 'Royal Guest', email } = req.body;
    let user;

    if (email) {
      user = await User.findOne({ email });
    }

    if (!user) {
      const guestId = `guest_${Math.random().toString(36).substring(2, 10)}`;
      const guestEmail = email || `${guestId}@royalwedding.local`;

      user = await User.create({
        clerkUserId: guestId,
        name,
        email: guestEmail,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=681D32,C5A15B`,
      });
    }

    const token = generateGuestToken(user);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          clerkUserId: user.clerkUserId,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
