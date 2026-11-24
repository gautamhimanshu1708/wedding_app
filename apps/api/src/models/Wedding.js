import mongoose from 'mongoose';
import { isDbConnected } from '../config/db.js';
import { memoryStore, generateId, MemorySingleQuery } from './store.js';

const weddingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: null },
    coupleNames: {
      partner1: { type: String, required: true },
      partner2: { type: String, required: true },
    },
    weddingDate: { type: Date, required: true },
    venue: { type: String, required: true },
    coverImage: { type: String, default: '' },
    welcomeMessage: { type: String, default: '' },
    theme: {
      primary: { type: String, default: '#681D32' },
      secondary: { type: String, default: '#C5A15B' },
      background: { type: String, default: '#F7F0E4' },
      font: { type: String, default: 'Playfair Display' },
    },
    settings: {
      allowGuestUploads: { type: Boolean, default: true },
      allowPublicQR: { type: Boolean, default: true },      // Anyone with QR can join
      enableRealtime: { type: Boolean, default: true },      // Live Socket.IO gallery
      maxPhotosPerGuest: { type: Number, default: 200 },
      isPrivate: { type: Boolean, default: false },
    },
    driveConfig: {
      folderId: { type: String, default: '' },
      clientEmail: { type: String, default: '' },
      privateKey: { type: String, default: '' },
      isConnected: { type: Boolean, default: false },
      connectedAt: { type: Date },
      storageMode: { type: String, enum: ['local', 'google_drive'], default: 'local' },
    },
    status: { type: String, enum: ['active', 'archived', 'draft'], default: 'active' },
    adminPin: { type: String, default: '1211', trim: true },
  },
  { timestamps: true }
);

const MongooseWedding = mongoose.model('Wedding', weddingSchema);

export const Wedding = {
  findOne(query) {
    if (isDbConnected()) {
      return MongooseWedding.findOne(query);
    }
    const found = memoryStore.weddings.find((w) => {
      if (query.slug && w.slug.toLowerCase() === query.slug.toLowerCase()) return true;
      if (query._id && (w._id === query._id || w._id === query._id?.toString())) return true;
      return false;
    });
    return new MemorySingleQuery(found);
  },

  findById(id) {
    if (isDbConnected()) {
      return MongooseWedding.findById(id);
    }
    const found = memoryStore.weddings.find(
      (w) => w._id === id || w._id === id?.toString()
    );
    return new MemorySingleQuery(found);
  },

  async create(data) {
    if (isDbConnected()) {
      return MongooseWedding.create(data);
    }
    const doc = {
      _id: generateId(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: async function () {
        const idx = memoryStore.weddings.findIndex((w) => w._id === this._id);
        if (idx !== -1) memoryStore.weddings[idx] = this;
        return this;
      },
      toObject: function () {
        return { ...this };
      },
    };
    memoryStore.weddings.push(doc);
    return doc;
  },
};
