import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, AlertTriangle, Eye, MessageCircle, Pin, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { publicationsAPI } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { timeAgo, truncate } from '@/utils/helpers';
import { Publication } from '@/types';

const PUB_TYPES = [
  { value: '', label: 'Tout' }, { value: 'INVESTIGATION', label: '🔍 Enquêtes' },
  { value: 'ALERT', label: '🚨 Alertes' }, { value: 'COMMUNIQUE', label: '📢 Communiqués' },
  { value: 'NEWS', label: '📰 Actualités' }, { value: 'CAMPAIGN', label: '🚀 Campagnes' },
];

export const FeedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canPublish = ['EDITOR', 'ADMIN', 'SUPERADMIN'].includes(user?.role || '');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['publications', type, search, page],
    queryFn: () => publicationsAPI.getAll({ type, search, page, limit: '12' }).then(r => r.data),
  });

  const { data: urgentData } = useQuery({
    queryKey: ['publications', 'urgent'],
    queryFn: () => publicationsAPI.getAll({ urgent: 'true', limit: '3' }).then(r => r.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fil d'Actualité</h1>
          <p className="text-gray-500 text-sm">Publications officielles de la Dynamique</p>
        </div>
        {canPublish && (
          <Button onClick={() => navigate('/feed/new')} icon={<Plus size={16} />}>
            Publier
          </Button>
        )}
      </div>

      {/* Urgent alerts banner */}
      {urgentData?.publications?.filter((p: Publication) => p.isUrgent).length > 0 && (
        <div className="bg-red-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} />
            <span className="text-sm font-bold">ALERTES URGENTES</span>
          </div>
          <div className="space-y-2">
            {urgentData.publications.filter((p: Publication) => p.isUrgent).map((pub: Publication) => (
              <div key={pub.id}
                onClick={() => navigate(`/feed/${pub.id}`)}
                className="bg-white/10 rounded-lg p-3 cursor-pointer hover:bg-white/20 transition-colors">
                <p className="text-sm font-medium">{pub.title}</p>
                <p className="text-xs text-red-200 mt-0.5">{timeAgo(pub.publishedAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PUB_TYPES.map(t => (
            <button key={t.value}
              onClick={() => setType(t.value)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors
                ${type === t.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une publication..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
      </div>

      {isLoading ? <LoadingSpinner text="Chargement des publications..." /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data?.publications?.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-gray-400">
              Aucune publication trouvée
            </div>
          ) : (
            data?.publications?.map((pub: Publication) => (
              <Card key={pub.id} hover onClick={() => navigate(`/feed/${pub.id}`)}>
                {pub.mediaUrls?.[0] && (
                  <img src={pub.mediaUrls[0]} alt={pub.title}
                    className="w-full h-48 object-cover rounded-t-xl" />
                )}
                <div className="p-5">
                  <div className="flex items-start gap-2 mb-2">
                    {pub.isPinned && (
                      <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex-shrink-0">
                        <Pin size={10} /> Épinglé
                      </span>
                    )}
                    {pub.isUrgent && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex-shrink-0">
                        🚨 URGENT
                      </span>
                    )}
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {pub.type}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 leading-tight">{pub.title}</h3>
                  <p className="text-gray-500 text-sm mt-2 line-clamp-3">{pub.excerpt || truncate(pub.content, 150)}</p>

                  {pub.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {pub.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">#{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye size={12} /> {pub.viewCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle size={12} /> {pub._count?.comments || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{pub.author?.fullName}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {timeAgo(pub.publishedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {data?.pagination?.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Précédent</Button>
          <span className="text-sm text-gray-500">Page {page} / {data.pagination.totalPages}</span>
          <Button variant="secondary" disabled={page === data.pagination.totalPages} onClick={() => setPage(p => p + 1)}>Suivant →</Button>
        </div>
      )}
    </div>
  );
};
