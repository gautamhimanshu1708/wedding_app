import { z } from 'zod';
import { ROLES, REPORT_REASONS } from './constants.js';

export const createWeddingSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  slug: z.string().min(3).max(60).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  coupleNames: z.object({
    partner1: z.string().min(2, 'Partner 1 name is required').max(50),
    partner2: z.string().min(2, 'Partner 2 name is required').max(50),
  }),
  weddingDate: z.string().or(z.date()),
  venue: z.string().min(2, 'Venue is required').max(120),
  coverImage: z.string().url().optional().or(z.literal('')),
  welcomeMessage: z.string().max(500).optional(),
});

export const updateWeddingSchema = createWeddingSchema.partial();

export const createEventSchema = z.object({
  name: z.string().min(2, 'Event name is required').max(60),
  description: z.string().max(300).optional(),
  date: z.string().or(z.date()),
  coverImage: z.string().url().optional().or(z.literal('')),
});

export const createInvitationSchema = z.object({
  role: z.enum([ROLES.GUEST, ROLES.EVENT_MANAGER, ROLES.ADMIN]).default(ROLES.GUEST),
  expiresInDays: z.number().int().min(1).max(365).default(30),
  maxUses: z.number().int().min(1).max(10000).default(500),
});

export const photoUploadInitSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  caption: z.string().max(250).optional(),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().positive().max(25 * 1024 * 1024, 'File size must be <= 25MB'),
});

export const reportPhotoSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  details: z.string().max(300).optional(),
});

export const guestMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(300),
});
