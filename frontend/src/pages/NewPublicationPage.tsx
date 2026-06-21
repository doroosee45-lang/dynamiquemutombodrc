import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Upload, X, AlertTriangle, Pin } from 'lucide-react';
import toast from 'react-hot-toast';
import { publicationsAPI } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { PROVINCES } from '@/utils/constants';

const PUB_TYPES = [
  { value: 'INVESTIGATION', label: '🔍 Enquête' },
  { value: 'ALERT', label: '🚨 Alerte' },
  { value: 'COMMUNIQUE', label: '📢 Communiqué' },
  { value: 'NEWS', label: '📰 Actualité' },
  { value: 'CAMPAIGN', label: '🚀 Campagne' },
];

const CATEGORIES = [
  'corruption', 'securite', 'justice', 'sante', 'education',
  'infrastructure', 'environnement', 'droits-humains', 'politique', 'economie', 'organisation',
];

export const NewPublicationPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: '',
    content: '',
    excerpt: '',
    type: 'NEWS',
    category: '',
    province: '',
    isUrgent: false,
    isPinned: false,
    tagsInput: '',
  });
  const [files, setFiles] = useState<File[]>([]);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (fd: FormData) => publicationsAPI.create(fd),
    onSuccess: () => {
      toast.success('Publication créée avec succès');
      queryClient.invalidateQueries({ queryKey: ['publications'] });
      navigate('/feed');
    },
    onError: () => toast.error('Erreur lors de la publication'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Titre et contenu sont requis');
      return;
    }

    const tags = form.tagsInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    const fd = new FormData();
    fd.append('title', form.title.trim());
    fd.append('content', form.content.trim());
    fd.append('excerpt', form.excerpt.trim());
    fd.append('type', form.type);
    fd.append('category', form.category);
    fd.append('province', form.province);
    fd.append('isUrgent', String(form.isUrgent));
    fd.append('isPinned', String(form.isPinned));
    fd.append('tags', JSON.stringify(tags));
    files.forEach(f => fd.append('media', f));

    mutation.mutate(fd);
  };

  const removeFile = (i: number) => setFiles(f => f.filter((_, idx) => idx !== i));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/feed')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle publication</h1>
          <p className="text-gray-500 text-sm">Publier sur le Fil d'Actualité</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type + Urgence + Épingle */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Type de publication</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {PUB_TYPES.map(t => (
              <button key={t.value} type="button"
                onClick={() => set('type', t.value)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  form.type === t.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isUrgent}
                onChange={e => set('isUrgent', e.target.checked)}
                className="w-4 h-4 accent-red-600" />
              <span className="text-sm font-medium flex items-center gap-1 text-red-600">
                <AlertTriangle size={14} /> Alerte urgente
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPinned}
                onChange={e => set('isPinned', e.target.checked)}
                className="w-4 h-4 accent-yellow-500" />
              <span className="text-sm font-medium flex items-center gap-1 text-yellow-600">
                <Pin size={14} /> Épingler en haut
              </span>
            </label>
          </div>
        </div>

        {/* Titre */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">Contenu</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Titre de la publication..."
              maxLength={200}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{form.title.length}/200</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Résumé (optionnel)</label>
            <input
              value={form.excerpt}
              onChange={e => set('excerpt', e.target.value)}
              placeholder="Courte description affichée dans le fil..."
              maxLength={300}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contenu complet *</label>
            <textarea
              value={form.content}
              onChange={e => set('content', e.target.value)}
              placeholder="Rédigez le contenu complet de la publication..."
              rows={12}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
              required
            />
          </div>
        </div>

        {/* Catégorie + Province + Tags */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Classification</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Toutes catégories</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace('-', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Province concernée</label>
              <select
                value={form.province}
                onChange={e => set('province', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Nationale (toutes provinces)</option>
                {PROVINCES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags <span className="text-gray-400">(séparés par des virgules)</span>
            </label>
            <input
              value={form.tagsInput}
              onChange={e => set('tagsInput', e.target.value)}
              placeholder="corruption, Kinshasa, enquête..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Médias */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">Médias (optionnel)</h2>
          <label className="block border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 transition-colors">
            <Upload size={24} className="mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">Cliquez pour ajouter des images ou vidéos</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, MP4 — max 5 fichiers</p>
            <input type="file" multiple accept="image/*,video/*" className="hidden"
              onChange={e => {
                const selected = Array.from(e.target.files || []).slice(0, 5);
                setFiles(prev => [...prev, ...selected].slice(0, 5));
                e.target.value = '';
              }} />
          </label>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative group">
                  {f.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(f)} alt="" className="w-20 h-20 object-cover rounded-lg" />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500 text-center p-1">
                      {f.name}
                    </div>
                  )}
                  <button type="button" onClick={() => removeFile(i)}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-6">
          <Button type="button" variant="secondary" onClick={() => navigate('/feed')}>
            Annuler
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Publier
          </Button>
        </div>
      </form>
    </div>
  );
};
