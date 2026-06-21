import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsAPI } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CategoryBadge, StatusBadge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { timeAgo, getInitials, confidenceColor } from '@/utils/helpers';
import { Comment, ReportStatus } from '@/types';
import { ThumbsUp, MessageCircle, Eye, MapPin, ArrowLeft, Image, CheckCircle } from 'lucide-react';
import { REPORT_STATUSES } from '@/utils/constants';
import toast from 'react-hot-toast';

export const ReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const canModerate = ['MODERATOR', 'ADMIN', 'SUPERADMIN'].includes(user?.role || '');

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsAPI.getById(id!).then(r => r.data),
    enabled: !!id,
  });

  const voteMutation = useMutation({
    mutationFn: () => reportsAPI.vote(id!),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['report', id] });
      toast.success(data.data.voted ? 'Vote enregistré !' : 'Vote retiré');
    },
  });

  const commentMutation = useMutation({
    mutationFn: () => reportsAPI.addComment(id!, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report', id] });
      setComment('');
      toast.success('Commentaire ajouté');
    },
  });

  const statusMutation = useMutation({
    mutationFn: () => reportsAPI.updateStatus(id!, newStatus, statusNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report', id] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Statut mis à jour');
      setNewStatus('');
      setStatusNote('');
    },
  });

  if (isLoading) return <LoadingSpinner text="Chargement du signalement..." />;
  if (!report) return <div className="text-center text-gray-400 py-12">Signalement introuvable</div>;

  const hasVoted = report.votes?.some((v: { userId: string }) => v.userId === user?.id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
        <ArrowLeft size={16} /> Retour aux signalements
      </button>

      {/* Main card */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex flex-wrap gap-2">
            <CategoryBadge category={report.category} />
            <StatusBadge status={report.status} />
            {report.isFlagged && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">⚠️ Vérification</span>}
          </div>
          <div className="flex gap-3 text-xs text-gray-400 flex-shrink-0">
            <span className="flex items-center gap-1"><Eye size={12} /> {report.viewCount}</span>
            <span className="flex items-center gap-1"><ThumbsUp size={12} /> {report.votes?.length || 0}</span>
            <span className="flex items-center gap-1"><MessageCircle size={12} /> {report.comments?.length || 0}</span>
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-3">{report.title}</h1>
        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{report.description}</p>

        {/* Media */}
        {report.mediaUrls?.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {report.mediaUrls.map((url: string, i: number) => (
              <img key={i} src={url} alt={`Media ${i + 1}`}
                className="w-full h-40 object-cover rounded-xl cursor-pointer"
                onClick={() => window.open(url, '_blank')} />
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <MapPin size={14} /> {report.province}{report.district ? ` · ${report.district}` : ''}{report.commune ? ` · ${report.commune}` : ''}
            </span>
            {report.address && <span>📍 {report.address}</span>}
            <span>🕐 {timeAgo(report.createdAt)}</span>
            {!report.isAnonymous && report.author?.fullName && (
              <span className="flex items-center gap-1">
                👤 {report.author.fullName} · {report.author.reputationPoints}pts
              </span>
            )}
          </div>

          {report.confidenceScore !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Score IA :</span>
              <span className={`text-xs font-semibold ${confidenceColor(report.confidenceScore)}`}>
                {Math.round(report.confidenceScore * 100)}% de confiance
              </span>
            </div>
          )}

          {report.moderatorNote && (
            <div className="bg-blue-50 rounded-lg px-3 py-2">
              <p className="text-xs font-medium text-blue-700">Note du modérateur :</p>
              <p className="text-xs text-blue-600 mt-0.5">{report.moderatorNote}</p>
            </div>
          )}
        </div>

        {/* Vote */}
        <div className="mt-4 flex gap-2">
          <Button
            variant={hasVoted ? 'primary' : 'outline'}
            size="sm"
            icon={<ThumbsUp size={14} />}
            onClick={() => voteMutation.mutate()}
            loading={voteMutation.isPending}>
            {hasVoted ? 'Voté' : 'Voter'} ({report.votes?.length || 0})
          </Button>
        </div>
      </Card>

      {/* Moderate status */}
      {canModerate && (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <CheckCircle size={16} className="text-primary-600" />
            Gestion du statut
          </h3>
          <div className="flex gap-2 flex-wrap">
            {REPORT_STATUSES.map(s => (
              <button key={s.value}
                onClick={() => setNewStatus(s.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                  ${newStatus === s.value ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : `${s.bg} ${s.color} border-transparent hover:border-gray-300`}`}>
                {s.label}
              </button>
            ))}
          </div>
          {newStatus && (
            <div className="mt-3 space-y-2">
              <textarea value={statusNote} onChange={e => setStatusNote(e.target.value)}
                placeholder="Note du modérateur (optionnel)..."
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <Button size="sm" onClick={() => statusMutation.mutate()} loading={statusMutation.isPending}>
                Mettre à jour → {REPORT_STATUSES.find(s => s.value === newStatus)?.label}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Status history */}
      {report.statusHistory?.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Historique du statut</h3>
          <div className="space-y-2">
            {report.statusHistory.map((h: { id: string; oldStatus: ReportStatus; newStatus: ReportStatus; note?: string; createdAt: string }) => (
              <div key={h.id} className="flex items-center gap-2 text-xs text-gray-500">
                <StatusBadge status={h.oldStatus} />
                <span>→</span>
                <StatusBadge status={h.newStatus} />
                {h.note && <span className="text-gray-400">({h.note})</span>}
                <span className="ml-auto">{timeAgo(h.createdAt)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Comments */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-800 mb-4">
          Commentaires ({report.comments?.length || 0})
        </h3>

        <form onSubmit={e => { e.preventDefault(); commentMutation.mutate(); }} className="mb-4">
          <textarea value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Partagez votre point de vue sur ce signalement..."
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <Button type="submit" size="sm" className="mt-2" loading={commentMutation.isPending}
            disabled={comment.trim().length < 2}>
            Commenter
          </Button>
        </form>

        <div className="space-y-4">
          {report.comments?.map((c: Comment) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500">
                {getInitials(c.author?.fullName || '?')}
              </div>
              <div className="flex-1">
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">{c.author?.fullName}</p>
                  <p className="text-sm text-gray-600">{c.content}</p>
                </div>
                <p className="text-xs text-gray-400 mt-1 ml-2">{timeAgo(c.createdAt)}</p>

                {/* Replies */}
                {c.replies && c.replies.length > 0 && (
                  <div className="ml-4 mt-2 space-y-2">
                    {c.replies.map((reply: Comment) => (
                      <div key={reply.id} className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                          {getInitials(reply.author?.fullName || '?')}
                        </div>
                        <div className="bg-gray-50 rounded-xl px-3 py-2">
                          <p className="text-xs font-medium text-gray-700">{reply.author?.fullName}</p>
                          <p className="text-xs text-gray-600">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {report.comments?.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-4">Aucun commentaire approuvé pour l'instant</p>
          )}
        </div>
      </Card>
    </div>
  );
};
