import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Eye, MessageCircle, Clock, Pin, Send,
  User, AlertTriangle, Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { publicationsAPI } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { timeAgo } from '@/utils/helpers';
import { Comment } from '@/types';

const TYPE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  INVESTIGATION: { label: 'Enquête',    color: 'text-purple-700', bg: 'bg-purple-100'  },
  ALERT:         { label: 'Alerte',     color: 'text-red-700',    bg: 'bg-red-100'     },
  COMMUNIQUE:    { label: 'Communiqué', color: 'text-blue-700',   bg: 'bg-blue-100'    },
  NEWS:          { label: 'Actualité',  color: 'text-emerald-700',bg: 'bg-emerald-100' },
  CAMPAIGN:      { label: 'Campagne',   color: 'text-orange-700', bg: 'bg-orange-100'  },
};

function Avatar({ src, name, size = 'md' }: { src?: string; name?: string; size?: 'sm' | 'md' }) {
  const dim  = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const icon = size === 'sm' ? 12 : 14;
  return (
    <div className={`${dim} rounded-full bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0 overflow-hidden`}>
      {src
        ? <img src={src} alt={name || ''} className="w-full h-full object-cover" />
        : <User size={icon} className="text-red-400" />}
    </div>
  );
}

export const PublicationDetailPage: React.FC = () => {
  const { id }  = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');

  const { data: pub, isLoading } = useQuery({
    queryKey: ['publication', id],
    queryFn: () => publicationsAPI.getById(id!).then(r => r.data),
    enabled: !!id,
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => publicationsAPI.addComment(id!, content),
    onSuccess: () => {
      setComment('');
      toast.success('Commentaire envoyé');
      queryClient.invalidateQueries({ queryKey: ['publication', id] });
    },
    onError: () => toast.error('Erreur lors de l\'envoi'),
  });

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    commentMutation.mutate(comment.trim());
  };

  /* ── Loading ── */
  if (isLoading) return <LoadingSpinner text="Chargement..." />;

  /* ── Not found ── */
  if (!pub) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
        <AlertTriangle size={26} className="text-red-300" />
      </div>
      <div>
        <p className="text-gray-800 font-bold text-lg">Publication introuvable</p>
        <p className="text-gray-400 text-sm mt-1">Ce contenu n'existe pas ou a été supprimé.</p>
      </div>
      <button
        type="button"
        onClick={() => navigate('/feed')}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all"
      >
        <ArrowLeft size={15} /> Retour au fil
      </button>
    </div>
  );

  const typeCfg      = TYPE_CFG[pub.type];
  const commentsCount = pub.comments?.length || pub._count?.comments || 0;
  const hasImage      = pub.mediaUrls?.[0];

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-4">

      {/* ── Back ── */}
      <button
        type="button"
        onClick={() => navigate('/feed')}
        className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-sm font-medium transition-colors group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        Fil d'actualité
      </button>

      {/* ── Cover image ── */}
      {hasImage && (
        <div className="relative rounded-2xl overflow-hidden shadow-xl bg-gray-950">
          <img
            src={pub.mediaUrls[0]}
            alt={pub.title}
            className="w-full h-auto max-h-[80vh] object-contain"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Badges on image */}
          <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
            {typeCfg && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${typeCfg.bg} ${typeCfg.color}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 flex-shrink-0" />
                {typeCfg.label}
              </span>
            )}
            {pub.isUrgent && (
              <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase animate-pulse">
                <AlertTriangle size={9} /> Urgent
              </span>
            )}
            {pub.isPinned && (
              <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                <Pin size={9} /> Épinglé
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Article body ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8">

          {/* Badges (sans image) */}
          {!hasImage && (
            <div className="flex items-center gap-2 flex-wrap mb-5">
              {typeCfg && (
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${typeCfg.bg} ${typeCfg.color}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 flex-shrink-0" />
                  {typeCfg.label}
                </span>
              )}
              {pub.isUrgent && (
                <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                  <AlertTriangle size={9} /> Urgent
                </span>
              )}
              {pub.isPinned && (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full">
                  <Pin size={9} /> Épinglé
                </span>
              )}
            </div>
          )}

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight tracking-tight mb-5">
            {pub.title}
          </h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 pb-5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Avatar src={pub.author?.avatar} name={pub.author?.fullName} />
              <span className="font-semibold text-gray-800 text-sm">
                {pub.author?.fullName || 'Dynamique RDC'}
              </span>
            </div>
            <span className="flex items-center gap-1.5 text-gray-400 text-sm"><Clock size={13} /> {timeAgo(pub.publishedAt)}</span>
            <span className="flex items-center gap-1.5 text-gray-400 text-sm"><Eye size={13} /> {pub.viewCount} vues</span>
            <span className="flex items-center gap-1.5 text-gray-400 text-sm"><MessageCircle size={13} /> {commentsCount}</span>
            {pub.province && (
              <span className="text-gray-400 text-sm">📍 {pub.province.replace('_', '-')}</span>
            )}
          </div>

          {/* Content */}
          <div className="mt-6 text-gray-700 leading-[1.85] text-[15px] whitespace-pre-wrap">
            {pub.content}
          </div>

          {/* Tags */}
          {pub.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-7 pt-5 border-t border-gray-100">
              {pub.tags.map((tag: string) => (
                <span key={tag} className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full hover:bg-gray-100 transition-colors">
                  <Tag size={10} /> #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Extra media */}
        {pub.mediaUrls?.length > 1 && (
          <div className="px-6 sm:px-8 pb-7">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Médias associés</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {pub.mediaUrls.slice(1).map((url: string, i: number) => (
                <div
                  key={i}
                  onClick={() => window.open(url, '_blank')}
                  className="rounded-xl overflow-hidden bg-gray-950 cursor-pointer group flex items-center justify-center"
                >
                  <img
                    src={url}
                    alt=""
                    className="w-full h-auto max-h-56 object-contain group-hover:brightness-110 transition-all duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Comments ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <MessageCircle size={15} className="text-red-500" />
          <h2 className="font-bold text-gray-800">
            Commentaires <span className="text-gray-400 font-normal">({commentsCount})</span>
          </h2>
        </div>

        {/* Form */}
        {isAuthenticated ? (
          <form onSubmit={handleComment} className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex gap-3">
              <Avatar />
              <div className="flex-1 flex gap-2">
                <input
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Écrire un commentaire..."
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
                <button
                  type="submit"
                  disabled={commentMutation.isPending || !comment.trim()}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all flex-shrink-0"
                >
                  {commentMutation.isPending
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Send size={13} />}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 text-sm text-gray-500 text-center">
            <button type="button" onClick={() => navigate('/login')} className="text-red-600 font-semibold hover:text-red-700">
              Connectez-vous
            </button>{' '}pour laisser un commentaire
          </div>
        )}

        {/* List */}
        <div className="divide-y divide-gray-50">
          {pub.comments?.length > 0 ? (
            pub.comments.map((c: Comment & { replies?: Comment[] }) => (
              <div key={c.id} className="px-6 py-5">
                <div className="flex items-start gap-3">
                  <Avatar src={c.author?.avatar} name={c.author?.fullName} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-semibold text-gray-800">{c.author?.fullName || 'Utilisateur'}</span>
                      <span className="text-xs text-gray-400">{timeAgo(c.createdAt)}</span>
                      {!c.isApproved && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">
                          En attente
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{c.content}</p>

                    {/* Replies */}
                    {c.replies && c.replies.length > 0 && (
                      <div className="mt-3 ml-1 space-y-3 border-l-2 border-gray-100 pl-4">
                        {c.replies.map(r => (
                          <div key={r.id} className="flex items-start gap-2">
                            <Avatar src={r.author?.avatar} name={r.author?.fullName} size="sm" />
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-gray-700">{r.author?.fullName}</span>
                                <span className="text-[10px] text-gray-400">{timeAgo(r.createdAt)}</span>
                              </div>
                              <p className="text-xs text-gray-600 leading-relaxed">{r.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center">
              <MessageCircle size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Aucun commentaire pour l'instant. Soyez le premier !</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
