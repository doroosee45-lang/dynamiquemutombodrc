import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Shield } from 'lucide-react';
import { authAPI } from '@/services/api';

export const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); setMessage('Token manquant'); return; }

    authAPI.verifyEmail(token)
      .then(res => { setStatus('success'); setMessage(res.data.message); })
      .catch(err => { setStatus('error'); setMessage(err.response?.data?.message || 'Erreur de vérification'); });
  }, [params]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-primary-950 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-10 text-center max-w-md w-full shadow-2xl">
        <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield size={24} className="text-white" />
        </div>

        {status === 'loading' && (
          <>
            <Loader2 size={48} className="animate-spin text-primary-400 mx-auto mb-4" />
            <p className="text-white">Vérification en cours...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Email vérifié !</h2>
            <p className="text-gray-300 mb-6">{message}</p>
            <Link to="/login" className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 inline-block">
              Se connecter
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Erreur de vérification</h2>
            <p className="text-gray-300 mb-6">{message}</p>
            <Link to="/login" className="text-primary-400 hover:text-primary-300 text-sm">
              Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
