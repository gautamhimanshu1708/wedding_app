import { PhotoReport } from '../models/PhotoReport.js';
import { Photo } from '../models/Photo.js';
import { Membership } from '../models/Membership.js';
import { StorageService } from '../services/storage.js';
import { broadcastToWedding } from '../sockets/socketHandler.js';
import { PHOTO_PUBLICATION_STATUS, SOCKET_EVENTS, ROLES } from '@wedding/shared';

export async function getReports(req, res, next) {
  try {
    const weddingId = req.wedding._id;

    const reports = await PhotoReport.find({ weddingId })
      .sort({ createdAt: -1 })
      .populate('photoId')
      .populate('reportedBy', 'name email avatar')
      .lean();

    const formattedReports = await Promise.all(
      reports.map(async (r) => {
        let photoData = null;
        if (r.photoId) {
          const [thumbUrl, displayUrl] = await Promise.all([
            StorageService.getObjectUrl(r.photoId.thumbnailObjectKey),
            StorageService.getObjectUrl(r.photoId.displayObjectKey),
          ]);
          photoData = {
            ...r.photoId,
            thumbnailUrl: thumbUrl,
            displayUrl: displayUrl,
          };
        }
        return {
          ...r,
          photo: photoData,
        };
      })
    );

    res.json({
      success: true,
      data: formattedReports,
    });
  } catch (err) {
    next(err);
  }
}

export async function updatePhotoStatus(req, res, next) {
  try {
    const { photoId } = req.params;
    const { status } = req.body; // 'published', 'hidden', 'quarantined', 'deleted'
    const weddingId = req.wedding._id;

    if (!Object.values(PHOTO_PUBLICATION_STATUS).includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid publication status' });
    }

    const photo = await Photo.findOne({ _id: photoId, weddingId });
    if (!photo) {
      return res.status(404).json({ success: false, error: 'Photo not found' });
    }

    photo.publicationStatus = status;
    await photo.save();

    // If hidden or deleted, broadcast removal to the live room immediately
    if (status === PHOTO_PUBLICATION_STATUS.HIDDEN || status === PHOTO_PUBLICATION_STATUS.DELETED) {
      broadcastToWedding(weddingId.toString(), SOCKET_EVENTS.PHOTO_REMOVED, {
        photoId,
      });
    }

    res.json({
      success: true,
      message: `Photo status updated to ${status}`,
      data: photo,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMembers(req, res, next) {
  try {
    const weddingId = req.wedding._id;

    const members = await Membership.find({ weddingId })
      .sort({ joinedAt: -1 })
      .populate('userId', 'name email avatar createdAt')
      .lean();

    res.json({
      success: true,
      data: members.map((m) => ({
        id: m._id,
        user: m.userId,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateMember(req, res, next) {
  try {
    const { memberId } = req.params;
    const { role, status } = req.body;
    const weddingId = req.wedding._id;

    const membership = await Membership.findOne({ _id: memberId, weddingId });
    if (!membership) {
      return res.status(404).json({ success: false, error: 'Member record not found' });
    }

    // Protect wedding owner from role demotion by others
    if (membership.role === ROLES.OWNER && role && role !== ROLES.OWNER) {
      return res.status(403).json({ success: false, error: 'Cannot demote the wedding owner' });
    }

    if (role && Object.values(ROLES).includes(role)) {
      membership.role = role;
    }
    if (status && ['active', 'blocked'].includes(status)) {
      membership.status = status;
    }

    await membership.save();

    res.json({
      success: true,
      data: membership,
    });
  } catch (err) {
    next(err);
  }
}
