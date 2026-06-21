import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Upload, X, MapPin, AlertTriangle, Eye, EyeOff,
  Locate, CheckCircle2, AlertCircle, Navigation, ExternalLink,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsAPI } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { REPORT_CATEGORIES, PROVINCES, DISTRICTS } from '@/utils/constants';
import { buildFormData } from '@/utils/helpers';
import toast from 'react-hot-toast';

type GpsStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export const NewReportPage: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const hasAutoRequested = useRef(false);

  const [form, setForm] = useState({
    title: '', description: '', category: '',
    province: '', district: '', commune: '', address: '',
    latitude: '', longitude: '',
    isAnonymous: false,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ── GPS state ────────────────────────────────────────────────── */
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [gpsAddress, setGpsAddress] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  const handleGpsSuccess = useCallback(async (pos: GeolocationPosition) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const acc = pos.coords.accuracy;
    setForm(f => ({ ...f, latitude: String(lat), longitude: String(lng) }));
    setGpsAccuracy(Math.round(acc));
    setGpsStatus('granted');

    // Reverse geocoding via Nominatim (OpenStreetMap — free, no key)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
        { headers: { 'User-Agent': 'DynamiqueRDC/1.0' } }
      );
      const data = await res.json();
      if (data?.display_name) setGpsAddress(data.display_name);
      // Auto-fill commune if empty
      const city = data?.address?.city || data?.address?.town || data?.address?.village || data?.address?.suburb;
      if (city) setForm(f => ({ ...f, commune: f.commune || city }));
    } catch { /* Nominatim unavailable — coordinates still saved */ }
  }, []);

  const handleGpsError = useCallback(() => {
    setGpsStatus('denied');
    toast('Localisation refusée — remplissez l\'adresse manuellement.', { icon: '📍' });
  }, []);

  const requestGps = useCallback(() => {
    if (!navigator.geolocation) { setGpsStatus('unavailable'); return; }
    setGpsStatus('requesting');
    navigator.geolocation.getCurrentPosition(handleGpsSuccess, handleGpsError, {
      timeout: 15000, enableHighAccuracy: true,
    });
  }, [handleGpsSuccess, handleGpsError]);

  // Auto-request GPS on mount
  useEffect(() => {
    if (hasAutoRequested.current) return;
    hasAutoRequested.current = true;
    if (navigator.geolocation) {
      setGpsStatus('requesting');
      navigator.geolocation.getCurrentPosition(handleGpsSuccess, handleGpsError, {
        timeout: 15000, enableHighAccuracy: true,
      });
    } else {
      setGpsStatus('unavailable');
    }
  }, [handleGpsSuccess, handleGpsError]);

  const clearGps = () => {
    setForm(f => ({ ...f, latitude: '', longitude: '' }));
    setGpsAddress('');
    setGpsAccuracy(null);
    setGpsStatus('idle');
  };

  /* ── Dropzone ─────────────────────────────────────────────────── */
  const onDrop = useCallback((accepted: File[]) => {
    setFiles(prev => [...prev, ...accepted].slice(0, 5));
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [] },
    maxSize: 50 * 1024 * 1024,
    maxFiles: 5,
  });

  /* ── Submit ───────────────────────────────────────────────────── */
  const mutation = useMutation({
    mutationFn: (data: FormData) => reportsAPI.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Signalement envoyé ! Il sera examiné par nos modérateurs.');
      navigate(`/reports/${res.data.id}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur lors de l\'envoi';
      toast.error(msg);
    },
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim() || form.title.length < 5) e.title = 'Le titre doit contenir au moins 5 caractères';
    if (!form.description.trim() || form.description.length < 50) e.description = 'La description doit contenir au moins 50 caractères';
    if (!form.category) e.category = 'Sélectionnez une catégorie';
    if (!form.province) e.province = 'Sélectionnez une province';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const fd = buildFormData({ ...form, isAnonymous: String(form.isAnonymous) });
    files.forEach(f => fd.append('media', f));
    mutation.mutate(fd);
  };

  /* ── Render helpers ───────────────────────────────────────────── */
  const mapSrc = form.latitude && form.longitude
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${Number(form.longitude) - 0.004},${Number(form.latitude) - 0.004},${Number(form.longitude) + 0.004},${Number(form.latitude) + 0.004}&layer=mapnik&marker=${form.latitude},${form.longitude}`
    : '';

  const mapsLink = form.latitude && form.longitude
    ? `https://maps.google.com/?q=${form.latitude},${form.longitude}`
    : '';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau Signalement</h1>
        <p className="text-gray-500 text-sm mt-1">
          Votre signalement sera analysé par notre IA et examiné par les modérateurs provinciaux.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Informations ───────────────────────────────────────── */}
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <AlertTriangle size={18} className="text-primary-600" />
            Informations du signalement
          </h2>

          <Input
            label="Titre du signalement"
            required
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            error={errors.title}
            placeholder="Ex: Braquage à main armée devant l'école..."
            maxLength={200}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Catégorie <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {REPORT_CATEGORIES.map(c => (
                <button key={c.value} type="button"
                  onClick={() => setForm(f => ({ ...f, category: c.value }))}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all
                    ${form.category === c.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                  <span>{c.icon}</span>
                  <span className="text-xs">{c.label}</span>
                </button>
              ))}
            </div>
            {errors.category && <p className="text-xs text-red-600">{errors.category}</p>}
          </div>

          <Textarea
            label="Description détaillée"
            required
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            error={errors.description}
            rows={5}
            placeholder="Décrivez en détail l'incident : que s'est-il passé, quand, comment, qui était impliqué... (minimum 50 caractères)"
            hint={`${form.description.length} / 50 caractères minimum`}
          />
        </Card>

        {/* ── Localisation ───────────────────────────────────────── */}
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <MapPin size={18} className="text-primary-600" />
            Localisation
            {gpsStatus === 'granted' && (
              <span className="ml-auto flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <CheckCircle2 size={12} /> GPS actif
              </span>
            )}
          </h2>

          {/* GPS banner — requesting */}
          {gpsStatus === 'requesting' && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Navigation size={16} className="text-blue-600 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800">Demande de localisation en cours…</p>
                <p className="text-xs text-blue-500 mt-0.5">Autorisez l'accès à votre position pour localiser précisément le problème.</p>
              </div>
            </div>
          )}

          {/* GPS banner — denied / unavailable */}
          {(gpsStatus === 'denied' || gpsStatus === 'unavailable') && (
            <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertCircle size={16} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {gpsStatus === 'unavailable' ? 'GPS non disponible' : 'Localisation refusée'}
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">Remplissez l'adresse manuellement ci-dessous.</p>
                </div>
              </div>
              {gpsStatus === 'denied' && (
                <button type="button" onClick={requestGps}
                  className="shrink-0 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors">
                  Réessayer
                </button>
              )}
            </div>
          )}

          {/* GPS captured — map preview */}
          {gpsStatus === 'granted' && form.latitude && form.longitude && (
            <div className="bg-green-50 border border-green-200 rounded-xl overflow-hidden">
              {/* Map preview */}
              <div className="relative h-40 bg-gray-100">
                <iframe
                  title="Prévisualisation de la position"
                  src={mapSrc}
                  className="w-full h-full border-0"
                  loading="lazy"
                  sandbox="allow-scripts allow-same-origin"
                />
                {/* Overlay badge */}
                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg shadow px-2.5 py-1.5 flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-gray-800">Position en direct</span>
                </div>
              </div>

              {/* Info row */}
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Locate size={15} className="text-green-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-green-800">
                      {parseFloat(form.latitude).toFixed(5)}, {parseFloat(form.longitude).toFixed(5)}
                      {gpsAccuracy !== null && (
                        <span className="ml-2 font-normal text-green-600">± {gpsAccuracy} m</span>
                      )}
                    </p>
                    {gpsAddress && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{gpsAddress}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {mapsLink && (
                    <a href={mapsLink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                      <ExternalLink size={12} /> Carte
                    </a>
                  )}
                  <button type="button" onClick={clearGps}
                    title="Effacer la position"
                    className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Manual GPS trigger (when idle or to refresh) */}
          {(gpsStatus === 'idle' || gpsStatus === 'granted') && (
            <button type="button" onClick={requestGps}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all
                ${gpsStatus === 'granted'
                  ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
                  : 'border-primary-300 text-primary-700 bg-primary-50 hover:bg-primary-100'}`}>
              <Locate size={15} />
              {gpsStatus === 'granted' ? 'Actualiser la position GPS' : 'Utiliser ma position actuelle'}
            </button>
          )}

          <div className="border-t border-gray-100 pt-4 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Localisation administrative <span className="text-red-500">*</span>
            </p>

            <Select
              label="Province *"
              required
              value={form.province}
              onChange={e => setForm(f => ({ ...f, province: e.target.value, district: '' }))}
              options={PROVINCES}
              error={errors.province}
            />

            {form.province === 'KINSHASA' && (
              <Select
                label="District"
                value={form.district}
                onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                options={DISTRICTS.map(d => ({ value: d.value, label: d.label }))}
              />
            )}

            <Input
              label="Commune / Quartier"
              value={form.commune}
              onChange={e => setForm(f => ({ ...f, commune: e.target.value }))}
              placeholder="Ex: Gombe, Lemba, Matete..."
            />

            <Input
              label="Adresse précise"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="Ex: Avenue de l'Université, près du marché..."
            />
          </div>
        </Card>

        {/* ── Médias ─────────────────────────────────────────────── */}
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Upload size={18} className="text-primary-600" />
            Photos / Vidéos <span className="text-gray-400 text-sm font-normal">(optionnel)</span>
          </h2>

          <div {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <input {...getInputProps()} />
            <Upload size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {isDragActive ? 'Déposez vos fichiers ici...' : 'Glissez des photos/vidéos ou cliquez pour sélectionner'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Max 5 fichiers · 50 Mo chacun</p>
          </div>

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative">
                  {f.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(f)} alt="" className="w-20 h-20 object-cover rounded-lg" />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-gray-500 text-center px-1">{f.name}</span>
                    </div>
                  )}
                  <button type="button"
                    onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Anonymat ────────────────────────────────────────────── */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {form.isAnonymous ? <EyeOff size={18} className="text-gray-500" /> : <Eye size={18} className="text-gray-500" />}
              <div>
                <p className="text-sm font-medium text-gray-700">Signalement anonyme</p>
                <p className="text-xs text-gray-500">Votre nom n'apparaîtra pas publiquement</p>
              </div>
            </div>
            <button type="button"
              onClick={() => setForm(f => ({ ...f, isAnonymous: !f.isAnonymous }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${form.isAnonymous ? 'bg-primary-600' : 'bg-gray-200'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${form.isAnonymous ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)} className="flex-1">
            Annuler
          </Button>
          <Button type="submit" loading={mutation.isPending} className="flex-2">
            Envoyer le signalement
          </Button>
        </div>
      </form>
    </div>
  );
};
