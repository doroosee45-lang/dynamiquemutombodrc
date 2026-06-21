import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Plus, Edit2, Trash2, KeyRound, Eye, EyeOff,
  CheckCircle, AlertTriangle, Clock, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { timeAgo } from '@/utils/helpers';

// ─── Constants ────────────────────────────────────────────────────────────────
const DISTRICTS = [
  { value: 'LUKUNGA',   label: 'Lukunga',   communes: ['Bandalungwa','Barumbu','Gombe','Kintambo','Kinshasa','Lingwala','Mont-Ngafula','Ngaliema'] },
  { value: 'FUNA',      label: 'Funa',       communes: ['Bumbu','Kalamu','Kasa-Vubu','Makala','Ngaba','Selembao'] },
  { value: 'MONT_AMBA', label: 'Mont-Amba',  communes: ['Kisenso','Lemba','Limete','Matete','Mont-Ngafula','Ngaba'] },
  { value: 'TSHANGU',   label: 'Tshangu',    communes: ['Kimbanseke','Kimwenza','Maluku','Masina','Ndjili','Nsele'] },
];

interface DistrictAdmin {
  _id: string; email: string; fullName: string; district: string; province: string;
  phone?: string; bio?: string; isBanned: boolean; reputationPoints: number;
  createdAt: string; lastLoginAt?: string;
}
interface DistrictSlot { district: string; admin: DistrictAdmin | null }

const EMPTY_FORM = { fullName: '', email: '', password: '', phone: '', bio: '' };

type ModalType = 'create' | 'edit' | 'delete' | 'reset' | null;

// ─── Component ────────────────────────────────────────────────────────────────
export const DistrictAdminsPage: React.FC = () => {
  const { user: me } = useAuthStore();
  const qc = useQueryClient();
  const isSuperAdmin = me?.role === 'SUPERADMIN';
  const province = me?.province || 'KINSHASA';

  const [modal, setModal] = useState<ModalType>(null);
  const [activeDistrict, setActiveDistrict] = useState<string>('');
  const [selected, setSelected] = useState<DistrictAdmin | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [newPwd, setNewPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // ─── Query ─────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['district-admins', province],
    queryFn: () => adminAPI.getDistrictAdmins(isSuperAdmin ? province : undefined).then(r => r.data),
  });
  const slots: DistrictSlot[] = data?.districts || DISTRICTS.map(d => ({ district: d.value, admin: null }));

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: () => adminAPI.createDistrictAdmin({ ...form, district: activeDistrict, province }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['district-admins'] }); toast.success('Admin de district créé'); closeModal(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur de création'),
  });

  const updateMut = useMutation({
    mutationFn: () => adminAPI.updateDistrictAdmin(selected!._id, { fullName: form.fullName, email: form.email, phone: form.phone, bio: form.bio }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['district-admins'] }); toast.success('Admin mis à jour'); closeModal(); },
    onError: () => toast.error('Erreur de mise à jour'),
  });

  const deleteMut = useMutation({
    mutationFn: () => adminAPI.deleteDistrictAdmin(selected!._id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['district-admins'] }); toast.success('Admin supprimé'); closeModal(); },
    onError: () => toast.error('Erreur de suppression'),
  });

  const resetMut = useMutation({
    mutationFn: () => adminAPI.resetDistrictAdminPassword(selected!._id, newPwd),
    onSuccess: () => { toast.success('Mot de passe réinitialisé'); closeModal(); },
    onError: () => toast.error('Erreur de réinitialisation'),
  });

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const openCreate = (districtValue: string) => {
    setActiveDistrict(districtValue);
    setForm({ ...EMPTY_FORM });
    setModal('create');
  };
  const openEdit = (admin: DistrictAdmin) => {
    setSelected(admin);
    setForm({ fullName: admin.fullName, email: admin.email, phone: admin.phone || '', bio: admin.bio || '', password: '' });
    setModal('edit');
  };
  const openDelete = (admin: DistrictAdmin) => { setSelected(admin); setModal('delete'); };
  const openReset = (admin: DistrictAdmin) => { setSelected(admin); setNewPwd(''); setModal('reset'); };
  const closeModal = () => { setModal(null); setSelected(null); setActiveDistrict(''); };

  const districtInfo = (val: string) => DISTRICTS.find(d => d.value === val);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admins de District — Kinshasa</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Les 4 districts de Kinshasa, chacun géré par un administrateur dédié
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
        <p className="font-medium mb-1">Structure administrative de Kinshasa</p>
        <p className="text-xs text-blue-600">
          Chaque admin de district gère les communes et quartiers de son district, ainsi que les membres inscrits.
          Les 4 districts : <strong>Lukunga</strong> · <strong>Funa</strong> · <strong>Mont-Amba</strong> · <strong>Tshangu</strong>
        </p>
      </div>

      {/* District cards */}
      {isLoading ? <LoadingSpinner text="Chargement des districts..." /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {DISTRICTS.map(district => {
            const slot = slots.find(s => s.district === district.value);
            const admin = slot?.admin || null;
            const hasAdmin = !!admin;

            return (
              <Card key={district.value}>
                <div className="p-5 space-y-4">
                  {/* District header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                        ${hasAdmin && !admin!.isBanned ? 'bg-green-100' : hasAdmin ? 'bg-red-100' : 'bg-gray-100'}`}>
                        <Building2 size={18} className={hasAdmin && !admin!.isBanned ? 'text-green-600' : hasAdmin ? 'text-red-500' : 'text-gray-400'} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">District {district.label}</h3>
                        <p className="text-xs text-gray-400">{district.communes.length} communes</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0
                      ${hasAdmin && !admin!.isBanned ? 'bg-green-100 text-green-700'
                      : hasAdmin ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-500'}`}>
                      {hasAdmin && !admin!.isBanned ? '✓ Actif' : hasAdmin ? '✗ Suspendu' : 'Vacant'}
                    </span>
                  </div>

                  {/* Communes list */}
                  <div className="flex flex-wrap gap-1">
                    {district.communes.slice(0, 6).map(c => (
                      <span key={c} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                    {district.communes.length > 6 && (
                      <span className="text-xs text-gray-400 px-1">+{district.communes.length - 6}</span>
                    )}
                  </div>

                  {/* Admin info or vacant */}
                  {hasAdmin ? (
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700 flex-shrink-0">
                          {admin!.fullName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{admin!.fullName}</p>
                          <p className="text-xs text-gray-400 truncate">{admin!.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock size={11}/> {timeAgo(admin!.createdAt)}</span>
                        {admin!.lastLoginAt && <span className="flex items-center gap-1"><CheckCircle size={11} className="text-green-500"/> Connecté {timeAgo(admin!.lastLoginAt)}</span>}
                      </div>
                      <div className="flex gap-1.5 pt-1">
                        <button type="button" onClick={() => openEdit(admin!)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                          <Edit2 size={12}/> Modifier
                        </button>
                        <button type="button" onClick={() => openReset(admin!)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors">
                          <KeyRound size={12}/> Reset pwd
                        </button>
                        <button type="button" onClick={() => openDelete(admin!)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors ml-auto">
                          <Trash2 size={12}/> Supprimer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                      <Users size={24} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-400 mb-3">Aucun admin assigné</p>
                      <button type="button" onClick={() => openCreate(district.value)}
                        className="flex items-center gap-1.5 text-sm px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors mx-auto">
                        <Plus size={14}/> Assigner un admin
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ══ Modal Créer ══ */}
      <Modal open={modal === 'create'} onClose={closeModal}
        title={`Assigner un admin — District ${districtInfo(activeDistrict)?.label || activeDistrict}`} size="lg">
        <div className="space-y-4">
          <div className={`bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 text-sm text-blue-700`}>
            <p className="font-medium">District {districtInfo(activeDistrict)?.label}</p>
            <p className="text-xs text-blue-500 mt-0.5">
              Communes : {districtInfo(activeDistrict)?.communes.join(', ')}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
              <input value={form.fullName} onChange={e => setF('fullName', e.target.value)}
                placeholder="Prénom et nom"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={e => setF('email', e.target.value)}
                placeholder="admin@exemple.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => setF('password', e.target.value)}
                  placeholder="Min. 8 caractères"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                <button type="button" onClick={() => setShowPwd(v => !v)} title={showPwd ? 'Masquer' : 'Afficher'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input value={form.phone} onChange={e => setF('phone', e.target.value)}
                placeholder="+243 xxx xxx xxx"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea value={form.bio} onChange={e => setF('bio', e.target.value)} rows={2}
                placeholder="Présentation brève..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={closeModal} className="flex-1">Annuler</Button>
            <Button onClick={() => createMut.mutate()} loading={createMut.isPending} className="flex-1"
              disabled={!form.fullName || !form.email || !form.password}>
              Créer l'admin
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══ Modal Modifier ══ */}
      <Modal open={modal === 'edit'} onClose={closeModal}
        title={`Modifier — ${selected?.fullName}`} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
              <input value={form.fullName} onChange={e => setF('fullName', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={e => setF('email', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input value={form.phone} onChange={e => setF('phone', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea value={form.bio} onChange={e => setF('bio', e.target.value)} rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={closeModal} className="flex-1">Annuler</Button>
            <Button onClick={() => updateMut.mutate()} loading={updateMut.isPending} className="flex-1">
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══ Modal Reset password ══ */}
      <Modal open={modal === 'reset'} onClose={closeModal}
        title={`Nouveau mot de passe — ${selected?.fullName}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe *</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)}
                placeholder="Min. 8 caractères"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <button type="button" onClick={() => setShowPwd(v => !v)} title={showPwd ? 'Masquer' : 'Afficher'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={closeModal} className="flex-1">Annuler</Button>
            <Button onClick={() => resetMut.mutate()} loading={resetMut.isPending}
              className="flex-1" disabled={newPwd.length < 8}>
              Réinitialiser
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══ Modal Supprimer ══ */}
      <Modal open={modal === 'delete'} onClose={closeModal} title="Confirmer la suppression">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
            <AlertTriangle size={32} className="mx-auto mb-2 text-red-400" />
            <p className="text-sm text-red-800">
              Supprimer l'admin <strong>{selected?.fullName}</strong> du district <strong>{DISTRICTS.find(d => d.value === selected?.district)?.label}</strong> ?
            </p>
            <p className="text-xs text-red-600 mt-2">Le district reviendra à l'état "Vacant".</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={closeModal} className="flex-1">Annuler</Button>
            <Button onClick={() => deleteMut.mutate()} loading={deleteMut.isPending}
              className="flex-1 !bg-red-600 hover:!bg-red-700">
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
