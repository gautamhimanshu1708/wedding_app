import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://piyushrathore33706_db_user:vzZjtB8XFPJaic1L@cluster0.gol6bki.mongodb.net/royal-wedding-platform?retryWrites=true&w=majority';

const DEFAULT_EVENTS = [
  { name: 'Haldi Ceremony', description: 'Yellow hues, auspicious turmeric paste, and joyful music' },
  { name: 'Mehendi Soirée', description: 'Intricate henna designs, folk dances, and celebratory feasts' },
  { name: 'Sangeet Night', description: 'High-energy musical dance performances and celebration' },
  { name: 'Royal Wedding & Vows', description: 'Traditional sacred pheras by the lakeside courtyard' },
  { name: 'Grand Reception', description: 'Formal royal gala dinner and celebration of newlyweds' },
];

async function purgeAndReset() {
  console.log('=== Purging and Resetting Royal Wedding Platform ===');
  console.log('Connecting to:', MONGODB_URI.replace(/:\/\/.*@/, '://<credentials>@'));

  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  const db = mongoose.connection.db;

  // 1. Purge all collections
  const collectionsToClean = [
    'users',
    'memberships',
    'weddingevents',
    'photos',
    'likes',
    'photoreports',
    'guestmessages',
    'qrcodes',
  ];

  for (const collName of collectionsToClean) {
    try {
      const coll = db.collection(collName);
      const count = await coll.countDocuments();
      if (count > 0) {
        await coll.deleteMany({});
        console.log(`✓ Purged ${count} documents from '${collName}'`);
      } else {
        console.log(`- '${collName}' is already empty`);
      }
    } catch (err) {
      console.warn(`! Note on collection '${collName}':`, err.message);
    }
  }

  // 2. Reset or recreate Wedding with default PIN '1211' and NO owner yet
  const weddingsColl = db.collection('weddings');
  await weddingsColl.deleteMany({});

  const weddingDate = new Date();
  weddingDate.setDate(weddingDate.getDate() + 14);

  const cleanWedding = {
    title: "Aarav & Diya's Royal Wedding",
    slug: 'royal-udaipur-2026',
    ownerId: null,
    adminPin: '1211',
    coupleNames: {
      partner1: 'Aarav Sharma',
      partner2: 'Diya Verma',
    },
    weddingDate,
    venue: 'City Palace, Lake Pichola, Udaipur',
    coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    welcomeMessage:
      'Padharo mhare des! Welcome to our royal wedding celebrations. We invite you to capture and share all the cherished memories of our union.',
    theme: {
      primary: '#681D32',
      secondary: '#C5A15B',
      background: '#F7F0E4',
      font: 'Playfair Display',
    },
    settings: {
      allowGuestUploads: true,
      allowPublicQR: true,
      enableRealtime: true,
      maxPhotosPerGuest: 200,
      isPrivate: false,
    },
    driveConfig: {
      storageMode: 'local',
      isConnected: false,
      folderId: '',
      clientEmail: '',
      privateKey: '',
    },
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const weddingInsertRes = await weddingsColl.insertOne(cleanWedding);
  const weddingId = weddingInsertRes.insertedId;
  console.log(`✓ Created clean wedding 'royal-udaipur-2026' with ID: ${weddingId} and PIN: '1211'`);

  // 3. Seed fresh ceremonial events
  const eventsColl = db.collection('weddingevents');
  const eventDocs = DEFAULT_EVENTS.map((e, index) => {
    const eventDate = new Date(weddingDate);
    eventDate.setDate(eventDate.getDate() - (DEFAULT_EVENTS.length - 1 - index));
    return {
      weddingId,
      name: e.name,
      description: e.description,
      date: eventDate,
      status: index === 3 ? 'live' : 'upcoming',
      photoCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
  await eventsColl.insertMany(eventDocs);
  console.log(`✓ Seeded ${eventDocs.length} ceremonial events`);

  // 4. Clean local uploads folder if present
  const uploadsDir = path.resolve(__dirname, '../../uploads');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    let deletedFiles = 0;
    for (const file of files) {
      if (file !== '.gitkeep') {
        try {
          fs.rmSync(path.join(uploadsDir, file), { recursive: true, force: true });
          deletedFiles++;
        } catch (e) {}
      }
    }
    console.log(`✓ Cleaned ${deletedFiles} local upload files from '${uploadsDir}'`);
  }

  console.log('=== Database Purge and Reset Complete! ===');
  console.log('Default Admin PIN is verified as: 1211');
  await mongoose.disconnect();
  process.exit(0);
}

purgeAndReset().catch((err) => {
  console.error('Purge error:', err);
  process.exit(1);
});
