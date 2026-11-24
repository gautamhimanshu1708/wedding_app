import mongoose from 'mongoose';
import { isDbConnected } from '../config/db.js';
import { memoryStore, generateId, MemoryQuery, MemorySingleQuery } from './store.js';
import { PHOTO_PROCESSING_STATUS, PHOTO_PUBLICATION_STATUS } from '@wedding/shared';

const photoSchema = new mongoose.Schema(
  {
    weddingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'WeddingEvent', required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalObjectKey: { type: String, required: true },
    thumbnailObjectKey: { type: String, required: true },
    displayObjectKey: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    caption: { type: String, default: '' },
    processingStatus: { type: String, default: PHOTO_PROCESSING_STATUS.COMPLETED },
    publicationStatus: { type: String, default: PHOTO_PUBLICATION_STATUS.PUBLISHED },
    likesCount: { type: Number, default: 0 },
    reportsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// High-speed compound indexes for live feed and ceremony galleries
photoSchema.index({ weddingId: 1, publicationStatus: 1, createdAt: -1 });
photoSchema.index({ weddingId: 1, eventId: 1, publicationStatus: 1, createdAt: -1 });

const MongoosePhoto = mongoose.model('Photo', photoSchema);

export const Photo = {
  find(query = {}) {
    if (isDbConnected()) {
      return MongoosePhoto.find(query);
    }
    const filtered = memoryStore.photos.filter((p) => {
      const wid = p.weddingId?._id || p.weddingId;
      const targetWid = query.weddingId?._id || query.weddingId;
      if (targetWid && wid?.toString() !== targetWid?.toString()) return false;

      if (query.publicationStatus && p.publicationStatus !== query.publicationStatus) return false;

      if (query.eventId) {
        const eid = p.eventId?._id || p.eventId;
        const targetEid = query.eventId?._id || query.eventId;
        if (eid?.toString() !== targetEid?.toString()) return false;
      }

      if (query.uploadedBy) {
        const uid = p.uploadedBy?._id || p.uploadedBy;
        const targetUid = query.uploadedBy?._id || query.uploadedBy;
        if (uid?.toString() !== targetUid?.toString()) return false;
      }

      return true;
    });
    return new MemoryQuery(filtered);
  },

  findOne(query) {
    if (isDbConnected()) {
      return MongoosePhoto.findOne(query);
    }
    const found = memoryStore.photos.find((p) => {
      if (query._id && p._id?.toString() !== query._id?.toString()) return false;
      const wid = p.weddingId?._id || p.weddingId;
      const targetWid = query.weddingId?._id || query.weddingId;
      if (targetWid && wid?.toString() !== targetWid?.toString()) return false;
      return true;
    });
    return new MemorySingleQuery(found);
  },

  findById(id) {
    if (isDbConnected()) {
      return MongoosePhoto.findById(id);
    }
    const found = memoryStore.photos.find((p) => p._id?.toString() === id?.toString());
    return new MemorySingleQuery(found);
  },

  async countDocuments(query = {}) {
    if (isDbConnected()) {
      return MongoosePhoto.countDocuments(query);
    }
    const items = await this.find(query);
    return items.length;
  },

  async aggregate(pipeline = []) {
    if (isDbConnected()) {
      return MongoosePhoto.aggregate(pipeline);
    }
    // Simple group by eventId aggregation for dashboard stats
    const counts = {};
    const bytes = {};
    memoryStore.photos.forEach((p) => {
      if (p.publicationStatus === PHOTO_PUBLICATION_STATUS.PUBLISHED) {
        const eid = p.eventId?._id?.toString() || p.eventId?.toString() || 'other';
        counts[eid] = (counts[eid] || 0) + 1;
        bytes[eid] = (bytes[eid] || 0) + (p.sizeBytes || 0);
      }
    });
    return Object.keys(counts).map((eid) => ({
      _id: eid,
      count: counts[eid],
      totalBytes: bytes[eid],
    }));
  },

  async create(data) {
    if (isDbConnected()) {
      return MongoosePhoto.create(data);
    }
    const doc = {
      _id: generateId(),
      weddingId: data.weddingId?._id || data.weddingId,
      eventId: data.eventId?._id || data.eventId,
      uploadedBy: data.uploadedBy?._id || data.uploadedBy,
      originalObjectKey: data.originalObjectKey,
      thumbnailObjectKey: data.thumbnailObjectKey,
      displayObjectKey: data.displayObjectKey,
      mimeType: data.mimeType || 'image/webp',
      sizeBytes: data.sizeBytes || 0,
      width: data.width || 0,
      height: data.height || 0,
      caption: data.caption || '',
      processingStatus: data.processingStatus || PHOTO_PROCESSING_STATUS.COMPLETED,
      publicationStatus: data.publicationStatus || PHOTO_PUBLICATION_STATUS.PUBLISHED,
      likesCount: data.likesCount || 0,
      reportsCount: data.reportsCount || 0,
      createdAt: new Date(),
      save: async function () {
        const idx = memoryStore.photos.findIndex((p) => p._id === this._id);
        if (idx !== -1) memoryStore.photos[idx] = this;
        return this;
      },
      toObject: function () {
        return { ...this };
      },
    };
    memoryStore.photos.unshift(doc);
    return doc;
  },
};
