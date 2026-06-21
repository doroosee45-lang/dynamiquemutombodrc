import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { authAPI } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '', totpCode: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.login(form);

      if (data.requiresTwoFA) {
        setNeeds2FA(true);
        toast('Entrez votre code 2FA', { icon: '🔐' });
        return;
      }

      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success(`Bienvenue, ${data.user.fullName} !`);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erreur de connexion';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-primary-950 to-gray-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #dc2626 0%, transparent 50%), radial-gradient(circle at 75% 75%, #dc2626 0%, transparent 50%)' }} />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-xl mb-4">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Dynamique Israël Mutombo</h1>
          <p className="text-gray-400 text-sm mt-1">Plateforme Citoyenne — RDC</p>
          <div className="flex justify-center gap-2 mt-2 flex-wrap">
            {['Informer', 'Dénoncer', 'Mobiliser', 'Protéger'].map(v => (
              <span key={v} className="text-[10px] text-primary-400 bg-primary-900/50 px-2 py-0.5 rounded-full">{v}</span>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Connexion</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!needs2FA ? (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="votre@email.com"
                      required
                      className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-4 py-2.5 text-white
                        placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Mot de passe</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      required
                      className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-10 py-2.5 text-white
                        placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">Code d'authentification 2FA</label>
                <input
                  type="text"
                  value={form.totpCode}
                  onChange={e => setForm({ ...form, totpCode: e.target.value })}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white text-center
                    text-2xl font-mono tracking-widest placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading} size="lg">
              {needs2FA ? 'Vérifier' : 'Se connecter'}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="text-primary-400 hover:text-primary-300">
              Mot de passe oublié ?
            </Link>
            <Link to="/register" className="text-primary-400 hover:text-primary-300">
              Créer un compte
            </Link>
          </div>
        </div>

        {/* Demo accounts */}
        <div className="mt-4 bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-xs text-gray-400 font-medium mb-2">Comptes de démonstration :</p>
          <div className="space-y-1 text-xs text-gray-500">
            <p>Admin: <span className="text-gray-300">admin@dynamique-rdc.cd / Admin@Dynamique2026!</span></p>
            <p>Citoyen: <span className="text-gray-300">citoyen@example.com / Citoyen@2026!</span></p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Unité · Résistance · Discipline · Loyauté · Engagement
        </p>
      </div>
    </div>
  );
};
