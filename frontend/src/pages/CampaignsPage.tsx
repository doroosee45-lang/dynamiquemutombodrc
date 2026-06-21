import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Users, Target, Calendar, Plus, FileSignature } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsAPI } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Campaign } from '@/types';
import { formatNumber, timeAgo } from '@/utils/helpers';
import { PROVINCES } from '@/utils/constants';
import toast from 'react-hot-toast';

export const CampaignsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const canCreate = ['EDITOR', 'ADMIN', 'SUPERADMIN'].includes(user?.role || '');
  const [province, setProvince] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', province],
    queryFn: () => campaignsAPI.getAll({ status: 'ACTIVE', province, limit: '20' }).then(r => r.data),
  });

  const joinMutation = useMutation({
    mutationFn: (id: string) => campaignsAPI.join(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Vous participez maintenant à cette campagne !');
    },
    onError: () => toast.error('Vous participez déjà à cette campagne'),
  });

  const signMutation = useMutation({
    mutationFn: (petitionId: string) => campaignsAPI.signPetition(petitionId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(`Pétition signée ! ${formatNumber(data.data.totalSignatures)} signatures`);
    },
    onError: () => toast.error('Vous avez déjà signé cette pétition'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campagnes de Mobilisation</h1>
          <p className="text-gray-500 text-sm">Rejoignez les actions citoyennes de la Dynamique</p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate('/campaigns/new')} icon={<Plus size={16} />}>
            Créer une campagne
          </Button>
        )}
      </div>

      {/* Filter by province */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setProvince('')}
          className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap ${!province ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          Tout le pays
        </button>
        {PROVINCES.slice(0, 8).map(p => (
          <button key={p.value} onClick={() => setProvince(p.value)}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap ${province === p.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {data?.campaigns?.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-gray-400">
              <Megaphone size={48} className="mx-auto mb-3 text-gray-200" />
              <p>Aucune campagne active pour le moment</p>
            </div>
          ) : (
            data?.campaigns?.map((campaign: Campaign) => (
              <Card key={campaign.id} className="overflow-hidden">
                {campaign.mediaUrls?.[0] && (
                  <img src={campaign.mediaUrls[0]} alt={campaign.title} className="w-full h-40 object-cover" />
                )}
                {!campaign.mediaUrls?.[0] && (
                  <div className="w-full h-24 bg-gradient-to-r from-primary-600 to-primary-800 flex items-center justify-center">
                    <Megaphone size={32} className="text-white/60" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-bold text-gray-900 leading-tight">{campaign.title}</h3>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm line-clamp-3">{campaign.description}</p>

                  <div className="flex gap-4 mt-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users size={12} /> {formatNumber(campaign._count?.participants || 0)} participants
                    </span>
                    {campaign.province && <span>📍 {campaign.province}</span>}
                    {campaign.endDate && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> jusqu'au {new Date(campaign.endDate).toLocaleDateString('fr')}
                      </span>
                    )}
                  </div>

                  {campaign.targetCount && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{formatNumber(campaign.currentCount)} participants</span>
                        <span>Objectif: {formatNumber(campaign.targetCount)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-600 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (campaign.currentCount / campaign.targetCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {campaign.petition && (
                    <div className="mt-3 bg-blue-50 rounded-lg p-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span className="font-medium">Pétition associée</span>
                        <span>{formatNumber(campaign.petition._count?.signatures || 0)} / {formatNumber(campaign.petition.targetCount)} signatures</span>
                      </div>
                      <div className="h-1.5 bg-blue-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.min(100, ((campaign.petition._count?.signatures || 0) / campaign.petition.targetCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Users size={14} />}
                      onClick={() => joinMutation.mutate(campaign.id)}
                      loading={joinMutation.isPending}
                      className="flex-1">
                      Participer
                    </Button>
                    {campaign.petition && (
                      <Button
                        size="sm"
                        icon={<FileSignature size={14} />}
                        onClick={() => signMutation.mutate(campaign.petition!.id)}
                        loading={signMutation.isPending}
                        className="flex-1">
                        Signer
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};
