import { Request, Response } from 'express';
import crypto from 'crypto';
import { Newsletter } from '../models/Newsletter.model';
import { sendMail } from '../utils/mailer';
import { config } from '../config';
import { logger } from '../utils/logger';

export const subscribe = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: 'Adresse email invalide' });

    const existing = await Newsletter.findOne({ email });
    if (existing) {
      if (existing.isActive)
        return res.status(409).json({ message: 'Vous êtes déjà abonné à la newsletter' });
      existing.isActive = true;
      await existing.save();
      return res.json({ message: 'Abonnement réactivé avec succès' });
    }

    const unsubscribeToken = crypto.randomBytes(32).toString('hex');
    await Newsletter.create({ email, unsubscribeToken, subscribedAt: new Date() });

    res.status(201).json({ message: 'Abonnement confirmé ! Vous recevrez nos actualités.' });
  } catch (err) {
    logger.error('Newsletter subscribe error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const unsubscribe = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const sub = await Newsletter.findOneAndUpdate(
      { unsubscribeToken: token },
      { isActive: false },
      { new: true }
    );
    if (!sub) return res.status(404).json({ message: 'Token invalide ou déjà désabonné' });
    res.json({ message: 'Désabonnement effectué avec succès' });
  } catch (err) {
    logger.error('Newsletter unsubscribe error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getSubscribers = async (_req: Request, res: Response) => {
  try {
    const total  = await Newsletter.countDocuments({ isActive: true });
    const recent = await Newsletter.find({ isActive: true }).sort({ subscribedAt: -1 }).limit(10).select('email subscribedAt').lean();
    res.json({ total, recent });
  } catch (err) {
    logger.error('Get subscribers error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const sendContact = async (req: Request, res: Response) => {
  try {
    const { fullName, email, subject, message } = req.body;
    const phone: string | undefined = req.body.phone || undefined;
    if (!fullName || !email || !subject || !message)
      return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis' });

    logger.info('Contact form submission', { fullName, email, subject });

    // Send email to CONTACT_EMAIL asynchronously
    if (config.email.contactEmail) {
      setImmediate(async () => {
        const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:0}
  .wrap{max-width:580px;margin:30px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.1)}
  .hd{background:linear-gradient(135deg,#dc2626,#991b1b);padding:28px 36px;text-align:center}
  .hd h1{color:#fff;margin:0;font-size:20px;font-weight:900}
  .hd p{color:#fca5a5;margin:4px 0 0;font-size:13px}
  .bd{padding:28px 36px}
  .field{background:#f9fafb;border-left:3px solid #dc2626;border-radius:8px;padding:12px 14px;margin-bottom:12px}
  .label{font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:700;letter-spacing:.5px}
  .val{font-size:14px;color:#111;font-weight:600;margin-top:3px}
  .msg{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin-top:8px}
  .msg p{font-size:14px;color:#374151;line-height:1.7;margin:0}
  .ft{background:#111827;padding:18px;text-align:center}
  .ft p{color:#6b7280;font-size:11px;margin:2px 0}
</style></head>
<body><div class="wrap">
  <div class="hd"><h1>Dynamique Israël Mutombo</h1><p>Nouveau message via le formulaire de contact</p></div>
  <div class="bd">
    <div class="field"><div class="label">Nom complet</div><div class="val">${fullName}</div></div>
    <div class="field"><div class="label">Email</div><div class="val"><a href="mailto:${email}" style="color:#dc2626">${email}</a></div></div>
    ${phone ? `<div class="field"><div class="label">Téléphone</div><div class="val">${phone}</div></div>` : ''}
    <div class="field"><div class="label">Sujet</div><div class="val">${subject}</div></div>
    <p style="font-size:13px;font-weight:700;color:#dc2626;margin:16px 0 6px">Message :</p>
    <div class="msg"><p>${message.replace(/\n/g, '<br>')}</p></div>
  </div>
  <div class="ft">
    <p style="color:#9ca3af;font-size:12px">Dynamique Israël Mutombo · RDC · 2026</p>
    <p>Ce message a été envoyé depuis le formulaire de contact du site.</p>
  </div>
</div></body></html>`;
        await sendMail(config.email.contactEmail, `📩 Contact — ${subject} (${fullName})`, html);
      });
    }

    res.json({ message: 'Message envoyé ! Nous vous répondrons dans les plus brefs délais.' });
  } catch (err) {
    logger.error('Contact form error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
