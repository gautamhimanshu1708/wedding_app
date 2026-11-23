import { GuestMessage } from '../models/GuestMessage.js';
import { guestMessageSchema, SOCKET_EVENTS } from '@wedding/shared';
import { broadcastToWedding } from '../sockets/socketHandler.js';

export async function getMessages(req, res, next) {
  try {
    const weddingId = req.wedding._id;
    const messages = await GuestMessage.find({ weddingId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('userId', 'name avatar')
      .lean();

    res.json({
      success: true,
      data: messages,
    });
  } catch (err) {
    next(err);
  }
}

export async function createMessage(req, res, next) {
  try {
    const validated = guestMessageSchema.parse(req.body);
    const weddingId = req.wedding._id;

    const message = await GuestMessage.create({
      weddingId,
      userId: req.user._id,
      message: validated.message,
    });

    const populated = await GuestMessage.findById(message._id)
      .populate('userId', 'name avatar')
      .lean();

    // Broadcast message in real-time
    broadcastToWedding(weddingId.toString(), SOCKET_EVENTS.NEW_GUEST_MESSAGE, {
      message: populated,
    });

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (err) {
    next(err);
  }
}
