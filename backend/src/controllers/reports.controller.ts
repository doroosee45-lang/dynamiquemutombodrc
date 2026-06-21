import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { Report, IReport, IVote } from '../models/Report.model';
import { Comment, IComment } from '../models/Comment.model';
import { AuthRequest } from '../middleware/auth';
import { addPoints, POINTS } from '../utils/reputation';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getCache, setCache, deleteCachePattern } from '../utils/redis';
import { Types } from 'mongoose';

interface AggItem { _id: string; count: number }

const hashIp = (ip: string) =>
  crypto.createHash('sha256').update(ip + 'dynamique_salt').digest('hex').slice(0, 16);

const analyzeWithAI = async (title: string, description: string, category: string) => {
  try {
    const r = await axios.post(`${config.aiServiceUrl}/analyze`, { title, description, category }, { timeout: 5000 });
    return r.data as { confidence_score: number; is_duplicate: boolean; sentiment: string; tags: string[]; summary?: string };
  } catch {
    return { confidence_score: 0.7, is_duplicate: false, sentiment: 'NEUTRAL', tags: [], summary: undefined };
  }
};

export const createReport = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, category, province, district, commune, address, latitude, longitude, isAnonymous } = req.body;
    const mediaUrls = req.files ? (req.files as Express.Multer.File[]).map((f) => `/uploads/${f.filename}`) : [];
    const ai = await analyzeWithAI(title, description, category);

    const report = await Report.create({
      title, description, category, province,
      district: district || undefined,
      commune: commune || undefined,
      address: address || undefined,
      latitude: latitude ? parseFloat(latitude as string) : undefined,
      longitude: longitude ? parseFloat(longitude as string) : undefined,
      mediaUrls,
      isAnonymous: isAnonymous === 'true',
      ipHash: hashIp(req.ip || ''),
      author: req.user!.userId,
      confidenceScore: ai.confidence_score,
      isFlagged: ai.confidence_score < 0.4,
      flagReason: ai.confidence_score < 0.4 ? 'Score de confiance IA faible' : undefined,
      aiTags: ai.tags,
      aiSentiment: ai.sentiment,
      aiSummary: ai.summary,
    });

    await report.populate('author', 'fullName avatar');
    await deleteCachePattern('reports:*').catch(() => null);
    res.status(201).json(report);
  } catch (err) {
    logger.error('Create report error', err);
    res.status(500).json({ message: 'Erreur lors de la création du signalement' });
  }
};

export const getReports = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', category, status, province, district, startDate, endDate, search, sortBy = 'createdAt' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (province) filter.province = province;
    if (district) filter.district = district;
    if (search) filter.$or = [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
    if (startDate || endDate) {
      filter.createdAt = {
        ...(startDate && { $gte: new Date(String(startDate)) }),
        ...(endDate && { $lte: new Date(String(endDate)) }),
      };
    }

    const sortField = sortBy === 'votes' ? 'votes' : String(sortBy);
    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ [sortField]: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('author', 'fullName avatar')
        .lean<IReport[]>(),
      Report.countDocuments(filter),
    ]);

    const enriched = reports.map((r: IReport) => ({
      ...r,
      _count: { votes: r.votes?.length ?? 0, comments: 0 },
    }));

    res.json({ reports: enriched, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    logger.error('Get reports error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getReport = async (req: Request, res: Response) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('author', 'fullName avatar reputationPoints')
      .populate('moderatorId', 'fullName')
      .lean<IReport>();

    if (!report) return res.status(404).json({ message: 'Signalement introuvable' });

    const [comments, replies] = await Promise.all([
      Comment.find({ reportId: report._id, isApproved: true, parentId: null })
        .populate('author', 'fullName avatar')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean<IComment[]>(),
      Comment.find({ reportId: report._id, isApproved: true, parentId: { $ne: null } })
        .populate('author', 'fullName avatar')
        .lean<IComment[]>(),
    ]);

    const commentsWithReplies = comments.map((c: IComment) => ({
      ...c,
      replies: replies.filter((r: IComment) => r.parentId?.toString() === c._id.toString()),
      _count: { votes: c.votes?.length ?? 0 },
    }));

    await Report.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });

    res.json({ ...report, comments: commentsWithReplies, _count: { votes: report.votes?.length ?? 0, comments: comments.length } });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateReportStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status, note } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Signalement introuvable' });

    report.statusHistory.push({
      oldStatus: report.status,
      newStatus: status,
      note,
      changedBy: new Types.ObjectId(req.user!.userId),
      createdAt: new Date(),
    });
    report.status = status;
    report.moderatorId = new Types.ObjectId(req.user!.userId);
    report.moderatorNote = note;
    if (status === 'RESOLVED') report.resolvedAt = new Date();
    await report.save();

    if (status === 'VERIFIED' && report.author) await addPoints(report.author.toString(), POINTS.REPORT_VALIDATED);
    if (status === 'RESOLVED' && report.author) await addPoints(report.author.toString(), POINTS.REPORT_RESOLVED);

    await deleteCachePattern('reports:*').catch(() => null);
    res.json(report);
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const voteReport = async (req: AuthRequest, res: Response) => {
  try {
    const { value = 1 } = req.body;
    const userId = req.user!.userId;
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Signalement introuvable' });

    const idx = report.votes.findIndex((v: IVote) => v.user.toString() === userId);
    if (idx >= 0) {
      report.votes.splice(idx, 1);
      await report.save();
      return res.json({ message: 'Vote retiré', voted: false, totalVotes: report.votes.length });
    }

    report.votes.push({ user: new Types.ObjectId(userId), value: value as 1 | -1 });
    await report.save();
    await addPoints(userId, POINTS.VOTE);

    res.json({ message: 'Vote enregistré', voted: true, totalVotes: report.votes.length });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { content, parentId } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Signalement introuvable' });

    const comment = await Comment.create({
      content,
      reportId: req.params.id,
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

export const getMapData = async (req: Request, res: Response) => {
  try {
    const { province, category, status, startDate, endDate } = req.query;
    const cacheKey = `map:${province}:${category}:${status}`;
    const cached = await getCache(cacheKey).catch(() => null);
    if (cached) return res.json(cached);

    const filter: Record<string, unknown> = { latitude: { $exists: true, $ne: null }, longitude: { $exists: true, $ne: null } };
    if (province) filter.province = province;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {
        ...(startDate && { $gte: new Date(String(startDate)) }),
        ...(endDate && { $lte: new Date(String(endDate)) }),
      };
    }

    const points = await Report.find(filter)
      .select('_id title category status latitude longitude province createdAt votes')
      .limit(2000)
      .lean<IReport[]>();

    const result = points.map((p: IReport) => ({ ...p, _count: { votes: p.votes?.length ?? 0 } }));
    await setCache(cacheKey, result, 60).catch(() => null);
    res.json(result);
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getHeatmapData = async (req: Request, res: Response) => {
  try {
    const province = req.query.province as string | undefined;
    const filter: Record<string, unknown> = { latitude: { $exists: true, $ne: null }, longitude: { $exists: true, $ne: null } };
    if (province) filter.province = province;

    const points = await Report.find(filter).select('latitude longitude').limit(5000).lean<Pick<IReport, 'latitude' | 'longitude'>[]>();
    res.json(points.map((p) => ({ lat: p.latitude, lng: p.longitude, weight: 1 })));
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getReportStats = async (req: Request, res: Response) => {
  try {
    const province = req.query.province as string | undefined;
    const baseFilter: Record<string, unknown> = province ? { province } : {};

    const [total, byStatus, byCategory, byProvince, recentTrend] = await Promise.all([
      Report.countDocuments(baseFilter),
      Report.aggregate<AggItem>([{ $match: baseFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Report.aggregate<AggItem>([{ $match: baseFilter }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
      Report.aggregate<AggItem>([{ $group: { _id: '$province', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
      Report.aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) }, ...baseFilter } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({
      total,
      byStatus: byStatus.map((s: AggItem) => ({ status: s._id, _count: s.count })),
      byCategory: byCategory.map((c: AggItem) => ({ category: c._id, _count: c.count })),
      byProvince: byProvince.map((p: AggItem) => ({ province: p._id, _count: p.count })),
      recentTrend: recentTrend.map((t: { _id: string; count: number }) => ({ date: t._id, count: t.count })),
    });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
