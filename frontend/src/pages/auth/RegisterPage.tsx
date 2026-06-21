import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { PROVINCES, DISTRICTS } from '@/utils/constants';
import toast from 'react-hot-toast';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', phone: '', province: '', district: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error('Le mot de passe doit contenir au moins 8 caractères');

    setLoading(true);
    try {
      await authAPI.register(form);
      toast.success('Compte créé ! Vérifiez votre email pour activer votre compte.');
      navigate('/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur lors de la création du compte';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const districtOptions = form.province === 'KINSHASA'
    ? DISTRICTS.map(d => ({ value: d.value, label: d.label }))
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-primary-950 to-gray-900 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl shadow-xl mb-3">
            <Shield size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Rejoindre la Dynamique</h1>
          <p className="text-gray-400 text-sm mt-1">Plateforme Citoyenne RDC</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Nom complet *</label>
              <input type="text" value={form.fullName} onChange={set('fullName')} required
                placeholder="Prénom Nom"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Email *</label>
              <input type="email" value={form.email} onChange={set('email')} required
                placeholder="votre@email.com"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Téléphone</label>
              <input type="tel" value={form.phone} onChange={set('phone')}
                placeholder="+243 8XX XXX XXX"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Mot de passe *</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')}
                  required placeholder="Min. 8 caractères, 1 majuscule, 1 chiffre"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 pr-10 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Province *</label>
              <select value={form.province} onChange={set('province')} required
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                <option value="">Sélectionnez votre province...</option>
                {PROVINCES.map(p => <option key={p.value} value={p.value} className="bg-gray-800">{p.label}</option>)}
              </select>
            </div>

            {form.province === 'KINSHASA' && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">District (Kinshasa)</label>
                <select value={form.district} onChange={set('district')}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm">
                  <option value="">Sélectionnez votre district...</option>
                  {districtOptions.map(d => <option key={d.value} value={d.value} className="bg-gray-800">{d.label}</option>)}
                </select>
              </div>
            )}

            <div className="flex items-start gap-2 mt-2">
              <input type="checkbox" id="terms" required className="mt-0.5 rounded border-gray-400" />
              <label htmlFor="terms" className="text-xs text-gray-400">
                J'accepte que mes informations soient utilisées uniquement dans le cadre des activités citoyennes de la Dynamique, conformément à la politique de confidentialité.
              </label>
            </div>

            <Button type="submit" className="w-full" loading={loading} size="lg">
              Créer mon compte
            </Button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-4">
            Déjà membre ?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Se connecter</Link>
          </p>
        </div>
        <p className="text-center text-xs text-gray-500 mt-4">Unité · Résistance · Discipline · Loyauté · Engagement</p>
      </div>
    </div>
  );
};
