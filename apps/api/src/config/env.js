import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root, apps/api, or cwd
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/royal-wedding-platform',
  
  // Clerk Auth
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || '',
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET || '',

  // Cloudflare R2 / S3
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || '',
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || '',
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || '',
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || 'royal-wedding-photos',
  R2_PUBLIC_DOMAIN: process.env.R2_PUBLIC_DOMAIN || '', // Custom domain or workers domain if public, else signed URLs

  // Redis (optional, defaults to in-memory fallback if not provided)
  REDIS_URL: process.env.REDIS_URL || '',

  // App JWT secret for guests/dev sessions fallback
  JWT_SECRET: process.env.JWT_SECRET || 'royal-wedding-super-secret-key-change-in-production-2026',

  // Google Drive Storage (optional — alternative to Cloudflare R2)
  // Use either keyfile path OR client_email + private_key
  GOOGLE_DRIVE_KEYFILE_PATH: process.env.GOOGLE_DRIVE_KEYFILE_PATH || '',
  GOOGLE_DRIVE_CLIENT_EMAIL: process.env.GOOGLE_DRIVE_CLIENT_EMAIL || '',
  GOOGLE_DRIVE_PRIVATE_KEY: process.env.GOOGLE_DRIVE_PRIVATE_KEY || '',
  // The shared Google Drive folder ID where photos are saved
  GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
};
