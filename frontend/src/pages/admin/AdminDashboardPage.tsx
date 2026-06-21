import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2, Users, AlertTriangle, CheckCircle, Clock,
  Map, Download, Bell, Shield, Globe
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '@/services/api';
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

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'national' | 'province' | 'district'>('national');
  const [selectedProvince, setSelectedProvince] = useState('KINSHASA');
  const [selectedDistrict, setSelectedDistrict] = useState('LUKUNGA');

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { value: 'national', label: 'National', icon: Globe },
          { value: 'province', label: 'Provincial', icon: Map },
          { value: 'district', label: 'District (Kin)', icon: Shield },
        ].map(tab => (
          <button key={tab.value}
            onClick={() => setActiveTab(tab.value as typeof activeTab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.value ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'national' && dashData && (
        <>
          {/* Stats */}
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trend chart */}
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

            {/* By category pie */}
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

          {/* Province chart */}
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

          {/* Recent reports & users */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Signalements récents</h3>
                <button onClick={() => navigate('/reports')} className="text-xs text-primary-600">Voir tous →</button>
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
                <button onClick={() => navigate('/admin/users')} className="text-xs text-primary-600">Gérer →</button>
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

      {activeTab === 'province' && (
        <div className="space-y-4">
          <select value={selectedProvince} onChange={e => setSelectedProvince(e.target.value)}
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

      {activeTab === 'district' && (
        <div className="space-y-4">
          <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)}
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
    </div>
  );
};
