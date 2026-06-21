import { User } from '../models/User.model';
import { logger } from './logger';

export const POINTS = {
  REPORT_VALIDATED: 50,
  REPORT_RESOLVED: 100,
  COMMENT_APPROVED: 10,
  VOTE: 5,
  INNOVATION_VALIDATED: 200,
} as const;

const BADGE_THRESHOLDS: { points: number; badge: 'OBSERVER' | 'ACTIVIST' | 'CITIZEN_LEADER' }[] = [
  { points: 500, badge: 'OBSERVER' },
  { points: 2000, badge: 'ACTIVIST' },
  { points: 5000, badge: 'CITIZEN_LEADER' },
];

type BadgeEntry = { badge: string };

export const addPoints = async (userId: string, points: number): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(userId, { $inc: { reputationPoints: points } }, { new: true });
    if (user) await checkAndAwardBadges(userId, user.reputationPoints);
  } catch (err) {
    logger.error('addPoints error', err);
  }
};

const checkAndAwardBadges = async (userId: string, points: number): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) return;

  const badges = user.badges as BadgeEntry[];
  const existing = new Set(badges.map((b) => b.badge));
  let changed = false;

  for (const { points: threshold, badge } of BADGE_THRESHOLDS) {
    if (points >= threshold && !existing.has(badge)) {
      user.badges.push({ badge, awardedAt: new Date() });
      changed = true;
    }
  }

  if (changed) await user.save();
};

export const awardInnovatorBadge = async (userId: string): Promise<void> => {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    const badges = user.badges as BadgeEntry[];
    if (badges.some((b) => b.badge === 'INNOVATOR')) return;
    user.badges.push({ badge: 'INNOVATOR', awardedAt: new Date() });
    await user.save();
  } catch (err) {
    logger.error('awardInnovatorBadge error', err);
  }
};
