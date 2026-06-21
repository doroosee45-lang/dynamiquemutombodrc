import { Request, Response } from 'express';
import { Campaign } from '../models/Campaign.model';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { Types } from 'mongoose';

export const createCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, province, district, targetCount, startDate, endDate, hasPetition, petitionTarget, status } = req.body;
    const mediaUrls = req.files ? (req.files as Express.Multer.File[]).map((f) => `/uploads/${f.filename}`) : [];

    const campaign = await Campaign.create({
      title, description, province, district,
      targetCount: targetCount ? parseInt(targetCount as string) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      mediaUrls,
      author: req.user!.userId,
      status: status || 'ACTIVE',
      hasPetition: hasPetition === 'true',
      petitionTarget: petitionTarget ? parseInt(petitionTarget as string) : undefined,
    });

    await campaign.populate('author', 'fullName avatar');
    res.status(201).json(campaign);
  } catch (err) {
    logger.error('Create campaign error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getCampaigns = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '15', status, province } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (province) filter.province = province;

    const [campaigns, total] = await Promise.all([
      Campaign.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('author', 'fullName avatar')
        .lean(),
      Campaign.countDocuments(filter),
    ]);

    const enriched = campaigns.map((c) => ({
      ...c,
      _count: {
        participants: c.participants?.length ?? 0,
        petitionSignatures: c.petitionSignatures?.length ?? 0,
      },
    }));

    res.json({ campaigns: enriched, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getCampaign = async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findById(req.params.id).populate('author', 'fullName avatar').lean();
    if (!campaign) return res.status(404).json({ message: 'Campagne introuvable' });
    res.json(campaign);
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateCampaignStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!campaign) return res.status(404).json({ message: 'Campagne introuvable' });
    res.json(campaign);
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const joinCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const userId = new Types.ObjectId(req.user!.userId);
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campagne introuvable' });
    if (campaign.status !== 'ACTIVE') return res.status(400).json({ message: 'Campagne non active' });

    const already = campaign.participants.some((p) => p.toString() === userId.toString());
    if (already) return res.status(409).json({ message: 'Déjà participant' });

    campaign.participants.push(userId);
    campaign.currentCount = campaign.participants.length;
    await campaign.save();
    res.json({ message: 'Participation enregistrée', count: campaign.currentCount });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const signPetition = async (req: AuthRequest, res: Response) => {
  try {
    const { comment } = req.body;
    const userId = new Types.ObjectId(req.user!.userId);
    const campaign = await Campaign.findById(req.params.petitionId || req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campagne introuvable' });
    if (!campaign.hasPetition) return res.status(400).json({ message: "Cette campagne n'a pas de pétition" });

    const already = campaign.petitionSignatures.some((s) => s.user.toString() === userId.toString());
    if (already) return res.status(409).json({ message: 'Déjà signé' });

    campaign.petitionSignatures.push({ user: userId, comment, signedAt: new Date() });
    await campaign.save();
    res.json({ message: 'Pétition signée', count: campaign.petitionSignatures.length });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
