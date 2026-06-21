import { Request, Response } from 'express';
import { Event } from '../models/Event.model';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export const getEvents = async (req: Request, res: Response) => {
  try {
    const { status, province, limit = '10', page = '1' } = req.query;
    const filter: Record<string, unknown> = { isPublic: true };
    if (status) filter.status = status;
    if (province) filter.province = province;

    const pageNum  = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [events, total] = await Promise.all([
      Event.find(filter)
        .sort({ date: 1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('author', 'fullName avatar')
        .lean(),
      Event.countDocuments(filter),
    ]);

    res.json({ events, pagination: { page: pageNum, limit: limitNum, total } });
  } catch (err) {
    logger.error('Get events error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getEvent = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id).populate('author', 'fullName avatar').lean();
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });
    res.json(event);
  } catch (err) {
    logger.error('Get event error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, date, endDate, location, province, district, imageUrl, status, isPublic, registrationLink } = req.body;
    if (!title || !description || !date || !location)
      return res.status(400).json({ message: 'title, description, date et location sont requis' });

    const event = await Event.create({
      title, description,
      date: new Date(date),
      endDate: endDate ? new Date(endDate) : undefined,
      location, province, district, imageUrl,
      status: status || 'UPCOMING',
      isPublic: isPublic !== false,
      registrationLink,
      author: req.user!.userId,
    });

    await event.populate('author', 'fullName avatar');
    res.status(201).json(event);
  } catch (err) {
    logger.error('Create event error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, date, endDate, location, province, district, imageUrl, status, isPublic, registrationLink } = req.body;
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      {
        title, description,
        date: date ? new Date(date) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        location, province, district, imageUrl, status, isPublic, registrationLink,
      },
      { new: true, omitUndefined: true }
    ).populate('author', 'fullName avatar');

    if (!event) return res.status(404).json({ message: 'Événement introuvable' });
    res.json(event);
  } catch (err) {
    logger.error('Update event error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Événement supprimé' });
  } catch (err) {
    logger.error('Delete event error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
