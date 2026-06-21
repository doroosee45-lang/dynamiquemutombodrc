import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { REPORT_CATEGORIES, REPORT_STATUSES, BADGE_INFO } from './constants';
import { ReportCategory, ReportStatus, BadgeType } from '@/types';

export const timeAgo = (date: string): string =>
  formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });

export const formatDate = (date: string, fmt = 'dd/MM/yyyy HH:mm'): string =>
  format(new Date(date), fmt, { locale: fr });

export const getCategoryInfo = (category: ReportCategory) =>
  REPORT_CATEGORIES.find(c => c.value === category) || REPORT_CATEGORIES[REPORT_CATEGORIES.length - 1];

export const getStatusInfo = (status: ReportStatus) =>
  REPORT_STATUSES.find(s => s.value === status) || REPORT_STATUSES[0];

export const getBadgeInfo = (badge: BadgeType) =>
  BADGE_INFO[badge] || { label: badge, points: 0, color: 'text-gray-600', icon: '🏅' };

export const formatNumber = (n: number): string => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

export const confidenceColor = (score: number): string => {
  if (score >= 0.7) return 'text-green-600';
  if (score >= 0.4) return 'text-yellow-600';
  return 'text-red-600';
};

export const getInitials = (name: string): string =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export const truncate = (str: string, max: number): string =>
  str.length > max ? str.slice(0, max) + '...' : str;

export const buildFormData = (data: Record<string, unknown>): FormData => {
  const fd = new FormData();
  Object.entries(data).forEach(([key, val]) => {
    if (val instanceof File) fd.append(key, val);
    else if (Array.isArray(val)) {
      val.forEach(item => {
        if (item instanceof File) fd.append(key, item);
        else fd.append(key, String(item));
      });
    } else if (val !== undefined && val !== null) {
      fd.append(key, String(val));
    }
  });
  return fd;
};
