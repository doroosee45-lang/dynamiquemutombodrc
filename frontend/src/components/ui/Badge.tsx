import React from 'react';
import { getCategoryInfo, getStatusInfo } from '@/utils/helpers';
import { ReportCategory, ReportStatus } from '@/types';

interface Props {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export const Badge: React.FC<Props> = ({ children, color = 'bg-gray-100 text-gray-700', className = '' }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${color} ${className}`}>
    {children}
  </span>
);

export const CategoryBadge: React.FC<{ category: ReportCategory }> = ({ category }) => {
  const info = getCategoryInfo(category);
  return <Badge color={`${info.bg} ${info.color}`}>{info.icon} {info.label}</Badge>;
};

export const StatusBadge: React.FC<{ status: ReportStatus }> = ({ status }) => {
  const info = getStatusInfo(status);
  return <Badge color={`${info.bg} ${info.color}`}>{info.label}</Badge>;
};
