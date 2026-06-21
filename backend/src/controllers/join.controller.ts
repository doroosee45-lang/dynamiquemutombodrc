import { Request, Response } from 'express';
import { JoinRequest } from '../models/JoinRequest.model';
import { User } from '../models/User.model';
import { Notification } from '../models/Notification.model';
import { AuthRequest } from '../middleware/auth';
import { sendMail, joinRequestHtml } from '../utils/mailer';
import { config } from '../config';
import { logger } from '../utils/logger';

/* ── Public ─────────────────────────────────────────────────────────── */

export const submitJoinRequest = async (req: Request, res: Response) => {
  try {
    const {
      fullName, firstName, gender, birthDate,
      province, district, commune, quartier, address,
      email, phone, whatsapp, socialMedia,
      motivation, howKnown, skills, availability, previousExperience,
    } = req.body;

    // Basic required field check
    for (const [k, v] of Object.entries({ fullName, firstName, province, email, phone, motivation, howKnown })) {
      if (!v) return res.status(400).json({ message: `Le champ "${k}" est obligatoire` });
    }

    // Duplicate check (same email, still pending)
    const existing = await JoinRequest.findOne({ email: email.toLowerCase(), status: 'PENDING' });
    if (existing) {
      return res.status(409).json({ message: 'Une demande avec cet email est déjà en attente de traitement.' });
    }

    const jr = await JoinRequest.create({
      fullName, firstName, gender, birthDate,
      province, district, commune, quartier, address,
      email: email.toLowerCase(), phone, whatsapp, socialMedia,
      motivation, howKnown, skills, availability, previousExperience,
    });

    // Notify admins asynchronously
    setImmediate(async () => {
      try {
        // Find SUPERADMIN + provincial ADMIN matching the province
        const admins = await User.find({
          isBanned: false,
          $or: [
            { role: 'SUPERADMIN' },
            { role: 'ADMIN', province },
          ],
        }).select('_id email role').lean();

        if (admins.length === 0) return;

        // In-app notifications
        const notifs = admins.map(a => ({
          userId: a._id,
          title: `📋 Nouvelle demande d'adhésion — ${fullName} ${firstName}`,
          body: `Province : ${province} · Email : ${email}`,
          type: 'SYSTEM',
          data: { joinRequestId: jr._id.toString(), province },
          isRead: false,
        }));
        await Notification.insertMany(notifs, { ordered: false });

        // Emit socket event if io available
        const io = (global as Record<string, unknown>).io as { emit?: (e: string, d: unknown) => void } | undefined;
        io?.emit?.('new_join_request', { joinRequestId: jr._id, fullName, firstName, province });

        // Email notifications
        const emailList = admins.map(a => a.email).filter(Boolean) as string[];
        if (emailList.length > 0) {
          const html = joinRequestHtml({
            fullName, firstName, email, phone,
            province, district, commune, quartier,
            motivation, howKnown, skills, availability,
            dashboardUrl: `${config.frontendUrl}/admin/join-requests`,
          });
          await sendMail(emailList, `📋 Nouvelle adhésion — ${fullName} ${firstName} (${province})`, html);
        }
      } catch (err) {
        logger.error('Erreur notification demande adhésion', err);
      }
    });

    res.status(201).json({
      message: 'Votre demande a été soumise avec succès. Vous serez contacté dans les prochains jours.',
      id: jr._id,
    });
  } catch (err) {
    logger.error('Submit join request error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ── Admin ───────────────────────────────────────────────────────────── */

export const listJoinRequests = async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', status, province } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    // Provincial admins only see their province
    if (req.user!.role === 'ADMIN' && req.user!.province) {
      filter.province = req.user!.province;
    } else if (province) {
      filter.province = province;
    }

    const [requests, total] = await Promise.all([
      JoinRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      JoinRequest.countDocuments(filter),
    ]);

    res.json({ requests, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    logger.error('List join requests error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const reviewJoinRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { status, reviewNote } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const jr = await JoinRequest.findByIdAndUpdate(
      req.params.id,
      { status, reviewNote, reviewedBy: req.user!.userId, reviewedAt: new Date() },
      { new: true },
    );
    if (!jr) return res.status(404).json({ message: 'Demande introuvable' });

    res.json(jr);
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
