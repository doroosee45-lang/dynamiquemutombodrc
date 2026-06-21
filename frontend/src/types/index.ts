export type Role = 'CITIZEN' | 'MODERATOR' | 'EDITOR' | 'DISTRICT_ADMIN' | 'ADMIN' | 'SUPERADMIN';
export type ReportStatus = 'PENDING' | 'VERIFIED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
export type ReportCategory = 'INSECURITY' | 'BANDITRY' | 'TRANSPORT' | 'CORRUPTION' | 'TRIBALISM' | 'ADMINISTRATIVE' | 'OTHER';
export type Province = string;
export type District = 'LUKUNGA' | 'FUNA' | 'MONT_AMBA' | 'TSHANGU';
export type BadgeType = 'OBSERVER' | 'ACTIVIST' | 'CITIZEN_LEADER' | 'INNOVATOR';
export type Sentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'ALARMING';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatar?: string;
  role: Role;
  province?: Province;
  district?: District;
  isEmailVerified: boolean;
  twoFAEnabled: boolean;
  reputationPoints: number;
  isBanned: boolean;
  createdAt: string;
  badges: Badge[];
}

export interface Badge {
  id: string;
  badge: BadgeType;
  awardedAt: string;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  province: Province;
  district?: District;
  commune?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  mediaUrls: string[];
  isAnonymous: boolean;
  confidenceScore?: number;
  isFlagged: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  author: Partial<User>;
  _count?: { votes: number; comments: number };
  votes?: { userId: string; value: number }[];
  comments?: Comment[];
}

export interface Publication {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  type: 'INVESTIGATION' | 'ALERT' | 'COMMUNIQUE' | 'CAMPAIGN' | 'NEWS';
  category?: string;
  province?: Province;
  isUrgent: boolean;
  isPinned: boolean;
  mediaUrls: string[];
  tags: string[];
  viewCount: number;
  publishedAt: string;
  author: Partial<User>;
  _count?: { comments: number };
}

export interface Comment {
  id: string;
  content: string;
  isApproved: boolean;
  createdAt: string;
  author: Partial<User>;
  replies?: Comment[];
  _count?: { votes: number };
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  province?: Province;
  targetCount?: number;
  currentCount: number;
  startDate?: string;
  endDate?: string;
  mediaUrls: string[];
  author: Partial<User>;
  petition?: Petition;
  _count?: { participants: number };
}

export interface Petition {
  id: string;
  targetCount: number;
  _count?: { signatures: number };
}

export interface Innovation {
  id: string;
  title: string;
  description: string;
  category: string;
  mediaUrls: string[];
  isValidated: boolean;
  createdAt: string;
  author: Partial<User>;
  _count?: { votes: number };
}

export interface Message {
  id: string;
  content: string;
  type: string;
  groupId?: string;
  createdAt: string;
  sender: Partial<User>;
  receiverId?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}
