import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Calendar, MapPin, Edit2, Trash2, X,
  Clock, Globe, ExternalLink, CheckCircle, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { eventsAPI } from '@/services/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PROVINCES } from '@/utils/constants';

/* ── types ── */
interface EventForm {
  title: string;
  description: string;
  date: string;
  endDate: string;
  location: string;
  province: string;
  imageUrl: string;
  registrationLink: string;
  status: string;
  isPublic: boolean;
}

const EMPTY: EventForm = {
  title: '', description: '', date: '', endDate: '',
  location: '', province: '', imageUrl: '', registrationLink: '',
  status: 'UPCOMING', isPublic: true,
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  UPCOMING:  { label: 'À venir',    color: 'text-blue-700',   bg: 'bg-blue-100'   },
  ONGOING:   { label: 'En cours',   color: 'text-green-700',  bg: 'bg-green-100'  },
  PAST:      { label: 'Passé',      color: 'text-gray-600',   bg: 'bg-gray-100'   },
  CANCELLED: { label: 'Annulé',     color: 'text-red-700',    bg: 'bg-red-100'    },
};

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function toInputDate(d: string | Date | undefined) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 16);
}

/* ── composant ── */
export const EventsAdminPage: React.FC = () => {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [form,      setForm]      = useState<EventForm>(EMPTY);
  const [deleting,  setDeleting]  = useState<string | null>(null);

  /* ── requêtes ── */
  const { data, isLoading } = useQuery({
    queryKey: ['admin-events'],
    queryFn: () => eventsAPI.getAll({ limit: '50' }).then(r => r.data),
  });
  const events: Record<string, unknown>[] = data?.events ?? [];

  /* ── mutations ── */
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-events'] });
    qc.invalidateQueries({ queryKey: ['public-events'] });
    try { localStorage.removeItem('sango_events'); } catch {}
  };

  const createMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => eventsAPI.create(d),
    onSuccess: () => {
      toast.success('Événement créé ! Les abonnés ont été notifiés.');
      invalidate();
      closeModal();
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Record<string, unknown> }) => eventsAPI.update(id, d),
    onSuccess: () => {
      toast.success('Événement mis à jour');
      invalidate();
      closeModal();
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => eventsAPI.delete(id),
    onSuccess: () => {
      toast.success('Événement supprimé');
      invalidate();
      setDeleting(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  /* ── helpers ── */
  const openCreate = () => { setEditId(null); setForm(EMPTY); setShowModal(true); };

  const openEdit = (evt: Record<string, unknown>) => {
    setEditId((evt.id || evt._id) as string);
    setForm({
      title:            (evt.title as string) || '',
      description:      (evt.description as string) || '',
      date:             toInputDate(evt.date as string),
      endDate:          toInputDate(evt.endDate as string | undefined),
      location:         (evt.location as string) || '',
      province:         (evt.province as string) || '',
      imageUrl:         (evt.imageUrl as string) || '',
      registrationLink: (evt.registrationLink as string) || '',
      status:           (evt.status as string) || 'UPCOMING',
      isPublic:         evt.isPublic !== false,
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditId(null); setForm(EMPTY); };

  const set = (k: keyof EventForm, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.date || !form.location.trim()) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }
    const payload: Record<string, unknown> = {
      title:            form.title.trim(),
      description:      form.description.trim(),
      date:             form.date,
      location:         form.location.trim(),
      province:         form.province || undefined,
      imageUrl:         form.imageUrl.trim() || undefined,
      registrationLink: form.registrationLink.trim() || undefined,
      status:           form.status,
      isPublic:         form.isPublic,
    };
    if (form.endDate) payload.endDate = form.endDate;

    if (editId) updateMut.mutate({ id: editId, d: payload });
    else        createMut.mutate(payload);
  };

  const isPending = createMut.isPending || updateMut.isPending;

  /* ── render ── */
  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Événements</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Les événements publiés apparaissent sur la page publique. Les abonnés reçoivent un email à la création.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all"
        >
          <Plus size={16} /> Nouvel événement
        </button>
      </div>

      {/* Liste */}
      {isLoading ? (
        <LoadingSpinner text="Chargement des événements..." />
      ) : events.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar size={28} className="text-gray-300" />
          </div>
          <p className="text-gray-600 font-semibold">Aucun événement pour le moment</p>
          <p className="text-gray-400 text-sm mt-1">Créez votre premier événement.</p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all"
          >
            <Plus size={15} /> Créer un événement
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {events.map(evt => {
            const id     = (evt.id || evt._id) as string;
            const stCfg  = STATUS_CFG[(evt.status as string) || 'UPCOMING'];
            return (
              <div key={id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">

                {/* Image ou placeholder */}
                {evt.imageUrl ? (
                  <div className="h-40 overflow-hidden bg-gray-100">
                    <img
                      src={evt.imageUrl as string}
                      alt={evt.title as string}
                      className="w-full h-full object-contain bg-gray-950"
                    />
                  </div>
                ) : (
                  <div className="h-28 bg-gradient-to-br from-gray-800 to-gray-950 flex items-center justify-center">
                    <Calendar size={30} className="text-white/15" />
                  </div>
                )}

                <div className="p-4 flex flex-col flex-1">
                  {/* Statut + visibilité */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${stCfg.bg} ${stCfg.color}`}>
                      {stCfg.label}
                    </span>
                    {evt.isPublic
                      ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full"><Globe size={8} /> Public</span>
                      : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">Privé</span>
                    }
                  </div>

                  <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 mb-2">
                    {evt.title as string}
                  </h3>

                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                      <Calendar size={11} /> {formatDate(evt.date as string)}
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                      <MapPin size={11} /> {evt.location as string}
                    </div>
                    {(evt.registrationLink as string) && (
                      <a href={evt.registrationLink as string} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-red-500 hover:text-red-600 text-xs font-medium">
                        <ExternalLink size={10} /> Lien d'inscription
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-auto pt-3 border-t border-gray-50 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(evt)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 text-xs font-medium py-2 rounded-xl transition-all"
                    >
                      <Edit2 size={12} /> Modifier
                    </button>
                    {deleting === id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => deleteMut.mutate(id)}
                          disabled={deleteMut.isPending}
                          className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all disabled:opacity-50"
                        >
                          {deleteMut.isPending
                            ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <><CheckCircle size={11} /> Confirmer</>}
                        </button>
                        <button type="button" onClick={() => setDeleting(null)}
                          className="text-gray-400 hover:text-gray-600 px-2 py-2 rounded-xl text-xs">
                          Non
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleting(id)}
                        className="flex items-center gap-1 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 text-xs font-medium py-2 px-3 rounded-xl transition-all"
                      >
                        <Trash2 size={12} /> Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal créer / modifier ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">
                {editId ? 'Modifier l\'événement' : 'Créer un événement'}
              </h2>
              <button type="button" onClick={closeModal} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              {/* Titre */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Titre *
                </label>
                <input
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="Titre de l'événement"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Description *
                </label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Décrivez l'événement..."
                  rows={4}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Date début / Date fin */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Date & heure *
                  </label>
                  <input
                    type="datetime-local"
                    value={form.date}
                    onChange={e => set('date', e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Date de fin
                  </label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={e => set('endDate', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Lieu */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Lieu *
                </label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={form.location}
                    onChange={e => set('location', e.target.value)}
                    placeholder="Adresse ou lieu de l'événement"
                    required
                    className="w-full pl-9 pr-4 border border-gray-200 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Province + Statut */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Province</label>
                  <select
                    value={form.province}
                    onChange={e => set('province', e.target.value)}
                    title="Province"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                  >
                    <option value="">Nationale</option>
                    {PROVINCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Statut</label>
                  <select
                    value={form.status}
                    onChange={e => set('status', e.target.value)}
                    title="Statut"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                  >
                    {Object.entries(STATUS_CFG).map(([v, c]) => (
                      <option key={v} value={v}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  URL de l'image
                </label>
                <input
                  value={form.imageUrl}
                  onChange={e => set('imageUrl', e.target.value)}
                  placeholder="https://... (optionnel)"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {/* Lien inscription */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  Lien d'inscription
                </label>
                <div className="relative">
                  <ExternalLink size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={form.registrationLink}
                    onChange={e => set('registrationLink', e.target.value)}
                    placeholder="https://... (optionnel)"
                    className="w-full pl-9 pr-4 border border-gray-200 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Visibilité */}
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-gray-50 border border-gray-100">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={e => set('isPublic', e.target.checked)}
                  className="w-4 h-4 accent-red-600"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Publier sur le site public</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Visible sur la page SangoPage dans la section Agenda
                  </p>
                </div>
                <Globe size={15} className="text-emerald-500 ml-auto flex-shrink-0" />
              </label>

              {/* Avertissement notification */}
              {!editId && (
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    À la création, tous les utilisateurs inscrits recevront une notification in-app, et les abonnés newsletter recevront un email.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-all"
                >
                  {isPending ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : editId ? (
                    <><CheckCircle size={14} /> Enregistrer</>
                  ) : (
                    <><Plus size={14} /> Créer l'événement</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
