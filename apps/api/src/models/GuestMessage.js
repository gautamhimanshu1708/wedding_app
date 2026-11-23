import mongoose from 'mongoose';
import { isDbConnected } from '../config/db.js';
import { memoryStore, generateId, MemoryQuery, MemorySingleQuery } from './store.js';

const guestMessageSchema = new mongoose.Schema(
  {
    weddingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

const MongooseMessage = mongoose.model('GuestMessage', guestMessageSchema);

export const GuestMessage = {
  find(query = {}) {
    if (isDbConnected()) {
      return MongooseMessage.find(query);
    }
    const filtered = memoryStore.messages.filter((m) => {
      const wid = m.weddingId?._id || m.weddingId;
      const targetWid = query.weddingId?._id || query.weddingId;
      if (targetWid && wid?.toString() !== targetWid?.toString()) return false;
      return true;
    });
    return new MemoryQuery(filtered);
  },

  findById(id) {
    if (isDbConnected()) {
      return MongooseMessage.findById(id);
    }
    const found = memoryStore.messages.find((m) => m._id === id);
    return new MemorySingleQuery(found);
  },

  async create(data) {
    if (isDbConnected()) {
      return MongooseMessage.create(data);
    }
    const doc = {
      _id: generateId(),
      weddingId: data.weddingId?._id || data.weddingId,
      userId: data.userId?._id || data.userId,
      message: data.message,
      createdAt: new Date(),
    };
    memoryStore.messages.unshift(doc);
    return doc;
  },
};
