import { Router, Request, Response } from 'express';
import { User } from '../models/User.model';
import { logger } from '../utils/logger';

const router = Router();

// One-time production seed — protected by SETUP_SECRET env var
// Call: POST /api/setup/seed  with header X-Setup-Secret: <value>
// Disable by removing SETUP_SECRET from Render env vars after use.
router.post('/seed', async (req: Request, res: Response) => {
  const secret = process.env.SETUP_SECRET;
  if (!secret) return res.status(404).json({ message: 'Not found' });
  if (req.headers['x-setup-secret'] !== secret) return res.status(403).json({ message: 'Forbidden' });

  try {
    const users = [
      {
        email: 'superadmin@dynamique-rdc.cd',
        password: 'SuperAdmin@Dynamique2026!',
        fullName: 'Israël Mutombo — Administrateur National',
        role: 'SUPERADMIN' as const,
        province: 'KINSHASA',
        isEmailVerified: true,
        twoFAEnabled: false,
        reputationPoints: 99999,
        isBanned: false,
        bio: 'Administrateur national suprême de la Dynamique Israël Mutombo.',
        badges: [
          { badge: 'OBSERVER',       awardedAt: new Date('2024-01-01') },
          { badge: 'ACTIVIST',       awardedAt: new Date('2024-03-01') },
          { badge: 'CITIZEN_LEADER', awardedAt: new Date('2024-06-01') },
          { badge: 'INNOVATOR',      awardedAt: new Date('2024-09-01') },
        ],
      },
      {
        email: 'admin.kinshasa@dynamique-rdc.cd',
        password: 'Admin@Dynamique2026!',
        fullName: 'Admin Provincial — Kinshasa',
        role: 'ADMIN' as const,
        province: 'KINSHASA',
        isEmailVerified: true,
      },
      {
        email: 'citoyen@example.com',
        password: 'Citoyen@2026!',
        fullName: 'Jean-Paul Citoyen',
        role: 'CITIZEN' as const,
        province: 'KINSHASA',
        isEmailVerified: true,
      },
    ];

    const results: string[] = [];
    for (const data of users) {
      await User.deleteOne({ email: data.email });
      const u = await User.create(data);
      results.push(`${u.role} — ${u.email}`);
    }

    logger.info('Setup seed completed', { users: results });
    res.json({ message: 'Seed réussi', users: results });
  } catch (err) {
    logger.error('Setup seed error', err);
    res.status(500).json({ message: 'Erreur lors du seed', error: String(err) });
  }
});

export default router;
