import { Wedding } from '../models/Wedding.js';
import { Membership } from '../models/Membership.js';
import { WeddingEvent } from '../models/Event.js';
import { Photo } from '../models/Photo.js';
import { ROLES, DEFAULT_EVENTS, createWeddingSchema, updateWeddingSchema } from '@wedding/shared';

export async function createWedding(req, res, next) {
  try {
    const validated = createWeddingSchema.parse(req.body);

    const existing = await Wedding.findOne({ slug: validated.slug });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Wedding with slug '${validated.slug}' already exists. Please choose another link name.`,
      });
    }

    const wedding = await Wedding.create({
      ...validated,
      ownerId: req.user._id,
    });

    await Membership.create({
      weddingId: wedding._id,
      userId: req.user._id,
      role: ROLES.OWNER,
      status: 'active',
    });

    const eventDocs = DEFAULT_EVENTS.map((e, index) => {
      const eventDate = new Date(wedding.weddingDate);
      eventDate.setDate(eventDate.getDate() - (DEFAULT_EVENTS.length - 1 - index));
      return {
        weddingId: wedding._id,
        name: e.name,
        description: e.description,
        date: eventDate,
        status: index === 3 ? 'live' : 'upcoming',
      };
    });
    await WeddingEvent.insertMany(eventDocs);

    res.status(201).json({ success: true, data: wedding });
  } catch (err) {
    next(err);
  }
}

export async function getMyWeddings(req, res, next) {
  try {
    const memberships = await Membership.find({ userId: req.user._id, status: 'active' })
      .populate('weddingId')
      .lean();

    const weddings = memberships
      .filter((m) => m.weddingId)
      .map((m) => ({
        ...m.weddingId,
        userRole: m.role,
        joinedAt: m.joinedAt,
      }));

    res.json({ success: true, data: weddings });
  } catch (err) {
    next(err);
  }
}

export async function getWeddingBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const wedding = await Wedding.findOne({ slug: slug.toLowerCase() }).lean();

    if (!wedding) {
      return res.status(404).json({ success: false, error: 'Wedding not found' });
    }

    res.json({
      success: true,
      data: {
        _id: wedding._id,
        id: wedding._id,
        title: wedding.title,
        slug: wedding.slug,
        coupleNames: wedding.coupleNames,
        weddingDate: wedding.weddingDate,
        venue: wedding.venue,
        coverImage: wedding.coverImage,
        welcomeMessage: wedding.welcomeMessage,
        theme: wedding.theme,
        status: wedding.status,
        settings: {
          allowPublicQR: wedding.settings?.allowPublicQR !== false, // default true
          allowGuestUploads: wedding.settings?.allowGuestUploads !== false,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /weddings/slug/:slug/join
 * Open QR join — any authenticated user can join as Guest if allowPublicQR is true.
 * No admin approval required. Idempotent — returns existing membership if already joined.
 */
export async function joinWeddingByQR(req, res, next) {
  try {
    const { slug } = req.params;
    const wedding = await Wedding.findOne({ slug: slug.toLowerCase() });

    if (!wedding) {
      return res.status(404).json({ success: false, error: 'Wedding not found' });
    }

    if (wedding.status !== 'active') {
      return res.status(403).json({ success: false, error: 'This wedding is no longer active.' });
    }

    // Check if public QR joining is allowed (default: true)
    const allowPublicQR = wedding.settings?.allowPublicQR !== false;
    if (!allowPublicQR) {
      return res.status(403).json({
        success: false,
        error: 'This wedding requires a personal invitation. Public QR joining is disabled.',
      });
    }

    // Idempotent: find or create membership
    let membership = await Membership.findOne({
      weddingId: wedding._id,
      userId: req.user._id,
    });

    let isNewMember = false;
    if (!membership) {
      membership = await Membership.create({
        weddingId: wedding._id,
        userId: req.user._id,
        role: ROLES.GUEST, // Never elevate via QR
        status: 'active',
        joinedViaQR: true,
      });
      isNewMember = true;
    } else if (membership.status === 'blocked') {
      return res.status(403).json({ success: false, error: 'Your access to this wedding has been revoked.' });
    }

    // Build wedding response
    const weddingData = {
      _id: wedding._id,
      id: wedding._id,
      title: wedding.title,
      slug: wedding.slug,
      coupleNames: wedding.coupleNames,
      weddingDate: wedding.weddingDate,
      venue: wedding.venue,
      welcomeMessage: wedding.welcomeMessage,
      theme: wedding.theme,
      status: wedding.status,
      userRole: membership.role,
      settings: {
        allowGuestUploads: wedding.settings?.allowGuestUploads !== false,
        allowPublicQR: true,
      },
    };

    res.json({
      success: true,
      data: {
        wedding: weddingData,
        membership: {
          role: membership.role,
          status: membership.status,
          joinedAt: membership.joinedAt,
        },
        isNewMember,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getWeddingById(req, res, next) {
  try {
    res.json({
      success: true,
      data: {
        ...req.wedding.toObject(),
        currentUserRole: req.membership.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateWedding(req, res, next) {
  try {
    const wedding = req.wedding;
    const { title, venue, welcomeMessage, settings } = req.body;

    if (title !== undefined) wedding.title = title;
    if (venue !== undefined) wedding.venue = venue;
    if (welcomeMessage !== undefined) wedding.welcomeMessage = welcomeMessage;

    // Merge settings safely — owner can toggle QR, uploads, etc.
    if (settings && typeof settings === 'object') {
      wedding.settings = {
        ...(wedding.settings || {}),
        ...settings,
        // These defaults cannot be turned off via regular update (must be explicit)
        allowGuestUploads: settings.allowGuestUploads !== undefined
          ? Boolean(settings.allowGuestUploads)
          : (wedding.settings?.allowGuestUploads !== false),
        allowPublicQR: settings.allowPublicQR !== undefined
          ? Boolean(settings.allowPublicQR)
          : (wedding.settings?.allowPublicQR !== false),
        maxPhotosPerGuest: settings.maxPhotosPerGuest || wedding.settings?.maxPhotosPerGuest || 200,
      };
    }

    await wedding.save();

    res.json({ success: true, data: wedding });
  } catch (err) {
    next(err);
  }
}

export async function getWeddingStats(req, res, next) {
  try {
    const weddingId = req.wedding._id;

    const [totalGuests, totalPhotos, eventStats] = await Promise.all([
      Membership.countDocuments({ weddingId, status: 'active' }),
      Photo.countDocuments({ weddingId, publicationStatus: 'published' }),
      Photo.aggregate([
        { $match: { weddingId, publicationStatus: 'published' } },
        { $group: { _id: '$eventId', count: { $sum: 1 }, totalBytes: { $sum: '$sizeBytes' } } },
      ]),
    ]);

    const events = await WeddingEvent.find({ weddingId }).lean();
    const eventMap = new Map(events.map((e) => [e._id.toString(), e.name]));

    const formattedEventStats = eventStats.map((item) => ({
      eventId: item._id,
      name: eventMap.get(item._id?.toString()) || 'General',
      count: item.count,
      totalBytes: item.totalBytes,
    }));

    const totalStorageBytes = eventStats.reduce((acc, curr) => acc + (curr.totalBytes || 0), 0);

    res.json({
      success: true,
      data: {
        totalGuests,
        totalPhotos,
        totalStorageBytes,
        storageFormatted: `${(totalStorageBytes / (1024 * 1024)).toFixed(2)} MB`,
        photosByEvent: formattedEventStats,
      },
    });
  } catch (err) {
    next(err);
  }
}
