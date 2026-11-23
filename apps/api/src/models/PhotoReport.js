import mongoose from 'mongoose';
import { isDbConnected } from '../config/db.js';
import { memoryStore, generateId, MemoryQuery } from './store.js';
import { REPORT_REASONS } from '@wedding/shared';

const photoReportSchema = new mongoose.Schema(
  {
    weddingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true },
    photoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Photo', required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'reviewed', 'dismissed', 'actioned'], default: 'pending' },
  },
  { timestamps: true }
);

const MongooseReport = mongoose.model('PhotoReport', photoReportSchema);

export const PhotoReport = {
  find(query = {}) {
    if (isDbConnected()) {
      return MongooseReport.find(query);
    }
    const filtered = memoryStore.reports.filter((r) => {
      const wid = r.weddingId?._id || r.weddingId;
      const targetWid = query.weddingId?._id || query.weddingId;
      if (targetWid && wid?.toString() !== targetWid?.toString()) return false;
      return true;
    });
    return new MemoryQuery(filtered);
  },

  async create(data) {
    if (isDbConnected()) {
      return MongooseReport.create(data);
    }
    const doc = {
      _id: generateId(),
      weddingId: data.weddingId?._id || data.weddingId,
      photoId: data.photoId?._id || data.photoId,
      reportedBy: data.reportedBy?._id || data.reportedBy,
      reason: data.reason,
      details: data.details || '',
      status: 'pending',
      createdAt: new Date(),
    };
    memoryStore.reports.unshift(doc);
    return doc;
  },
};
