import { Request, Response } from 'express';
import { Event } from '../models/Event.model';
import { Notification } from '../models/Notification.model';
import { Newsletter } from '../models/Newsletter.model';
import { User } from '../models/User.model';
import { AuthRequest } from '../middleware/auth';
import { sendMail } from '../utils/mailer';
import { config } from '../config';
import { logger } from '../utils/logger';

export const getEvents = async (req: Request, res: Response) => {
  try {
    const { status, province, limit = '10', page = '1', upcoming } = req.query;
    const filter: Record<string, unknown> = { isPublic: true };

    if (upcoming === 'true') {
      /* SangoPage public view: show UPCOMING + ONGOING events with future (or today) date */
      filter.status = { $in: ['UPCOMING', 'ONGOING'] };
      filter.date   = { $gte: new Date(new Date().setHours(0, 0, 0, 0)) };
    } else {
      if (status) filter.status = status;
    }
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

    const mapped = events.map(e => ({ ...e, id: e._id.toString() }));
    res.json({ events: mapped, pagination: { page: pageNum, limit: limitNum, total } });
  } catch (err) {
    logger.error('Get events error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getEvent = async (req: Request, res: Response) => {
  try {
    const event = await Event.findById(req.params.id).populate('author', 'fullName avatar').lean();
    if (!event) return res.status(404).json({ message: 'Événement introuvable' });
    res.json({ ...event, id: event._id.toString() });
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

    /* ── Notifications asynchrones (fire-and-forget) ── */
    setImmediate(async () => {
      try {
        const eventDate = new Date(date).toLocaleDateString('fr-FR', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        });

        /* 1. Notifications in-app pour tous les utilisateurs actifs */
        const users = await User.find({ isBanned: false }).select('_id').lean();
        if (users.length > 0) {
          const notifications = users.map(u => ({
            userId: u._id,
            title: `📅 Nouvel événement : ${title}`,
            body: `${location} · ${eventDate}`,
            type: 'EVENT',
            data: { eventId: event._id.toString() },
            isRead: false,
          }));
          await Notification.insertMany(notifications, { ordered: false });

          const io = (global as Record<string, unknown>).io as { emit: (ev: string, data: unknown) => void } | undefined;
          io?.emit('new_event', { eventId: event._id, title, date, location });
        }

        /* 2. Email aux abonnés newsletter actifs */
        const subscribers = await Newsletter.find({ isActive: true }).select('email unsubscribeToken').lean();
        if (subscribers.length > 0 && config.email.user) {
          const unsubBase = `${config.frontendUrl}/newsletter/unsubscribe`;

          const html = (unsubToken: string) => `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;background:#f3f4f6}
    .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)}
    .hd{background:linear-gradient(135deg,#dc2626,#991b1b);padding:28px 36px;text-align:center}
    .hd h1{color:#fff;font-size:20px;font-weight:900;margin-bottom:4px}
    .hd p{color:#fca5a5;font-size:12px}
    .bd{padding:28px 36px}
    .badge{display:inline-block;background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:18px;text-transform:uppercase;letter-spacing:.5px}
    .title{font-size:20px;font-weight:900;color:#111;margin-bottom:16px;line-height:1.3}
    .info{background:#f9fafb;border-left:3px solid #dc2626;border-radius:8px;padding:12px 16px;margin-bottom:10px}
    .info-label{font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:700;letter-spacing:.5px}
    .info-val{font-size:14px;color:#111;font-weight:600;margin-top:3px}
    .desc{font-size:14px;color:#374151;line-height:1.7;margin:16px 0}
    .cta{text-align:center;margin:24px 0 8px}
    .btn{display:inline-block;background:#dc2626;color:#fff;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px}
    ${registrationLink ? '' : ''}
    .ft{background:#111827;padding:18px;text-align:center}
    .ft p{color:#6b7280;font-size:10px;margin-top:4px}
    .unsub{color:#6b7280;font-size:10px;text-decoration:underline}
  </style>
</head>
<body>
<div class="wrap">
  <div class="hd">
    <h1>Dynamique Israël Mutombo</h1>
    <p>Nouvel événement annoncé</p>
  </div>
  <div class="bd">
    <span class="badge">📅 Événement à venir</span>
    <p class="title">${title}</p>

    <div class="info"><div class="info-label">Date</div><div class="info-val">📅 ${eventDate}</div></div>
    <div class="info"><div class="info-label">Lieu</div><div class="info-val">📍 ${location}</div></div>
    ${province ? `<div class="info"><div class="info-label">Province</div><div class="info-val">🗺️ ${province}</div></div>` : ''}

    <p class="desc">${description.replace(/\n/g, '<br>')}</p>

    ${registrationLink
      ? `<div class="cta"><a class="btn" href="${registrationLink}">S'inscrire à l'événement →</a></div>`
      : `<div class="cta"><a class="btn" href="${config.frontendUrl}/#events">Voir tous les événements →</a></div>`
    }
  </div>
  <div class="ft">
    <p style="color:#9ca3af;font-size:12px">Dynamique Israël Mutombo · RDC · 2026</p>
    <p>Unité · Résistance · Discipline · Loyauté · Engagement</p>
    <p style="margin-top:10px"><a class="unsub" href="${unsubBase}/${unsubToken}">Se désabonner de la newsletter</a></p>
  </div>
</div>
</body></html>`;

          /* Envoi par lots de 50 pour éviter les timeouts SMTP */
          const BATCH = 50;
          for (let i = 0; i < subscribers.length; i += BATCH) {
            const batch = subscribers.slice(i, i + BATCH);
            await Promise.allSettled(
              batch.map(s => sendMail(s.email, `📅 Événement : ${title}`, html(s.unsubscribeToken)))
            );
          }
          logger.info(`Notifications événement envoyées à ${subscribers.length} abonnés`);
        }
      } catch (notifErr) {
        logger.error('Event notification error', notifErr);
      }
    });

    res.status(201).json({ ...event.toObject(), id: event._id.toString() });
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
    res.json({ ...event.toObject(), id: event._id.toString() });
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
