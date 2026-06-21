import { Request, Response } from 'express';
import { Innovation } from '../models/Innovation.model';
import { AuthRequest } from '../middleware/auth';
import { addPoints, POINTS, awardInnovatorBadge } from '../utils/reputation';
import { logger } from '../utils/logger';
import { Types } from 'mongoose';

export const createInnovation = async (req: AuthRequest, res: Response) => {
  try {
    const {
      title, description, category, province,
      problemStatement, targetAudience, developmentStage,
      expectedImpact, resourcesNeeded, demoUrl,
    } = req.body;
    const mediaUrls = req.files ? (req.files as Express.Multer.File[]).map((f) => `/uploads/${f.filename}`) : [];

    const innovation = await Innovation.create({
      title, description, category,
      province: province || undefined,
      problemStatement: problemStatement || undefined,
      targetAudience: targetAudience || undefined,
      developmentStage: developmentStage || undefined,
      expectedImpact: expectedImpact || undefined,
      resourcesNeeded: resourcesNeeded || undefined,
      demoUrl: demoUrl || undefined,
      mediaUrls,
      author: req.user!.userId,
    });

    await innovation.populate('author', 'fullName avatar');
    res.status(201).json(innovation);
  } catch (err) {
    logger.error('Create innovation error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getInnovations = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '15', category, validated } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
    if (validated !== undefined) filter.isValidated = validated === 'true';

    const [innovations, total] = await Promise.all([
      Innovation.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('author', 'fullName avatar')
        .lean(),
      Innovation.countDocuments(filter),
    ]);

    const enriched = innovations.map((i) => ({ ...i, _count: { votes: i.votes?.length ?? 0 } }));
    res.json({ innovations: enriched, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getInnovation = async (req: Request, res: Response) => {
  try {
    const innovation = await Innovation.findById(req.params.id).populate('author', 'fullName avatar').lean();
    if (!innovation) return res.status(404).json({ message: 'Innovation introuvable' });
    res.json({ ...innovation, _count: { votes: innovation.votes?.length ?? 0 } });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const voteInnovation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = new Types.ObjectId(req.user!.userId);
    const innovation = await Innovation.findById(req.params.id);
    if (!innovation) return res.status(404).json({ message: 'Innovation introuvable' });

    const idx = innovation.votes.findIndex((v) => v.user.toString() === userId.toString());
    if (idx >= 0) {
      innovation.votes.splice(idx, 1);
    } else {
      innovation.votes.push({ user: userId, value: 1 });
      await addPoints(req.user!.userId, POINTS.VOTE);
    }

    await innovation.save();
    res.json({ totalVotes: innovation.votes.length, voted: idx < 0 });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const validateInnovation = async (req: AuthRequest, res: Response) => {
  try {
    const { mentorNote } = req.body;
    const innovation = await Innovation.findById(req.params.id);
    if (!innovation) return res.status(404).json({ message: 'Innovation introuvable' });

    innovation.isValidated = true;
    innovation.mentorNote = mentorNote;
    await innovation.save();

    await addPoints(innovation.author.toString(), POINTS.INNOVATION_VALIDATED);
    await awardInnovatorBadge(innovation.author.toString());
    res.json(innovation);
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
