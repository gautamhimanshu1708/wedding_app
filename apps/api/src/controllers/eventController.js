import { WeddingEvent } from '../models/Event.js';
import { Photo } from '../models/Photo.js';
import { createEventSchema } from '@wedding/shared';

export async function getEvents(req, res, next) {
  try {
    const weddingId = req.wedding?._id || req.params.weddingId;
    if (!weddingId) {
      return res.status(400).json({ success: false, error: 'Wedding ID required' });
    }
    const events = await WeddingEvent.find({ weddingId }).sort({ date: 1 }).lean();

    // Fetch photo counts for each event safely
    let countMap = new Map();
    try {
      const photoCounts = await Photo.aggregate([
        { $match: { weddingId, publicationStatus: 'published' } },
        { $group: { _id: '$eventId', count: { $sum: 1 } } },
      ]);
      countMap = new Map(
        photoCounts
          .filter((p) => p._id != null)
          .map((p) => [p._id.toString(), p.count])
      );
    } catch (aggErr) {
      // Aggregation fallback for memory store
    }

    const eventsWithCounts = (events || []).map((event) => ({
      ...event,
      photoCount: countMap.get(event._id?.toString()) || 0,
    }));

    res.json({
      success: true,
      data: eventsWithCounts,
    });
  } catch (err) {
    next(err);
  }
}

export async function createEvent(req, res, next) {
  try {
    const weddingId = req.wedding?._id || req.wedding?.id || req.params.weddingId;
    if (!weddingId) {
      return res.status(400).json({ success: false, error: 'Wedding context missing. Please refresh and try again.' });
    }

    const validated = createEventSchema.parse(req.body);
    const event = await WeddingEvent.create({
      ...validated,
      weddingId,
    });

    res.status(201).json({
      success: true,
      data: event,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateEvent(req, res, next) {
  try {
    const { eventId } = req.params;
    const event = await WeddingEvent.findOne({
      _id: eventId,
      weddingId: req.wedding._id,
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    if (req.body.name) event.name = req.body.name;
    if (req.body.description !== undefined) event.description = req.body.description;
    if (req.body.date) event.date = req.body.date;
    if (req.body.coverImage !== undefined) event.coverImage = req.body.coverImage;
    if (req.body.status) event.status = req.body.status;

    await event.save();

    res.json({
      success: true,
      data: event,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteEvent(req, res, next) {
  try {
    const { eventId } = req.params;
    const event = await WeddingEvent.findOneAndDelete({
      _id: eventId,
      weddingId: req.wedding._id,
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}
