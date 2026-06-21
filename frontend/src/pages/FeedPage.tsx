import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, AlertTriangle, Eye, MessageCircle,
  Pin, Clock, Newspaper, Zap, ChevronRight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { publicationsAPI } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { timeAgo } from '@/utils/helpers';
import { Publication } from '@/types';

/* ── type badge config ───────────────────────────── */
const TYPE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  INVESTIGATION: { label: 'Enquête',    color: 'text-purple-700', bg: 'bg-purple-100'  },
  ALERT:         { label: 'Alerte',     color: 'text-red-700',    bg: 'bg-red-100'     },
  COMMUNIQUE:    { label: 'Communiqué', color: 'text-blue-700',   bg: 'bg-blue-100'    },
  NEWS:          { label: 'Actualité',  color: 'text-emerald-700',bg: 'bg-emerald-100' },
  CAMPAIGN:      { label: 'Campagne',   color: 'text-orange-700', bg: 'bg-orange-100'  },
};

const FILTERS = [
  { value: '',              label: 'Tout'        },
  { value: 'INVESTIGATION', label: '🔍 Enquêtes' },
  { value: 'ALERT',         label: '🚨 Alertes'  },
  { value: 'COMMUNIQUE',    label: '📢 Communiqués' },
  { value: 'NEWS',          label: '📰 Actualités'  },
  { value: 'CAMPAIGN',      label: '🚀 Campagnes'   },
];

function TypeBadge({ type }: { type: string }) {
  const c = TYPE_CFG[type];
  if (!c) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${c.bg} ${c.color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 flex-shrink-0" />
      {c.label}
    </span>
  );
}

/* ── component ───────────────────────────────────── */
export const FeedPage: React.FC = () => {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const canPublish = ['EDITOR', 'ADMIN', 'SUPERADMIN'].includes(user?.role || '');
  const [type,   setType]   = useState('');
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['publications', type, search, page],
    queryFn: () => publicationsAPI.getAll({ type, search, page, limit: '12' }).then(r => r.data),
  });

  const { data: urgentData } = useQuery({
    queryKey: ['publications', 'urgent'],
    queryFn: () => publicationsAPI.getAll({ urgent: 'true', limit: '3' }).then(r => r.data),
  });

  const pubs: Publication[] = data?.publications ?? [];
  const featured = pubs[0];
  const rest     = pubs.slice(1);
  const urgentPubs = (urgentData?.publications ?? []).filter((p: Publication) => p.isUrgent);

  return (
    <div className="space-y-5 pb-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fil d'Actualité</h1>
          <p className="text-gray-400 text-sm mt-0.5">Publications officielles de la Dynamique</p>
        </div>
        {canPublish && (
          <button
            type="button"
            onClick={() => navigate('/feed/new')}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all"
          >
            <Plus size={16} /> Publier
          </button>
        )}
      </div>

      {/* ── Urgent banner ── */}
      {urgentPubs.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
              <Zap size={11} className="fill-white text-white" />
              <span className="text-white text-[11px] font-black uppercase tracking-widest">Alertes urgentes</span>
            </span>
          </div>
          <div className="space-y-1.5">
            {urgentPubs.map((pub: Publication) => (
              <div
                key={pub.id}
                onClick={() => navigate(`/feed/${pub.id}`)}
                className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 cursor-pointer transition-all group"
              >
                <AlertTriangle size={13} className="text-red-200 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{pub.title}</p>
                  <p className="text-red-200 text-[11px] mt-0.5">{timeAgo(pub.publishedAt)}</p>
                </div>
                <ChevronRight size={14} className="text-red-300 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {FILTERS.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => { setType(f.value); setPage(1); }}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                type === f.value
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher une publication..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <LoadingSpinner text="Chargement des publications..." />
      ) : pubs.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Newspaper size={28} className="text-gray-300" />
          </div>
          <p className="text-gray-600 font-semibold">Aucune publication trouvée</p>
          <p className="text-gray-400 text-sm mt-1">Essayez un autre filtre ou revenez plus tard.</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* ── Article featured ── */}
          {featured && (
            <div
              onClick={() => navigate(`/feed/${featured.id}`)}
              className="group relative bg-gray-900 rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-2xl transition-all duration-300"
            >
              {featured.mediaUrls?.[0] ? (
                <>
                  <div className="relative overflow-hidden bg-gray-950">
                    <img
                      src={featured.mediaUrls[0]}
                      alt={featured.title}
                      className="w-full h-auto max-h-[70vh] object-contain"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      {featured.isPinned && (
                        <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                          <Pin size={9} /> Épinglé
                        </span>
                      )}
                      {featured.isUrgent && (
                        <span className="inline-flex items-center gap-1 bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase animate-pulse">
                          <AlertTriangle size={9} /> Urgent
                        </span>
                      )}
                      <TypeBadge type={featured.type} />
                    </div>
                    <h2 className="text-xl sm:text-3xl font-black text-white leading-snug mb-2 group-hover:text-red-300 transition-colors">
                      {featured.title}
                    </h2>
                    {featured.excerpt && (
                      <p className="text-gray-300 text-sm line-clamp-2 mb-3 hidden sm:block">{featured.excerpt}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Clock size={11} /> {timeAgo(featured.publishedAt)}</span>
                      <span className="flex items-center gap-1"><Eye size={11} /> {featured.viewCount} vues</span>
                      <span className="flex items-center gap-1"><MessageCircle size={11} /> {featured._count?.comments || 0}</span>
                      {featured.author?.fullName && (
                        <span className="text-gray-500">— {featured.author.fullName}</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6 sm:p-8">
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    {featured.isUrgent && (
                      <span className="inline-flex items-center gap-1 bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase animate-pulse">
                        <AlertTriangle size={9} /> Urgent
                      </span>
                    )}
                    <TypeBadge type={featured.type} />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-snug mb-3 group-hover:text-red-300 transition-colors">
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p className="text-gray-400 text-sm line-clamp-3 mb-4">{featured.excerpt}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock size={11} /> {timeAgo(featured.publishedAt)}</span>
                    <span className="flex items-center gap-1"><Eye size={11} /> {featured.viewCount} vues</span>
                    <span className="flex items-center gap-1"><MessageCircle size={11} /> {featured._count?.comments || 0}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Grille articles ── */}
          {rest.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map((pub: Publication) => (
                <div
                  key={pub.id}
                  onClick={() => navigate(`/feed/${pub.id}`)}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-red-100 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col"
                >
                  {/* Image */}
                  {pub.mediaUrls?.[0] ? (
                    <div className="relative overflow-hidden bg-gray-950 flex-shrink-0 flex items-center justify-center">
                      <img
                        src={pub.mediaUrls[0]}
                        alt={pub.title}
                        className="w-full h-auto max-h-56 object-contain"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                      <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                        <TypeBadge type={pub.type} />
                        {pub.isUrgent && (
                          <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                            <AlertTriangle size={8} /> Urgent
                          </span>
                        )}
                      </div>

                      {pub.isPinned && (
                        <div className="absolute top-3 right-3">
                          <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <Pin size={8} />
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-28 bg-gradient-to-br from-gray-800 to-gray-950 flex items-center justify-center relative flex-shrink-0">
                      <Newspaper size={32} className="text-white/10" />
                      <div className="absolute top-3 left-3">
                        <TypeBadge type={pub.type} />
                      </div>
                    </div>
                  )}

                  {/* Body */}
                  <div className="p-4 flex flex-col flex-1">
                    {!pub.mediaUrls?.[0] && pub.isPinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full self-start mb-2">
                        <Pin size={8} /> Épinglé
                      </span>
                    )}

                    <h3 className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-2 group-hover:text-red-700 transition-colors flex-1">
                      {pub.title}
                    </h3>

                    {pub.excerpt && (
                      <p className="text-gray-400 text-xs mt-2 line-clamp-2">{pub.excerpt}</p>
                    )}

                    {pub.tags && pub.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pub.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center gap-1"><Eye size={10} /> {pub.viewCount}</span>
                        <span className="flex items-center gap-1"><MessageCircle size={10} /> {pub._count?.comments || 0}</span>
                      </div>
                      <span className="flex items-center gap-1"><Clock size={10} /> {timeAgo(pub.publishedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Pagination ── */}
      {(data?.pagination?.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ← Précédent
          </button>
          <span className="text-sm text-gray-400 px-3">{page} / {data?.pagination?.totalPages}</span>
          <button
            type="button"
            disabled={page === data?.pagination?.totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
};
