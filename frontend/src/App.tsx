import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AppLayout } from './components/layout/AppLayout';
import { PageLoader } from './components/ui/LoadingSpinner';
import { useAuthStore } from './store/auth.store';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReportsPage } from './pages/ReportsPage';
import { NewReportPage } from './pages/NewReportPage';
import { ReportDetailPage } from './pages/ReportDetailPage';
import { MapPage } from './pages/MapPage';
import { FeedPage } from './pages/FeedPage';
import { NewPublicationPage } from './pages/NewPublicationPage';
import { PublicationDetailPage } from './pages/PublicationDetailPage';
import { ChatPage } from './pages/ChatPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { NewCampaignPage } from './pages/NewCampaignPage';
import { InnovationsPage } from './pages/InnovationsPage';
import { NewInnovationPage } from './pages/NewInnovationPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { UsersPage } from './pages/admin/UsersPage';
import { ProvincialAdminsPage } from './pages/admin/ProvincialAdminsPage';
import { DistrictAdminsPage } from './pages/admin/DistrictAdminsPage';
import { TerritoirePage } from './pages/admin/TerritoirePage';
import { SangoPage } from './pages/SangoPage';
import { JoinPage } from './pages/JoinPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute: React.FC<{ element: React.ReactElement; roles?: string[] }> = ({ element, roles }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return element;
};

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { fontSize: '14px', borderRadius: '12px' },
          success: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<SangoPage />} />
          <Route path="/rejoindre" element={<JoinPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Protected routes */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<ProtectedRoute element={<DashboardPage />} />} />
            <Route path="/reports" element={<ProtectedRoute element={<ReportsPage />} />} />
            <Route path="/reports/new" element={<ProtectedRoute element={<NewReportPage />} />} />
            <Route path="/reports/:id" element={<ProtectedRoute element={<ReportDetailPage />} />} />
            <Route path="/map" element={<ProtectedRoute element={<MapPage />} />} />
            <Route path="/feed" element={<ProtectedRoute element={<FeedPage />} />} />
            <Route path="/feed/new" element={<ProtectedRoute element={<NewPublicationPage />} roles={['EDITOR', 'ADMIN', 'SUPERADMIN']} />} />
            <Route path="/feed/:id" element={<ProtectedRoute element={<PublicationDetailPage />} />} />
            <Route path="/chat" element={<ProtectedRoute element={<ChatPage />} />} />
            <Route path="/campaigns" element={<ProtectedRoute element={<CampaignsPage />} />} />
            <Route path="/campaigns/new" element={<ProtectedRoute element={<NewCampaignPage />} roles={['EDITOR', 'ADMIN', 'SUPERADMIN']} />} />
            <Route path="/innovations" element={<ProtectedRoute element={<InnovationsPage />} />} />
            <Route path="/innovations/new" element={<ProtectedRoute element={<NewInnovationPage />} />} />
            <Route path="/profile" element={<ProtectedRoute element={<ProfilePage />} />} />
            <Route path="/admin" element={<ProtectedRoute element={<AdminDashboardPage />} roles={['MODERATOR', 'EDITOR', 'ADMIN', 'SUPERADMIN']} />} />
            <Route path="/admin/users" element={<ProtectedRoute element={<UsersPage />} roles={['ADMIN', 'SUPERADMIN']} />} />
            <Route path="/admin/provincial-admins" element={<ProtectedRoute element={<ProvincialAdminsPage />} roles={['SUPERADMIN']} />} />
            <Route path="/admin/district-admins" element={<ProtectedRoute element={<DistrictAdminsPage />} roles={['ADMIN', 'SUPERADMIN']} />} />
            <Route path="/admin/territories" element={<ProtectedRoute element={<TerritoirePage />} roles={['ADMIN', 'SUPERADMIN', 'DISTRICT_ADMIN']} />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
