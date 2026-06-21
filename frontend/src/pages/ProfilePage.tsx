import React, { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authAPI, reportsAPI } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CategoryBadge, StatusBadge } from '@/components/ui/Badge';
import { getInitials, getBadgeInfo, formatNumber, timeAgo } from '@/utils/helpers';
import { BadgeType, Report } from '@/types';
import { Camera, Shield, Star, Award, QrCode } from 'lucide-react';
import { PROVINCES, DISTRICTS, BADGE_INFO } from '@/utils/constants';
import toast from 'react-hot-toast';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [qrData, setQrData] = useState<{ qrCode: string; secret: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    province: user?.province || '',
    district: user?.district || '',
  });

  const { data: myReports, isLoading } = useQuery({
    queryKey: ['my-reports'],
    queryFn: () => reportsAPI.getAll({ limit: '10', sortBy: 'createdAt' }).then(r => r.data),
    enabled: !!user,
  });

  const profileMutation = useMutation({
    mutationFn: (fd: FormData) => authAPI.updateProfile(fd),
    onSuccess: (res) => {
      updateUser(res.data);
      setEditing(false);
      toast.success('Profil mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const setup2FAMutation = useMutation({
    mutationFn: () => authAPI.setup2FA(),
    onSuccess: (res) => { setQrData(res.data); setShow2FAModal(true); },
  });

  const verify2FAMutation = useMutation({
    mutationFn: () => authAPI.verify2FA(totpCode),
    onSuccess: () => {
      updateUser({ twoFAEnabled: true });
      setShow2FAModal(false);
      toast.success('2FA activé avec succès !');
    },
    onError: () => toast.error('Code invalide'),
  });

  const disable2FAMutation = useMutation({
    mutationFn: () => authAPI.disable2FA(),
    onSuccess: () => { updateUser({ twoFAEnabled: false }); toast.success('2FA désactivé'); },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    profileMutation.mutate(fd);
  };

  if (!user) return <LoadingSpinner />;

  const nextBadgeThreshold = Object.entries(BADGE_INFO)
    .filter(([k]) => k !== 'INNOVATOR')
    .find(([, v]) => user.reputationPoints < v.points);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile header */}
      <Card className="p-6">
        <div className="flex items-start gap-5">
          <div className="relative">
            {user.avatar ? (
              <img src={user.avatar} alt={user.fullName} className="w-20 h-20 rounded-2xl object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-primary-600 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">{getInitials(user.fullName)}</span>
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border border-gray-200 rounded-full
              flex items-center justify-center cursor-pointer shadow-sm hover:bg-gray-50">
              <Camera size={14} className="text-gray-500" />
              <input type="file" className="hidden" accept="image/*" onChange={e => {
                if (!e.target.files?.[0]) return;
                const fd = new FormData();
                fd.append('avatar', e.target.files[0]);
                profileMutation.mutate(fd);
              }} />
            </label>
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{user.fullName}</h1>
                <p className="text-gray-500 text-sm">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                    ${user.role === 'SUPERADMIN' ? 'bg-red-100 text-red-700'
                      : user.role === 'ADMIN' ? 'bg-orange-100 text-orange-700'
                      : user.role === 'MODERATOR' ? 'bg-blue-100 text-blue-700'
                      : user.role === 'EDITOR' ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-700'}`}>
                    {user.role}
                  </span>
                  {user.province && <span className="text-xs text-gray-400">📍 {user.province}</span>}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Modifier
              </Button>
            </div>

            {/* Reputation */}
            <div className="mt-4 bg-gradient-to-r from-primary-50 to-orange-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-yellow-500" />
                  <span className="text-sm font-semibold text-gray-700">Réputation</span>
                </div>
                <span className="text-xl font-bold text-primary-600">{formatNumber(user.reputationPoints)} pts</span>
              </div>

              {nextBadgeThreshold && (
                <>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-orange-500 rounded-full"
                      style={{ width: `${Math.min(100, (user.reputationPoints / nextBadgeThreshold[1].points) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatNumber(nextBadgeThreshold[1].points - user.reputationPoints)} points pour le badge {nextBadgeThreshold[1].icon} {nextBadgeThreshold[1].label}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Badges */}
      {user.badges?.length > 0 && (
        <Card className="p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Award size={18} className="text-yellow-500" /> Mes Badges
          </h2>
          <div className="flex flex-wrap gap-3">
            {user.badges.map(b => {
              const info = getBadgeInfo(b.badge as BadgeType);
              return (
                <div key={b.badge} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2">
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{info.label}</p>
                    <p className="text-xs text-gray-400">Obtenu le {new Date(b.awardedAt).toLocaleDateString('fr')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Security */}
      <Card className="p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Shield size={18} className="text-primary-600" /> Sécurité
        </h2>
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-700">Authentification à deux facteurs (2FA)</p>
            <p className="text-xs text-gray-500">Sécurisez votre compte avec une application d'authentification</p>
          </div>
          {user.twoFAEnabled ? (
            <Button size="sm" variant="danger" onClick={() => disable2FAMutation.mutate()} loading={disable2FAMutation.isPending}>
              Désactiver
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setup2FAMutation.mutate()} loading={setup2FAMutation.isPending}>
              Activer
            </Button>
          )}
        </div>
        <div className="py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Email vérifié</p>
            <span className={`text-xs ${user.isEmailVerified ? 'text-green-600' : 'text-red-600'}`}>
              {user.isEmailVerified ? '✓ Vérifié' : '✗ Non vérifié'}
            </span>
          </div>
        </div>
      </Card>

      {/* My reports */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Mes signalements récents</h2>
        </div>
        {isLoading ? <LoadingSpinner size="sm" /> : (
          <div className="divide-y divide-gray-50">
            {myReports?.reports?.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">Aucun signalement</p>
            ) : (
              myReports?.reports?.map((r: Report) => (
                <div key={r.id} className="px-6 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <CategoryBadge category={r.category} />
                        <span className="text-xs text-gray-400">{timeAgo(r.createdAt)}</span>
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      {/* Edit modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Modifier mon profil">
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <Input label="Nom complet" value={form.fullName}
            onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
          <Input label="Téléphone" type="tel" value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
            <select value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {PROVINCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          {form.province === 'KINSHASA' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
              <select value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {DISTRICTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(false)} className="flex-1">Annuler</Button>
            <Button type="submit" loading={profileMutation.isPending} className="flex-1">Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {/* 2FA Setup Modal */}
      <Modal open={show2FAModal} onClose={() => setShow2FAModal(false)} title="Configurer le 2FA">
        {qrData && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-gray-600">
              Scannez ce QR code avec Google Authenticator ou une application TOTP compatible.
            </p>
            <img src={qrData.qrCode} alt="QR Code 2FA" className="mx-auto w-40 h-40" />
            <p className="text-xs text-gray-500">Clé secrète : <code className="bg-gray-100 px-2 py-0.5 rounded">{qrData.secret}</code></p>
            <Input label="Code de vérification (6 chiffres)"
              value={totpCode}
              onChange={e => setTotpCode(e.target.value)}
              placeholder="000000"
              maxLength={6}
              className="text-center text-xl tracking-widest" />
            <Button className="w-full" onClick={() => verify2FAMutation.mutate()} loading={verify2FAMutation.isPending}>
              Vérifier et activer
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};
