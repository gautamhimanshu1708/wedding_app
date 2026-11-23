/**
 * Google Drive Storage Provider
 * 
 * Setup:
 *  1. Create a Google Cloud project and enable the Drive API.
 *  2. Create a Service Account, download the JSON key file.
 *  3. Add these env vars to your .env:
 *       GOOGLE_DRIVE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
 *       GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 *       GOOGLE_DRIVE_FOLDER_ID=1AbCdEfGhIjKlMnOpQrStUvWx  (a shared Drive folder)
 *  4. Share the Google Drive folder with the service account email (Editor access).
 *  5. All guest photo uploads will appear in that shared folder.
 * 
 * OR:
 *  Use GOOGLE_DRIVE_KEYFILE_PATH=/path/to/keyfile.json instead of CLIENT_EMAIL + PRIVATE_KEY.
 */

import { Readable } from 'stream';
import { ENV } from '../config/env.js';

let drive = null;
let isGoogleDriveConfigured = false;

async function initGoogleDrive() {
  const { GOOGLE_DRIVE_CLIENT_EMAIL, GOOGLE_DRIVE_PRIVATE_KEY, GOOGLE_DRIVE_KEYFILE_PATH } = ENV;

  if (!GOOGLE_DRIVE_CLIENT_EMAIL && !GOOGLE_DRIVE_KEYFILE_PATH) return false;

  try {
    const { google } = await import('googleapis');

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

    drive = google.drive({ version: 'v3', auth });
    console.log('[Storage] Google Drive initialized. Folder:', ENV.GOOGLE_DRIVE_FOLDER_ID || 'root');
    return true;
  } catch (err) {
    console.error('[Storage] Google Drive init failed:', err.message);
    return false;
  }
}

// Initialize on first import
const initPromise = initGoogleDrive().then((ok) => {
  isGoogleDriveConfigured = ok;
});

export { isGoogleDriveConfigured, initPromise };

/**
 * Upload a buffer to Google Drive
 * Returns the file ID (used as the storage key)
 */
export async function driveUpload(buffer, fileName, mimeType = 'image/webp', weddingId = null) {
  await initPromise;
  if (!drive) throw new Error('Google Drive not configured');

  const folderId = await ensureWeddingFolder(weddingId);

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType,
    body: Readable.from(buffer),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, webViewLink, webContentLink',
  });

  return response.data;
}

/**
 * Get a public/shareable URL for a Drive file
 */
export async function driveGetUrl(fileId) {
  await initPromise;
  if (!drive) return null;

  try {
    // Make file publicly readable
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    // Return direct download URL
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  } catch (err) {
    console.error('[Drive] getUrl error:', err.message);
    return `https://drive.google.com/file/d/${fileId}/view`;
  }
}

/**
 * Delete a file from Google Drive
 */
export async function driveDelete(fileId) {
  await initPromise;
  if (!drive || !fileId) return;

  try {
    await drive.files.delete({ fileId });
  } catch (err) {
    console.error('[Drive] delete error:', err.message);
  }
}

/**
 * Ensure a per-wedding subfolder exists under the root Drive folder.
 * Returns the folder ID to upload into.
 */
async function ensureWeddingFolder(weddingId) {
  const rootFolderId = ENV.GOOGLE_DRIVE_FOLDER_ID || 'root';
  if (!weddingId) return rootFolderId;

  const folderName = `Wedding_${weddingId}`;

  // Check if folder already exists
  const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${rootFolderId}' in parents and trashed=false`;
  const existing = await drive.files.list({ q: query, fields: 'files(id, name)', spaces: 'drive' });

  if (existing.data.files?.length > 0) {
    return existing.data.files[0].id;
  }

  // Create the folder
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
    },
    fields: 'id',
  });

  return folder.data.id;
}
