import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, AlertTriangle, Newspaper, Map, Megaphone, MessageSquare,
  Lightbulb, LogOut, Users, BarChart2, Shield, MapPin, Layers, Building2,
  ChevronLeft, ChevronRight, User
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { authAPI } from '@/services/api';
import { disconnectSocket } from '@/services/socket';
import { getInitials } from '@/utils/helpers';
import toast from 'react-hot-toast';

const ALL = ['CITIZEN','MODERATOR','EDITOR','DISTRICT_ADMIN','ADMIN','SUPERADMIN'];
const navItems = [
  { to: '/dashboard',              icon: Home,         label: 'Accueil',            roles: ALL },
  { to: '/reports',                icon: AlertTriangle,label: 'Signalements',        roles: ALL },
  { to: '/map',                    icon: Map,           label: 'Carte Interactive',   roles: ALL },
  { to: '/feed',                   icon: Newspaper,     label: "Fil d'Actualité",    roles: ALL },
  { to: '/campaigns',              icon: Megaphone,     label: 'Campagnes',          roles: ALL },
  { to: '/chat',                   icon: MessageSquare, label: 'Communauté',         roles: ALL },
  { to: '/innovations',            icon: Lightbulb,     label: 'Innovation Jeunes',  roles: ALL },
  { to: '/admin',                  icon: BarChart2,     label: 'Dashboard Admin',    roles: ['MODERATOR','EDITOR','DISTRICT_ADMIN','ADMIN','SUPERADMIN'] },
  { to: '/admin/users',            icon: Users,         label: 'Gestion Membres',    roles: ['DISTRICT_ADMIN','ADMIN','SUPERADMIN'] },
  { to: '/admin/provincial-admins',icon: MapPin,        label: 'Admins Provinciaux', roles: ['SUPERADMIN'] },
  { to: '/admin/district-admins',  icon: Building2,     label: 'Admins Districts',   roles: ['ADMIN','SUPERADMIN'] },
  { to: '/admin/territories',      icon: Layers,        label: 'Divisions Admin.',   roles: ['DISTRICT_ADMIN','ADMIN','SUPERADMIN'] },
  { to: '/profile',                icon: User,          label: 'Mon Profil',         roles: ALL },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar, onlineCount } = useUIStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch {}
    disconnectSocket();
    logout();
    navigate('/login');
    toast.success('Déconnexion réussie');
  };

  const allowedItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <aside className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-gray-900 transition-all duration-300
      ${sidebarOpen ? 'w-64' : 'w-16'}`}>

      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white text-xs font-bold leading-tight">Dynamique</p>
              <p className="text-gray-400 text-[10px]">Israël Mutombo</p>
            </div>
          </div>
        )}
        {!sidebarOpen && (
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mx-auto">
            <Shield size={16} className="text-white" />
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors ${!sidebarOpen ? 'hidden' : ''}`}
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Online indicator */}
      {sidebarOpen && (
        <div className="px-4 py-2 bg-green-900/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs">{onlineCount} en ligne</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {allowedItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group
              ${isActive
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      {user && (
        <div className="border-t border-gray-800 p-3">
          <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
            {user.avatar ? (
              <img src={user.avatar} alt={user.fullName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{getInitials(user.fullName)}</span>
              </div>
            )}
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{user.fullName}</p>
                <p className="text-gray-400 text-[10px] truncate">{user.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`mt-2 flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-xs
              ${sidebarOpen ? 'px-2 py-1.5' : 'w-full justify-center py-1.5'}`}
          >
            <LogOut size={14} />
            {sidebarOpen && 'Déconnexion'}
          </button>
        </div>
      )}
    </aside>
  );
};
