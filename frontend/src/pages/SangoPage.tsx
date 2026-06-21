import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Star, Shield, Award, Target, Heart, Zap,
  Quote, Mic, Users, Globe, Camera, Play,
  LogIn, UserPlus, ChevronDown, Menu, X,
  AlertTriangle, Calendar, MapPin, Phone, Mail,
  Send, Bell, ExternalLink, Clock, ChevronRight,
  Newspaper, MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { publicationsAPI, eventsAPI, newsletterAPI } from '@/services/api';
import toast from 'react-hot-toast';

/* ── CONSTANTS ─────────────────────────────────────────────────────── */

const VALUES = [
  { label: 'Unité',      icon: Heart,  color: 'from-red-500 to-rose-600',      desc: 'Une seule voix pour tout un peuple congolais' },
  { label: 'Résistance', icon: Shield, color: 'from-blue-600 to-blue-800',     desc: "Face aux anti-valeurs et à l'injustice quotidienne" },
  { label: 'Discipline', icon: Target, color: 'from-amber-500 to-orange-600',  desc: 'Rigueur, méthode et engagement constant' },
  { label: 'Loyauté',    icon: Award,  color: 'from-emerald-500 to-teal-600',  desc: 'Fidèle à la vérité, fidèle au peuple' },
  { label: 'Engagement', icon: Zap,    color: 'from-purple-500 to-violet-700', desc: 'Action concrète pour un Congo meilleur' },
];

const GALLERY = [
  {
    url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&q=80',
    caption: 'Mobilisation citoyenne',
  },
  {
    url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80',
    caption: "Journalisme d'investigation",
  },
  {
    url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80',
    caption: 'Solidarité communautaire',
  },
  {
    url: 'https://i0.wp.com/mbote.cd/app/uploads/2025/10/IMG_7538.jpeg?resize=420%2C280&ssl=1',
    caption: 'Éveil patriotique',
  },
];

const PUB_TYPE_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  INVESTIGATION: { label: 'Enquête',    color: 'bg-purple-100 text-purple-700', icon: <Mic size={10} />        },
  ALERT:         { label: 'Alerte',     color: 'bg-red-100 text-red-700',       icon: <AlertTriangle size={10} /> },
  COMMUNIQUE:    { label: 'Communiqué', color: 'bg-blue-100 text-blue-700',     icon: <Newspaper size={10} />  },
  NEWS:          { label: 'Actualité',  color: 'bg-green-100 text-green-700',   icon: <Newspaper size={10} />  },
  CAMPAIGN:      { label: 'Campagne',   color: 'bg-amber-100 text-amber-700',   icon: <Users size={10} />      },
};

const NAV_LINKS = [
  { label: 'À propos',   href: '#about'    },
  { label: 'Actualités', href: '#news'     },
  { label: 'Événements', href: '#events'   },
  { label: 'Contact',    href: '#contact'  },
];

/* ── HELPERS ───────────────────────────────────────────────────────── */

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function timeAgo(d: string | Date) {
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1)  return 'À l\'instant';
  if (h < 24) return `Il y a ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `Il y a ${days}j`;
  return formatDate(d);
}

/* ── MAIN COMPONENT ─────────────────────────────────────────────────── */

export const SangoPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [scrolled,   setScrolled]   = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [newsletter, setNewsletter] = useState('');
  const [nlLoading,  setNlLoading]  = useState(false);
  const [contact, setContact] = useState({ fullName: '', email: '', phone: '', subject: '', message: '' });
  const [ctLoading, setCtLoading] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  /* ── Publications live ───── */
  const { data: pubData } = useQuery({
    queryKey: ['public-publications'],
    queryFn: () => publicationsAPI.getAll({ limit: '6', page: '1' }).then(r => r.data),
    staleTime: 60000,
  });
  const publications = pubData?.publications ?? [];

  /* ── Events live ─────────── */
  const { data: evtData } = useQuery({
    queryKey: ['public-events'],
    queryFn: () => eventsAPI.getAll({ status: 'UPCOMING', limit: '4' }).then(r => r.data),
    staleTime: 60000,
  });
  const events = evtData?.events ?? [];

  /* ── Newsletter submit ────── */
  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletter) return;
    setNlLoading(true);
    try {
      await newsletterAPI.subscribe(newsletter);
      toast.success('Abonnement confirmé ! Vous recevrez nos actualités.');
      setNewsletter('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Erreur lors de l\'abonnement');
    } finally {
      setNlLoading(false);
    }
  };

  /* ── Contact submit ─────── */
  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setCtLoading(true);
    try {
      await newsletterAPI.contact(contact as unknown as Record<string, unknown>);
      toast.success('Message envoyé ! Nous vous répondrons rapidement.');
      setContact({ fullName: '', email: '', phone: '', subject: '', message: '' });
    } catch {
      toast.error('Erreur lors de l\'envoi. Réessayez.');
    } finally {
      setCtLoading(false);
    }
  };

  /* ── Urgent publication ─── */
  const urgent = publications.find((p: { isUrgent: boolean }) => p.isUrgent);

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ══ TICKER URGENT ═══════════════════════════════════════════ */}
      {urgent && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-red-600 text-white text-xs py-1.5 flex items-center gap-3 px-4 overflow-hidden">
          <span className="flex-shrink-0 flex items-center gap-1 font-black uppercase tracking-wider border-r border-red-400 pr-3">
            <AlertTriangle size={12} /> Alerte
          </span>
          <div className="flex-1 overflow-hidden">
            <span className="animate-marquee inline-block whitespace-nowrap">
              {(urgent as { title: string }).title}
            </span>
          </div>
        </div>
      )}

      {/* ══ NAVBAR ══════════════════════════════════════════════════ */}
      <nav className={`fixed left-0 right-0 z-50 transition-all duration-300 ${urgent ? 'top-7' : 'top-0'} ${
        scrolled ? 'bg-gray-900/97 backdrop-blur-md shadow-xl' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm leading-none">Dynamique</p>
              <p className="text-red-400 text-[10px] font-semibold leading-none mt-0.5">Israël Mutombo</p>
            </div>
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(l => (
              <button
                key={l.href}
                type="button"
                onClick={() => scrollTo(l.href.slice(1))}
                className="text-white/70 hover:text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/10 transition-all"
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <button type="button" onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all shadow-lg">
                Mon tableau de bord
              </button>
            ) : (
              <>
                <button type="button" onClick={() => navigate('/login')}
                  className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-white/10 transition-all">
                  <LogIn size={14} /> Se connecter
                </button>
                <button type="button" onClick={() => navigate('/rejoindre')}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all shadow-lg">
                  <UserPlus size={14} /> Rejoindre
                </button>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button type="button" onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-white/70 hover:text-white" aria-label="Menu">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-gray-900 border-t border-white/10 px-6 py-4 space-y-1">
            {NAV_LINKS.map(l => (
              <button key={l.href} type="button" onClick={() => scrollTo(l.href.slice(1))}
                className="w-full text-left text-white/80 text-sm py-2.5 px-3 rounded-lg hover:bg-white/10">
                {l.label}
              </button>
            ))}
            <div className="border-t border-white/10 pt-3 mt-3 space-y-2">
              {isAuthenticated ? (
                <button type="button" onClick={() => navigate('/dashboard')}
                  className="w-full bg-red-600 text-white text-sm font-semibold py-3 rounded-xl">
                  Mon tableau de bord
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => navigate('/login')}
                    className="w-full border border-white/20 text-white/80 text-sm py-3 rounded-xl">
                    Se connecter
                  </button>
                  <button type="button" onClick={() => navigate('/rejoindre')}
                    className="w-full bg-red-600 text-white text-sm font-semibold py-3 rounded-xl">
                    Rejoindre la Dynamique
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ══ HERO ════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gray-900">
        {/* Background photo */}
        <div className="absolute inset-0">
          <img
            src="https://www.mediacongo.net/cache/mutombo_israel_21_0_jpg_711_473_1_jpeg_711_473_1.jpeg"
            alt="RDC"
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-gray-900/50" />
        </div>
        <div className="absolute inset-0 hero-grid-pattern" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-400 to-red-600" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16 w-full">
          <div className="flex flex-col lg:flex-row items-center gap-14">

            {/* Text */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-bold px-4 py-2 rounded-full mb-6 uppercase tracking-widest">
                <Mic size={11} /> Journaliste d'investigation — RDC
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] mb-2">
                Israël<br /><span className="text-red-500">Mutombo</span>
              </h1>
              <p className="text-2xl text-gray-300 font-light italic mb-2">"Sango"</p>
              <p className="text-gray-400 text-base leading-relaxed max-w-lg mx-auto lg:mx-0 mb-3">
                <span className="text-amber-400 font-semibold">« Ambassadeur de la vérité, la voix des faibles »</span>
              </p>
              <p className="text-gray-500 text-sm leading-relaxed max-w-lg mx-auto lg:mx-0 mb-8">
                Autorité de référence de la Dynamique Israël Mutombo — défenseur de la vérité
                au service des 26 provinces de la République Démocratique du Congo.
              </p>

              <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-8">
                {isAuthenticated ? (
                  <button type="button" onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-red-900/40 transition-all hover:scale-105">
                    Accéder à la plateforme
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={() => navigate('/rejoindre')}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-red-900/40 transition-all hover:scale-105">
                      <UserPlus size={18} /> Rejoindre
                    </button>
                    <button type="button" onClick={() => navigate('/login')}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl transition-all">
                      <LogIn size={18} /> Se connecter
                    </button>
                  </>
                )}
              </div>

              <div className="flex gap-1.5 justify-center lg:justify-start">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} className="fill-amber-400 text-amber-400" />)}
                <span className="text-gray-500 text-sm ml-2 self-center">26 provinces · 4 districts Kinshasa</span>
              </div>
            </div>

            {/* Photos */}
            <div className="flex-shrink-0 flex gap-4 items-end">
              <div className="relative w-52 h-68 rounded-3xl overflow-hidden border-4 border-white/10 shadow-2xl">
                <img
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSUy4j7oL2ggCxuP1ROvIAQ-yDlYkDut1gphpMBpMTDw-1zQZ3gvRcRwr4&s=10"
                  alt="Israël Mutombo"
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <p className="text-white font-bold text-sm">Israël Mutombo</p>
                  <p className="text-red-400 text-xs">Autorité de Référence</p>
                </div>
              </div>
              <div className="w-36 h-48 rounded-2xl overflow-hidden border-2 border-white/10 shadow-xl hidden sm:block">
                <img
                  src="https://i0.wp.com/mbote.cd/app/uploads/2025/10/IMG_7538.jpeg?resize=420%2C280&ssl=1"
                  alt="Dynamique"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-2 text-gray-600">
            <span className="text-xs uppercase tracking-widest">Découvrir</span>
            <ChevronDown size={16} className="animate-bounce" />
          </div>
        </div>
      </section>

      {/* ══ CITATION ════════════════════════════════════════════════ */}
      <section className="relative bg-gradient-to-r from-red-700 to-red-600 py-14 overflow-hidden">
        <div className="absolute top-0 left-8 opacity-10"><Quote size={120} className="text-white" /></div>
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <blockquote className="text-2xl md:text-3xl font-black text-white leading-tight">
            « Votre apport, notre apport —<br />
            <span className="text-red-200">peut être une solution et un changement pour notre pays »</span>
          </blockquote>
          <p className="mt-4 text-red-200 text-sm font-semibold tracking-[0.2em] uppercase">— Israël Mutombo, dit Sango</p>
        </div>
      </section>

      {/* ══ À PROPOS ════════════════════════════════════════════════ */}
      <section id="about" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Photos stack */}
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <img
                  src="https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80"
                  alt="Investigation"
                  className="rounded-2xl w-full h-56 object-cover shadow-lg"
                />
                <img
                  src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80"
                  alt="Communauté"
                  className="rounded-2xl w-full h-56 object-cover shadow-lg mt-8"
                />
                <img
                  src="https://i0.wp.com/mbote.cd/app/uploads/2025/10/IMG_7538.jpeg?resize=420%2C280&ssl=1"
                  alt="Mobilisation"
                  className="rounded-2xl w-full h-48 object-cover shadow-lg -mt-4"
                />
                <div className="bg-gray-900 rounded-2xl p-6 flex flex-col justify-center mt-4">
                  <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-2">Depuis</p>
                  <p className="text-white text-4xl font-black">2026</p>
                  <p className="text-gray-400 text-sm mt-2">Au service du peuple congolais</p>
                </div>
              </div>
              {/* Badge flottant */}
              <div className="absolute -bottom-4 -right-4 bg-red-600 text-white rounded-2xl p-4 shadow-xl hidden lg:block">
                <p className="text-3xl font-black">26</p>
                <p className="text-red-200 text-xs">Provinces</p>
              </div>
            </div>

            {/* Text */}
            <div>
              <p className="text-red-600 text-xs font-bold uppercase tracking-[0.2em] mb-3">À propos</p>
              <h2 className="text-4xl font-black text-gray-900 mb-6 leading-tight">
                Israël Mutombo,<br /><span className="text-red-600">dit « Sango »</span>
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Israël Mutombo est un <strong className="text-gray-900">journaliste d'investigation congolais</strong> dont
                  le travail est entièrement dédié à la défense de la vérité et à l'éveil de la conscience
                  patriotique en République Démocratique du Congo.
                </p>
                <p>
                  Autorité de référence de la <strong className="text-red-600">Dynamique Israël Mutombo</strong>,
                  il incarne un mouvement citoyen <em>volontaire, apolitique, aconfessionnel et transrégional</em>,
                  rassemblant des milliers de jeunes bénévoles engagés dans les 26 provinces du pays.
                </p>
                <p>
                  Son action repose sur un triptyque fondamental : <strong className="text-gray-900">informer, dénoncer
                  et mobiliser</strong> — pour éradiquer les anti-valeurs qui nuisent au peuple congolais et construire
                  un Congo fondé sur la vérité, la dignité et la justice.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                {[
                  { label: 'Apolitique',       icon: Shield   },
                  { label: 'Aconfessionnel',   icon: Heart    },
                  { label: 'Transrégional',    icon: Globe    },
                  { label: 'Volontaire',       icon: Users    },
                ].map(({ label, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon size={14} className="text-red-600" />
                    </div>
                    <span className="text-gray-700 font-semibold text-sm">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ VALEURS ═════════════════════════════════════════════════ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-red-600 text-xs font-bold uppercase tracking-[0.2em] mb-2">Les piliers</p>
            <h2 className="text-3xl font-black text-gray-900">5 Valeurs Fondamentales</h2>
            <p className="text-gray-500 mt-2 text-sm">Unité · Résistance · Discipline · Loyauté · Engagement</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {VALUES.map(({ label, icon: Icon, color, desc }) => (
              <div key={label}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon size={24} className="text-white" />
                </div>
                <p className="font-black text-gray-900 text-sm mb-1">{label}</p>
                <p className="text-gray-400 text-[11px] leading-relaxed hidden md:block">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ACTUALITÉS ══════════════════════════════════════════════ */}
      <section id="news" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-red-600 text-xs font-bold uppercase tracking-[0.2em] mb-2">Publications</p>
              <h2 className="text-3xl font-black text-gray-900">Dernières Actualités</h2>
              <p className="text-gray-500 text-sm mt-1">Les enquêtes, alertes et communiqués de la Dynamique</p>
            </div>
            <button type="button" onClick={() => navigate('/feed')}
              className="hidden md:flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-semibold">
              Tout voir <ChevronRight size={16} />
            </button>
          </div>

          {publications.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Newspaper size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucune publication pour le moment.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Featured */}
              {publications[0] && (
                <div
                  className="md:col-span-2 group bg-gray-900 rounded-3xl overflow-hidden cursor-pointer hover:shadow-2xl transition-all"
                  onClick={() => navigate(`/feed/${(publications[0] as { _id: string })._id}`)}
                >
                  {(publications[0] as { mediaUrls: string[] }).mediaUrls?.[0] ? (
                    <img
                      src={(publications[0] as { mediaUrls: string[] }).mediaUrls[0]}
                      alt={(publications[0] as { title: string }).title}
                      className="w-full h-52 object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-52 bg-gradient-to-br from-red-900/50 to-gray-800 flex items-center justify-center">
                      <Newspaper size={48} className="text-white/20" />
                    </div>
                  )}
                  <div className="p-6">
                    {(publications[0] as { isUrgent: boolean }).isUrgent && (
                      <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-3 uppercase">
                        <AlertTriangle size={9} /> Urgent
                      </span>
                    )}
                    {PUB_TYPE_LABELS[(publications[0] as { type: string }).type] && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-3 ml-2 ${PUB_TYPE_LABELS[(publications[0] as { type: string }).type].color}`}>
                        {PUB_TYPE_LABELS[(publications[0] as { type: string }).type].icon}
                        {PUB_TYPE_LABELS[(publications[0] as { type: string }).type].label}
                      </span>
                    )}
                    <h3 className="text-white font-black text-xl leading-snug mb-2 group-hover:text-red-400 transition-colors">
                      {(publications[0] as { title: string }).title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">
                      {(publications[0] as { excerpt: string }).excerpt}
                    </p>
                    <div className="mt-4 flex items-center gap-3 text-gray-500 text-xs">
                      <Clock size={11} />
                      {timeAgo((publications[0] as { publishedAt: string }).publishedAt)}
                    </div>
                  </div>
                </div>
              )}

              {/* Side list */}
              <div className="space-y-4">
                {publications.slice(1, 5).map((pub: Record<string, unknown>) => (
                  <div
                    key={pub._id as string}
                    className="group bg-gray-50 hover:bg-red-50 rounded-2xl p-4 cursor-pointer transition-all border border-gray-100 hover:border-red-100"
                    onClick={() => navigate(`/feed/${pub._id as string}`)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        {PUB_TYPE_LABELS[pub.type as string] && (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 ${PUB_TYPE_LABELS[pub.type as string].color}`}>
                            {PUB_TYPE_LABELS[pub.type as string].icon}
                            {PUB_TYPE_LABELS[pub.type as string].label}
                          </span>
                        )}
                        <p className="font-bold text-gray-900 text-sm leading-snug group-hover:text-red-700 transition-colors line-clamp-2">
                          {pub.title as string}
                        </p>
                        <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                          <Clock size={10} /> {timeAgo(pub.publishedAt as string)}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-red-400 flex-shrink-0 mt-1 transition-colors" />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => navigate('/feed')}
                  className="w-full text-center text-red-600 hover:text-red-700 text-sm font-semibold py-3 border border-red-100 hover:border-red-200 rounded-xl transition-all">
                  Toutes les publications →
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══ CHIFFRES ════════════════════════════════════════════════ */}
      <section className="py-16 bg-gradient-to-br from-red-700 to-red-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {[
              { n: '26', label: 'Provinces couvertes', sub: 'Territoire national' },
              { n: '4',  label: 'Districts Kinshasa',  sub: 'Lukunga · Funa · Mont-Amba · Tshangu' },
              { n: '∞',  label: 'Citoyens engagés',    sub: 'Et ça grandit chaque jour' },
              { n: '1',  label: 'Mission commune',      sub: 'Un Congo meilleur' },
            ].map(({ n, label, sub }) => (
              <div key={label}>
                <p className="text-6xl font-black">{n}</p>
                <p className="text-red-200 font-bold mt-2 text-sm">{label}</p>
                <p className="text-red-300/50 text-xs mt-1">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ GALERIE ═════════════════════════════════════════════════ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-red-600 text-xs font-bold uppercase tracking-[0.2em] mb-2">En images</p>
            <h2 className="text-3xl font-black text-gray-900">Galerie</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {GALLERY.map(({ url, caption }) => (
              <div key={caption} className="group relative rounded-2xl overflow-hidden aspect-square shadow-sm hover:shadow-xl transition-all">
                <img src={url} alt={caption} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <p className="text-white text-sm font-semibold">{caption}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ÉVÉNEMENTS ══════════════════════════════════════════════ */}
      <section id="events" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-red-600 text-xs font-bold uppercase tracking-[0.2em] mb-2">Agenda</p>
              <h2 className="text-3xl font-black text-gray-900">Prochains Événements</h2>
              <p className="text-gray-500 text-sm mt-1">Retrouvez-nous lors de nos activités sur le terrain</p>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar size={32} className="text-gray-300" />
              </div>
              <p className="text-gray-500 text-sm font-medium">Aucun événement à venir pour le moment.</p>
              <p className="text-gray-400 text-xs mt-1">Les prochains événements apparaîtront ici.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {events.map((evt: Record<string, unknown>) => (
                <div key={evt._id as string} className="group bg-gray-50 hover:bg-white rounded-2xl border border-gray-100 hover:border-red-100 hover:shadow-lg transition-all overflow-hidden">
                  {evt.imageUrl ? (
                    <img src={evt.imageUrl as string} alt={evt.title as string} className="w-full h-36 object-cover" />
                  ) : (
                    <div className="w-full h-36 bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                      <Calendar size={32} className="text-white/40" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-1.5 text-red-600 text-xs font-bold mb-2">
                      <Calendar size={11} />
                      {formatDate(evt.date as string)}
                    </div>
                    <h3 className="font-black text-gray-900 text-sm leading-snug mb-2 group-hover:text-red-700 transition-colors">
                      {evt.title as string}
                    </h3>
                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                      <MapPin size={10} /> {evt.location as string}
                    </div>
                    {(evt.registrationLink as string | undefined) && (
                      <a href={evt.registrationLink as string} target="_blank" rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-semibold">
                        S'inscrire <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══ CONTACT ═════════════════════════════════════════════════ */}
      <section id="contact" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-red-600 text-xs font-bold uppercase tracking-[0.2em] mb-2">Nous contacter</p>
            <h2 className="text-3xl font-black text-gray-900">Contact & Urgences</h2>
            <p className="text-gray-500 text-sm mt-2">Pour signaler, témoigner ou rejoindre la Dynamique</p>
          </div>

          <div className="grid lg:grid-cols-5 gap-10">

            {/* Info urgences */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-red-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                    <Phone size={18} />
                  </div>
                  <div>
                    <p className="font-black">Ligne d'urgence</p>
                    <p className="text-red-200 text-xs">Disponible 24h/24</p>
                  </div>
                </div>
                <p className="text-2xl font-black mb-1">+243 XXX XXX XXX</p>
                <p className="text-red-200 text-sm">Pour signalements urgents sur le terrain</p>
              </div>

              {[
                { icon: Mail,  label: 'Email officiel',  value: 'contact@dynamique-rdc.cd',   sub: 'Réponse sous 48h' },
                { icon: MapPin, label: 'Siège national',  value: 'Kinshasa, RDC',              sub: 'Comité National' },
              ].map(({ icon: Icon, label, value, sub }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4 shadow-sm">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-semibold uppercase">{label}</p>
                    <p className="text-gray-900 font-bold mt-0.5">{value}</p>
                    <p className="text-gray-400 text-xs">{sub}</p>
                  </div>
                </div>
              ))}

              <div className="bg-gray-900 rounded-2xl p-5">
                <p className="text-white font-bold mb-3 text-sm">Réseaux sociaux</p>
                <div className="flex gap-3">
                  {([
                    { Icon: Globe,         label: 'Facebook'  },
                    { Icon: MessageSquare, label: 'Twitter'   },
                    { Icon: Play,          label: 'YouTube'   },
                    { Icon: Camera,        label: 'Instagram' },
                  ] as { Icon: React.FC<{ size: number; className: string }>; label: string }[]).map(({ Icon, label }) => (
                    <button key={label} type="button" title={label} aria-label={label}
                      className="w-10 h-10 bg-white/10 hover:bg-red-600 rounded-xl flex items-center justify-center transition-all">
                      <Icon size={16} className="text-white" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Formulaire */}
            <div className="lg:col-span-3">
              <form onSubmit={handleContact} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-5">
                <h3 className="font-black text-gray-900 text-lg mb-2">Envoyer un message</h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 text-xs font-bold mb-1.5 uppercase">Nom complet *</label>
                    <input
                      type="text" required
                      value={contact.fullName}
                      onChange={e => setContact(c => ({ ...c, fullName: e.target.value }))}
                      placeholder="Jean-Pierre Mukendi"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs font-bold mb-1.5 uppercase">Email *</label>
                    <input
                      type="email" required
                      value={contact.email}
                      onChange={e => setContact(c => ({ ...c, email: e.target.value }))}
                      placeholder="votre@email.com"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 text-xs font-bold mb-1.5 uppercase">Téléphone</label>
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={e => setContact(c => ({ ...c, phone: e.target.value }))}
                      placeholder="+243 XXX XXX XXX"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs font-bold mb-1.5 uppercase">Sujet *</label>
                    <select required
                      value={contact.subject}
                      onChange={e => setContact(c => ({ ...c, subject: e.target.value }))}
                      title="Sujet du message"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all bg-white">
                      <option value="">Choisir un sujet</option>
                      <option>Signalement urgent</option>
                      <option>Rejoindre la Dynamique</option>
                      <option>Témoignage / Information</option>
                      <option>Partenariat</option>
                      <option>Autre</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 text-xs font-bold mb-1.5 uppercase">Message *</label>
                  <textarea
                    required rows={5}
                    value={contact.message}
                    onChange={e => setContact(c => ({ ...c, message: e.target.value }))}
                    placeholder="Décrivez votre situation ou votre demande..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
                  />
                </div>

                <button type="submit" disabled={ctLoading}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-sm shadow-lg shadow-red-200 transition-all hover:scale-[1.01]">
                  {ctLoading ? (
                    <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi en cours...</span>
                  ) : (
                    <><Send size={16} /> Envoyer le message</>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA REJOINDRE ═══════════════════════════════════════════ */}
      <section className="py-24 bg-gray-900">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="flex justify-center gap-1.5 mb-6">
            {[...Array(5)].map((_, i) => <Star key={i} size={20} className="fill-amber-400 text-amber-400" />)}
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Rejoignez le mouvement<br /><span className="text-red-400">qui change le Congo</span>
          </h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Signaler, dénoncer, mobiliser — ensemble nous pouvons bâtir la RDC que nous méritons.
            La Dynamique vous réserve un accueil chaleureux.
          </p>
          {isAuthenticated ? (
            <button type="button" onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white font-bold px-12 py-5 rounded-2xl text-lg shadow-2xl shadow-red-900/50 transition-all hover:scale-105">
              Accéder à la plateforme
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button type="button" onClick={() => navigate('/rejoindre')}
                className="inline-flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white font-bold px-10 py-4 rounded-2xl shadow-2xl shadow-red-900/50 transition-all hover:scale-105">
                <UserPlus size={18} /> Rejoindre la Dynamique
              </button>
              <button type="button" onClick={() => navigate('/login')}
                className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-10 py-4 rounded-2xl transition-all">
                <LogIn size={18} /> Se connecter
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════ */}
      <footer className="bg-black border-t border-white/5">

        {/* Newsletter band */}
        <div className="bg-red-600 py-10">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Bell size={18} className="text-white" />
              <h3 className="text-white font-black text-lg">Restez informé</h3>
            </div>
            <p className="text-red-200 text-sm mb-5">
              Abonnez-vous à notre newsletter et recevez les actualités directement dans votre boîte mail.
            </p>
            <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email" required
                value={newsletter}
                onChange={e => setNewsletter(e.target.value)}
                placeholder="votre@email.com"
                className="flex-1 bg-white/20 border border-white/30 text-white placeholder-white/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <button type="submit" disabled={nlLoading}
                className="flex items-center justify-center gap-2 bg-white text-red-600 font-bold px-6 py-3 rounded-xl text-sm hover:bg-red-50 transition-all disabled:opacity-60 whitespace-nowrap">
                {nlLoading ? <span className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" /> : <><Send size={14} /> S'abonner</>}
              </button>
            </form>
          </div>
        </div>

        {/* Main footer */}
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid md:grid-cols-4 gap-10">

            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                  <Shield size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-black">Dynamique</p>
                  <p className="text-red-400 text-xs">Israël Mutombo</p>
                </div>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed mb-5 max-w-sm">
                Mouvement citoyen volontaire, apolitique, aconfessionnel et transrégional
                au service des 26 provinces de la RDC.
              </p>
              <div className="flex gap-3">
                {([
                  { Icon: Globe,         label: 'Facebook'  },
                  { Icon: MessageSquare, label: 'Twitter'   },
                  { Icon: Play,          label: 'YouTube'   },
                  { Icon: Camera,        label: 'Instagram' },
                ] as { Icon: React.FC<{ size: number; className: string }>; label: string }[]).map(({ Icon, label }) => (
                  <button key={label} type="button" title={label} aria-label={label}
                    className="w-9 h-9 bg-white/5 hover:bg-red-600 rounded-xl flex items-center justify-center transition-all">
                    <Icon size={15} className="text-gray-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div>
              <p className="text-white font-bold text-sm mb-4 uppercase tracking-widest">Navigation</p>
              <ul className="space-y-2.5">
                {[
                  { label: 'À propos',   id: 'about'   },
                  { label: 'Actualités', id: 'news'    },
                  { label: 'Événements', id: 'events'  },
                  { label: 'Contact',    id: 'contact' },
                ].map(({ label, id }) => (
                  <li key={id}>
                    <button type="button" onClick={() => scrollTo(id)}
                      className="text-gray-500 hover:text-red-400 text-sm transition-colors">
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Plateforme */}
            <div>
              <p className="text-white font-bold text-sm mb-4 uppercase tracking-widest">Plateforme</p>
              <ul className="space-y-2.5">
                {[
                  { label: 'Signalements',      path: '/reports'     },
                  { label: "Fil d'actualité",   path: '/feed'        },
                  { label: 'Campagnes',          path: '/campaigns'   },
                  { label: 'Innovation Jeunes',  path: '/innovations' },
                  { label: 'Carte interactive',  path: '/map'         },
                ].map(({ label, path }) => (
                  <li key={path}>
                    <button type="button" onClick={() => navigate(path)}
                      className="text-gray-500 hover:text-red-400 text-sm transition-colors">
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 py-6">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-gray-600 text-xs">
              © 2026 Dynamique Israël Mutombo · RDC · Tous droits réservés
            </p>
            <p className="text-gray-700 text-xs">
              Unité · Résistance · Discipline · Loyauté · Engagement
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
};
