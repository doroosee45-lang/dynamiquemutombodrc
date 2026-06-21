import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  User, MapPin, Phone, Heart, CheckCircle2,
  ArrowLeft, ArrowRight, ChevronRight, Shield,
  Send, Home, AlertCircle,
} from 'lucide-react';
import { joinAPI } from '../services/api';

/* ── Data ──────────────────────────────────────────────────────────── */

const PROVINCES = [
  { value: 'KINSHASA',      label: 'Kinshasa (Capitale)' },
  { value: 'KONGO_CENTRAL', label: 'Kongo-Central' },
  { value: 'KWANGO',        label: 'Kwango' },
  { value: 'KWILU',         label: 'Kwilu' },
  { value: 'MAI_NDOMBE',    label: 'Maï-Ndombe' },
  { value: 'KASAI',         label: 'Kasaï' },
  { value: 'KASAI_CENTRAL', label: 'Kasaï-Central' },
  { value: 'KASAI_ORIENTAL',label: 'Kasaï-Oriental' },
  { value: 'LOMAMI',        label: 'Lomami' },
  { value: 'SANKURU',       label: 'Sankuru' },
  { value: 'MANIEMA',       label: 'Maniema' },
  { value: 'SUD_KIVU',      label: 'Sud-Kivu' },
  { value: 'NORD_KIVU',     label: 'Nord-Kivu' },
  { value: 'ITURI',         label: 'Ituri' },
  { value: 'HAUT_UELE',     label: 'Haut-Uélé' },
  { value: 'BAS_UELE',      label: 'Bas-Uélé' },
  { value: 'TSHOPO',        label: 'Tshopo' },
  { value: 'MONGALA',       label: 'Mongala' },
  { value: 'NORD_UBANGI',   label: 'Nord-Ubangi' },
  { value: 'SUD_UBANGI',    label: 'Sud-Ubangi' },
  { value: 'EQUATEUR',      label: 'Équateur' },
  { value: 'TSHUAPA',       label: 'Tshuapa' },
  { value: 'TANGANIKA',     label: 'Tanganika' },
  { value: 'HAUT_LOMAMI',   label: 'Haut-Lomami' },
  { value: 'LUALABA',       label: 'Lualaba' },
  { value: 'HAUT_KATANGA',  label: 'Haut-Katanga' },
];

const KINSHASA_DISTRICTS = [
  { value: 'LUKUNGA',  label: 'Lukunga' },
  { value: 'FUNA',     label: 'Funa' },
  { value: 'MONT_AMBA',label: 'Mont-Amba' },
  { value: 'TSHANGU',  label: 'Tshangu' },
];

const HOW_KNOWN_OPTIONS = [
  'Réseaux sociaux (Facebook, Twitter, TikTok)',
  'Bouche-à-oreille / Un ami ou proche',
  'Médias (radio, TV, presse)',
  'Événement public ou meeting',
  'Affiches ou flyers',
  'Site web officiel',
  'Autre',
];

const AVAILABILITY_OPTIONS = [
  'Quelques heures par semaine (1-5h)',
  'Mi-temps (5-20h par semaine)',
  'Plein temps',
  'Uniquement les week-ends',
  'Selon les besoins',
];

/* ── Types ─────────────────────────────────────────────────────────── */

interface FormData {
  /* Step 1 */
  fullName: string; firstName: string; gender: string; birthDate: string;
  /* Step 2 */
  province: string; district: string; commune: string; quartier: string; address: string;
  /* Step 3 */
  email: string; phone: string; whatsapp: string; socialMedia: string;
  /* Step 4 */
  motivation: string; howKnown: string; skills: string; availability: string; previousExperience: string;
  /* Step 5 */
  charter: boolean;
  honour: boolean;
}

const INITIAL: FormData = {
  fullName: '', firstName: '', gender: '', birthDate: '',
  province: '', district: '', commune: '', quartier: '', address: '',
  email: '', phone: '', whatsapp: '', socialMedia: '',
  motivation: '', howKnown: '', skills: '', availability: '', previousExperience: '',
  charter: false, honour: false,
};

/* ── Helpers ───────────────────────────────────────────────────────── */

const Field: React.FC<{
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}> = ({ label, required, error, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-semibold text-gray-700">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && (
      <span className="flex items-center gap-1 text-xs text-red-600 mt-0.5">
        <AlertCircle size={12} /> {error}
      </span>
    )}
  </div>
);

const inputCls = (err?: string) =>
  `w-full px-4 py-3 rounded-xl border text-sm transition-all outline-none
   focus:ring-2 focus:ring-red-500/30 focus:border-red-500
   ${err ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'}`;

const selectCls = (err?: string) => `${inputCls(err)} cursor-pointer`;

/* ── Step components ───────────────────────────────────────────────── */

const Step1: React.FC<{ fd: FormData; set: (k: keyof FormData, v: string) => void; errors: Partial<Record<keyof FormData, string>> }> = ({ fd, set, errors }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
    <Field label="Nom (de famille)" required error={errors.fullName}>
      <input className={inputCls(errors.fullName)} placeholder="Ex : Mutombo" value={fd.fullName}
        onChange={e => set('fullName', e.target.value)} />
    </Field>
    <Field label="Prénom(s)" required error={errors.firstName}>
      <input className={inputCls(errors.firstName)} placeholder="Ex : Jean-Pierre" value={fd.firstName}
        onChange={e => set('firstName', e.target.value)} />
    </Field>
    <Field label="Genre">
      <select className={selectCls()} value={fd.gender} onChange={e => set('gender', e.target.value)}>
        <option value="">— Sélectionner —</option>
        <option value="M">Masculin</option>
        <option value="F">Féminin</option>
        <option value="OTHER">Autre / Préfère ne pas préciser</option>
      </select>
    </Field>
    <Field label="Date de naissance">
      <input type="date" className={inputCls()} value={fd.birthDate}
        max={new Date().toISOString().split('T')[0]}
        onChange={e => set('birthDate', e.target.value)} />
    </Field>
  </div>
);

const Step2: React.FC<{ fd: FormData; set: (k: keyof FormData, v: string) => void; errors: Partial<Record<keyof FormData, string>> }> = ({ fd, set, errors }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
    <Field label="Province" required error={errors.province} >
      <select className={selectCls(errors.province)} value={fd.province} onChange={e => { set('province', e.target.value); set('district', ''); }}>
        <option value="">— Choisir une province —</option>
        {PROVINCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
    </Field>
    {fd.province === 'KINSHASA' && (
      <Field label="District de Kinshasa" required error={errors.district}>
        <select className={selectCls(errors.district)} value={fd.district} onChange={e => set('district', e.target.value)}>
          <option value="">— Choisir un district —</option>
          {KINSHASA_DISTRICTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </Field>
    )}
    <Field label="Commune / Territoire">
      <input className={inputCls()} placeholder="Ex : Lingwala" value={fd.commune}
        onChange={e => set('commune', e.target.value)} />
    </Field>
    <Field label="Quartier / Village">
      <input className={inputCls()} placeholder="Ex : Quartier Kintambo" value={fd.quartier}
        onChange={e => set('quartier', e.target.value)} />
    </Field>
    <Field label="Adresse complète" >
      <input className={`${inputCls()} sm:col-span-2`} placeholder="Rue, numéro, réf. proche…" value={fd.address}
        onChange={e => set('address', e.target.value)} />
    </Field>
  </div>
);

const Step3: React.FC<{ fd: FormData; set: (k: keyof FormData, v: string) => void; errors: Partial<Record<keyof FormData, string>> }> = ({ fd, set, errors }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
    <Field label="Adresse email" required error={errors.email}>
      <input type="email" className={inputCls(errors.email)} placeholder="vous@exemple.com" value={fd.email}
        onChange={e => set('email', e.target.value)} />
    </Field>
    <Field label="Téléphone principal" required error={errors.phone}>
      <input type="tel" className={inputCls(errors.phone)} placeholder="+243 8XX XXX XXX" value={fd.phone}
        onChange={e => set('phone', e.target.value)} />
    </Field>
    <Field label="Numéro WhatsApp">
      <input type="tel" className={inputCls()} placeholder="+243 8XX XXX XXX (si différent)" value={fd.whatsapp}
        onChange={e => set('whatsapp', e.target.value)} />
    </Field>
    <Field label="Réseaux sociaux">
      <input className={inputCls()} placeholder="Lien Facebook, Instagram, Twitter…" value={fd.socialMedia}
        onChange={e => set('socialMedia', e.target.value)} />
    </Field>
  </div>
);

const Step4: React.FC<{ fd: FormData; set: (k: keyof FormData, v: string) => void; errors: Partial<Record<keyof FormData, string>> }> = ({ fd, set, errors }) => (
  <div className="flex flex-col gap-5">
    <Field label="Pourquoi souhaitez-vous rejoindre la Dynamique ?" required error={errors.motivation}>
      <textarea rows={4} className={`${inputCls(errors.motivation)} resize-none`}
        placeholder="Partagez votre motivation, vos convictions, ce que vous apportez à la Dynamique…"
        value={fd.motivation} onChange={e => set('motivation', e.target.value)} />
      <span className="text-xs text-gray-400 text-right">{fd.motivation.length}/1000 car.</span>
    </Field>
    <Field label="Comment avez-vous connu la Dynamique ?" required error={errors.howKnown}>
      <select className={selectCls(errors.howKnown)} value={fd.howKnown} onChange={e => set('howKnown', e.target.value)}>
        <option value="">— Sélectionner —</option>
        {HOW_KNOWN_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <Field label="Vos compétences / domaine d'expertise">
        <input className={inputCls()} placeholder="Ex : Droit, médecine, informatique, communication…"
          value={fd.skills} onChange={e => set('skills', e.target.value)} />
      </Field>
      <Field label="Disponibilité">
        <select className={selectCls()} value={fd.availability} onChange={e => set('availability', e.target.value)}>
          <option value="">— Sélectionner —</option>
          {AVAILABILITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>
    </div>
    <Field label="Expériences associatives ou politiques antérieures">
      <textarea rows={3} className={`${inputCls()} resize-none`}
        placeholder="Mouvements, partis, associations auxquels vous avez participé (optionnel)…"
        value={fd.previousExperience} onChange={e => set('previousExperience', e.target.value)} />
    </Field>
  </div>
);

const RecapRow: React.FC<{ label: string; value?: string }> = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
};

const Step5: React.FC<{
  fd: FormData;
  set: (k: keyof FormData, v: string | boolean) => void;
  errors: Partial<Record<keyof FormData, string>>;
}> = ({ fd, set, errors }) => {
  const provinceName = PROVINCES.find(p => p.value === fd.province)?.label ?? fd.province;
  const districtName = KINSHASA_DISTRICTS.find(d => d.value === fd.district)?.label ?? fd.district;
  const genderLabel = fd.gender === 'M' ? 'Masculin' : fd.gender === 'F' ? 'Féminin' : fd.gender === 'OTHER' ? 'Autre' : '';

  return (
    <div className="flex flex-col gap-6">
      {/* Recap cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Identité */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-3">1. Identité</p>
          <RecapRow label="Nom" value={fd.fullName} />
          <RecapRow label="Prénom(s)" value={fd.firstName} />
          <RecapRow label="Genre" value={genderLabel} />
          <RecapRow label="Naissance" value={fd.birthDate} />
        </div>
        {/* Localisation */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-3">2. Localisation</p>
          <RecapRow label="Province" value={provinceName} />
          <RecapRow label="District" value={districtName} />
          <RecapRow label="Commune / Territoire" value={fd.commune} />
          <RecapRow label="Quartier / Village" value={fd.quartier} />
        </div>
        {/* Contact */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-3">3. Contact</p>
          <RecapRow label="Email" value={fd.email} />
          <RecapRow label="Téléphone" value={fd.phone} />
          <RecapRow label="WhatsApp" value={fd.whatsapp} />
          <RecapRow label="Réseaux sociaux" value={fd.socialMedia} />
        </div>
        {/* Engagement */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-3">4. Engagement</p>
          <RecapRow label="Comment connu" value={fd.howKnown} />
          <RecapRow label="Compétences" value={fd.skills} />
          <RecapRow label="Disponibilité" value={fd.availability} />
        </div>
      </div>

      {/* Motivation */}
      {fd.motivation && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Motivation</p>
          <p className="text-sm text-gray-700 leading-relaxed">{fd.motivation}</p>
        </div>
      )}

      {/* Charter checkboxes */}
      <div className="flex flex-col gap-3 border-t border-gray-100 pt-5">
        <label className={`flex gap-3 cursor-pointer rounded-xl p-3 border transition-colors
          ${errors.charter ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-red-300 hover:bg-red-50/30'}`}>
          <input type="checkbox" checked={fd.charter as boolean}
            onChange={e => set('charter', e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-red-600 shrink-0" />
          <span className="text-sm text-gray-700">
            J'adhère aux valeurs de la Dynamique Israël Mutombo :{' '}
            <strong>Unité, Résistance, Discipline, Loyauté et Engagement</strong> au service du peuple congolais.
          </span>
        </label>
        {errors.charter && <p className="text-xs text-red-600 flex gap-1 ml-1"><AlertCircle size={12} className="mt-0.5" />{errors.charter}</p>}

        <label className={`flex gap-3 cursor-pointer rounded-xl p-3 border transition-colors
          ${errors.honour ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-red-300 hover:bg-red-50/30'}`}>
          <input type="checkbox" checked={fd.honour as boolean}
            onChange={e => set('honour', e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-red-600 shrink-0" />
          <span className="text-sm text-gray-700">
            Je certifie sur l'honneur que les informations fournies sont exactes et sincères.
          </span>
        </label>
        {errors.honour && <p className="text-xs text-red-600 flex gap-1 ml-1"><AlertCircle size={12} className="mt-0.5" />{errors.honour}</p>}
      </div>
    </div>
  );
};

/* ── Validation ────────────────────────────────────────────────────── */

const validate = (step: number, fd: FormData): Partial<Record<keyof FormData, string>> => {
  const errs: Partial<Record<keyof FormData, string>> = {};
  if (step === 1) {
    if (!fd.fullName.trim()) errs.fullName = 'Le nom est obligatoire';
    if (!fd.firstName.trim()) errs.firstName = 'Le prénom est obligatoire';
  }
  if (step === 2) {
    if (!fd.province) errs.province = 'Veuillez choisir une province';
    if (fd.province === 'KINSHASA' && !fd.district) errs.district = 'Veuillez choisir un district de Kinshasa';
  }
  if (step === 3) {
    if (!fd.email.trim() || !/\S+@\S+\.\S+/.test(fd.email)) errs.email = 'Email invalide';
    if (!fd.phone.trim()) errs.phone = 'Le téléphone est obligatoire';
  }
  if (step === 4) {
    if (!fd.motivation.trim() || fd.motivation.length < 30) errs.motivation = 'Décrivez votre motivation (30 car. min.)';
    if (!fd.howKnown) errs.howKnown = 'Veuillez indiquer comment vous nous avez connu';
  }
  if (step === 5) {
    if (!fd.charter) errs.charter = 'Vous devez adhérer aux valeurs de la Dynamique';
    if (!fd.honour) errs.honour = 'Vous devez certifier l\'exactitude de vos informations';
  }
  return errs;
};

/* ── Step config ───────────────────────────────────────────────────── */

const STEPS = [
  { label: 'Identité',     icon: User,        desc: 'Qui êtes-vous ?' },
  { label: 'Localisation', icon: MapPin,       desc: 'Où résidez-vous ?' },
  { label: 'Contact',      icon: Phone,        desc: 'Comment vous joindre ?' },
  { label: 'Engagement',   icon: Heart,        desc: 'Vos motivations' },
  { label: 'Confirmation', icon: CheckCircle2, desc: 'Vérification & envoi' },
];

/* ── Main component ────────────────────────────────────────────────── */

export const JoinPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [fd, setFd] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  const set = (k: keyof FormData, v: string | boolean) =>
    setFd(prev => ({ ...prev, [k]: v }));

  const mutation = useMutation({
    mutationFn: () =>
      joinAPI.submit({
        fullName: fd.fullName, firstName: fd.firstName,
        gender: fd.gender || undefined, birthDate: fd.birthDate || undefined,
        province: fd.province, district: fd.district || undefined,
        commune: fd.commune || undefined, quartier: fd.quartier || undefined,
        address: fd.address || undefined,
        email: fd.email, phone: fd.phone,
        whatsapp: fd.whatsapp || undefined, socialMedia: fd.socialMedia || undefined,
        motivation: fd.motivation, howKnown: fd.howKnown,
        skills: fd.skills || undefined, availability: fd.availability || undefined,
        previousExperience: fd.previousExperience || undefined,
      }),
    onSuccess: () => {
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      const msg = err?.response?.data?.message ?? 'Erreur lors de l\'envoi. Réessayez.';
      toast.error(msg);
    },
  });

  const next = () => {
    const errs = validate(step, fd);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const back = () => { setErrors({}); setStep(s => s - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const submit = () => {
    const errs = validate(5, fd);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    mutation.mutate();
  };

  /* Success screen */
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} className="text-green-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-3">Demande envoyée !</h1>
          <p className="text-gray-600 leading-relaxed mb-2">
            Merci <strong>{fd.firstName} {fd.fullName}</strong>, votre demande d'adhésion à la
            Dynamique Israël Mutombo a bien été reçue.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            L'administrateur de la province de{' '}
            <strong>{PROVINCES.find(p => p.value === fd.province)?.label ?? fd.province}</strong>{' '}
            vous contactera dans les prochains jours.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors">
              <Home size={18} /> Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const StepIcon = STEPS[step - 1].icon;
  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-black">D</span>
            </div>
            <span className="font-black text-gray-900 text-sm hidden sm:block">Dynamique <span className="text-red-600">RDC</span></span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Shield size={16} className="text-red-500" />
            Formulaire sécurisé
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full mb-4">
              <ChevronRight size={12} /> Rejoindre la Dynamique
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight">
              Faites partie du<br />
              <span className="text-red-600">changement</span>
            </h1>
            <p className="text-gray-500 text-sm mt-3 max-w-sm mx-auto">
              Remplissez ce formulaire en 5 étapes pour rejoindre la Dynamique Israël Mutombo.
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Étape {step} sur {STEPS.length}</span>
              <span>{Math.round(progress)}% complété</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-red-700 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Step pills */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
            {STEPS.map((s, i) => {
              const n = i + 1;
              const done = n < step;
              const active = n === step;
              const Icon = s.icon;
              return (
                <div key={n} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all
                  ${active ? 'bg-red-600 text-white shadow-md shadow-red-200' : done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {done ? <CheckCircle2 size={12} /> : <Icon size={12} />}
                  {s.label}
                </div>
              );
            })}
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
            {/* Card header */}
            <div className="bg-gradient-to-r from-red-600 to-red-800 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <StepIcon size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-red-200 text-xs font-semibold uppercase tracking-wider">Étape {step}</p>
                  <h2 className="text-white font-black text-lg">{STEPS[step - 1].label}</h2>
                </div>
                <span className="ml-auto text-red-200 text-sm">{STEPS[step - 1].desc}</span>
              </div>
            </div>

            {/* Card body */}
            <div className="p-6 sm:p-8">
              {step === 1 && <Step1 fd={fd} set={(k, v) => set(k, v as string)} errors={errors} />}
              {step === 2 && <Step2 fd={fd} set={(k, v) => set(k, v as string)} errors={errors} />}
              {step === 3 && <Step3 fd={fd} set={(k, v) => set(k, v as string)} errors={errors} />}
              {step === 4 && <Step4 fd={fd} set={(k, v) => set(k, v as string)} errors={errors} />}
              {step === 5 && <Step5 fd={fd} set={set} errors={errors} />}
            </div>

            {/* Card footer */}
            <div className="px-6 sm:px-8 pb-6 sm:pb-8 flex items-center justify-between gap-4 border-t border-gray-50 pt-4">
              {step > 1 ? (
                <button type="button" onClick={back}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">
                  <ArrowLeft size={16} /> Retour
                </button>
              ) : (
                <Link to="/"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">
                  <Home size={16} /> Accueil
                </Link>
              )}

              {step < 5 ? (
                <button type="button" onClick={next}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-md shadow-red-100 transition-all active:scale-95">
                  Continuer <ArrowRight size={16} />
                </button>
              ) : (
                <button type="button" onClick={submit} disabled={mutation.isPending}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold shadow-md shadow-red-100 transition-all active:scale-95">
                  {mutation.isPending ? (
                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Envoi en cours…</>
                  ) : (
                    <><Send size={16} /> Soumettre ma demande</>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 mt-8 text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><Shield size={13} className="text-green-500" /> Données sécurisées</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-blue-500" /> Processus officiel</span>
            <span className="flex items-center gap-1.5"><Heart size={13} className="text-red-500" /> Dynamique RDC 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
};
