import React, { useState } from 'react';
import { Bell, Menu, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { getInitials, timeAgo } from '@/utils/helpers';
import { notificationsAPI } from '@/services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const TopBar: React.FC = () => {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => notificationsAPI.getAll({ unread: 'true', limit: '10' }).then(r => r.data),
    refetchInterval: 30000,
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: () => notificationsAPI.markAsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications-count'] }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/reports?search=${encodeURIComponent(search)}`);
  };

  return (
    <header className={`
      fixed top-0 right-0 z-20 bg-white border-b border-gray-200 shadow-sm h-14
      transition-all duration-300
      left-0
      ${sidebarOpen ? 'lg:left-64' : 'lg:left-16'}
    `}>
      <div className="h-full flex items-center justify-between px-3 lg:px-4 gap-2 lg:gap-4">

        {/* Left: hamburger + search */}
        <div className="flex items-center gap-2 lg:gap-3 min-w-0">
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0"
            aria-label="Menu"
          >
            <Menu size={20} />
          </button>

          <form onSubmit={handleSearch} className="hidden sm:flex items-center">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg w-44 lg:w-64
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </form>
        </div>

        {/* Right: motto + notifications + avatar */}
        <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
          <p className="hidden xl:block text-[10px] text-gray-400 italic">
            Unité · Résistance · Discipline · Loyauté · Engagement
          </p>

          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) markRead.mutate(); }}
              className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {notifData?.unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notifData.unreadCount > 9 ? '9+' : notifData.unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-11 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  <button type="button" onClick={() => setNotifOpen(false)} className="p-1 hover:bg-gray-100 rounded" aria-label="Fermer">
                    <X size={14} />
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifData?.notifications?.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-6">Aucune notification</p>
                  ) : (
                    notifData?.notifications?.map((n: { id: string; title: string; body: string; isRead: boolean; createdAt: string }) => (
                      <div key={n.id} className={`px-4 py-3 border-b hover:bg-gray-50 cursor-pointer ${!n.isRead ? 'bg-blue-50' : ''}`}>
                        <p className="text-sm font-medium text-gray-800">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-3 border-t text-center">
                  <button
                    type="button"
                    onClick={() => { navigate('/notifications'); setNotifOpen(false); }}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Voir toutes les notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User avatar */}
          {user && (
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 hover:opacity-80"
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.fullName} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{getInitials(user.fullName)}</span>
                </div>
              )}
              <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[80px] lg:max-w-[100px] truncate">
                {user.fullName.split(' ')[0]}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
