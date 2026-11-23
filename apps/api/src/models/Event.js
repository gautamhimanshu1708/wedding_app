import mongoose from 'mongoose';
import { isDbConnected } from '../config/db.js';
import { memoryStore, generateId, MemoryQuery, MemorySingleQuery } from './store.js';

const eventSchema = new mongoose.Schema(
  {
    weddingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    date: { type: Date, required: true },
    coverImage: { type: String, default: '' },
    status: { type: String, enum: ['upcoming', 'live', 'completed', 'archived'], default: 'upcoming' },
  },
  { timestamps: true }
);

const MongooseEvent = mongoose.model('WeddingEvent', eventSchema);

export const WeddingEvent = {
  find(query = {}) {
    if (isDbConnected()) {
      return MongooseEvent.find(query);
    }
    const filtered = memoryStore.events.filter((e) => {
      const wid = e.weddingId?._id || e.weddingId;
      const targetWid = query.weddingId?._id || query.weddingId;
      if (targetWid && wid?.toString() !== targetWid?.toString()) return false;
      return true;
    });
    return new MemoryQuery(filtered);
  },

  findOne(query) {
    if (isDbConnected()) {
      return MongooseEvent.findOne(query);
    }
    const found = memoryStore.events.find((e) => {
      if (query._id && e._id?.toString() !== query._id?.toString()) return false;
      const wid = e.weddingId?._id || e.weddingId;
      const targetWid = query.weddingId?._id || query.weddingId;
      if (targetWid && wid?.toString() !== targetWid?.toString()) return false;
      return true;
    });
    return new MemorySingleQuery(found);
  },

  async findOneAndDelete(query) {
    if (isDbConnected()) {
      return MongooseEvent.findOneAndDelete(query);
    }
    const idx = memoryStore.events.findIndex((e) => {
      if (query._id && e._id?.toString() !== query._id?.toString()) return false;
      return true;
    });
    if (idx !== -1) {
      const removed = memoryStore.events.splice(idx, 1)[0];
      return removed;
    }
    return null;
  },

  async create(data) {
    if (isDbConnected()) {
      return MongooseEvent.create(data);
    }
    const doc = {
      _id: generateId(),
      weddingId: data.weddingId?._id || data.weddingId,
      name: data.name,
      description: data.description || '',
      date: new Date(data.date),
      coverImage: data.coverImage || '',
      status: data.status || 'upcoming',
      createdAt: new Date(),
      save: async function () {
        const idx = memoryStore.events.findIndex((e) => e._id === this._id);
        if (idx !== -1) memoryStore.events[idx] = this;
        return this;
      },
      toObject: function () {
        return { ...this };
      },
    };
    memoryStore.events.push(doc);
    return doc;
  },

  async insertMany(docs) {
    if (isDbConnected()) {
      return MongooseEvent.insertMany(docs);
    }
    const created = docs.map((d) => ({
      _id: generateId(),
      ...d,
      createdAt: new Date(),
      save: async function () { return this; },
      toObject: function () { return { ...this }; },
    }));
    memoryStore.events.push(...created);
    return created;
  },
};
