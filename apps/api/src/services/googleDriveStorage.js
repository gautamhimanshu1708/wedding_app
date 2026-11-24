/**
 * Google Drive Storage Provider
 * Supports both environment-level credentials and per-wedding in-portal credentials.
 */

import { Readable } from 'stream';
import { ENV } from '../config/env.js';

let defaultDrive = null;
let isGoogleDriveConfigured = false;

async function getGoogleLib() {
  return await import('googleapis');
}

/**
 * Test a given set of Google Drive credentials
 */
export async function testDriveConfig({ clientEmail, privateKey, folderId }) {
  try {
    const { google } = await getGoogleLib();
    const formattedKey = privateKey.includes('\n') ? privateKey : privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: formattedKey,
      },
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.metadata.readonly'],
    });

    const testDrive = google.drive({ version: 'v3', auth });

    if (folderId) {
      // Verify folder exists and is accessible
      await testDrive.files.get({ fileId: folderId, fields: 'id, name, capabilities' });
    } else {
      // Verify basic API access
      await testDrive.files.list({ pageSize: 1, fields: 'files(id)' });
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Failed to authenticate with Google Drive using the provided credentials.',
    };
  }
}

/**
 * Create or retrieve a Drive client for a specific wedding or fallback to default
 */
export async function getDriveClient(wedding = null) {
  const { google } = await getGoogleLib();

  // 1. Check if wedding has dynamic portal-configured Drive credentials
  if (wedding?.driveConfig?.isConnected && wedding.driveConfig.clientEmail && wedding.driveConfig.privateKey) {
    try {
      const formattedKey = wedding.driveConfig.privateKey.includes('\n')
        ? wedding.driveConfig.privateKey
        : wedding.driveConfig.privateKey.replace(/\\n/g, '\n');

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: wedding.driveConfig.clientEmail,
          private_key: formattedKey,
        },
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      return {
        drive: google.drive({ version: 'v3', auth }),
        rootFolderId: wedding.driveConfig.folderId || 'root',
      };
    } catch (err) {
      console.warn('[Storage] Failed to instantiate wedding custom Drive client:', err.message);
    }
  }

  // 2. Fallback to server .env credentials
  if (defaultDrive) {
    return { drive: defaultDrive, rootFolderId: ENV.GOOGLE_DRIVE_FOLDER_ID || 'root' };
  }

  const { GOOGLE_DRIVE_CLIENT_EMAIL, GOOGLE_DRIVE_PRIVATE_KEY, GOOGLE_DRIVE_KEYFILE_PATH } = ENV;
  if (!GOOGLE_DRIVE_CLIENT_EMAIL && !GOOGLE_DRIVE_KEYFILE_PATH) return null;

  try {
    let auth;
    if (GOOGLE_DRIVE_KEYFILE_PATH) {
      auth = new google.auth.GoogleAuth({
        keyFile: GOOGLE_DRIVE_KEYFILE_PATH,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });
    } else {
      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: GOOGLE_DRIVE_CLIENT_EMAIL,
          private_key: GOOGLE_DRIVE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });
    }

    defaultDrive = google.drive({ version: 'v3', auth });
    isGoogleDriveConfigured = true;
    return { drive: defaultDrive, rootFolderId: ENV.GOOGLE_DRIVE_FOLDER_ID || 'root' };
  } catch (err) {
    console.error('[Storage] Google Drive init failed:', err.message);
    return null;
  }
}

// Global cache for folder creation to prevent concurrent race conditions
const folderPromiseCache = new Map();

/**
 * Upload a buffer to Google Drive
 */
export async function driveUpload(buffer, fileName, mimeType = 'image/jpeg', wedding = null, ceremonyName = null) {
  const clientInfo = await getDriveClient(wedding);
  if (!clientInfo || !clientInfo.drive) {
    throw new Error('Google Drive is not configured or accessible.');
  }

  const { drive, rootFolderId } = clientInfo;

  // 1. Resolve ceremony subfolder with race condition protection
  let targetFolderId = rootFolderId || 'root';
  if (ceremonyName && targetFolderId && targetFolderId !== 'root') {
    targetFolderId = await ensureSubfolder(drive, targetFolderId, ceremonyName);
  }

  // 2. Always ensure a clean .jpg name and image/jpeg MIME type for Google Drive
  // so Google Drive generates full visual thumbnails and image previews
  let cleanName = fileName;
  let cleanMime = 'image/jpeg';
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.png')) {
    cleanMime = 'image/png';
  } else if (!lowerName.endsWith('.jpg') && !lowerName.endsWith('.jpeg')) {
    cleanName = `${fileName.replace(/\.[^/.]+$/, '')}.jpg`;
    cleanMime = 'image/jpeg';
  }

  const fileMetadata = {
    name: cleanName,
    parents: [targetFolderId],
  };

  const media = {
    mimeType: cleanMime,
    body: Readable.from(buffer),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, webViewLink, webContentLink',
    supportsAllDrives: true,
  });

  // Make file publicly readable so it renders directly in the web app
  try {
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    });
  } catch (permErr) {
    // Non-critical: parent folder permissions may already cover it
  }

  return response.data;
}

/**
 * Get a direct public URL for a Drive file
 * Using Google's direct CDN format lh3.googleusercontent.com/d/{fileId}
 * allows instant loading in <img> tags without Google auth redirects or cookie barriers.
 */
export async function driveGetUrl(fileId, wedding = null) {
  if (!fileId) return null;
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/**
 * Stream a Drive file directly through the API server as a resilient fail-safe
 * when third-party cookies or networks block Google CDN hotlinks.
 */
export async function driveGetStream(fileId, wedding = null) {
  const clientInfo = await getDriveClient(wedding);
  if (!clientInfo || !clientInfo.drive || !fileId) return null;

  try {
    const res = await clientInfo.drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' }
    );
    return {
      stream: res.data,
      contentType: res.headers['content-type'] || 'image/jpeg',
      contentLength: res.headers['content-length'] || null,
    };
  } catch (err) {
    console.error('[Drive Stream] Error fetching file stream:', err.message);
    return null;
  }
}

/**
 * Delete a file from Google Drive
 */
export async function driveDelete(fileId, wedding = null) {
  const clientInfo = await getDriveClient(wedding);
  if (!clientInfo || !clientInfo.drive || !fileId) return;

  try {
    await clientInfo.drive.files.delete({ fileId, supportsAllDrives: true });
  } catch (err) {
    console.error('[Drive] delete error:', err.message);
  }
}

/**
 * Ensure a clean ceremony subfolder exists under root
 * Uses memoized promise caching to prevent duplicate folders during concurrent photo uploads.
 */
async function ensureSubfolder(drive, parentFolderId, subfolderName) {
  if (!subfolderName || !parentFolderId || parentFolderId === 'root') return parentFolderId;
  const cleanName = subfolderName.trim();
  const cacheKey = `${parentFolderId}:::${cleanName.toLowerCase()}`;

  if (folderPromiseCache.has(cacheKey)) {
    return await folderPromiseCache.get(cacheKey);
  }

  const creationPromise = (async () => {
    try {
      const query = `name='${cleanName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`;
      const existing = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      if (existing.data.files?.length > 0) {
        return existing.data.files[0].id;
      }

      const folder = await drive.files.create({
        requestBody: {
          name: cleanName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId],
        },
        fields: 'id',
        supportsAllDrives: true,
      });

      return folder.data.id;
    } catch (e) {
      console.warn('[Storage] Notice creating subfolder, using parent:', e.message);
      return parentFolderId;
    }
  })();

  folderPromiseCache.set(cacheKey, creationPromise);
  return await creationPromise;
}

const initPromise = Promise.resolve(true);

export { isGoogleDriveConfigured, initPromise };
