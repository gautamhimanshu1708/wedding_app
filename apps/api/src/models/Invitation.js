import mongoose from 'mongoose';
import { isDbConnected } from '../config/db.js';
import { memoryStore, generateId, MemorySingleQuery } from './store.js';
import { ROLES } from '@wedding/shared';

const invitationSchema = new mongoose.Schema(
  {
    weddingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    role: { type: String, enum: [ROLES.GUEST, ROLES.EVENT_MANAGER, ROLES.ADMIN], default: ROLES.GUEST },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'WeddingEvent', default: null },
    expiresAt: { type: Date, required: true },
    maxUses: { type: Number, default: 500 },
    usedCount: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'revoked', 'expired'], default: 'active' },
  },
  { timestamps: true }
);

const MongooseInvitation = mongoose.model('Invitation', invitationSchema);

export const Invitation = {
  findOne(query) {
    if (isDbConnected()) {
      return MongooseInvitation.findOne(query);
    }
    const found = memoryStore.invitations.find((inv) => {
      if (query.tokenHash && inv.tokenHash !== query.tokenHash) return false;
      if (query.status && inv.status !== query.status) return false;
      return true;
    });
    return new MemorySingleQuery(found);
  },

  async create(data) {
    if (isDbConnected()) {
      return MongooseInvitation.create(data);
    }
    const doc = {
      _id: generateId(),
      weddingId: data.weddingId?._id || data.weddingId,
      tokenHash: data.tokenHash,
      role: data.role || ROLES.GUEST,
      eventId: data.eventId || null,
      expiresAt: data.expiresAt,
      maxUses: data.maxUses || 500,
      usedCount: data.usedCount || 0,
      status: data.status || 'active',
      createdAt: new Date(),
      save: async function () {
        const idx = memoryStore.invitations.findIndex((i) => i._id === this._id);
        if (idx !== -1) memoryStore.invitations[idx] = this;
        return this;
      },
      toObject: function () {
        return { ...this };
      },
    };
    memoryStore.invitations.push(doc);
    return doc;
  },
};
