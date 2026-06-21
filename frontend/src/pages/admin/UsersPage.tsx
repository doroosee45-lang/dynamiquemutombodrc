import React, { useState } from 'react';
import { Search, UserPlus, Eye, EyeOff, MapPin, Building2, Users, Globe } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getInitials, timeAgo, formatNumber } from '@/utils/helpers';
import { PROVINCES } from '@/utils/constants';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLES = ['CITIZEN', 'MODERATOR', 'EDITOR', 'DISTRICT_ADMIN', 'ADMIN', 'SUPERADMIN'];
const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN:    'bg-red-100 text-red-700',
  ADMIN:         'bg-orange-100 text-orange-700',
  DISTRICT_ADMIN:'bg-yellow-100 text-yellow-700',
  MODERATOR:     'bg-blue-100 text-blue-700',
  EDITOR:        'bg-purple-100 text-purple-700',
  CITIZEN:       'bg-gray-100 text-gray-700',
};
const DISTRICTS = [
  { value: 'LUKUNGA', label: 'Lukunga' },
  { value: 'FUNA',    label: 'Funa' },
  { value: 'MONT_AMBA', label: 'Mont-Amba' },
  { value: 'TSHANGU', label: 'Tshangu' },
];
const PROVINCE_LABELS = Object.fromEntries(PROVINCES.map(p => [p.value, p.label]));

type UserRow = {
  _id: string; id?: string; email: string; fullName: string; role: string;
  province?: string; district?: string; commune?: string;
  isBanned: boolean; banReason?: string; reputationPoints: number;
  isEmailVerified: boolean; createdAt: string; lastLoginAt?: string;
};
type ProvinceStats = { province: string; count: number; citizens: number };
type DistrictStats = { district: string; count: number };

const EMPTY_CREATE = { fullName: '', email: '', password: '', phone: '', commune: '', bio: '', province: '', district: '' };

// ─── Province pill button ─────────────────────────────────────────────────────
const ProvincePill: React.FC<{
  label: string; count: number; active: boolean; onClick: () => void; isKinshasa?: boolean;
}> = ({ label, count, active, onClick, isKinshasa }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border
      ${active
        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
        : isKinshasa
          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-400'
          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}
  >
    {isKinshasa && <Building2 size={10} />}
    <span>{label}</span>
    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold
      ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
      {formatNumber(count)}
    </span>
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const UsersPage: React.FC = () => {
  const { user: me } = useAuthStore();
  const qc = useQueryClient();
  const isSuperAdmin = me?.role === 'SUPERADMIN';
  const isAdmin = me?.role === 'ADMIN';
  const isDistrictAdmin = me?.role === 'DISTRICT_ADMIN';

  const [filters, setFilters] = useState({
    search: '', role: '', page: 1, province: '', district: '',
  });
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ role: '', isBanned: false, banReason: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_CREATE });
  const [showPwd, setShowPwd] = useState(false);

  // ─── Data ──────────────────────────────────────────────────────────────────
  const { data: statsData } = useQuery({
    queryKey: ['member-stats'],
    queryFn: () => adminAPI.getMemberStats().then(r => r.data),
    enabled: isSuperAdmin,
    staleTime: 60000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', filters],
    queryFn: () => adminAPI.getUsers({ ...filters, limit: '20' }).then(r => r.data),
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      adminAPI.updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['member-stats'] });
      toast.success('Membre mis à jour');
      setEditUser(null);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const createMutation = useMutation({
    mutationFn: () => adminAPI.createMember({ ...createForm }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['member-stats'] });
      toast.success('Membre créé avec succès');
      setCreateOpen(false);
      setCreateForm({ ...EMPTY_CREATE });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur de création'),
  });

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setEditForm({ role: u.role, isBanned: u.isBanned, banReason: u.banReason || '' });
  };
  const setCF = (k: string, v: string) => setCreateForm(f => ({ ...f, [k]: v }));

  const selectProvince = (prov: string) => {
    setFilters(f => ({ ...f, province: prov, district: '', page: 1 }));
  };
  const selectDistrict = (dist: string) => {
    setFilters(f => ({ ...f, district: dist, page: 1 }));
  };

  // Scope info for non-SuperAdmin
  const scopeLabel = isDistrictAdmin
    ? `District ${DISTRICTS.find(d => d.value === (me as any)?.district)?.label || (me as any)?.district} — ${me?.province}`
    : isAdmin ? `Province de ${PROVINCE_LABELS[me?.province || ''] || me?.province}`
    : null;

  const provinceStats: ProvinceStats[] = statsData?.byProvince || [];
  const kinshasaDistrictStats: DistrictStats[] = statsData?.kinshasa?.byDistrict || [];
  const totalMembers: number = statsData?.total || data?.pagination?.total || 0;

  const showKinshasaDistricts = filters.province === 'KINSHASA';

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Membres</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {formatNumber(data?.pagination?.total || 0)} membres{filters.province ? ` en ${PROVINCE_LABELS[filters.province] || filters.province}` : isSuperAdmin ? ' sur tout le système' : ''}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} icon={<UserPlus size={16} />}>
          Ajouter un membre
        </Button>
      </div>

      {/* ── Scope banner (non-SuperAdmin) ── */}
      {scopeLabel && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
          ${isDistrictAdmin ? 'bg-yellow-50 border border-yellow-100 text-yellow-800' : 'bg-orange-50 border border-orange-100 text-orange-800'}`}>
          {isDistrictAdmin ? <Building2 size={15}/> : <MapPin size={15}/>}
          <span>Portée : <strong>{scopeLabel}</strong> — vous gérez uniquement les membres de votre {isDistrictAdmin ? 'district' : 'province'}</span>
        </div>
      )}

      {/* ── SuperAdmin Stats Panel ── */}
      {isSuperAdmin && (
        <div className="space-y-3">
          {/* Global totals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total membres', value: totalMembers, icon: <Globe size={16}/>, color: 'text-primary-600 bg-primary-50 border-primary-100' },
              { label: 'Provinces actives', value: provinceStats.length, icon: <MapPin size={16}/>, color: 'text-green-700 bg-green-50 border-green-100' },
              { label: 'Citoyens', value: statsData?.byRole?.find((r: any) => r.role === 'CITIZEN')?.count || 0, icon: <Users size={16}/>, color: 'text-blue-700 bg-blue-50 border-blue-100' },
              { label: 'Kinshasa (4 districts)', value: provinceStats.find(p => p.province === 'KINSHASA')?.count || 0, icon: <Building2 size={16}/>, color: 'text-rose-700 bg-rose-50 border-rose-100' },
            ].map(stat => (
              <Card key={stat.label}>
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${stat.color}`}>
                  <div className="flex-shrink-0">{stat.icon}</div>
                  <div>
                    <p className="text-xl font-bold">{formatNumber(stat.value)}</p>
                    <p className="text-xs opacity-70 leading-tight">{stat.label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Province pills */}
          <Card>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Filtrer par province</p>
                {filters.province && (
                  <button type="button" onClick={() => selectProvince('')}
                    className="text-xs text-gray-400 hover:text-gray-600 underline">
                    Toutes les provinces
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {provinceStats.map(ps => (
                  <ProvincePill
                    key={ps.province}
                    label={PROVINCE_LABELS[ps.province] || ps.province}
                    count={ps.count}
                    active={filters.province === ps.province}
                    onClick={() => selectProvince(filters.province === ps.province ? '' : ps.province)}
                    isKinshasa={ps.province === 'KINSHASA'}
                  />
                ))}
                {provinceStats.length === 0 && (
                  <p className="text-sm text-gray-400">Aucun membre enregistré par province encore.</p>
                )}
              </div>

              {/* Kinshasa district breakdown — only shown when KINSHASA selected */}
              {showKinshasaDistricts && (
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <p className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                    <Building2 size={12}/> Districts de Kinshasa
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {DISTRICTS.map(d => {
                      const stat = kinshasaDistrictStats.find(s => s.district === d.value);
                      return (
                        <button
                          type="button"
                          key={d.value}
                          onClick={() => selectDistrict(filters.district === d.value ? '' : d.value)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                            ${filters.district === d.value
                              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-400'}`}
                        >
                          {d.label}
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold
                            ${filters.district === d.value ? 'bg-white/20' : 'bg-rose-100 text-rose-700'}`}>
                            {stat?.count ?? 0}
                          </span>
                        </button>
                      );
                    })}
                    {filters.district && (
                      <button type="button" onClick={() => selectDistrict('')}
                        className="text-xs text-gray-400 hover:text-gray-600 underline self-center">
                        Tout Kinshasa
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── Search & Role filter ── */}
      <Card>
        <div className="p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
              placeholder="Rechercher par nom ou email..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            title="Filtrer par rôle"
            value={filters.role}
            onChange={e => setFilters(f => ({ ...f, role: e.target.value, page: 1 }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Tous les rôles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {/* Active province/district chips */}
          {filters.province && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 border border-primary-200 rounded-lg text-xs text-primary-700 font-medium">
              <MapPin size={12}/>
              {PROVINCE_LABELS[filters.province] || filters.province}
              {filters.district && <> → {DISTRICTS.find(d => d.value === filters.district)?.label}</>}
            </div>
          )}
        </div>
      </Card>

      {/* ── Members table ── */}
      {isLoading ? <LoadingSpinner /> : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Membre', 'Rôle', 'Province / District', 'Points', 'Statut', 'Inscrit le', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(data?.users || []).map((u: UserRow) => (
                  <tr key={u._id || u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                          {getInitials(u.fullName)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{u.fullName}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                          {u.commune && <p className="text-xs text-gray-400 italic">{u.commune}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-700'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-gray-700 font-medium">{PROVINCE_LABELS[u.province || ''] || u.province || '—'}</div>
                      {u.district && (
                        <div className="text-xs text-rose-600 flex items-center gap-0.5 mt-0.5">
                          <Building2 size={10}/> {DISTRICTS.find(d => d.value === u.district)?.label || u.district}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-primary-600 font-medium">{formatNumber(u.reputationPoints)}</td>
                    <td className="px-4 py-3">
                      {u.isBanned
                        ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Suspendu</span>
                        : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Actif</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{timeAgo(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => openEdit(u)} className="text-xs text-primary-600 hover:underline">
                        Modifier
                      </button>
                    </td>
                  </tr>
                ))}
                {(data?.users || []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Users size={36} className="mx-auto text-gray-200 mb-2"/>
                      <p className="text-sm text-gray-400">Aucun membre trouvé</p>
                      {filters.province && <p className="text-xs text-gray-400 mt-1">en {PROVINCE_LABELS[filters.province] || filters.province}</p>}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Pagination ── */}
      {data?.pagination && Math.ceil(data.pagination.total / 20) > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" disabled={filters.page === 1}
            onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>← Précédent</Button>
          <span className="text-sm text-gray-500">
            Page {filters.page} / {Math.ceil(data.pagination.total / 20)}
          </span>
          <Button variant="secondary" disabled={filters.page >= Math.ceil(data.pagination.total / 20)}
            onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Suivant →</Button>
        </div>
      )}

      {/* ══ Modal Créer membre ══ */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateForm({ ...EMPTY_CREATE }); }}
        title="Ajouter un nouveau membre"
        size="lg"
      >
        <div className="space-y-4">
          {scopeLabel && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm text-blue-700 flex items-center gap-2">
              <MapPin size={14}/> Membre enregistré dans : <strong>{scopeLabel}</strong>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
              <input value={createForm.fullName} onChange={e => setCF('fullName', e.target.value)}
                placeholder="Prénom et nom"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={createForm.email} onChange={e => setCF('email', e.target.value)}
                placeholder="membre@exemple.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={createForm.password} onChange={e => setCF('password', e.target.value)}
                  placeholder="Min. 8 caractères"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                <button type="button" onClick={() => setShowPwd(v => !v)} title={showPwd ? 'Masquer' : 'Afficher'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input value={createForm.phone} onChange={e => setCF('phone', e.target.value)}
                placeholder="+243 xxx xxx xxx"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commune / Quartier</label>
              <input value={createForm.commune} onChange={e => setCF('commune', e.target.value)}
                placeholder="Commune ou quartier de résidence"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            {isSuperAdmin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                  <select
                    title="Province du membre"
                    value={createForm.province}
                    onChange={e => setCF('province', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sélectionner...</option>
                    {PROVINCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                {createForm.province === 'KINSHASA' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">District (Kinshasa)</label>
                    <select
                      title="District de Kinshasa"
                      value={createForm.district}
                      onChange={e => setCF('district', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Sélectionner...</option>
                      {DISTRICTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                )}
              </>
            )}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio / Présentation</label>
              <textarea value={createForm.bio} onChange={e => setCF('bio', e.target.value)} rows={2}
                placeholder="Courte présentation du membre..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setCreateOpen(false)} className="flex-1">Annuler</Button>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} className="flex-1"
              disabled={!createForm.fullName || !createForm.email || !createForm.password}>
              Créer le compte
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══ Modal Modifier ══ */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Modifier — ${editUser?.fullName}`}>
        <div className="space-y-4">
          {/* Province info */}
          {editUser?.province && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 flex items-center gap-2">
              <MapPin size={12}/> {PROVINCE_LABELS[editUser.province] || editUser.province}
              {editUser.district && <><Building2 size={12}/> {DISTRICTS.find(d => d.value === editUser.district)?.label}</>}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
            <select
              title="Rôle de l'utilisateur"
              value={editForm.role}
              onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700">Suspendre ce compte</p>
              <p className="text-xs text-gray-500">L'utilisateur ne pourra plus se connecter</p>
            </div>
            <button
              type="button"
              title={editForm.isBanned ? 'Réactiver' : 'Suspendre'}
              onClick={() => setEditForm(f => ({ ...f, isBanned: !f.isBanned }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editForm.isBanned ? 'bg-red-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editForm.isBanned ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {editForm.isBanned && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raison de la suspension</label>
              <input value={editForm.banReason} onChange={e => setEditForm(f => ({ ...f, banReason: e.target.value }))}
                placeholder="Motif de suspension..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" onClick={() => setEditUser(null)} className="flex-1">Annuler</Button>
            <Button
              onClick={() => updateMutation.mutate({ id: (editUser!._id || editUser!.id)!, data: editForm })}
              loading={updateMutation.isPending}
              className="flex-1"
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
