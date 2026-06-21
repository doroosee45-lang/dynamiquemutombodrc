import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Edit2, Trash2, KeyRound, Eye, EyeOff,
  CheckCircle, XCircle, MapPin, Users, AlertTriangle,
  Mail, Phone, Shield, LayoutGrid, List, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getInitials, timeAgo, formatNumber } from '@/utils/helpers';
import { PROVINCES } from '@/utils/constants';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProvincialAdmin {
  _id: string; id?: string;
  fullName: string; email: string; phone?: string; bio?: string; avatar?: string;
  province: string; district?: string;
  isBanned: boolean; banReason?: string;
  reputationPoints: number;
  createdAt: string; lastLoginAt?: string;
  reportCount: number;
}

type ModalType = 'create' | 'edit' | 'delete' | 'reset-password' | 'view' | null;

const PROVINCE_LABELS = Object.fromEntries(PROVINCES.map(p => [p.value, p.label]));

const RoleBadge = ({ banned }: { banned: boolean }) => (
  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
    banned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
  }`}>
    {banned ? <><XCircle size={10} /> Suspendu</> : <><CheckCircle size={10} /> Actif</>}
  </span>
);

// ─── Form Defaults ─────────────────────────────────────────────────────────────
const EMPTY_FORM = { fullName: '', email: '', password: '', province: '', phone: '', bio: '', isBanned: false, banReason: '' };

// ─── Main Page ─────────────────────────────────────────────────────────────────
export const ProvincialAdminsPage: React.FC = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'banned' | 'vacant'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [modal, setModal] = useState<ModalType>(null);
  const [selected, setSelected] = useState<ProvincialAdmin | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const setF = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  // ─── Queries ─────────────────────────────────────────────────────────────────
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['provincial-admins'],
    queryFn: () => adminAPI.getProvincialAdmins().then(r => r.data),
  });

  const admins: ProvincialAdmin[] = data?.admins || [];

  // Build map: province → admin
  const adminsByProvince = useMemo(() =>
    Object.fromEntries(admins.map(a => [a.province, a])),
    [admins]
  );

  // Stats
  const assigned = admins.length;
  const vacant = 26 - assigned;
  const active = admins.filter(a => !a.isBanned).length;
  const banned = admins.filter(a => a.isBanned).length;
  const totalReports = admins.reduce((s, a) => s + (a.reportCount || 0), 0);

  // Filtered view
  const filteredProvinces = useMemo(() => {
    return PROVINCES.filter(p => {
      const adm = adminsByProvince[p.value];
      const matchSearch = !search ||
        p.label.toLowerCase().includes(search.toLowerCase()) ||
        (adm?.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
        (adm?.email || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        filterStatus === 'all' ? true :
        filterStatus === 'vacant' ? !adm :
        filterStatus === 'active' ? (adm && !adm.isBanned) :
        filterStatus === 'banned' ? (adm && adm.isBanned) : true;
      return matchSearch && matchStatus;
    });
  }, [search, filterStatus, adminsByProvince]);

  // ─── Mutations ────────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: () => adminAPI.createProvincialAdmin(form as Record<string, unknown>),
    onSuccess: () => { toast.success('Administrateur créé avec succès'); qc.invalidateQueries({ queryKey: ['provincial-admins'] }); closeModal(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur lors de la création'),
  });

  const updateMut = useMutation({
    mutationFn: () => adminAPI.updateProvincialAdmin(selected!._id, form as Record<string, unknown>),
    onSuccess: () => { toast.success('Administrateur mis à jour'); qc.invalidateQueries({ queryKey: ['provincial-admins'] }); closeModal(); },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteMut = useMutation({
    mutationFn: () => adminAPI.deleteProvincialAdmin(selected!._id),
    onSuccess: () => { toast.success('Administrateur supprimé'); qc.invalidateQueries({ queryKey: ['provincial-admins'] }); closeModal(); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const resetPwdMut = useMutation({
    mutationFn: () => adminAPI.resetProvincialAdminPassword(selected!._id, newPassword),
    onSuccess: () => { toast.success('Mot de passe réinitialisé'); closeModal(); setNewPassword(''); },
    onError: () => toast.error('Erreur lors de la réinitialisation'),
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const openCreate = (province?: string) => {
    setForm({ ...EMPTY_FORM, province: province || '' });
    setSelected(null);
    setModal('create');
  };

  const openEdit = (adm: ProvincialAdmin) => {
    setSelected(adm);
    setForm({ fullName: adm.fullName, email: adm.email, password: '', province: adm.province, phone: adm.phone || '', bio: adm.bio || '', isBanned: adm.isBanned, banReason: adm.banReason || '' });
    setModal('edit');
  };

  const openDelete = (adm: ProvincialAdmin) => { setSelected(adm); setModal('delete'); };
  const openView = (adm: ProvincialAdmin) => { setSelected(adm); setModal('view'); };
  const openResetPwd = (adm: ProvincialAdmin) => { setSelected(adm); setNewPassword(''); setModal('reset-password'); };
  const closeModal = () => { setModal(null); setSelected(null); setShowPassword(false); };

  // ─── Render ───────────────────────────────────────────────────────────────────
  if (isLoading) return <LoadingSpinner text="Chargement des administrateurs..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administrateurs Provinciaux</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gérer les 26 admins des provinces de la RDC</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => refetch()} icon={<RefreshCw size={15} />}>Actualiser</Button>
          <Button onClick={() => openCreate()} icon={<Plus size={16} />}>Nommer un admin</Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Provinces assignées', value: assigned, color: 'text-blue-600 bg-blue-50', icon: <Shield size={18} /> },
          { label: 'Postes vacants', value: vacant, color: 'text-orange-600 bg-orange-50', icon: <MapPin size={18} /> },
          { label: 'Admins actifs', value: active, color: 'text-green-600 bg-green-50', icon: <CheckCircle size={18} /> },
          { label: 'Suspendus', value: banned, color: 'text-red-600 bg-red-50', icon: <XCircle size={18} /> },
          { label: 'Signalements gérés', value: formatNumber(totalReports), color: 'text-purple-600 bg-purple-50', icon: <AlertTriangle size={18} /> },
        ].map(s => (
          <Card key={s.label}>
            <div className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.color}`}>{s.icon}</div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 leading-tight">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher province ou admin..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div className="flex gap-1">
          {[
            { key: 'all', label: 'Toutes' },
            { key: 'active', label: '✅ Actifs' },
            { key: 'vacant', label: '⚠️ Vacants' },
            { key: 'banned', label: '🚫 Suspendus' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilterStatus(f.key as typeof filterStatus)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filterStatus === f.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            <List size={16} />
          </button>
        </div>
      </div>

      {/* ── GRID VIEW ── */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProvinces.map(p => {
            const adm = adminsByProvince[p.value];
            return (
              <Card key={p.value} className={`overflow-hidden transition-shadow hover:shadow-md ${adm?.isBanned ? 'border-red-200' : ''}`}>
                {/* Province header */}
                <div className={`px-4 py-3 flex items-center justify-between ${
                  !adm ? 'bg-orange-50' : adm.isBanned ? 'bg-red-50' : 'bg-green-50'
                }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin size={14} className={!adm ? 'text-orange-500' : adm.isBanned ? 'text-red-500' : 'text-green-600'} />
                    <span className="text-sm font-semibold text-gray-800 truncate">{p.label}</span>
                  </div>
                  {adm ? <RoleBadge banned={adm.isBanned} /> : (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full whitespace-nowrap">Vacant</span>
                  )}
                </div>

                <div className="p-4">
                  {adm ? (
                    <>
                      {/* Admin info */}
                      <div className="flex items-center gap-3 mb-3">
                        {adm.avatar ? (
                          <img src={adm.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700">
                            {getInitials(adm.fullName)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{adm.fullName}</p>
                          <p className="text-xs text-gray-400 truncate">{adm.email}</p>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mb-3">
                        <span>{formatNumber(adm.reportCount || 0)} signalements</span>
                        {adm.lastLoginAt && <span>Actif {timeAgo(adm.lastLoginAt)}</span>}
                      </div>
                      {/* Actions */}
                      <div className="flex gap-1">
                        <button onClick={() => openView(adm)} title="Voir détails"
                          className="flex-1 py-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center">
                          <Eye size={13} />
                        </button>
                        <button onClick={() => openEdit(adm)} title="Modifier"
                          className="flex-1 py-1.5 rounded-md border border-blue-200 text-blue-600 hover:bg-blue-50 flex items-center justify-center">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => openResetPwd(adm)} title="Réinitialiser mot de passe"
                          className="flex-1 py-1.5 rounded-md border border-purple-200 text-purple-600 hover:bg-purple-50 flex items-center justify-center">
                          <KeyRound size={13} />
                        </button>
                        <button onClick={() => openDelete(adm)} title="Supprimer"
                          className="flex-1 py-1.5 rounded-md border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-3">
                      <Users size={28} className="mx-auto mb-2 text-gray-200" />
                      <p className="text-xs text-gray-400 mb-3">Aucun administrateur assigné</p>
                      <button onClick={() => openCreate(p.value)}
                        className="w-full py-1.5 rounded-lg border-2 border-dashed border-primary-300 text-primary-600 text-xs font-medium hover:bg-primary-50 transition-colors flex items-center justify-center gap-1">
                        <Plus size={13} /> Nommer un admin
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Province', 'Administrateur', 'Email', 'Statut', 'Signalements', 'Dernière connexion', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProvinces.map(p => {
                  const adm = adminsByProvince[p.value];
                  return (
                    <tr key={p.value} className={`hover:bg-gray-50 ${adm?.isBanned ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-800 whitespace-nowrap">{p.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {adm ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700 flex-shrink-0">
                              {getInitials(adm.fullName)}
                            </div>
                            <span className="text-sm text-gray-800 whitespace-nowrap">{adm.fullName}</span>
                          </div>
                        ) : <span className="text-xs text-orange-500 font-medium">— Poste vacant</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{adm?.email || '—'}</td>
                      <td className="px-4 py-3">
                        {adm ? <RoleBadge banned={adm.isBanned} /> : (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Vacant</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">{adm ? formatNumber(adm.reportCount || 0) : '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {adm?.lastLoginAt ? timeAgo(adm.lastLoginAt) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {adm ? (
                          <div className="flex gap-1">
                            <button onClick={() => openView(adm)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Détails"><Eye size={13} /></button>
                            <button onClick={() => openEdit(adm)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Modifier"><Edit2 size={13} /></button>
                            <button onClick={() => openResetPwd(adm)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded" title="Réinitialiser MDP"><KeyRound size={13} /></button>
                            <button onClick={() => openDelete(adm)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Supprimer"><Trash2 size={13} /></button>
                          </div>
                        ) : (
                          <button onClick={() => openCreate(p.value)}
                            className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                            <Plus size={12} /> Nommer
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {filteredProvinces.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Search size={36} className="mx-auto mb-2 text-gray-200" />
          <p>Aucune province trouvée</p>
        </div>
      )}

      {/* ══════════ MODAL : Créer ══════════ */}
      <Modal open={modal === 'create'} onClose={closeModal} title="Nommer un Administrateur Provincial" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
              <input value={form.fullName} onChange={e => setF('fullName', e.target.value)}
                placeholder="Jean-Pierre Mukendi"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Province assignée *</label>
              <select value={form.province} onChange={e => setF('province', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Sélectionner une province...</option>
                {PROVINCES.filter(p => !adminsByProvince[p.value]).map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={form.email} onChange={e => setF('email', e.target.value)} type="email"
                  placeholder="admin.kinshasa@dynamique-rdc.cd"
                  className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
              <div className="relative">
                <input value={form.password} onChange={e => setF('password', e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 caractères"
                  className="w-full border border-gray-200 rounded-lg px-3 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={form.phone} onChange={e => setF('phone', e.target.value)}
                  placeholder="+243 8xx xxx xxx"
                  className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Biographie / Notes</label>
            <textarea value={form.bio} onChange={e => setF('bio', e.target.value)} rows={3}
              placeholder="Brève description du rôle ou parcours de cet administrateur..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
            📋 Cet administrateur aura accès au tableau de bord provincial, pourra modérer les signalements de sa province et gérer les membres locaux.
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={closeModal} className="flex-1">Annuler</Button>
            <Button onClick={() => createMut.mutate()} loading={createMut.isPending} className="flex-1"
              disabled={!form.fullName || !form.email || !form.password || !form.province}>
              Créer l'administrateur
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══════════ MODAL : Modifier ══════════ */}
      <Modal open={modal === 'edit'} onClose={closeModal} title={`Modifier — ${selected?.fullName}`} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
              <input value={form.fullName} onChange={e => setF('fullName', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
              <select value={form.province} onChange={e => setF('province', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                {PROVINCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input value={form.email} onChange={e => setF('email', e.target.value)} type="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input value={form.phone} onChange={e => setF('phone', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Biographie</label>
            <textarea value={form.bio} onChange={e => setF('bio', e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
          {/* Suspension toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-700">Suspendre ce compte</p>
              <p className="text-xs text-gray-500">L'administrateur ne pourra plus se connecter</p>
            </div>
            <button onClick={() => setF('isBanned', !form.isBanned)}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.isBanned ? 'bg-red-500' : 'bg-gray-300'}`}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isBanned ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          {form.isBanned && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raison de la suspension</label>
              <input value={form.banReason} onChange={e => setF('banReason', e.target.value)}
                placeholder="Ex: Non-conformité aux directives nationales"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={closeModal} className="flex-1">Annuler</Button>
            <Button onClick={() => updateMut.mutate()} loading={updateMut.isPending} className="flex-1">
              Enregistrer les modifications
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══════════ MODAL : Voir détails ══════════ */}
      <Modal open={modal === 'view'} onClose={closeModal} title="Profil de l'Administrateur" size="lg">
        {selected && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-xl font-bold text-primary-700">
                {getInitials(selected.fullName)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selected.fullName}</h3>
                <p className="text-sm text-gray-500">{selected.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                    ADMIN — {PROVINCE_LABELS[selected.province] || selected.province}
                  </span>
                  <RoleBadge banned={selected.isBanned} />
                </div>
              </div>
            </div>
            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Province', value: PROVINCE_LABELS[selected.province] || selected.province },
                { label: 'Téléphone', value: selected.phone || '—' },
                { label: 'Points réputation', value: formatNumber(selected.reputationPoints) },
                { label: 'Signalements province', value: formatNumber(selected.reportCount || 0) },
                { label: 'Compte créé le', value: new Date(selected.createdAt).toLocaleDateString('fr-CD', { day: 'numeric', month: 'long', year: 'numeric' }) },
                { label: 'Dernière connexion', value: selected.lastLoginAt ? timeAgo(selected.lastLoginAt) : 'Jamais' },
              ].map(row => (
                <div key={row.label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-0.5">{row.label}</p>
                  <p className="font-medium text-gray-800">{row.value}</p>
                </div>
              ))}
            </div>
            {selected.bio && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Biographie</p>
                <p className="text-sm text-gray-700">{selected.bio}</p>
              </div>
            )}
            {selected.isBanned && selected.banReason && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                <p className="text-xs text-red-500 font-medium mb-1">Raison de suspension</p>
                <p className="text-sm text-red-700">{selected.banReason}</p>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" onClick={() => { closeModal(); setTimeout(() => openEdit(selected), 100); }} icon={<Edit2 size={14} />} className="flex-1">
                Modifier
              </Button>
              <Button variant="secondary" onClick={() => { closeModal(); setTimeout(() => openResetPwd(selected), 100); }} icon={<KeyRound size={14} />} className="flex-1">
                Réinitialiser MDP
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ══════════ MODAL : Réinitialiser mot de passe ══════════ */}
      <Modal open={modal === 'reset-password'} onClose={closeModal} title={`Réinitialiser le mot de passe`}>
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-sm text-yellow-700">
            ⚠️ Vous allez réinitialiser le mot de passe de <strong>{selected?.fullName}</strong>. Communiquez le nouveau mot de passe par canal sécurisé.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe *</label>
            <div className="relative">
              <input value={newPassword} onChange={e => setNewPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 caractères"
                className="w-full border border-gray-200 rounded-lg px-3 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <button type="button" onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={closeModal} className="flex-1">Annuler</Button>
            <Button onClick={() => resetPwdMut.mutate()} loading={resetPwdMut.isPending}
              disabled={newPassword.length < 8} className="flex-1">
              Réinitialiser
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══════════ MODAL : Confirmer suppression ══════════ */}
      <Modal open={modal === 'delete'} onClose={closeModal} title="Confirmer la suppression">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
            <Trash2 size={32} className="mx-auto mb-2 text-red-400" />
            <p className="text-sm text-red-800">
              Vous êtes sur le point de supprimer définitivement le compte de<br />
              <strong className="text-base">{selected?.fullName}</strong><br />
              <span className="text-xs text-red-600">Admin — {PROVINCE_LABELS[selected?.province || ''] || selected?.province}</span>
            </p>
          </div>
          <p className="text-sm text-gray-500 text-center">
            Cette action est <strong>irréversible</strong>. Le poste sera déclaré vacant.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={closeModal} className="flex-1">Annuler</Button>
            <Button onClick={() => deleteMut.mutate()} loading={deleteMut.isPending}
              className="flex-1 !bg-red-600 hover:!bg-red-700">
              Supprimer définitivement
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
