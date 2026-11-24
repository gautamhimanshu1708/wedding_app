import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENV } from '../config/env.js';
import { connectDB, isDbConnected } from '../config/db.js';
import '../models/User.js';
import '../models/Wedding.js';
import '../models/Event.js';
import '../models/Membership.js';
import '../models/Photo.js';
import '../models/Like.js';
import '../models/PhotoReport.js';
import '../models/QRCode.js';
import '../models/GuestMessage.js';
import { memoryStore } from '../models/store.js';
import { ROLES, DEFAULT_EVENTS } from '@wedding/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cleanData() {
  console.log('--- Connecting to database to clean test data ---');
  await connectDB();

  if (isDbConnected()) {
    console.log('[CleanData] Connected to live MongoDB Atlas database.');
    const MongoosePhoto = mongoose.models.Photo;
    const MongooseLike = mongoose.models.Like;
    const MongooseReport = mongoose.models.PhotoReport;
    const MongooseMessage = mongoose.models.GuestMessage;
    const MongooseQRCode = mongoose.models.QRCode;
    const MongooseUser = mongoose.models.User;
    const MongooseMembership = mongoose.models.Membership;
    const MongooseEvent = mongoose.models.WeddingEvent;
    const MongooseWedding = mongoose.models.Wedding;

    // 1. Delete all test photos
    if (MongoosePhoto) {
      const res = await MongoosePhoto.deleteMany({});
      console.log(`✓ Deleted ${res.deletedCount} photos from MongoDB Atlas.`);
    }

    // 2. Delete all likes
    if (MongooseLike) {
      const res = await MongooseLike.deleteMany({});
      console.log(`✓ Deleted ${res.deletedCount} likes from MongoDB Atlas.`);
    }

    // 3. Delete all photo reports
    if (MongooseReport) {
      const res = await MongooseReport.deleteMany({});
      console.log(`✓ Deleted ${res.deletedCount} reports from MongoDB Atlas.`);
    }

    // 4. Delete guest messages
    if (MongooseMessage) {
      const res = await MongooseMessage.deleteMany({});
      console.log(`✓ Deleted ${res.deletedCount} messages from MongoDB Atlas.`);
    }

    // 5. Delete test QR codes
    if (MongooseQRCode) {
      const res = await MongooseQRCode.deleteMany({});
      console.log(`✓ Deleted ${res.deletedCount} QR codes from MongoDB Atlas.`);
    }

    // 6. Delete test users (keep real couple Aarav & Diya)
    if (MongooseUser) {
      const res = await MongooseUser.deleteMany({
        $or: [
          { email: { $regex: /test|demo|host@royalwedding\.com/i } },
          { name: { $regex: /test/i } },
          { clerkUserId: { $regex: /^user_dev_/i } },
        ],
      });
      console.log(`✓ Deleted ${res.deletedCount} test users from MongoDB Atlas.`);
    }

    // 7. Reset wedding events for default wedding
    if (MongooseWedding && MongooseEvent) {
      const wedding = await MongooseWedding.findOne({ slug: 'royal-udaipur-2026' });
      if (wedding) {
        await MongooseEvent.deleteMany({ weddingId: wedding._id });

        const eventDocs = DEFAULT_EVENTS.map((e, index) => {
          const eventDate = new Date(wedding.weddingDate || Date.now() + 14 * 86400000);
          eventDate.setDate(eventDate.getDate() - (DEFAULT_EVENTS.length - 1 - index));
          return {
            weddingId: wedding._id,
            name: e.name,
            description: e.description,
            date: eventDate,
            status: index === 3 ? 'live' : 'upcoming',
          };
        });
        const seeded = await MongooseEvent.insertMany(eventDocs);
        console.log(`✓ Reset ceremonies to ${seeded.length} fresh standard wedding ceremonies.`);
      }
    }
  } else {
    console.log('[CleanData] Note: Remote DB was not reachable; purged in-memory stores.');
  }

  // Clear memory stores
  memoryStore.photos = [];
  memoryStore.likes = [];
  memoryStore.reports = [];
  memoryStore.messages = [];
  memoryStore.qrcodes = [];

  // Clean physical uploads folder on disk
  const uploadsDir = path.resolve(__dirname, '../../uploads');
  if (fs.existsSync(uploadsDir)) {
    try {
      const files = fs.readdirSync(uploadsDir);
      for (const item of files) {
        if (item === '.gitkeep') continue;
        const fullPath = path.join(uploadsDir, item);
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
      console.log('✓ Cleaned physical upload folders in apps/api/uploads/');
    } catch (err) {
      console.warn('Physical cleanup note:', err.message);
    }
  }

  console.log('=== All Test Data Successfully Purged! Platform Is Fresh & Clean ===');
  process.exit(0);
}

cleanData().catch((err) => {
  console.error('Clean data error:', err);
  process.exit(1);
});
