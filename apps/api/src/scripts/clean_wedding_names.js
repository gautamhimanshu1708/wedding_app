import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const uri =
  process.env.MONGODB_URI ||
  'mongodb+srv://piyushrathore33706_db_user:vzZjtB8XFPJaic1L@cluster0.gol6bki.mongodb.net/royal-wedding-platform?retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const res = await db.collection('weddings').updateOne(
    { slug: 'royal-udaipur-2026' },
    {
      $set: {
        title: 'Aatithi devo bahva',
        coupleNames: { partner1: 'Deepika', partner2: 'Sunmeet' },
        venue: 'Fern recidency Bodhgaya',
        weddingDate: new Date('2026-12-09T18:00:00Z'),
        welcomeMessage:
          'Padharo mhare des! Welcome to our royal wedding celebrations. We invite you to capture and share all the cherished memories of our union.',
      },
    }
  );
  console.log('Saved Deepika & Sunmeet settings into MongoDB Atlas:', res.modifiedCount);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
