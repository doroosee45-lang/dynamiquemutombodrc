import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, CheckCircle, Lightbulb, Users, Cog,
  TrendingUp, Image, Upload, X, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { innovationsAPI } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { PROVINCES } from '@/utils/constants';

const CATEGORIES = [
  { value: 'APP', label: '📱 Application Mobile/Web', desc: 'App, site web, outil numérique' },
  { value: 'TOOL', label: '🔧 Outil Citoyen', desc: 'Outil pratique pour la communauté' },
  { value: 'DATA', label: '📊 Data & Journalisme', desc: 'Visualisation, investigation, données' },
  { value: 'COMMUNITY', label: '🤝 Solution Communautaire', desc: 'Solidarité, coopérative, réseau' },
  { value: 'SECURITY', label: '🛡️ Sécurité & Alerte', desc: 'Alerte, prévention, surveillance' },
  { value: 'OTHER', label: '💡 Autre Innovation', desc: 'Toute autre idée novatrice' },
];

const STAGES = [
  { value: 'IDEA', label: '💭 Idée', desc: 'Concept non encore développé' },
  { value: 'PROTOTYPE', label: '🔨 Prototype', desc: 'Première version en cours' },
  { value: 'MVP', label: '🚀 MVP', desc: 'Produit minimal fonctionnel' },
  { value: 'FUNCTIONAL', label: '✅ Fonctionnel', desc: 'Déjà utilisé par des personnes' },
];

const STEPS = [
  { label: 'Présentation', icon: Lightbulb },
  { label: 'Le Problème', icon: Users },
  { label: 'Ta Solution', icon: Cog },
  { label: 'Impact & Liens', icon: TrendingUp },
  { label: 'Médias & Envoi', icon: Image },
];

interface FormState {
  title: string; category: string; province: string;
  problemStatement: string; targetAudience: string;
  description: string; developmentStage: string;
  expectedImpact: string; resourcesNeeded: string; demoUrl: string;
}

const INITIAL: FormState = {
  title: '', category: '', province: '',
  problemStatement: '', targetAudience: '',
  description: '', developmentStage: '',
  expectedImpact: '', resourcesNeeded: '', demoUrl: '',
};

export const NewInnovationPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [files, setFiles] = useState<File[]>([]);

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (fd: FormData) => innovationsAPI.submit(fd),
    onSuccess: () => {
      toast.success('Innovation soumise ! Notre équipe l\'examinera bientôt. 💡');
      queryClient.invalidateQueries({ queryKey: ['innovations'] });
      navigate('/innovations');
    },
    onError: () => toast.error('Erreur lors de la soumission'),
  });

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!form.title.trim()) return 'Le titre est requis';
      if (!form.category) return 'Choisis une catégorie';
    }
    if (step === 1) {
      if (!form.problemStatement.trim()) return 'Décris le problème concret';
      if (!form.targetAudience.trim()) return 'Précise le public cible';
    }
    if (step === 2) {
      if (!form.description.trim()) return 'Décris le fonctionnement de ta solution';
      if (!form.developmentStage) return 'Indique le stade de développement';
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) { toast.error(err); return; }
    setStep(s => s + 1);
  };

  const handleSubmit = () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    files.forEach(f => fd.append('media', f));
    mutation.mutate(fd);
  };

  const removeFile = (i: number) => setFiles(f => f.filter((_, idx) => idx !== i));

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/innovations')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Soumettre mon Innovation</h1>
          <p className="text-gray-500 text-sm">Valorisons l'ingéniosité congolaise</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    done ? 'bg-green-500 text-white' :
                    active ? 'bg-primary-600 text-white ring-4 ring-primary-100' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {done ? <CheckCircle size={16} /> : <Icon size={16} />}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${active ? 'text-primary-600' : done ? 'text-green-600' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 transition-colors ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-gray-400 text-right mt-1">Étape {step + 1} sur {STEPS.length}</p>
      </div>

      {/* Step content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">

        {/* ÉTAPE 1 — Présentation */}
        {step === 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <Lightbulb size={16} className="text-primary-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Présente ton innovation</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'innovation *</label>
              <input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Ex: CiviAlert — Application de signalement communautaire"
                maxLength={120}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{form.title.length}/120</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CATEGORIES.map(c => (
                  <button key={c.value} type="button"
                    onClick={() => set('category', c.value)}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      form.category === c.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Province concernée <span className="text-gray-400">(optionnel)</span></label>
              <select
                value={form.province}
                onChange={e => set('province', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Nationale / Toutes provinces</option>
                {PROVINCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* ÉTAPE 2 — Le Problème */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <Users size={16} className="text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Le problème que tu résous</h2>
            </div>

            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-sm text-orange-700">
              💬 Une bonne innovation part d'un problème réel. Sois concret et précis — les mentors de la Dynamique seront plus convaincus.
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quel est le problème concret ? *</label>
              <textarea
                value={form.problemStatement}
                onChange={e => set('problemStatement', e.target.value)}
                placeholder="Ex: Les citoyens de Kinshasa n'ont aucun moyen fiable de signaler les pannes d'électricité à la SNEL. Les rapports papier prennent des semaines et sont souvent perdus..."
                rows={5}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qui est touché par ce problème ? *</label>
              <textarea
                value={form.targetAudience}
                onChange={e => set('targetAudience', e.target.value)}
                placeholder="Ex: Les ménages des zones périurbaines de Kinshasa, environ 2 millions de personnes qui subissent des délestages fréquents sans recours..."
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
              />
            </div>
          </div>
        )}

        {/* ÉTAPE 3 — Ta Solution */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Cog size={16} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Ta solution</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comment fonctionne ton innovation ? *</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Ex: CiviAlert est une application mobile qui permet aux citoyens de signaler des pannes via GPS en quelques secondes. Les signalements sont agrégés sur une carte publique et envoyés automatiquement à la SNEL avec preuves photos..."
                rows={6}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stade de développement *</label>
              <div className="grid grid-cols-2 gap-2">
                {STAGES.map(s => (
                  <button key={s.value} type="button"
                    onClick={() => set('developmentStage', s.value)}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      form.developmentStage === s.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 4 — Impact & Liens */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp size={16} className="text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Impact & ressources</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Impact attendu</label>
              <textarea
                value={form.expectedImpact}
                onChange={e => set('expectedImpact', e.target.value)}
                placeholder="Ex: Réduction de 60% du temps de résolution des pannes. 500 000 citoyens seraient directement bénéficiaires dans la première année..."
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ressources ou soutien nécessaires</label>
              <textarea
                value={form.resourcesNeeded}
                onChange={e => set('resourcesNeeded', e.target.value)}
                placeholder="Ex: Hébergement serveur (~50$/mois), partenariat avec la SNEL, 2 développeurs juniors pour 3 mois..."
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lien démo / GitHub / vidéo <span className="text-gray-400">(optionnel)</span>
              </label>
              <div className="relative">
                <ExternalLink size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={form.demoUrl}
                  onChange={e => set('demoUrl', e.target.value)}
                  placeholder="https://..."
                  type="url"
                  className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 5 — Médias & Confirmation */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Image size={16} className="text-purple-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Médias & Confirmation</h2>
            </div>

            {/* Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visuels <span className="text-gray-400">(captures d'écran, maquettes, prototype — max 3)</span>
              </label>
              <label className="block border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-purple-400 transition-colors">
                <Upload size={24} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">Cliquez pour ajouter des images</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG — max 3 fichiers</p>
                <input type="file" multiple accept="image/*" className="hidden"
                  onChange={e => {
                    const sel = Array.from(e.target.files || []);
                    setFiles(prev => [...prev, ...sel].slice(0, 3));
                    e.target.value = '';
                  }} />
              </label>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {files.map((f, i) => (
                    <div key={i} className="relative group">
                      <img src={URL.createObjectURL(f)} alt="" className="w-20 h-20 object-cover rounded-lg" />
                      <button type="button" onClick={() => removeFile(i)}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recap */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
              <h3 className="text-sm font-bold text-gray-700">Récapitulatif</h3>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-gray-400 w-28 flex-shrink-0">Titre</span>
                  <span className="font-medium text-gray-800">{form.title || '—'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-28 flex-shrink-0">Catégorie</span>
                  <span className="text-gray-700">{CATEGORIES.find(c => c.value === form.category)?.label || '—'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-28 flex-shrink-0">Province</span>
                  <span className="text-gray-700">{PROVINCES.find(p => p.value === form.province)?.label || 'Nationale'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-28 flex-shrink-0">Stade</span>
                  <span className="text-gray-700">{STAGES.find(s => s.value === form.developmentStage)?.label || '—'}</span>
                </div>
                {form.demoUrl && (
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-28 flex-shrink-0">Démo</span>
                    <a href={form.demoUrl} target="_blank" rel="noreferrer"
                      className="text-primary-600 hover:underline truncate">{form.demoUrl}</a>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-gray-400 w-28 flex-shrink-0">Médias</span>
                  <span className="text-gray-700">{files.length} fichier{files.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-sm text-purple-700">
              🏅 Si ton innovation est validée par l'équipe Dynamique, tu recevras le badge <strong>Innovateur</strong> et <strong>+200 points</strong> de réputation.
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        {step > 0 ? (
          <Button variant="secondary" onClick={() => setStep(s => s - 1)} icon={<ArrowLeft size={16} />}>
            Précédent
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => navigate('/innovations')}>
            Annuler
          </Button>
        )}

        {step < STEPS.length - 1 ? (
          <Button onClick={next} icon={<ArrowRight size={16} />} iconPosition="right">
            Étape suivante
          </Button>
        ) : (
          <Button onClick={handleSubmit} loading={mutation.isPending} icon={<Lightbulb size={16} />}>
            Soumettre mon innovation
          </Button>
        )}
      </div>
    </div>
  );
};
