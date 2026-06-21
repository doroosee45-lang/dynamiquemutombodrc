import { Request, Response } from 'express';
import crypto from 'crypto';
import { Newsletter } from '../models/Newsletter.model';
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
    const total   = await Newsletter.countDocuments({ isActive: true });
    const recent  = await Newsletter.find({ isActive: true }).sort({ subscribedAt: -1 }).limit(10).select('email subscribedAt').lean();
    res.json({ total, recent });
  } catch (err) {
    logger.error('Get subscribers error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const sendContact = async (req: Request, res: Response) => {
  try {
    const { fullName, email, phone, subject, message } = req.body;
    if (!fullName || !email || !subject || !message)
      return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis' });

    logger.info('Contact form submission', { fullName, email, subject });
    res.json({ message: 'Message envoyé ! Nous vous répondrons dans les plus brefs délais.' });
  } catch (err) {
    logger.error('Contact form error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
