import mongoose from 'mongoose';
import { isDbConnected } from '../config/db.js';
import { memoryStore, generateId, MemoryQuery } from './store.js';

const likeSchema = new mongoose.Schema(
  {
    weddingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true },
    photoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Photo', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

likeSchema.index({ photoId: 1, userId: 1 }, { unique: true });

const MongooseLike = mongoose.model('Like', likeSchema);

export const Like = {
  async findOne(query) {
    if (isDbConnected()) {
      return MongooseLike.findOne(query);
    }
    const found = memoryStore.likes.find((l) => {
      const pid = l.photoId?._id || l.photoId;
      const uid = l.userId?._id || l.userId;
      const targetPid = query.photoId?._id || query.photoId;
      const targetUid = query.userId?._id || query.userId;
      return pid?.toString() === targetPid?.toString() && uid?.toString() === targetUid?.toString();
    });
    return found ? { ...found } : null;
  },

  find(query = {}) {
    if (isDbConnected()) {
      return MongooseLike.find(query);
    }
    const filtered = memoryStore.likes.filter((l) => {
      const uid = l.userId?._id || l.userId;
      const targetUid = query.userId?._id || query.userId;
      if (targetUid && uid?.toString() !== targetUid?.toString()) return false;
      if (query.photoId?.$in) {
        const pid = l.photoId?._id || l.photoId;
        const inList = query.photoId.$in.map((id) => id?.toString());
        return inList.includes(pid?.toString());
      }
      return true;
    });
    return new MemoryQuery(filtered);
  },

  async exists(query) {
    if (isDbConnected()) {
      return MongooseLike.exists(query);
    }
    const found = await this.findOne(query);
    return Boolean(found);
  },

  async findByIdAndDelete(id) {
    if (isDbConnected()) {
      return MongooseLike.findByIdAndDelete(id);
    }
    const idx = memoryStore.likes.findIndex((l) => l._id?.toString() === id?.toString());
    if (idx !== -1) {
      return memoryStore.likes.splice(idx, 1)[0];
    }
    return null;
  },

  async create(data) {
    if (isDbConnected()) {
      return MongooseLike.create(data);
    }
    const doc = {
      _id: generateId(),
      weddingId: data.weddingId?._id || data.weddingId,
      photoId: data.photoId?._id || data.photoId,
      userId: data.userId?._id || data.userId,
      createdAt: new Date(),
    };
    memoryStore.likes.push(doc);
    return doc;
  },
};
