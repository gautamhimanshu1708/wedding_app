import mongoose from 'mongoose';
import crypto from 'crypto';
import { isDbConnected } from '../config/db.js';
import { memoryStore, generateId, MemoryQuery, MemorySingleQuery } from './store.js';

const qrCodeSchema = new mongoose.Schema(
  {
    weddingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true, index: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'WeddingEvent', required: true, index: true },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => crypto.randomBytes(8).toString('hex'),
    },
    label: { type: String, required: true, trim: true, default: 'General QR' },
    isActive: { type: Boolean, default: true },
    scansCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// High-speed index for instant venue QR scanning
qrCodeSchema.index({ token: 1, isActive: 1 });
qrCodeSchema.index({ weddingId: 1, eventId: 1 });

const MongooseQRCode = mongoose.model('QRCode', qrCodeSchema);

// In-memory initialization if needed
if (!memoryStore.qrcodes) {
  memoryStore.qrcodes = [];
}

export const QRCode = {
  find(query = {}) {
    if (isDbConnected()) {
      return MongooseQRCode.find(query);
    }
    const filtered = (memoryStore.qrcodes || []).filter((qr) => {
      const wid = qr.weddingId?._id || qr.weddingId;
      const eid = qr.eventId?._id || qr.eventId;
      const targetWid = query.weddingId?._id || query.weddingId;
      const targetEid = query.eventId?._id || query.eventId;

      if (targetWid && wid?.toString() !== targetWid?.toString()) return false;
      if (targetEid && eid?.toString() !== targetEid?.toString()) return false;
      if (query.isActive !== undefined && qr.isActive !== query.isActive) return false;
      if (query._id && qr._id?.toString() !== query._id?.toString()) return false;
      if (query.token && qr.token !== query.token) return false;
      return true;
    });
    return new MemoryQuery(filtered);
  },

  findOne(query) {
    if (isDbConnected()) {
      return MongooseQRCode.findOne(query);
    }
    const found = (memoryStore.qrcodes || []).find((qr) => {
      const wid = qr.weddingId?._id || qr.weddingId;
      const eid = qr.eventId?._id || qr.eventId;
      const targetWid = query.weddingId?._id || query.weddingId;
      const targetEid = query.eventId?._id || query.eventId;

      if (targetWid && wid?.toString() !== targetWid?.toString()) return false;
      if (targetEid && eid?.toString() !== targetEid?.toString()) return false;
      if (query.token && qr.token === query.token) return true;
      if (query._id && qr._id?.toString() === query._id?.toString()) return true;
      return false;
    });
    return new MemorySingleQuery(found);
  },

  findById(id) {
    if (isDbConnected()) {
      return MongooseQRCode.findById(id);
    }
    const found = (memoryStore.qrcodes || []).find((qr) => qr._id === id || qr._id === id?.toString());
    return new MemorySingleQuery(found);
  },

  async create(data) {
    if (isDbConnected()) {
      return MongooseQRCode.create(data);
    }
    const doc = {
      _id: generateId(),
      weddingId: data.weddingId?._id || data.weddingId,
      eventId: data.eventId?._id || data.eventId,
      token: data.token || crypto.randomBytes(8).toString('hex'),
      label: data.label || 'General QR',
      isActive: data.isActive !== undefined ? data.isActive : true,
      scansCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: async function () {
        const idx = (memoryStore.qrcodes || []).findIndex((q) => q._id === this._id);
        if (idx !== -1) memoryStore.qrcodes[idx] = this;
        return this;
      },
      toObject: function () {
        return { ...this };
      },
    };
    if (!memoryStore.qrcodes) memoryStore.qrcodes = [];
    memoryStore.qrcodes.push(doc);
    return doc;
  },

  async findOneAndDelete(query) {
    if (isDbConnected()) {
      return MongooseQRCode.findOneAndDelete(query);
    }
    const idx = (memoryStore.qrcodes || []).findIndex((q) => {
      if (query._id && q._id?.toString() === query._id?.toString()) return true;
      return false;
    });
    if (idx !== -1) {
      return memoryStore.qrcodes.splice(idx, 1)[0];
    }
    return null;
  },
};
