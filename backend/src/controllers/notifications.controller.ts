import { Response } from 'express';
import { Notification } from '../models/Notification.model';
import { AuthRequest } from '../middleware/auth';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', unread } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const filter: Record<string, unknown> = { userId: req.user!.userId };
    if (unread === 'true') filter.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: req.user!.userId, isRead: false }),
    ]);

    res.json({ notifications, pagination: { page: pageNum, limit: limitNum, total }, unreadCount });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user!.userId }, { isRead: true });
    res.json({ message: 'Notification marquée comme lue' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    await Notification.updateMany({ userId: req.user!.userId, isRead: false }, { isRead: true });
    res.json({ message: 'Toutes les notifications marquées comme lues' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user!.userId });
    res.json({ message: 'Notification supprimée' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user!.userId, isRead: false });
    res.json({ count });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const deleteAllNotifications = async (req: AuthRequest, res: Response) => {
  try {
    await Notification.deleteMany({ userId: req.user!.userId });
    res.json({ message: 'Toutes les notifications supprimées' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
