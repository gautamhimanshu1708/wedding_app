import mongoose from 'mongoose';
import { isDbConnected } from '../config/db.js';
import { memoryStore, generateId, MemoryQuery, MemorySingleQuery } from './store.js';
import { ROLES } from '@wedding/shared';

const membershipSchema = new mongoose.Schema(
  {
    weddingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.GUEST },
    status: { type: String, enum: ['active', 'blocked', 'pending'], default: 'active' },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

membershipSchema.index({ weddingId: 1, userId: 1 }, { unique: true });

const MongooseMembership = mongoose.model('Membership', membershipSchema);

export const Membership = {
  findOne(query) {
    if (isDbConnected()) {
      return MongooseMembership.findOne(query);
    }
    const found = memoryStore.memberships.find((m) => {
      const wid = m.weddingId?._id || m.weddingId;
      const uid = m.userId?._id || m.userId;
      const targetWid = query.weddingId?._id || query.weddingId;
      const targetUid = query.userId?._id || query.userId;

      if (targetWid && wid?.toString() !== targetWid?.toString()) return false;
      if (targetUid && uid?.toString() !== targetUid?.toString()) return false;
      if (query.status && m.status !== query.status) return false;
      if (query._id && m._id?.toString() !== query._id?.toString()) return false;
      return true;
    });
    return new MemorySingleQuery(found);
  },

  find(query = {}) {
    if (isDbConnected()) {
      return MongooseMembership.find(query);
    }
    const filtered = memoryStore.memberships.filter((m) => {
      const wid = m.weddingId?._id || m.weddingId;
      const uid = m.userId?._id || m.userId;
      const targetWid = query.weddingId?._id || query.weddingId;
      const targetUid = query.userId?._id || query.userId;

      if (targetWid && wid?.toString() !== targetWid?.toString()) return false;
      if (targetUid && uid?.toString() !== targetUid?.toString()) return false;
      if (query.status && m.status !== query.status) return false;
      return true;
    });
    return new MemoryQuery(filtered);
  },

  async countDocuments(query = {}) {
    if (isDbConnected()) {
      return MongooseMembership.countDocuments(query);
    }
    const items = await this.find(query);
    return items.length;
  },

  async create(data) {
    if (isDbConnected()) {
      return MongooseMembership.create(data);
    }
    const doc = {
      _id: generateId(),
      weddingId: data.weddingId?._id || data.weddingId,
      userId: data.userId?._id || data.userId,
      role: data.role || ROLES.GUEST,
      status: data.status || 'active',
      joinedAt: new Date(),
      save: async function () {
        const idx = memoryStore.memberships.findIndex((m) => m._id === this._id);
        if (idx !== -1) memoryStore.memberships[idx] = this;
        return this;
      },
      toObject: function () {
        return { ...this };
      },
    };
    memoryStore.memberships.push(doc);
    return doc;
  },
};
