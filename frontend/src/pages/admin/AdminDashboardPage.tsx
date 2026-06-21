import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2, Users, AlertTriangle, CheckCircle, Clock,
  Map, Download, Bell, Shield, Globe, Mail, MessageSquare,
  Newspaper, Eye, EyeOff, Phone, Calendar, ChevronRight,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI, newsletterAPI } from '@/services/api';
import { StatCard, Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatNumber, timeAgo } from '@/utils/helpers';
import { PROVINCES, DISTRICTS } from '@/utils/constants';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Report } from '@/types';

const COLORS = ['#dc2626', '#ea580c', '#d97706', '#16a34a', '#2563eb', '#7c3aed', '#db2777'];

const SUBJECT_BADGE: Record<string, string> = {
  'Signalement urgent': 'bg-red-100 text-red-700',
  'Rejoindre la Dynamique': 'bg-blue-100 text-blue-700',
  'Témoignage / Information': 'bg-purple-100 text-purple-700',
  'Partenariat': 'bg-emerald-100 text-emerald-700',
  'Autre': 'bg-gray-100 text-gray-600',
};

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'national' | 'province' | 'district' | 'messages'>('national');
  const [selectedProvince, setSelectedProvince] = useState('KINSHASA');
  const [selectedDistrict, setSelectedDistrict] = useState('LUKUNGA');
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminAPI.getDashboard().then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: provinceData } = useQuery({
    queryKey: ['province-dashboard', selectedProvince],
    queryFn: () => adminAPI.getProvinceDashboard(selectedProvince).then(r => r.data),
    enabled: activeTab === 'province',
  });

  const { data: districtData } = useQuery({
    queryKey: ['district-dashboard', selectedDistrict],
    queryFn: () => adminAPI.getDistrictDashboard(selectedDistrict).then(r => r.data),
    enabled: activeTab === 'district',
  });

  const { data: contactData } = useQuery({
    queryKey: ['contact-messages'],
    queryFn: () => newsletterAPI.getContactMessages().then(r => r.data),
    refetchInterval: 30000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => newsletterAPI.markContactRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-messages'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });

  const handleExport = async () => {
    const res = await adminAPI.exportReports({ format: 'csv' });
    const blob = new Blob([res.data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rapports-dynamique.csv';
    a.click();
  };

  if (isLoading) return <LoadingSpinner text="Chargement du tableau de bord..." />;

  const unreadCount = dashData?.stats?.unreadContacts ?? contactData?.unread ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord Administrateur</h1>
          <p className="text-gray-500 text-sm">Vue nationale — 26 provinces · 4 districts Kinshasa</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<Download size={16} />} onClick={handleExport}>
            Exporter CSV
          </Button>
          <Button variant="secondary" icon={<Bell size={16} />} onClick={() => navigate('/admin/broadcast')}>
            Notification massive
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {[
          { value: 'national',  label: 'National',       icon: Globe },
          { value: 'province',  label: 'Provincial',     icon: Map },
          { value: 'district',  label: 'District (Kin)', icon: Shield },
          { value: 'messages',  label: 'Messages',       icon: MessageSquare, badge: unreadCount },
        ].map(tab => (
          <button type="button" key={tab.value}
            onClick={() => setActiveTab(tab.value as typeof activeTab)}
            className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.value ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            <tab.icon size={14} />
            {tab.label}
            {tab.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {tab.badge > 9 ? '9+' : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══ NATIONAL ═══════════════════════════════════════════════ */}
      {activeTab === 'national' && dashData && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total membres" value={formatNumber(dashData.stats.totalUsers)}
              icon={<Users size={20} />} color="bg-blue-50 text-blue-600" />
            <StatCard label="Total signalements" value={formatNumber(dashData.stats.totalReports)}
              icon={<AlertTriangle size={20} />} color="bg-red-50 text-red-600" />
            <StatCard label="Publications" value={formatNumber(dashData.stats.totalPublications)}
              icon={<BarChart2 size={20} />} color="bg-purple-50 text-purple-600" />
            <StatCard
              label="Taux résolution"
              value={`${dashData.stats.totalReports > 0
                ? Math.round((dashData.reportsByStatus?.find((s: { status: string }) => s.status === 'RESOLVED')?._count || 0) / dashData.stats.totalReports * 100)
                : 0}%`}
              icon={<CheckCircle size={20} />}
              color="bg-green-50 text-green-600"
            />
          </div>

          {/* Newsletter + Messages non lus */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <div className="p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Mail size={24} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Abonnés Newsletter</p>
                  <p className="text-4xl font-black text-gray-900 mt-1">
                    {formatNumber(dashData.stats.newsletterTotal ?? 0)}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">Emails actifs inscrits</p>
                </div>
                <button type="button" onClick={() => setActiveTab('messages')}
                  className="text-emerald-600 hover:text-emerald-700 text-xs font-semibold flex items-center gap-1">
                  Voir <ChevronRight size={14} />
                </button>
              </div>
            </Card>

            <Card>
              <div className="p-5 flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${unreadCount > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <MessageSquare size={24} className={unreadCount > 0 ? 'text-red-600' : 'text-gray-400'} />
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Messages non lus</p>
                  <p className={`text-4xl font-black mt-1 ${unreadCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {unreadCount}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">Formulaire de contact</p>
                </div>
                {unreadCount > 0 && (
                  <button type="button" onClick={() => setActiveTab('messages')}
                    className="text-red-600 hover:text-red-700 text-xs font-semibold flex items-center gap-1">
                    Lire <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </Card>
          </div>

          {/* Publications urgentes */}
          {dashData.urgentPublications?.length > 0 && (
            <Card>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <h3 className="font-semibold text-gray-800">Publications urgentes</h3>
                  <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {dashData.urgentPublications.length}
                  </span>
                </div>
                <button type="button" onClick={() => navigate('/feed')} className="text-xs text-primary-600">
                  Voir toutes →
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {dashData.urgentPublications.slice(0, 5).map((p: Record<string, unknown>) => (
                  <div key={p._id as string}
                    className="px-5 py-3 hover:bg-red-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/feed/${p._id as string}`)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <AlertTriangle size={8} /> URGENT
                          </span>
                          <span className="text-gray-400 text-xs">{p.type as string}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 truncate">{p.title as string}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {p.excerpt ? (p.excerpt as string).slice(0, 80) + '…' : ''}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                        {timeAgo(p.publishedAt as string)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {dashData.last30Days?.length > 0 && (
              <Card className="lg:col-span-2">
                <div className="p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Signalements — 30 derniers jours</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={dashData.last30Days}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }}
                        tickFormatter={v => new Date(v).toLocaleDateString('fr', { day: '2-digit', month: '2-digit' })} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip labelFormatter={v => new Date(v).toLocaleDateString('fr')} />
                      <Line type="monotone" dataKey="count" stroke="#dc2626" strokeWidth={2}
                        dot={false} name="Signalements" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {dashData.reportsByCategory?.length > 0 && (
              <Card>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Par catégorie</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={dashData.reportsByCategory.map((c: { category: string; _count: number }) => ({ name: c.category, value: c._count }))}
                        cx="50%" cy="50%" outerRadius={70} dataKey="value">
                        {dashData.reportsByCategory.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend iconSize={10} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}
          </div>

          {dashData.reportsByProvince?.length > 0 && (
            <Card>
              <div className="p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Signalements par province (Top 10)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dashData.reportsByProvince.filter((p: { province: string | null; _count: number }) => p.province).slice(0, 10).map((p: { province: string; _count: number }) => ({
                    name: p.province.replace('_', '-').slice(0, 12),
                    total: p._count
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#dc2626" radius={[4, 4, 0, 0]} name="Signalements" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Signalements récents</h3>
                <button type="button" onClick={() => navigate('/reports')} className="text-xs text-primary-600">Voir tous →</button>
              </div>
              <div className="divide-y divide-gray-50">
                {dashData.recentReports?.slice(0, 5).map((r: Report) => (
                  <div key={r.id} className="px-5 py-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/reports/${r.id}`)}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                        <p className="text-xs text-gray-400">{r.province} · {timeAgo(r.createdAt)}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Membres récents</h3>
                <button type="button" onClick={() => navigate('/admin/users')} className="text-xs text-primary-600">Gérer →</button>
              </div>
              <div className="divide-y divide-gray-50">
                {dashData.recentUsers?.slice(0, 5).map((u: { id: string; fullName: string; role: string; province: string; createdAt: string }) => (
                  <div key={u.id} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{u.fullName}</p>
                        <p className="text-xs text-gray-400">{u.role} · {u.province}</p>
                      </div>
                      <p className="text-xs text-gray-400">{timeAgo(u.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ══ PROVINCIAL ═════════════════════════════════════════════ */}
      {activeTab === 'province' && (
        <div className="space-y-4">
          <select value={selectedProvince} onChange={e => setSelectedProvince(e.target.value)}
            title="Sélectionner une province"
            className="border border-gray-200 rounded-lg px-4 py-2 text-sm">
            {PROVINCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>

          {provinceData && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total signalements" value={formatNumber(provinceData.total)}
                  icon={<AlertTriangle size={20} />} color="bg-red-50 text-red-600" />
                {provinceData.byStatus?.map((s: { status: string; _count: number }) => (
                  <StatCard key={s.status} label={s.status} value={formatNumber(s._count)}
                    icon={<Clock size={20} />} color="bg-gray-50 text-gray-600" />
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {provinceData.byCategory?.length > 0 && (
                  <Card>
                    <div className="p-5">
                      <h3 className="font-semibold text-gray-800 mb-4">Par catégorie</h3>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={provinceData.byCategory.map((c: { category: string; _count: number }) => ({ name: c.category, count: c._count }))}>
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#dc2626" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
                <Card>
                  <div className="px-5 py-4 border-b">
                    <h3 className="font-semibold text-gray-800">Top contributeurs</h3>
                  </div>
                  <div className="divide-y">
                    {provinceData.topReporters?.map((u: { id: string; fullName: string; reputationPoints: number }) => (
                      <div key={u.id} className="px-5 py-3 flex justify-between">
                        <span className="text-sm text-gray-800">{u.fullName}</span>
                        <span className="text-xs text-primary-600 font-medium">{formatNumber(u.reputationPoints)} pts</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ DISTRICT ═══════════════════════════════════════════════ */}
      {activeTab === 'district' && (
        <div className="space-y-4">
          <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)}
            title="Sélectionner un district"
            className="border border-gray-200 rounded-lg px-4 py-2 text-sm">
            {DISTRICTS.map(d => <option key={d.value} value={d.value}>{d.label} ({d.communes})</option>)}
          </select>

          {districtData && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="Signalements" value={formatNumber(districtData.total)}
                icon={<AlertTriangle size={20} />} color="bg-red-50 text-red-600" />
              {districtData.byStatus?.map((s: { status: string; _count: number }) => (
                <StatCard key={s.status} label={s.status} value={formatNumber(s._count)}
                  icon={<Clock size={20} />} color="bg-gray-50 text-gray-600" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ MESSAGES & NEWSLETTER ══════════════════════════════════ */}
      {activeTab === 'messages' && (
        <div className="space-y-6">

          {/* Newsletter stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <div className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Mail size={22} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-semibold uppercase">Abonnés actifs</p>
                  <p className="text-3xl font-black text-gray-900">{formatNumber(dashData?.stats?.newsletterTotal ?? 0)}</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <EyeOff size={22} className="text-red-500" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-semibold uppercase">Messages non lus</p>
                  <p className="text-3xl font-black text-red-600">{contactData?.unread ?? 0}</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <MessageSquare size={22} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-semibold uppercase">Total messages</p>
                  <p className="text-3xl font-black text-gray-900">{contactData?.total ?? 0}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Publications urgentes */}
          {dashData?.urgentPublications?.length > 0 && (
            <Card>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h3 className="font-semibold text-gray-800">Publications marquées Urgentes</h3>
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {dashData.urgentPublications.length}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {dashData.urgentPublications.map((p: Record<string, unknown>) => (
                  <div key={p._id as string}
                    className="px-5 py-4 hover:bg-red-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/feed/${p._id as string}`)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <AlertTriangle size={8} /> URGENT
                          </span>
                          <span className="bg-gray-100 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            {p.type as string}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-800">{p.title as string}</p>
                        {!!(p.excerpt as string) && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.excerpt as string}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs text-gray-400">{timeAgo(p.publishedAt as string)}</p>
                        <Newspaper size={14} className="text-gray-300 mt-1 ml-auto" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Messages de contact */}
          <Card>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-800">Messages du formulaire de contact</h3>
                {contactData?.unread > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {contactData.unread} non lus
                  </span>
                )}
              </div>
            </div>

            {!contactData?.messages?.length ? (
              <div className="p-10 text-center text-gray-400">
                <MessageSquare size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucun message reçu pour le moment.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {contactData.messages.map((msg: Record<string, unknown>) => {
                  const id = msg._id as string;
                  const isExpanded = expandedMsg === id;
                  const isUnread = !msg.isRead;
                  const isUrgent = msg.isUrgent as boolean;
                  return (
                    <div key={id} className={`transition-colors ${isUnread ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                      <div className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          {/* Avatar initiales */}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${isUrgent ? 'bg-red-500' : 'bg-gray-400'}`}>
                            {(msg.fullName as string).charAt(0).toUpperCase()}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                              <span className="font-semibold text-sm text-gray-900">{msg.fullName as string}</span>
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" title="Non lu" />
                              )}
                              {isUrgent && (
                                <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  <AlertTriangle size={8} /> URGENT
                                </span>
                              )}
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SUBJECT_BADGE[msg.subject as string] ?? 'bg-gray-100 text-gray-600'}`}>
                                {msg.subject as string}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1"><Mail size={10} /> {msg.email as string}</span>
                              {(msg.phone as string | null) ? <span className="flex items-center gap-1"><Phone size={10} /> {msg.phone as string}</span> : null}
                              <span className="flex items-center gap-1"><Calendar size={10} /> {timeAgo(msg.createdAt as string)}</span>
                            </div>

                            {isExpanded && (
                              <div className="mt-3 p-3 bg-white rounded-xl border border-gray-100 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {msg.message as string}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button type="button"
                              onClick={() => setExpandedMsg(isExpanded ? null : id)}
                              className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
                              title={isExpanded ? 'Réduire' : 'Lire le message'}>
                              {isExpanded ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                            {isUnread && (
                              <button type="button"
                                onClick={() => markRead.mutate(id)}
                                disabled={markRead.isPending}
                                className="p-1.5 rounded-lg hover:bg-emerald-100 text-gray-400 hover:text-emerald-600 transition-colors"
                                title="Marquer comme lu">
                                <CheckCircle size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
