import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Wedding } from '../models/Wedding.js';
import { WeddingEvent } from '../models/Event.js';
import { Membership } from '../models/Membership.js';
import { Photo } from '../models/Photo.js';
import { ROLES, DEFAULT_EVENTS } from '@wedding/shared';
import { StorageService } from '../services/storage.js';
import sharp from 'sharp';

async function seed() {
  console.log('--- Seeding Royal Wedding Platform ---');
  await connectDB();

  // 1. Create or Find Royal Couple Owner User
  let owner = await User.findOne({ email: 'aarav.diya@royalwedding.com' });
  if (!owner) {
    owner = await User.create({
      clerkUserId: 'user_royal_owner_001',
      name: 'Aarav & Diya',
      email: 'aarav.diya@royalwedding.com',
      avatar: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=300&q=80',
    });
    console.log('✓ Created owner user:', owner.name);
  }

  // 2. Create or Find Wedding
  let wedding = await Wedding.findOne({ slug: 'royal-udaipur-2026' });
  if (!wedding) {
    const weddingDate = new Date();
    weddingDate.setDate(weddingDate.getDate() + 14); // 2 weeks in future

    wedding = await Wedding.create({
      title: "Aarav & Diya's Royal Wedding",
      slug: 'royal-udaipur-2026',
      ownerId: owner._id,
      coupleNames: {
        partner1: 'Aarav Sharma',
        partner2: 'Diya Verma',
      },
      weddingDate,
      venue: 'City Palace, Lake Pichola, Udaipur',
      coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
      welcomeMessage:
        'Padharo mhare des! Welcome to our royal wedding celebrations. We invite you to capture and share all the cherished memories of our union.',
      status: 'active',
    });
    console.log('✓ Created wedding:', wedding.title, `(Slug: ${wedding.slug})`);

    // Assign owner membership
    await Membership.create({
      weddingId: wedding._id,
      userId: owner._id,
      role: ROLES.OWNER,
      status: 'active',
    });
  }

  // 3. Create Events
  let events = await WeddingEvent.find({ weddingId: wedding._id });
  if (events.length === 0) {
    const eventDocs = DEFAULT_EVENTS.map((e, index) => {
      const eventDate = new Date(wedding.weddingDate);
      eventDate.setDate(eventDate.getDate() - (DEFAULT_EVENTS.length - 1 - index));
      return {
        weddingId: wedding._id,
        name: e.name,
        description: e.description,
        date: eventDate,
        status: index === 3 ? 'live' : 'upcoming',
      };
    });
    events = await WeddingEvent.insertMany(eventDocs);
    console.log(`✓ Seeded ${events.length} wedding events (Haldi, Mehendi, Sangeet, Wedding, Reception)`);
  }

  // 4. Seed a demo guest
  let guest = await User.findOne({ email: 'rahul.guest@royalwedding.com' });
  if (!guest) {
    guest = await User.create({
      clerkUserId: 'user_royal_guest_002',
      name: 'Rahul Mehra',
      email: 'rahul.guest@royalwedding.com',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=RahulMehra&backgroundColor=681D32,C5A15B',
    });
    await Membership.create({
      weddingId: wedding._id,
      userId: guest._id,
      role: ROLES.GUEST,
      status: 'active',
    });
    console.log('✓ Seeded demo guest:', guest.name);
  }

  console.log('=== Seed Completed Successfully! ===');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed Error:', err);
  process.exit(1);
});
