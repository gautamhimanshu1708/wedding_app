import crypto from 'crypto';
import { QRCode } from '../models/QRCode.js';
import { WeddingEvent } from '../models/Event.js';
import { Wedding } from '../models/Wedding.js';

/**
 * GET /weddings/:weddingId/events/:eventId/qrcodes
 * List all QR codes for a specific event
 */
export async function getEventQRCodes(req, res, next) {
  try {
    const { eventId } = req.params;
    const weddingId = req.wedding._id;

    let qrcodes = await QRCode.find({ weddingId, eventId }).sort({ createdAt: -1 });

    // If none exist yet for this event, auto-generate a primary QR
    if (!qrcodes || qrcodes.length === 0) {
      const primaryQR = await QRCode.create({
        weddingId,
        eventId,
        token: crypto.randomBytes(6).toString('hex'),
        label: 'Main Ceremony QR',
        isActive: true,
      });
      qrcodes = [primaryQR];
    }

    res.json({
      success: true,
      data: qrcodes,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /weddings/:weddingId/events/:eventId/qrcodes
 * Create a new QR code for an event with custom label
 */
export async function createEventQRCode(req, res, next) {
  try {
    const { eventId } = req.params;
    const { label } = req.body;
    const weddingId = req.wedding._id;

    const event = await WeddingEvent.findOne({ _id: eventId, weddingId });
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const token = crypto.randomBytes(6).toString('hex');
    const qrCode = await QRCode.create({
      weddingId,
      eventId,
      token,
      label: label?.trim() || `Station QR #${Date.now().toString().slice(-4)}`,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      data: qrCode,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /weddings/:weddingId/events/:eventId/qrcodes/:qrId/toggle
 * Toggle active/inactive status of a QR code
 */
export async function toggleQRCodeStatus(req, res, next) {
  try {
    const { qrId } = req.params;
    const weddingId = req.wedding._id;

    const qr = await QRCode.findOne({ _id: qrId, weddingId });
    if (!qr) {
      return res.status(404).json({ success: false, error: 'QR Code not found' });
    }

    qr.isActive = !qr.isActive;
    await qr.save();

    res.json({
      success: true,
      data: qr,
      message: `QR Code ${qr.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /weddings/:weddingId/events/:eventId/qrcodes/:qrId
 * Remove a specific QR code
 */
export async function deleteQRCode(req, res, next) {
  try {
    const { qrId } = req.params;
    const weddingId = req.wedding._id;

    const deleted = await QRCode.findOneAndDelete({ _id: qrId, weddingId });
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'QR Code not found' });
    }

    res.json({
      success: true,
      message: 'QR Code deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /qr/verify/:token
 * Public validation endpoint for in-browser scanner or scanned link
 */
export async function verifyScannedQR(req, res, next) {
  try {
    const { token } = req.params;

    const qr = await QRCode.findOne({ token });
    if (!qr) {
      return res.status(404).json({
        success: false,
        valid: false,
        error: 'Invalid QR code. No celebration matching this code was found.',
      });
    }

    if (!qr.isActive) {
      return res.status(403).json({
        success: false,
        valid: false,
        error: 'This QR code has been paused or deactivated by the host.',
        code: 'QR_DEACTIVATED',
      });
    }

    // Increment scan count
    qr.scansCount = (qr.scansCount || 0) + 1;
    await qr.save();

    const [wedding, event] = await Promise.all([
      Wedding.findById(qr.weddingId),
      WeddingEvent.findById(qr.eventId),
    ]);

    if (!wedding || !event) {
      return res.status(404).json({
        success: false,
        valid: false,
        error: 'Associated event or wedding is no longer available.',
      });
    }

    res.json({
      success: true,
      valid: true,
      data: {
        qr: {
          id: qr._id,
          token: qr.token,
          label: qr.label,
          isActive: qr.isActive,
        },
        wedding: {
          id: wedding._id,
          title: wedding.title,
          slug: wedding.slug,
          venue: wedding.venue,
          theme: wedding.theme,
        },
        event: {
          id: event._id,
          name: event.name,
          description: event.description,
          date: event.date,
          status: event.status,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
