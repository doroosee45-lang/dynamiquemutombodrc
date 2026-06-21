import { Request, Response } from 'express';
import { Territory } from '../models/Territory.model';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { Types } from 'mongoose';

// Returns { province, district } scope. SUPERADMIN: no restriction. DISTRICT_ADMIN: locked to their district.
const getScope = (req: AuthRequest): { province: string | null; district: string | null } => {
  if (req.user!.role === 'SUPERADMIN') return { province: null, district: null };
  if (req.user!.role === 'DISTRICT_ADMIN') return { province: req.user!.province || null, district: (req.user as any).district || null };
  return { province: req.user!.province || null, district: null };
};
// Legacy helper used by some functions
const getProvinceScope = (req: AuthRequest): string | null => getScope(req).province;

export const listTerritories = async (req: AuthRequest, res: Response) => {
  try {
    const scope = getScope(req);
    const { province, parentId, type, search, flat } = req.query;

    const resolvedProvince = scope.province || (province as string) || undefined;
    if (!resolvedProvince) return res.status(400).json({ message: 'Province requise' });

    const filter: Record<string, unknown> = { province: resolvedProvince };
    if (scope.district) filter.district = scope.district; // DISTRICT_ADMIN: locked to their district
    if (type) filter.type = type;
    if (search) filter.name = { $regex: search, $options: 'i' };

    if (flat !== 'true') {
      // If parentId is explicitly 'root', fetch top-level units (null parentId)
      if (parentId === 'root' || parentId === 'null') filter.parentId = null;
      else if (parentId) filter.parentId = new Types.ObjectId(parentId as string);
      else filter.parentId = null; // default: top-level
    }

    const territories = await Territory.find(filter)
      .sort({ type: 1, name: 1 })
      .populate('createdBy', 'fullName')
      .lean();

    // For flat=true, attach child counts
    if (flat === 'true') {
      const ids = territories.map(t => t._id);
      const childCounts = await Territory.aggregate([
        { $match: { parentId: { $in: ids } } },
        { $group: { _id: '$parentId', count: { $sum: 1 } } },
      ]);
      const countMap = Object.fromEntries(childCounts.map(c => [c._id.toString(), c.count]));
      const enriched = territories.map(t => ({ ...t, childCount: countMap[t._id.toString()] || 0 }));
      return res.json({ territories: enriched, total: enriched.length });
    }

    // Attach child counts for tree navigation
    const idsForCount = territories.map(t => t._id);
    const childCounts = await Territory.aggregate([
      { $match: { parentId: { $in: idsForCount } } },
      { $group: { _id: '$parentId', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(childCounts.map(c => [c._id.toString(), c.count]));
    const enriched = territories.map(t => ({ ...t, childCount: countMap[t._id.toString()] || 0 }));

    res.json({ territories: enriched, total: enriched.length, province: resolvedProvince });
  } catch (err) {
    logger.error('List territories error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getProvinceStats = async (req: AuthRequest, res: Response) => {
  try {
    const scope = getProvinceScope(req);
    const province = scope || (req.params.province as string);
    if (!province) return res.status(400).json({ message: 'Province requise' });

    const stats = await Territory.aggregate([
      { $match: { province } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const totalPop = await Territory.aggregate([
      { $match: { province, population: { $exists: true, $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$population' } } },
    ]);

    res.json({
      province,
      byType: stats.map(s => ({ type: s._id, count: s.count })),
      totalEntries: stats.reduce((acc, s) => acc + s.count, 0),
      estimatedPopulation: totalPop[0]?.total || 0,
    });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const createTerritory = async (req: AuthRequest, res: Response) => {
  try {
    const scope = getScope(req);
    const { name, type, province, parentId, code, population, chief, notes } = req.body;

    const targetProvince = province || scope.province;
    if (!targetProvince) return res.status(400).json({ message: 'Province requise' });
    if (scope.province && targetProvince !== scope.province)
      return res.status(403).json({ message: 'Vous ne pouvez gérer que votre province' });

    if (!name?.trim() || !type)
      return res.status(400).json({ message: 'Nom et type sont requis' });

    // Validate parentId belongs to same province
    if (parentId) {
      const parent = await Territory.findById(parentId);
      if (!parent || parent.province !== targetProvince)
        return res.status(400).json({ message: 'Parent invalide ou hors province' });
    }

    const territory = await Territory.create({
      province: targetProvince,
      district: scope.district || undefined,
      type, name: name.trim(),
      parentId: parentId ? new Types.ObjectId(parentId) : null,
      code: code?.trim() || undefined,
      population: population ? parseInt(population) : undefined,
      chief: chief?.trim() || undefined,
      notes: notes?.trim() || undefined,
      createdBy: new Types.ObjectId(req.user!.userId),
    });

    await territory.populate('createdBy', 'fullName');
    res.status(201).json(territory);
  } catch (err) {
    logger.error('Create territory error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateTerritory = async (req: AuthRequest, res: Response) => {
  try {
    const scope = getProvinceScope(req);
    const territory = await Territory.findById(req.params.id);
    if (!territory) return res.status(404).json({ message: 'Division introuvable' });
    if (scope && territory.province !== scope)
      return res.status(403).json({ message: 'Accès refusé — hors de votre province' });

    const { name, code, population, chief, notes, isActive } = req.body;
    territory.name = name?.trim() || territory.name;
    territory.code = code?.trim() || territory.code;
    territory.population = population !== undefined ? parseInt(population) : territory.population;
    territory.chief = chief?.trim() || territory.chief;
    territory.notes = notes?.trim() || territory.notes;
    if (isActive !== undefined) territory.isActive = isActive === true || isActive === 'true';

    await territory.save();
    await territory.populate('createdBy', 'fullName');
    res.json(territory);
  } catch (err) {
    logger.error('Update territory error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const deleteTerritory = async (req: AuthRequest, res: Response) => {
  try {
    const scope = getProvinceScope(req);
    const territory = await Territory.findById(req.params.id);
    if (!territory) return res.status(404).json({ message: 'Division introuvable' });
    if (scope && territory.province !== scope)
      return res.status(403).json({ message: 'Accès refusé — hors de votre province' });

    // Check children
    const childCount = await Territory.countDocuments({ parentId: territory._id });
    if (childCount > 0)
      return res.status(400).json({ message: `Suppression impossible — ${childCount} sous-division(s) dépendent de cet élément. Supprimez-les d'abord.` });

    await Territory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Division administrative supprimée' });
  } catch (err) {
    logger.error('Delete territory error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getAncestors = async (req: AuthRequest, res: Response) => {
  try {
    const territory = await Territory.findById(req.params.id).lean();
    if (!territory) return res.status(404).json({ message: 'Division introuvable' });

    const ancestors = [];
    let current = territory;
    while (current.parentId) {
      const parent = await Territory.findById(current.parentId).lean();
      if (!parent) break;
      ancestors.unshift(parent);
      current = parent;
    }
    res.json({ ancestors, current: territory });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
