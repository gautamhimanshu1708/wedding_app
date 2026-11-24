import { Wedding } from '../models/Wedding.js';
import { testDriveConfig } from '../services/googleDriveStorage.js';

/**
 * GET /weddings/:weddingId/storage
 * Get current storage status & configuration
 */
export async function getStorageSettings(req, res, next) {
  try {
    const wedding = req.wedding;
    const driveConfig = wedding.driveConfig || {};

    res.json({
      success: true,
      data: {
        storageMode: driveConfig.storageMode || 'local',
        isConnected: Boolean(driveConfig.isConnected),
        folderId: driveConfig.folderId || '',
        clientEmail: driveConfig.clientEmail || '',
        hasPrivateKey: Boolean(driveConfig.privateKey),
        connectedAt: driveConfig.connectedAt || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /weddings/:weddingId/storage/google-drive
 * Save Google Drive credentials and test connection from the portal
 */
export async function setupGoogleDrive(req, res, next) {
  try {
    const wedding = req.wedding;
    const { folderId, clientEmail, privateKey, serviceAccountJson, storageMode = 'google_drive' } = req.body;

    let email = clientEmail?.trim();
    let key = privateKey?.trim();
    let fId = folderId?.trim();

    // Support pasting raw service account JSON directly
    if (serviceAccountJson) {
      try {
        const parsed = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
        if (parsed.client_email) email = parsed.client_email;
        if (parsed.private_key) key = parsed.private_key;
      } catch (jsonErr) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Service Account JSON format. Please paste valid JSON.',
        });
      }
    }

    if (!email || !key) {
      return res.status(400).json({
        success: false,
        error: 'Both Client Email and Private Key are required for Google Drive integration.',
      });
    }

    // Clean folder ID if full Drive URL was pasted
    if (fId && fId.includes('/folders/')) {
      const match = fId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (match) fId = match[1];
    }

    // Test credentials before saving
    const testResult = await testDriveConfig({
      clientEmail: email,
      privateKey: key,
      folderId: fId,
    });

    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        error: `Google Drive verification failed: ${testResult.error}`,
      });
    }

    // Save configuration in wedding document
    wedding.driveConfig = {
      folderId: fId || '',
      clientEmail: email,
      privateKey: key,
      isConnected: true,
      connectedAt: new Date(),
      storageMode,
    };
    await wedding.save();

    res.json({
      success: true,
      message: 'Google Drive connected successfully! Photos will be stored in your Drive folder.',
      data: {
        storageMode,
        isConnected: true,
        folderId: fId,
        clientEmail: email,
        connectedAt: wedding.driveConfig.connectedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /weddings/:weddingId/storage/toggle-mode
 * Switch between Local storage and Google Drive
 */
export async function toggleStorageMode(req, res, next) {
  try {
    const wedding = req.wedding;
    const { storageMode } = req.body;

    if (!['local', 'google_drive'].includes(storageMode)) {
      return res.status(400).json({ success: false, error: 'Invalid storage mode. Choose local or google_drive.' });
    }

    if (storageMode === 'google_drive' && !wedding.driveConfig?.isConnected) {
      return res.status(400).json({
        success: false,
        error: 'Google Drive is not configured yet. Please configure credentials first.',
      });
    }

    wedding.driveConfig = wedding.driveConfig || {};
    wedding.driveConfig.storageMode = storageMode;
    await wedding.save();

    res.json({
      success: true,
      message: `Storage mode switched to ${storageMode}`,
      storageMode,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /weddings/:weddingId/storage/disconnect
 * Disconnect Google Drive credentials and revert to local storage
 */
export async function disconnectGoogleDrive(req, res, next) {
  try {
    const wedding = req.wedding;
    wedding.driveConfig = {
      folderId: '',
      clientEmail: '',
      privateKey: '',
      isConnected: false,
      storageMode: 'local',
      connectedAt: null,
    };
    await wedding.save();

    res.json({
      success: true,
      message: 'Google Drive disconnected successfully. Switched to Local Storage.',
      data: {
        storageMode: 'local',
        isConnected: false,
        folderId: '',
        clientEmail: '',
      },
    });
  } catch (err) {
    next(err);
  }
}
