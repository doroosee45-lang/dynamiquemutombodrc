import { Request, Response } from 'express';
import { Publication } from '../models/Publication.model';
import { Comment } from '../models/Comment.model';
import { Notification } from '../models/Notification.model';
import { User } from '../models/User.model';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export const createPublication = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, excerpt, type, category, province, district, isUrgent, isPinned, tags } = req.body;
    const mediaUrls = req.files ? (req.files as Express.Multer.File[]).map(f => `/uploads/${f.filename}`) : [];

    const pub = await Publication.create({
      title, content,
      excerpt: excerpt || content.slice(0, 200),
      type, category,
      province: province || undefined,
      district: district || undefined,
      isUrgent: isUrgent === 'true',
      isPinned: isPinned === 'true',
      mediaUrls,
      tags: tags ? JSON.parse(tags) : [],
      author: req.user!.userId,
      publishedAt: new Date(),
    });

    await pub.populate('author', 'fullName avatar');

    // Notify all active users asynchronously (fire-and-forget)
    setImmediate(async () => {
      try {
        const users = await User.find({ isBanned: false }).select('_id').lean();
        if (users.length > 0) {
          const notifications = users.map(u => ({
            userId: u._id,
            title: `📰 Nouvelle publication : ${title}`,
            body: (excerpt || content).slice(0, 120),
            type: 'PUBLICATION',
            data: { publicationId: pub._id.toString(), publicationType: type },
            isRead: false,
          }));
          await Notification.insertMany(notifications, { ordered: false });
          const io = (global as Record<string, unknown>).io as { emit: (ev: string, data: unknown) => void } | undefined;
          io?.emit('new_publication', { publicationId: pub._id, title, type });
        }
      } catch (notifErr) {
        logger.error('Publication notification error', notifErr);
      }
    });

    res.status(201).json(pub);
  } catch (err) {
    logger.error('Create publication error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getPublications = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '15', type, category, province, search, urgent } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const filter: Record<string, unknown> = { publishedAt: { $exists: true } };
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (province) filter.province = province;
    if (urgent === 'true') filter.isUrgent = true;
    if (search) filter.$or = [{ title: { $regex: search, $options: 'i' } }, { content: { $regex: search, $options: 'i' } }];

    const [publications, total] = await Promise.all([
      Publication.find(filter)
        .sort({ isPinned: -1, isUrgent: -1, publishedAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('author', 'fullName avatar')
        .lean(),
      Publication.countDocuments(filter),
    ]);

    res.json({ publications, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getPublication = async (req: Request, res: Response) => {
  try {
    const pub = await Publication.findById(req.params.id).populate('author', 'fullName avatar').lean();
    if (!pub) return res.status(404).json({ message: 'Publication introuvable' });

    const comments = await Comment.find({ publicationId: pub._id, isApproved: true, parentId: null })
      .populate('author', 'fullName avatar')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const replies = await Comment.find({ publicationId: pub._id, isApproved: true, parentId: { $ne: null } })
      .populate('author', 'fullName avatar')
      .lean();

    const commentsWithReplies = comments.map(c => ({
      ...c,
      replies: replies.filter(r => r.parentId?.toString() === c._id.toString()),
    }));

    await Publication.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });

    res.json({ ...pub, comments: commentsWithReplies, _count: { comments: comments.length } });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updatePublication = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, excerpt, isUrgent, isPinned } = req.body;
    const pub = await Publication.findByIdAndUpdate(
      req.params.id,
      { title, content, excerpt, isUrgent: isUrgent === 'true', isPinned: isPinned === 'true' },
      { new: true }
    );
    res.json(pub);
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const deletePublication = async (req: AuthRequest, res: Response) => {
  try {
    await Publication.findByIdAndDelete(req.params.id);
    res.json({ message: 'Publication supprimée' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { content, parentId } = req.body;
    const comment = await Comment.create({
      content,
      publicationId: req.params.id,
      parentId: parentId || undefined,
      author: req.user!.userId,
      isApproved: ['MODERATOR', 'EDITOR', 'ADMIN', 'SUPERADMIN'].includes(req.user!.role),
    });
    await comment.populate('author', 'fullName avatar');
    res.status(201).json(comment);
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
