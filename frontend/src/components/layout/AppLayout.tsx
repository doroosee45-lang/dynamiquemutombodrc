import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { connectSocket } from '@/services/socket';

export const AppLayout: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, closeSidebar } = useUIStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
    else connectSocket();
  }, [isAuthenticated, navigate]);

  // Start closed on mobile, open on desktop
  useEffect(() => {
    const init = () => setSidebarOpen(window.innerWidth >= 1024);
    init();
    window.addEventListener('resize', init);
    return () => window.removeEventListener('resize', init);
  }, [setSidebarOpen]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <Sidebar />
      <TopBar />

      <main className={`pt-14 min-h-screen transition-all duration-300
        ml-0 lg:${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
