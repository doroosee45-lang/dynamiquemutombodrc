import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Newspaper, Map, Megaphone, Users, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { reportsAPI, publicationsAPI, adminAPI } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { StatCard, Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CategoryBadge, StatusBadge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { timeAgo, formatNumber } from '@/utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = ['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes(user?.role || '');

  const { data: recentReports, isLoading: loadingReports } = useQuery({
    queryKey: ['reports', 'recent'],
    queryFn: () => reportsAPI.getAll({ limit: '5', sortBy: 'createdAt' }).then(r => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['report-stats'],
    queryFn: () => reportsAPI.getStats().then(r => r.data),
  });

  const { data: adminData } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminAPI.getDashboard().then(r => r.data),
    enabled: isAdmin,
  });

  const { data: publications } = useQuery({
    queryKey: ['publications', 'recent'],
    queryFn: () => publicationsAPI.getAll({ limit: '3', type: 'ALERT' }).then(r => r.data),
  });

  const urgentPub = publications?.publications?.find((p: { isUrgent: boolean }) => p.isUrgent);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bienvenue, {user?.fullName?.split(' ')[0]} 👋</h1>
            <p className="text-primary-200 mt-1 text-sm">
              {new Date().toLocaleDateString('fr-CD', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-primary-100 mt-3 text-sm italic">
              « Votre apport peut être une solution et un changement pour notre pays. »
            </p>
          </div>
          <Button
            onClick={() => navigate('/reports/new')}
            icon={<AlertTriangle size={16} />}
            className="bg-white text-primary-600 hover:bg-primary-50 flex-shrink-0"
          >
            Signaler
          </Button>
        </div>
        <div className="flex gap-4 mt-4 text-xs text-primary-200">
          {['Unité', 'Résistance', 'Discipline', 'Loyauté', 'Engagement'].map(v => (
            <span key={v} className="bg-white/10 px-2 py-0.5 rounded-full">{v}</span>
          ))}
        </div>
      </div>

      {/* Urgent alert */}
      {urgentPub && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-700">🚨 ALERTE URGENTE</p>
            <p className="text-sm text-red-600 mt-0.5">{urgentPub.title}</p>
            <button onClick={() => navigate(`/feed/${urgentPub.id}`)} className="text-xs text-red-500 hover:underline mt-1">
              Lire plus →
            </button>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Signalements totaux" value={formatNumber(stats?.total || 0)}
          icon={<AlertTriangle size={20} />} color="bg-red-50 text-red-600" />
        <StatCard label="Résolus" value={formatNumber(stats?.byStatus?.find((s: { status: string; _count: number }) => s.status === 'RESOLVED')?._count || 0)}
          icon={<CheckCircle size={20} />} color="bg-green-50 text-green-600" />
        <StatCard label="En attente" value={formatNumber(stats?.byStatus?.find((s: { status: string; _count: number }) => s.status === 'PENDING')?._count || 0)}
          icon={<Clock size={20} />} color="bg-yellow-50 text-yellow-600" />
        {isAdmin && adminData && (
          <StatCard label="Membres actifs" value={formatNumber(adminData.stats?.totalUsers || 0)}
            icon={<Users size={20} />} color="bg-blue-50 text-blue-600" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent reports */}
        <div className="lg:col-span-2">
          <Card>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Signalements récents</h2>
              <button onClick={() => navigate('/reports')} className="text-xs text-primary-600 hover:underline">
                Voir tous →
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {loadingReports ? <LoadingSpinner /> :
                recentReports?.reports?.map((r: { id: string; title: string; category: import('@/types').ReportCategory; status: import('@/types').ReportStatus; province: string; createdAt: string }) => (
                  <div key={r.id}
                    onClick={() => navigate(`/reports/${r.id}`)}
                    className="px-6 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <CategoryBadge category={r.category} />
                          <span className="text-xs text-gray-400">{r.province}</span>
                          <span className="text-xs text-gray-400">{timeAgo(r.createdAt)}</span>
                        </div>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                ))
              }
            </div>
          </Card>
        </div>

        {/* Stats by category */}
        <div className="space-y-4">
          {stats?.byCategory && (
            <Card>
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">Par catégorie</h2>
              </div>
              <div className="px-4 py-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={stats.byCategory.map((c: { category: string; _count: number }) => ({ name: c.category, value: c._count }))}
                      cx="50%" cy="50%" innerRadius={40} outerRadius={80}
                      dataKey="value">
                      {stats.byCategory.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number | string) => [v, 'Signalements']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Quick actions */}
          <Card>
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Actions rapides</h2>
            </div>
            <div className="p-4 space-y-2">
              {[
                { label: 'Faire un signalement', icon: AlertTriangle, path: '/reports/new', color: 'text-red-600' },
                { label: 'Voir la carte', icon: Map, path: '/map', color: 'text-blue-600' },
                { label: 'Fil d\'actualité', icon: Newspaper, path: '/feed', color: 'text-green-600' },
                { label: 'Campagnes actives', icon: Megaphone, path: '/campaigns', color: 'text-orange-600' },
              ].map(item => (
                <button key={item.path}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <item.icon size={18} className={item.color} />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Province stats */}
      {stats?.byProvince && stats.byProvince.length > 0 && (
        <Card>
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Top provinces actives</h2>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.byProvince.slice(0, 8).map((p: { province: string; _count: number }) => ({ name: p.province.replace('_', '-'), count: p._count }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
};
