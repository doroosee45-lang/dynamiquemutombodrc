import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Filter, Search, AlertTriangle, ThumbsUp, MessageCircle, Eye, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { reportsAPI } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { CategoryBadge, StatusBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { REPORT_CATEGORIES, REPORT_STATUSES, PROVINCES } from '@/utils/constants';
import { timeAgo, truncate } from '@/utils/helpers';
import { Report } from '@/types';

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: '',
    status: '',
    province: '',
    page: 1,
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports', filters],
    queryFn: () => reportsAPI.getAll({
      ...filters,
      limit: '15',
    }).then(r => r.data),
  });

  const updateFilter = (key: string, value: string | number) =>
    setFilters(f => ({ ...f, [key]: value, page: 1 }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Signalements Citoyens</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {data?.pagination?.total || 0} signalement(s) enregistré(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => refetch()}>
            Actualiser
          </Button>
          <Button onClick={() => navigate('/reports/new')} icon={<Plus size={16} />}>
            Nouveau signalement
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <div className="p-4 space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={filters.search}
                onChange={e => updateFilter('search', e.target.value)}
                placeholder="Rechercher dans les signalements..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <Button variant="secondary" icon={<Filter size={16} />} onClick={() => setShowFilters(!showFilters)}>
              Filtres
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
              <select value={filters.category} onChange={e => updateFilter('category', e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Toutes catégories</option>
                {REPORT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </select>

              <select value={filters.status} onChange={e => updateFilter('status', e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Tous statuts</option>
                {REPORT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>

              <select value={filters.province} onChange={e => updateFilter('province', e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Toutes provinces</option>
                {PROVINCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* Reports list */}
      {isLoading ? <LoadingSpinner text="Chargement des signalements..." /> : (
        <div className="space-y-3">
          {data?.reports?.length === 0 ? (
            <Card className="p-12 text-center">
              <AlertTriangle size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun signalement trouvé</p>
              <Button className="mt-4" onClick={() => navigate('/reports/new')}>
                Faire le premier signalement
              </Button>
            </Card>
          ) : (
            data?.reports?.map((r: Report) => (
              <Card key={r.id} hover onClick={() => navigate(`/reports/${r.id}`)}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <CategoryBadge category={r.category} />
                        <StatusBadge status={r.status} />
                        {r.isFlagged && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                            ⚠️ Vérification requise
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900">{r.title}</h3>
                      <p className="text-gray-500 text-sm mt-1 line-clamp-2">{truncate(r.description, 150)}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                        <span>📍 {r.province}{r.district ? ` · ${r.district}` : ''}</span>
                        {!r.isAnonymous && r.author?.fullName && <span>👤 {r.author.fullName}</span>}
                        <span>{timeAgo(r.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="flex gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <ThumbsUp size={12} /> {r._count?.votes || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle size={12} /> {r._count?.comments || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye size={12} /> {r.viewCount}
                        </span>
                      </div>
                      {r.confidenceScore !== undefined && (
                        <span className={`text-xs font-medium ${r.confidenceScore >= 0.7 ? 'text-green-600' : r.confidenceScore >= 0.4 ? 'text-yellow-600' : 'text-red-600'}`}>
                          IA: {Math.round(r.confidenceScore * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" disabled={filters.page === 1}
            onClick={() => updateFilter('page', filters.page - 1)}>
            ← Précédent
          </Button>
          <span className="text-sm text-gray-500">
            Page {filters.page} / {data.pagination.totalPages}
          </span>
          <Button variant="secondary" disabled={filters.page === data.pagination.totalPages}
            onClick={() => updateFilter('page', filters.page + 1)}>
            Suivant →
          </Button>
        </div>
      )}
    </div>
  );
};
