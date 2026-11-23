import mongoose from 'mongoose';
import { isDbConnected } from '../config/db.js';
import { memoryStore, generateId } from './store.js';

const userSchema = new mongoose.Schema(
  {
    clerkUserId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    avatar: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const MongooseUser = mongoose.model('User', userSchema);

export const User = {
  async findOne(query) {
    if (isDbConnected()) {
      return MongooseUser.findOne(query);
    }
    const found = memoryStore.users.find((u) => {
      if (query.clerkUserId && u.clerkUserId === query.clerkUserId) return true;
      if (query.email && u.email === query.email) return true;
      if (query._id && (u._id === query._id || u._id === query._id?.toString())) return true;
      return false;
    });
    return found ? { ...found } : null;
  },

  async findById(id) {
    if (isDbConnected()) {
      return MongooseUser.findById(id);
    }
    const found = memoryStore.users.find(
      (u) => u._id === id || u._id === id?.toString()
    );
    return found ? { ...found } : null;
  },

  async create(data) {
    if (isDbConnected()) {
      return MongooseUser.create(data);
    }
    const doc = {
      _id: generateId(),
      clerkUserId: data.clerkUserId || generateId(),
      name: data.name,
      email: data.email || '',
      avatar: data.avatar || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      save: async function () {
        const idx = memoryStore.users.findIndex((u) => u._id === this._id);
        if (idx !== -1) memoryStore.users[idx] = this;
        return this;
      },
      toObject: function () {
        return { ...this };
      },
    };
    memoryStore.users.push(doc);
    return doc;
  },
};
