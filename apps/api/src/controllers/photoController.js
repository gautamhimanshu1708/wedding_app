import { v4 as uuidv4 } from 'uuid';
import { Photo } from '../models/Photo.js';
import { Like } from '../models/Like.js';
import { PhotoReport } from '../models/PhotoReport.js';
import { WeddingEvent } from '../models/Event.js';
import { StorageService } from '../services/storage.js';
import { ImageProcessor } from '../services/imageProcessor.js';
import { broadcastToWedding } from '../sockets/socketHandler.js';
import {
  PHOTO_PROCESSING_STATUS,
  PHOTO_PUBLICATION_STATUS,
  SOCKET_EVENTS,
  reportPhotoSchema,
} from '@wedding/shared';

/**
 * Format photo document for client consumption (resolve URLs and user like state)
 */
async function formatPhotoForClient(photo, currentUserId) {
  const photoObj = photo.toObject ? photo.toObject() : photo;

  // Resolve URLs
  const [thumbnailUrl, displayUrl] = await Promise.all([
    StorageService.getObjectUrl(photoObj.thumbnailObjectKey),
    StorageService.getObjectUrl(photoObj.displayObjectKey),
  ]);

  let isLikedByMe = false;
  if (currentUserId) {
    const likeExists = await Like.exists({
      photoId: photoObj._id,
      userId: currentUserId,
    });
    isLikedByMe = Boolean(likeExists);
  }

  return {
    ...photoObj,
    thumbnailUrl,
    displayUrl,
    isLikedByMe,
  };
}

export async function getPhotos(req, res, next) {
  try {
    const weddingId = req.wedding._id;
    const {
      eventId,
      uploaderId,
      sort = 'newest',
      page = 1,
      limit = 20,
    } = req.query;

    const query = {
      weddingId,
      publicationStatus: PHOTO_PUBLICATION_STATUS.PUBLISHED,
    };

    if (eventId) {
      query.eventId = eventId;
    }
    if (uploaderId) {
      query.uploadedBy = uploaderId;
    }

    let sortOption = { createdAt: -1 }; // newest first
    if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'mostLiked') {
      sortOption = { likesCount: -1, createdAt: -1 };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [photos, totalCount] = await Promise.all([
      Photo.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(take)
        .populate('uploadedBy', 'name avatar')
        .populate('eventId', 'name')
        .lean(),
      Photo.countDocuments(query),
    ]);

    // Check likes for current user in bulk
    const photoIds = photos.map((p) => p._id);
    const userLikes = await Like.find({
      photoId: { $in: photoIds },
      userId: req.user._id,
    }).lean();
    const likedPhotoIdSet = new Set(userLikes.map((l) => l.photoId.toString()));

    const formattedPhotos = await Promise.all(
      photos.map(async (photo) => {
        const [thumbnailUrl, displayUrl] = await Promise.all([
          StorageService.getObjectUrl(photo.thumbnailObjectKey),
          StorageService.getObjectUrl(photo.displayObjectKey),
        ]);

        return {
          ...photo,
          thumbnailUrl,
          displayUrl,
          isLikedByMe: likedPhotoIdSet.has(photo._id.toString()),
        };
      })
    );

    res.json({
      success: true,
      data: {
        photos: formattedPhotos,
        pagination: {
          page: parseInt(page, 10),
          limit: take,
          totalCount,
          totalPages: Math.ceil(totalCount / take),
          hasMore: skip + photos.length < totalCount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadDirect(req, res, next) {
  try {
    const weddingId = req.wedding._id;
    const { eventId, caption = '' } = req.body;

    if (!req.file && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }

    // Check allowGuestUploads setting
    if (req.wedding.settings?.allowGuestUploads === false && req.membership?.role === 'guest') {
      return res.status(403).json({
        success: false,
        error: 'Guest photo uploads are currently disabled for this wedding.',
      });
    }

    const files = req.files || [req.file];
    const results = [];

    // Verify event exists for this wedding
    const targetEvent = await WeddingEvent.findOne({ _id: eventId, weddingId });
    if (!targetEvent) {
      return res.status(400).json({ success: false, error: 'Valid eventId is required for photo upload' });
    }

    for (const file of files) {
      try {
        // 1. Image processing with Sharp: stripping EXIF, auto-orient, creating display & thumb
        const processed = await ImageProcessor.processPhoto(file.buffer);

        const photoId = uuidv4();
        const shortId = photoId.slice(0, 8);
        const cleanName = (file.originalname || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
        const ceremonyName = targetEvent.name || 'Ceremonies';

        // Unique keys for each asset so Google Drive never receives duplicate filenames
        const originalKey = `weddings/${weddingId}/photos/${photoId}/Photo_${shortId}_${cleanName}`;
        const displayKey = `weddings/${weddingId}/photos/${photoId}/Display_${shortId}.webp`;
        const thumbKey = `weddings/${weddingId}/photos/${photoId}/Thumb_${shortId}.webp`;

        // 2. Persist to Cloudflare R2 / Google Drive / Local Storage
        await Promise.all([
          StorageService.putObject(originalKey, processed.originalBuffer, file.mimetype, req.wedding, ceremonyName),
          StorageService.putObject(displayKey, processed.displayBuffer, 'image/webp', req.wedding, ceremonyName),
          StorageService.putObject(thumbKey, processed.thumbnailBuffer, 'image/webp', req.wedding, ceremonyName),
        ]);

        // 3. Create Photo Record in MongoDB - Automatically Published!
        const photo = await Photo.create({
          weddingId,
          eventId: targetEvent._id,
          uploadedBy: req.user._id,
          originalObjectKey: originalKey,
          displayObjectKey: displayKey,
          thumbnailObjectKey: thumbKey,
          mimeType: 'image/webp',
          sizeBytes: processed.displayBuffer.length,
          width: processed.width,
          height: processed.height,
          caption: caption.trim(),
          processingStatus: PHOTO_PROCESSING_STATUS.COMPLETED,
          publicationStatus: PHOTO_PUBLICATION_STATUS.PUBLISHED,
          likesCount: 0,
        });

        // Populate details for client payload
        const populatedPhoto = await Photo.findById(photo._id)
          .populate('uploadedBy', 'name avatar')
          .populate('eventId', 'name');

        const clientPhoto = await formatPhotoForClient(populatedPhoto, req.user._id);

        // 4. Real-time broadcast to all guests in the wedding room!
        broadcastToWedding(weddingId.toString(), SOCKET_EVENTS.PHOTO_PUBLISHED, {
          photo: clientPhoto,
        });

        results.push(clientPhoto);
      } catch (fileErr) {
        console.error('[Upload File Error]', fileErr);
        results.push({
          error: fileErr.message,
          filename: file.originalname,
          success: false,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `${results.filter((r) => !r.error).length} photo(s) uploaded and published immediately.`,
      data: results,
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleLike(req, res, next) {
  try {
    const { photoId } = req.params;
    const weddingId = req.wedding._id;
    const userId = req.user._id;

    const photo = await Photo.findOne({ _id: photoId, weddingId });
    if (!photo) {
      return res.status(404).json({ success: false, error: 'Photo not found' });
    }

    const existingLike = await Like.findOne({ photoId, userId });

    let isLiked = false;
    if (existingLike) {
      // Unlike
      await Like.findByIdAndDelete(existingLike._id);
      photo.likesCount = Math.max(0, photo.likesCount - 1);
      await photo.save();
      isLiked = false;

      broadcastToWedding(weddingId.toString(), SOCKET_EVENTS.PHOTO_UNLIKED, {
        photoId,
        likesCount: photo.likesCount,
      });
    } else {
      // Like
      await Like.create({
        weddingId,
        photoId,
        userId,
      });
      photo.likesCount += 1;
      await photo.save();
      isLiked = true;

      broadcastToWedding(weddingId.toString(), SOCKET_EVENTS.PHOTO_LIKED, {
        photoId,
        likesCount: photo.likesCount,
        likedBy: req.user.name,
      });
    }

    res.json({
      success: true,
      data: {
        photoId,
        isLiked,
        likesCount: photo.likesCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function reportPhoto(req, res, next) {
  try {
    const { photoId } = req.params;
    const weddingId = req.wedding._id;
    const validated = reportPhotoSchema.parse(req.body);

    const photo = await Photo.findOne({ _id: photoId, weddingId });
    if (!photo) {
      return res.status(404).json({ success: false, error: 'Photo not found' });
    }

    await PhotoReport.create({
      weddingId,
      photoId,
      reportedBy: req.user._id,
      reason: validated.reason,
      details: validated.details || '',
      status: 'pending',
    });

    photo.reportsCount += 1;
    await photo.save();

    res.json({
      success: true,
      message: 'Photo report submitted. Wedding administrators have been notified.',
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyUploads(req, res, next) {
  try {
    const weddingId = req.wedding._id;
    const userId = req.user._id;

    const photos = await Photo.find({
      weddingId,
      uploadedBy: userId,
    })
      .sort({ createdAt: -1 })
      .populate('eventId', 'name')
      .lean();

    const formattedPhotos = await Promise.all(
      photos.map(async (photo) => {
        const [thumbnailUrl, displayUrl] = await Promise.all([
          StorageService.getObjectUrl(photo.thumbnailObjectKey),
          StorageService.getObjectUrl(photo.displayObjectKey),
        ]);

        return {
          ...photo,
          thumbnailUrl,
          displayUrl,
          isLikedByMe: false,
        };
      })
    );

    res.json({
      success: true,
      data: formattedPhotos,
    });
  } catch (err) {
    next(err);
  }
}
