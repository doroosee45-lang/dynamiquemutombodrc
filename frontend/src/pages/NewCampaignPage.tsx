import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Upload, X, Users, Target, Calendar, FileSignature, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { campaignsAPI } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { PROVINCES, DISTRICTS } from '@/utils/constants';

const today = new Date().toISOString().split('T')[0];

export const NewCampaignPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: '',
    description: '',
    province: '',
    district: '',
    targetCount: '',
    startDate: today,
    endDate: '',
    status: 'ACTIVE',
    hasPetition: false,
    petitionTarget: '',
  });
  const [files, setFiles] = useState<File[]>([]);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (fd: FormData) => campaignsAPI.create(fd),
    onSuccess: () => {
      toast.success('Campagne créée avec succès !');
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      navigate('/campaigns');
    },
    onError: () => toast.error('Erreur lors de la création de la campagne'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Titre et description sont requis');
      return;
    }
    if (form.hasPetition && !form.petitionTarget) {
      toast.error('Indiquez l\'objectif de signatures pour la pétition');
      return;
    }

    const fd = new FormData();
    fd.append('title', form.title.trim());
    fd.append('description', form.description.trim());
    fd.append('province', form.province);
    fd.append('district', form.district);
    fd.append('targetCount', form.targetCount);
    fd.append('startDate', form.startDate);
    fd.append('endDate', form.endDate);
    fd.append('status', form.status);
    fd.append('hasPetition', String(form.hasPetition));
    fd.append('petitionTarget', form.petitionTarget);
    files.forEach(f => fd.append('media', f));

    mutation.mutate(fd);
  };

  const removeFile = (i: number) => setFiles(f => f.filter((_, idx) => idx !== i));

  const isKinshasa = form.province === 'KINSHASA';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/campaigns')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle campagne</h1>
          <p className="text-gray-500 text-sm">Mobiliser les citoyens autour d'une cause</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Informations principales */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Megaphone size={18} className="text-primary-600" />
            <h2 className="font-semibold text-gray-800">Informations principales</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre de la campagne *</label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Ex: Stop à la corruption aux douanes de Matadi"
              maxLength={150}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{form.title.length}/150</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description complète *</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Décrivez les objectifs, le contexte et les actions prévues dans cette campagne..."
              rows={6}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
            />
          </div>

          {/* Statut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut de publication</label>
            <div className="flex gap-3">
              {[
                { value: 'ACTIVE', label: '🟢 Publier maintenant', desc: 'Visible immédiatement' },
                { value: 'DRAFT', label: '📝 Brouillon', desc: 'Visible seulement par les admins' },
              ].map(s => (
                <button key={s.value} type="button"
                  onClick={() => set('status', s.value)}
                  className={`flex-1 py-2.5 px-3 rounded-lg border-2 text-left transition-colors ${
                    form.status === s.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-gray-500">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Localisation */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Localisation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
              <select
                value={form.province}
                onChange={e => { set('province', e.target.value); set('district', ''); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Nationale (toutes provinces)</option>
                {PROVINCES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            {isKinshasa && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">District (Kinshasa)</label>
                <select
                  value={form.district}
                  onChange={e => set('district', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">Tous les districts</option>
                  {DISTRICTS.map((d: { value: string; label: string }) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Dates et objectif */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={18} className="text-primary-600" />
            <h2 className="font-semibold text-gray-800">Dates et objectif</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate}
                onChange={e => set('endDate', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Users size={13} /> Objectif participants
              </label>
              <input
                type="number"
                value={form.targetCount}
                onChange={e => set('targetCount', e.target.value)}
                placeholder="Ex: 1000"
                min="1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Pétition */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSignature size={18} className="text-primary-600" />
              <h2 className="font-semibold text-gray-800">Pétition associée</h2>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-600">Ajouter une pétition</span>
              <div
                onClick={() => set('hasPetition', !form.hasPetition)}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                  form.hasPetition ? 'bg-primary-600' : 'bg-gray-300'
                }`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.hasPetition ? 'translate-x-5' : ''
                }`} />
              </div>
            </label>
          </div>

          {form.hasPetition && (
            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
              <p className="text-sm text-blue-700">
                Une pétition permettra aux citoyens de signer numériquement pour soutenir cette campagne.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Target size={13} /> Objectif de signatures *
                </label>
                <input
                  type="number"
                  value={form.petitionTarget}
                  onChange={e => set('petitionTarget', e.target.value)}
                  placeholder="Ex: 5000"
                  min="10"
                  required={form.hasPetition}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Médias */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">Image de couverture <span className="text-gray-400 font-normal">(optionnel)</span></h2>
          <label className="block border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 transition-colors">
            <Upload size={24} className="mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">Cliquez pour ajouter des images</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG — max 3 fichiers</p>
            <input type="file" multiple accept="image/*" className="hidden"
              onChange={e => {
                const selected = Array.from(e.target.files || []).slice(0, 3);
                setFiles(prev => [...prev, ...selected].slice(0, 3));
                e.target.value = '';
              }} />
          </label>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative group">
                  <img src={URL.createObjectURL(f)} alt=""
                    className="w-24 h-24 object-cover rounded-lg" />
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
          <Button type="button" variant="secondary" onClick={() => navigate('/campaigns')}>
            Annuler
          </Button>
          <Button type="submit" loading={mutation.isPending} icon={<Megaphone size={16} />}>
            {form.status === 'ACTIVE' ? 'Publier la campagne' : 'Enregistrer le brouillon'}
          </Button>
        </div>
      </form>
    </div>
  );
};
