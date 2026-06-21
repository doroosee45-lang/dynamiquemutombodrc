import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, MessageCircle, Clock, Pin, Send, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { publicationsAPI } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { timeAgo } from '@/utils/helpers';
import { Comment } from '@/types';

const TYPE_COLORS: Record<string, string> = {
  INVESTIGATION: 'bg-purple-100 text-purple-700',
  ALERT: 'bg-red-100 text-red-700',
  COMMUNIQUE: 'bg-blue-100 text-blue-700',
  NEWS: 'bg-green-100 text-green-700',
  CAMPAIGN: 'bg-orange-100 text-orange-700',
};

const TYPE_LABELS: Record<string, string> = {
  INVESTIGATION: '🔍 Enquête', ALERT: '🚨 Alerte', COMMUNIQUE: '📢 Communiqué',
  NEWS: '📰 Actualité', CAMPAIGN: '🚀 Campagne',
};

export const PublicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
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

  if (isLoading) return <LoadingSpinner text="Chargement..." />;
  if (!pub) return (
    <div className="text-center py-20 text-gray-400">
      <p>Publication introuvable</p>
      <Button variant="secondary" onClick={() => navigate('/feed')} className="mt-4">
        Retour au fil
      </Button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => navigate('/feed')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm">
        <ArrowLeft size={16} /> Retour au fil d'actualité
      </button>

      {/* Main article */}
      <Card>
        {pub.mediaUrls?.[0] && (
          <img src={pub.mediaUrls[0]} alt={pub.title}
            className="w-full max-h-80 object-cover rounded-t-xl" />
        )}
        <div className="p-6 space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_COLORS[pub.type] || 'bg-gray-100 text-gray-600'}`}>
              {TYPE_LABELS[pub.type] || pub.type}
            </span>
            {pub.isUrgent && (
              <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-bold">
                🚨 URGENT
              </span>
            )}
            {pub.isPinned && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Pin size={10} /> Épinglé
              </span>
            )}
            {pub.province && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                📍 {pub.province.replace('_', '-')}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{pub.title}</h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                {pub.author?.avatar
                  ? <img src={pub.author.avatar} className="w-7 h-7 rounded-full object-cover" alt="" />
                  : <User size={14} className="text-primary-600" />}
              </div>
              <span className="font-medium text-gray-700">{pub.author?.fullName || 'Dynamique RDC'}</span>
            </div>
            <span className="flex items-center gap-1"><Clock size={13} /> {timeAgo(pub.publishedAt)}</span>
            <span className="flex items-center gap-1"><Eye size={13} /> {pub.viewCount} vues</span>
            <span className="flex items-center gap-1"><MessageCircle size={13} /> {pub.comments?.length || pub._count?.comments || 0} commentaires</span>
          </div>

          {/* Content */}
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
            {pub.content}
          </div>

          {/* Tags */}
          {pub.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
              {pub.tags.map((tag: string) => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Extra media */}
          {pub.mediaUrls?.length > 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
              {pub.mediaUrls.slice(1).map((url: string, i: number) => (
                <img key={i} src={url} alt="" className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(url, '_blank')} />
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Comments */}
      <div className="space-y-4">
        <h2 className="font-bold text-gray-800 text-lg">
          Commentaires ({pub.comments?.length || pub._count?.comments || 0})
        </h2>

        {/* New comment form */}
        {isAuthenticated ? (
          <Card>
            <form onSubmit={handleComment} className="p-4 flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <User size={14} className="text-primary-600" />
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Écrire un commentaire..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <Button type="submit" loading={commentMutation.isPending} icon={<Send size={14} />}>
                  Envoyer
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Card>
            <div className="p-4 text-center text-sm text-gray-500">
              <button onClick={() => navigate('/login')} className="text-primary-600 hover:underline">
                Connectez-vous
              </button>{' '}pour laisser un commentaire
            </div>
          </Card>
        )}

        {/* Comment list */}
        {pub.comments?.length > 0 ? (
          <div className="space-y-3">
            {pub.comments.map((c: Comment & { replies?: Comment[] }) => (
              <Card key={c.id}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {c.author?.avatar
                        ? <img src={c.author.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                        : <User size={14} className="text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-800">{c.author?.fullName || 'Utilisateur'}</span>
                        <span className="text-xs text-gray-400">{timeAgo(c.createdAt)}</span>
                        {!c.isApproved && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">En attente</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{c.content}</p>

                      {/* Replies */}
                      {c.replies && c.replies.length > 0 && (
                        <div className="mt-3 ml-4 space-y-2 border-l-2 border-gray-100 pl-3">
                          {c.replies.map((r) => (
                            <div key={r.id} className="flex items-start gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <User size={11} className="text-gray-400" />
                              </div>
                              <div>
                                <span className="text-xs font-medium text-gray-700">{r.author?.fullName}</span>
                                <span className="text-xs text-gray-400 ml-2">{timeAgo(r.createdAt)}</span>
                                <p className="text-xs text-gray-600 mt-0.5">{r.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">
            Aucun commentaire pour l'instant. Soyez le premier !
          </div>
        )}
      </div>
    </div>
  );
};
