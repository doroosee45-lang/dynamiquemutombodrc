import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, Plus, ThumbsUp, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { innovationsAPI } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Innovation } from '@/types';
import { timeAgo, getInitials } from '@/utils/helpers';
import toast from 'react-hot-toast';

const CATEGORIES: Record<string, string> = {
  APP: '📱 App Mobile/Web',
  TOOL: '🔧 Outil Citoyen',
  DATA: '📊 Data & Journalisme',
  COMMUNITY: '🤝 Solution Communautaire',
  SECURITY: '🛡️ Sécurité & Alerte',
  OTHER: '💡 Autre Innovation',
};

const STAGES: Record<string, string> = {
  IDEA: '💭 Idée',
  PROTOTYPE: '🔨 Prototype',
  MVP: '🚀 MVP',
  FUNCTIONAL: '✅ Fonctionnel',
};

export const InnovationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(user?.role || '');
  const [filterValidated, setFilterValidated] = useState<boolean | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['innovations', filterValidated],
    queryFn: () =>
      innovationsAPI
        .getAll(filterValidated !== undefined ? { validated: String(filterValidated) } : {})
        .then(r => r.data),
  });

  const voteMutation = useMutation({
    mutationFn: (id: string) => innovationsAPI.vote(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['innovations'] });
      toast.success(data.data.voted ? 'Vote enregistré !' : 'Vote retiré');
    },
  });

  const validateMutation = useMutation({
    mutationFn: (id: string) => innovationsAPI.validate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['innovations'] });
      toast.success("Innovation validée ! Badge Innovateur décerné à l'auteur.");
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Innovation Jeunes</h1>
          <p className="text-gray-500 text-sm">Espace dédié à la valorisation des innovations citoyennes</p>
        </div>
        <Button onClick={() => navigate('/innovations/new')} icon={<Plus size={16} />}>
          Soumettre mon innovation
        </Button>
      </div>

      {/* Info banner */}
      <div className="bg-gradient-to-r from-purple-600 to-primary-600 rounded-xl p-5 text-white">
        <div className="flex items-start gap-3">
          <Lightbulb size={24} className="flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold">Valorisons l'innovation congolaise !</h3>
            <p className="text-purple-100 text-sm mt-1">
              Soumettez vos projets innovants en 5 étapes — applications, outils, solutions locales. Les innovations validées reçoivent le badge spécial 💡 <strong>Innovateur</strong> et <strong>+200 points</strong> de réputation.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { label: 'Toutes', value: undefined },
          { label: '✅ Validées', value: true },
          { label: '⏳ En attente', value: false },
        ].map(f => (
          <button key={String(f.value)}
            onClick={() => setFilterValidated(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              filterValidated === f.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <>
          {data?.innovations?.length === 0 ? (
            <div className="text-center py-16">
              <Lightbulb size={48} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400">Aucune innovation trouvée</p>
              <Button onClick={() => navigate('/innovations/new')} className="mt-4" icon={<Plus size={16} />}>
                Soumettre la première
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {data?.innovations?.map((inn: Innovation) => (
                <Card key={inn.id} className="overflow-hidden flex flex-col">
                  {inn.mediaUrls?.[0] ? (
                    <img src={inn.mediaUrls[0]} alt={inn.title} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-24 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                      <Lightbulb size={32} className="text-purple-300" />
                    </div>
                  )}

                  <div className="p-5 flex flex-col flex-1">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {inn.isValidated && (
                        <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          <CheckCircle size={10} /> Validée
                        </span>
                      )}
                      {inn.category && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          {CATEGORIES[inn.category] || inn.category}
                        </span>
                      )}
                      {(inn as any).developmentStage && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {STAGES[(inn as any).developmentStage] || (inn as any).developmentStage}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-gray-900 leading-tight">{inn.title}</h3>
                    <p className="text-gray-500 text-sm mt-2 line-clamp-3 flex-1">{inn.description}</p>

                    {/* Province */}
                    {(inn as any).province && (
                      <p className="text-xs text-gray-400 mt-2">📍 {(inn as any).province.replace('_', '-')}</p>
                    )}

                    {/* Demo link */}
                    {(inn as any).demoUrl && (
                      <a href={(inn as any).demoUrl} target="_blank" rel="noreferrer"
                        className="text-xs text-primary-600 hover:underline mt-1 flex items-center gap-1 w-fit"
                        onClick={e => e.stopPropagation()}>
                        🔗 Voir la démo
                      </a>
                    )}

                    {/* Author */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        {inn.author?.avatar ? (
                          <img src={inn.author.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                            {getInitials(inn.author?.fullName || '?')}
                          </div>
                        )}
                        <span className="text-xs text-gray-500 truncate max-w-[100px]">{inn.author?.fullName}</span>
                      </div>
                      <span className="text-xs text-gray-400">{timeAgo(inn.createdAt)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => voteMutation.mutate(inn.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        <ThumbsUp size={14} /> {inn._count?.votes || 0}
                      </button>
                      {isAdmin && !inn.isValidated && (
                        <button
                          onClick={() => validateMutation.mutate(inn.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 hover:bg-green-100 transition-colors">
                          <CheckCircle size={14} /> Valider
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
