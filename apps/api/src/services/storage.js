import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENV } from '../config/env.js';
import {
  isGoogleDriveConfigured as _isDrive,
  driveUpload,
  driveGetUrl,
  driveDelete,
} from './googleDriveStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local fallback storage folder
const LOCAL_UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
}

// Check if Cloudflare R2 is configured
const isR2Configured = Boolean(
  ENV.R2_ACCOUNT_ID &&
  ENV.R2_ACCESS_KEY_ID &&
  ENV.R2_SECRET_ACCESS_KEY &&
  ENV.R2_BUCKET_NAME
);

let s3Client = null;
if (isR2Configured) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${ENV.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ENV.R2_ACCESS_KEY_ID,
      secretAccessKey: ENV.R2_SECRET_ACCESS_KEY,
    },
  });
  console.log('[Storage] Cloudflare R2 initialized with bucket:', ENV.R2_BUCKET_NAME);
} else {
  console.log('[Storage] Cloudflare R2 credentials not detected. Operating with resilient local storage provider.');
}

export class StorageService {
  /**
   * Returns which storage backend is active
   */
  static get backend() {
    if (isR2Configured) return 'cloudflare-r2';
    if (_isDrive) return 'google-drive';
    return 'local';
  }

  /**
   * Save a buffer to storage (R2 → Google Drive → local)
   * For Google Drive, key format: "<weddingId>/<type>/<filename>"
   * Returns the storage key (or Drive fileId for Drive backend).
   */
  static async putObject(key, buffer, contentType = 'image/webp', wedding = null) {
    if (isR2Configured && s3Client) {
      const command = new PutObjectCommand({
        Bucket: ENV.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });
      await s3Client.send(command);
      return key;
    }

    // Google Drive backend (configured via portal settings or .env)
    const useWeddingDrive = wedding?.driveConfig?.isConnected && wedding.driveConfig.storageMode === 'google_drive';
    if (useWeddingDrive || _isDrive) {
      try {
        const parts = key.split('/');
        const fileName = parts[parts.length - 1];
        const fileData = await driveUpload(buffer, fileName, contentType, wedding);
        return `gdrive:${fileData.id}`;
      } catch (driveErr) {
        console.warn('[Storage] Google Drive upload failed, falling back to local storage:', driveErr.message);
      }
    }

    // Local fallback
    const targetPath = path.join(LOCAL_UPLOADS_DIR, key);
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(targetPath, buffer);
    return key;
  }

  /**
   * Get an accessible URL for a stored object
   */
  static async getObjectUrl(key, expiresIn = 3600, wedding = null) {
    if (!key) return null;

    // Already an external URL
    if (key.startsWith('http://') || key.startsWith('https://')) return key;

    // Google Drive file
    if (key.startsWith('gdrive:')) {
      const fileId = key.replace('gdrive:', '');
      return driveGetUrl(fileId, wedding);
    }

    if (isR2Configured && s3Client) {
      if (ENV.R2_PUBLIC_DOMAIN) return `${ENV.R2_PUBLIC_DOMAIN}/${key}`;
      const command = new GetObjectCommand({ Bucket: ENV.R2_BUCKET_NAME, Key: key });
      return await getSignedUrl(s3Client, command, { expiresIn });
    }

    return `/uploads/${key}`;
  }

  /**
   * Generate a pre-signed PUT upload URL for direct browser-to-R2 upload
   */
  static async getSignedUploadUrl(key, contentType, expiresIn = 900) {
    if (isR2Configured && s3Client) {
      const command = new PutObjectCommand({
        Bucket: ENV.R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
      });
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
      return { uploadUrl, key, directR2: true };
    }
    return {
      uploadUrl: `/api/v1/photos/direct-upload-endpoint?key=${encodeURIComponent(key)}`,
      key,
      directR2: false,
    };
  }

  /**
   * Delete an object from storage
   */
  static async deleteObject(key) {
    if (!key) return;

    if (key.startsWith('gdrive:')) {
      await driveDelete(key.replace('gdrive:', ''));
      return;
    }

    if (isR2Configured && s3Client) {
      const command = new DeleteObjectCommand({ Bucket: ENV.R2_BUCKET_NAME, Key: key });
      await s3Client.send(command);
      return;
    }

    const targetPath = path.join(LOCAL_UPLOADS_DIR, key);
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
  }
}
