import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { Report } from '../models/Report.model';
import { Publication } from '../models/Publication.model';
import { Comment } from '../models/Comment.model';
import { Notification } from '../models/Notification.model';
import { Newsletter } from '../models/Newsletter.model';
import { Contact } from '../models/Contact.model';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

interface AggItem { _id: string; count: number }

const toStat = (a: AggItem[]) => a.map((x: AggItem) => ({ id: x._id, _count: x.count }));

// ─── Provincial Admins ──────────────────────────────────────────────────────

export const getProvincialAdmins = async (_req: Request, res: Response) => {
  try {
    const admins = await User.find({ role: 'ADMIN' })
      .select('email fullName province district phone bio avatar reputationPoints isBanned createdAt lastLoginAt')
      .lean();

    const reportCounts = await Report.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$province', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(reportCounts.map((r) => [r._id, r.count]));

    const result = admins.map((a) => ({ ...a, reportCount: countMap[a.province || ''] || 0 }));
    res.json({ admins: result, total: result.length });
  } catch (err) {
    logger.error('Get provincial admins error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const createProvincialAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, email, password, province, district, phone, bio } = req.body;
    if (!fullName || !email || !password || !province)
      return res.status(400).json({ message: 'fullName, email, mot de passe et province sont requis' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Cet email est déjà utilisé' });

    const admin = await User.create({
      fullName, email, password, province, district: district || undefined,
      phone: phone || undefined, bio: bio || undefined,
      role: 'ADMIN', isEmailVerified: true, reputationPoints: 0,
    });

    res.status(201).json({ ...admin.toObject(), password: undefined });
  } catch (err) {
    logger.error('Create provincial admin error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateProvincialAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, email, province, district, phone, bio, isBanned, banReason } = req.body;
    const admin = await User.findByIdAndUpdate(
      req.params.id,
      { fullName, email, province, district: district || undefined, phone, bio, isBanned, banReason },
      { new: true }
    ).select('-password -twoFASecret');
    if (!admin) return res.status(404).json({ message: 'Administrateur introuvable' });
    res.json(admin);
  } catch (err) {
    logger.error('Update provincial admin error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const deleteProvincialAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Administrateur introuvable' });
    if (admin.role === 'SUPERADMIN')
      return res.status(403).json({ message: 'Impossible de supprimer un SuperAdmin' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Administrateur provincial supprimé' });
  } catch (err) {
    logger.error('Delete provincial admin error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const resetProvincialAdminPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8)
      return res.status(400).json({ message: 'Mot de passe trop court (min 8 caractères)' });
    const admin = await User.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Administrateur introuvable' });
    admin.password = password;
    await admin.save();
    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (err) {
    logger.error('Reset password error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const getDashboard = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totalUsers, totalReports, totalPublications, newsletterTotal, unreadContacts] = await Promise.all([
      User.countDocuments(),
      Report.countDocuments(),
      Publication.countDocuments(),
      Newsletter.countDocuments({ isActive: true }),
      Contact.countDocuments({ isRead: false }),
    ]);

    const [reportsByStatus, reportsByCategory, reportsByProvince] = await Promise.all([
      Report.aggregate<AggItem>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Report.aggregate<AggItem>([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      Report.aggregate<AggItem>([{ $group: { _id: '$province', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
    ]);

    const [recentReports, recentUsers, last30Days, activeProvinces, urgentPublications, recentContacts] = await Promise.all([
      Report.find().sort({ createdAt: -1 }).limit(10).populate('author', 'fullName').lean(),
      User.find().sort({ createdAt: -1 }).limit(10).select('fullName email role province createdAt').lean(),
      Report.aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Report.aggregate<AggItem>([
        { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } } },
        { $group: { _id: '$province', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Publication.find({ isUrgent: true }).sort({ publishedAt: -1 }).limit(10)
        .select('title excerpt type publishedAt author')
        .populate('author', 'fullName')
        .lean(),
      Contact.find().sort({ createdAt: -1 }).limit(15).lean(),
    ]);

    res.json({
      stats: { totalUsers, totalReports, totalPublications, newsletterTotal, unreadContacts },
      reportsByStatus: toStat(reportsByStatus),
      reportsByCategory: toStat(reportsByCategory),
      reportsByProvince: toStat(reportsByProvince),
      recentReports, recentUsers,
      last30Days: last30Days.map((d: AggItem) => ({ date: d._id, count: d.count })),
      activeProvinces: toStat(activeProvinces),
      urgentPublications,
      recentContacts,
    });
  } catch (err) {
    logger.error('Dashboard error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getProvinceDashboard = async (req: Request, res: Response) => {
  try {
    const { province } = req.params;

    const [total, byStatus, byCategory, recent, topReporters] = await Promise.all([
      Report.countDocuments({ province }),
      Report.aggregate<AggItem>([{ $match: { province } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Report.aggregate<AggItem>([{ $match: { province } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
      Report.find({ province }).sort({ createdAt: -1 }).limit(10).populate('author', 'fullName').lean(),
      User.find({ province }).sort({ reputationPoints: -1 }).limit(10).select('fullName reputationPoints badges').lean(),
    ]);

    res.json({ province, total, byStatus: toStat(byStatus), byCategory: toStat(byCategory), recent, topReporters });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getDistrictDashboard = async (req: Request, res: Response) => {
  try {
    const { district } = req.params;

    const [total, byStatus, byCategory, recent] = await Promise.all([
      Report.countDocuments({ district }),
      Report.aggregate<AggItem>([{ $match: { district } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Report.aggregate<AggItem>([{ $match: { district } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
      Report.find({ district }).sort({ createdAt: -1 }).limit(10).populate('author', 'fullName').lean(),
    ]);

    res.json({ district, total, byStatus: toStat(byStatus), byCategory: toStat(byCategory), recent });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const listUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', role, province, district, search, banned } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const filter: Record<string, unknown> = {};

    // Scope by caller's role
    const callerRole = req.user?.role;
    if (callerRole === 'DISTRICT_ADMIN') {
      filter.province = req.user!.province;
      filter.district = (req.user as any).district;
    } else if (callerRole === 'ADMIN') {
      filter.province = req.user!.province;
    }
    // SUPERADMIN: no automatic scope — optional filters applied below

    if (role) filter.role = role;
    if (!filter.province && province) {
      // Accept both enum value ('KINSHASA') and label variants ('Kinshasa', 'Nord-Kivu')
      const norm = normalizeProvince(province as string);
      filter.province = { $in: [norm, province as string] };
    }
    if (!filter.district && district) filter.district = district;
    if (banned !== undefined) filter.isBanned = banned === 'true';
    if (search) filter.$or = [{ fullName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select('email fullName role province district commune isBanned banReason reputationPoints isEmailVerified createdAt lastLoginAt')
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({ users, pagination: { page: pageNum, limit: limitNum, total }, scope: { province: filter.province, district: filter.district } });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const createMember = async (req: AuthRequest, res: Response) => {
  try {
    const callerRole = req.user?.role;
    const { fullName, email, password, phone, commune, bio } = req.body;
    if (!fullName || !email || !password)
      return res.status(400).json({ message: 'Nom complet, email et mot de passe sont requis' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Cet email est déjà utilisé' });

    // Province / district auto-set from caller scope
    const province = callerRole === 'SUPERADMIN' ? req.body.province : req.user!.province;
    const district = callerRole === 'DISTRICT_ADMIN' ? (req.user as any).district : (req.body.district || undefined);

    const member = await User.create({
      fullName, email, password, phone: phone || undefined,
      bio: bio || undefined, commune: commune || undefined,
      province, district,
      role: 'CITIZEN', isEmailVerified: true,
    });

    const safe = member.toObject() as unknown as Record<string, unknown>;
    delete safe.password;
    res.status(201).json(safe);
  } catch (err) {
    logger.error('Create member error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { role, isBanned, banReason } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role, isBanned, banReason }, { new: true }).select('email fullName role isBanned');
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getPendingComments = async (_req: Request, res: Response) => {
  try {
    const comments = await Comment.find({ isApproved: false, isFlagged: false })
      .populate('author', 'fullName')
      .populate('reportId', 'title')
      .populate('publicationId', 'title')
      .sort({ createdAt: 1 })
      .limit(50)
      .lean();
    res.json(comments);
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const moderateComment = async (req: AuthRequest, res: Response) => {
  try {
    const { action } = req.body;
    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { isApproved: action === 'approve', isFlagged: action === 'flag' },
      { new: true }
    );
    res.json(comment);
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const exportReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const { province, startDate, endDate, format = 'json' } = req.query;
    const filter: Record<string, unknown> = {};
    if (province) filter.province = province;
    if (startDate || endDate) {
      filter.createdAt = {
        ...(startDate && { $gte: new Date(String(startDate)) }),
        ...(endDate && { $lte: new Date(String(endDate)) }),
      };
    }

    const reports = await Report.find(filter).populate('author', 'fullName email').sort({ createdAt: -1 }).lean();

    if (format === 'csv') {
      const header = 'ID,Titre,Catégorie,Statut,Province,District,Date,Auteur\n';
      type PopulatedReport = typeof reports[number] & { author: { fullName?: string } | null };
      const rows = (reports as PopulatedReport[]).map((r) => {
        const name = r.author?.fullName ?? 'Anonyme';
        return `${r._id},"${r.title}",${r.category},${r.status},${r.province},${r.district ?? ''},${new Date(r.createdAt).toISOString()},"${name}"`;
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=rapports-dynamique.csv');
      res.send(header + rows);
      return;
    }

    res.json(reports);
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const sendBroadcastNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { title, body, province, district, type = 'BROADCAST' } = req.body;
    const filter: Record<string, unknown> = {};
    if (province) filter.province = province;
    if (district) filter.district = district;

    const users = await User.find(filter).select('_id').lean();
    const docs = users.map((u: { _id: unknown }) => ({ userId: u._id, title, body, type }));
    await Notification.insertMany(docs);

    res.json({ message: `Notification envoyée à ${users.length} membre(s)`, count: users.length });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ─── Member Stats (province breakdown + Kinshasa district breakdown) ──────────

// Normalize a province string to its canonical uppercase enum value
// e.g. 'Kinshasa' -> 'KINSHASA', 'Nord-Kivu' -> 'NORD_KIVU', 'Kinshasa (Capitale)' -> 'KINSHASA'
const PROVINCE_LABEL_TO_VALUE: Record<string, string> = {
  'kinshasa': 'KINSHASA',
  'kinshasa (capitale)': 'KINSHASA',
  'kinshasa-ville': 'KINSHASA',
  'kongo-central': 'KONGO_CENTRAL',
  'kongo central': 'KONGO_CENTRAL',
  'nord-kivu': 'NORD_KIVU',
  'nord kivu': 'NORD_KIVU',
  'sud-kivu': 'SUD_KIVU',
  'sud kivu': 'SUD_KIVU',
  'nord-ubangi': 'NORD_UBANGI',
  'sud-ubangi': 'SUD_UBANGI',
  'haut-uele': 'HAUT_UELE',
  'haut-uélé': 'HAUT_UELE',
  'bas-uele': 'BAS_UELE',
  'bas-uélé': 'BAS_UELE',
  'haut-lomami': 'HAUT_LOMAMI',
  'haut-katanga': 'HAUT_KATANGA',
  'maï-ndombe': 'MAI_NDOMBE',
  'mai-ndombe': 'MAI_NDOMBE',
  'kasaï': 'KASAI',
  'kasai': 'KASAI',
  'kasaï-central': 'KASAI_CENTRAL',
  'kasai-central': 'KASAI_CENTRAL',
  'kasaï-oriental': 'KASAI_ORIENTAL',
  'kasai-oriental': 'KASAI_ORIENTAL',
  'équateur': 'EQUATEUR',
  'equateur': 'EQUATEUR',
};
const normalizeProvince = (p: string): string => {
  if (!p) return p;
  return PROVINCE_LABEL_TO_VALUE[p.toLowerCase()] || p.toUpperCase().replace(/[\s-]/g, '_');
};

export const getMemberStats = async (_req: Request, res: Response) => {
  try {
    // First pull raw data then normalize in JS (simpler than complex MongoDB aggregation)
    const [rawByProvince, rawKinshasaDistrict, byRole, total] = await Promise.all([
      // Raw province counts — will be normalized below
      User.aggregate<{ _id: string; count: number; citizens: number }>([
        { $match: { province: { $exists: true, $nin: [null, ''] } } },
        { $group: {
          _id: '$province',
          count: { $sum: 1 },
          citizens: { $sum: { $cond: [{ $eq: ['$role', 'CITIZEN'] }, 1, 0] } },
        }},
      ]),
      // Kinshasa breakdown by district — match all Kinshasa variants
      User.aggregate<{ _id: string; count: number }>([
        { $match: { province: { $in: ['KINSHASA', 'Kinshasa', 'Kinshasa (Capitale)', 'kinshasa'] }, district: { $exists: true, $nin: [null, ''] } } },
        { $group: { _id: '$district', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      User.countDocuments(),
    ]);

    // Merge province counts after normalizing keys
    const provinceMap: Record<string, { count: number; citizens: number }> = {};
    for (const p of rawByProvince) {
      const key = normalizeProvince(p._id);
      if (!provinceMap[key]) provinceMap[key] = { count: 0, citizens: 0 };
      provinceMap[key].count += p.count;
      provinceMap[key].citizens += p.citizens;
    }
    const byProvince = Object.entries(provinceMap)
      .map(([province, d]) => ({ province, ...d }))
      .sort((a, b) => b.count - a.count);

    res.json({
      total,
      byProvince,
      kinshasa: {
        byDistrict: rawKinshasaDistrict.map((d: { _id: string; count: number }) => ({ district: d._id, count: d.count })),
      },
      byRole: byRole.map((r: { _id: string; count: number }) => ({ role: r._id, count: r.count })),
    });
  } catch (err) {
    logger.error('Member stats error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ─── District Admins (managed by provincial ADMIN for Kinshasa) ──────────────

const DISTRICTS = ['LUKUNGA', 'FUNA', 'MONT_AMBA', 'TSHANGU'] as const;

export const getDistrictAdmins = async (req: AuthRequest, res: Response) => {
  try {
    const province = req.user!.role === 'SUPERADMIN' ? (req.query.province as string || 'KINSHASA') : req.user!.province;
    const admins = await User.find({ role: 'DISTRICT_ADMIN', province })
      .select('email fullName province district phone bio avatar reputationPoints isBanned createdAt lastLoginAt')
      .lean();
    // Return all 4 districts, filling null where no admin exists
    const result = DISTRICTS.map(d => ({
      district: d,
      admin: admins.find(a => a.district === d) || null,
    }));
    res.json({ districts: result, province });
  } catch (err) {
    logger.error('Get district admins error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const createDistrictAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const province = req.user!.role === 'SUPERADMIN' ? req.body.province : req.user!.province;
    const { fullName, email, password, district, phone, bio } = req.body;
    if (!fullName || !email || !password || !district)
      return res.status(400).json({ message: 'fullName, email, mot de passe et district sont requis' });
    if (!DISTRICTS.includes(district))
      return res.status(400).json({ message: 'District invalide. Valeurs: LUKUNGA, FUNA, MONT_AMBA, TSHANGU' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Cet email est déjà utilisé' });

    const existing = await User.findOne({ role: 'DISTRICT_ADMIN', province, district });
    if (existing) return res.status(409).json({ message: `Un admin existe déjà pour le district ${district}` });

    const admin = await User.create({
      fullName, email, password, district, province,
      phone: phone || undefined, bio: bio || undefined,
      role: 'DISTRICT_ADMIN', isEmailVerified: true,
    });

    const safe = admin.toObject() as unknown as Record<string, unknown>;
    delete safe.password;
    res.status(201).json(safe);
  } catch (err) {
    logger.error('Create district admin error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateDistrictAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, email, phone, bio, isBanned, banReason } = req.body;
    const admin = await User.findByIdAndUpdate(
      req.params.id,
      { fullName, email, phone, bio, isBanned, banReason },
      { new: true }
    ).select('-password -twoFASecret');
    if (!admin) return res.status(404).json({ message: 'Administrateur de district introuvable' });
    res.json(admin);
  } catch (err) {
    logger.error('Update district admin error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const deleteDistrictAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Administrateur introuvable' });
    if (admin.role !== 'DISTRICT_ADMIN')
      return res.status(403).json({ message: 'Ce compte n\'est pas un admin de district' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Administrateur de district supprimé' });
  } catch (err) {
    logger.error('Delete district admin error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const resetDistrictAdminPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8)
      return res.status(400).json({ message: 'Mot de passe trop court (min 8 caractères)' });
    const admin = await User.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Administrateur introuvable' });
    admin.password = password;
    await admin.save();
    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (err) {
    logger.error('Reset district admin password error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
