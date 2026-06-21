import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue: { resolve: (v: string) => void; reject: (e: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token!));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken } = res.data;
        useAuthStore.getState().setAccessToken(accessToken);
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data: Record<string, unknown>) => api.post('/auth/register', data),
  login: (data: Record<string, unknown>) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  verifyEmail: (token: string) => api.get(`/auth/verify-email?token=${token}`),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  updateProfile: (data: FormData) => api.put('/auth/profile', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  setup2FA: () => api.post('/auth/2fa/setup'),
  verify2FA: (code: string) => api.post('/auth/2fa/verify', { code }),
  disable2FA: () => api.post('/auth/2fa/disable'),
};

// Reports
export const reportsAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/reports', { params }),
  getById: (id: string) => api.get(`/reports/${id}`),
  create: (data: FormData) => api.post('/reports', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateStatus: (id: string, status: string, note?: string) => api.patch(`/reports/${id}/status`, { status, note }),
  vote: (id: string) => api.post(`/reports/${id}/vote`),
  addComment: (id: string, content: string, parentId?: string) => api.post(`/reports/${id}/comments`, { content, parentId }),
  getMapData: (params?: Record<string, unknown>) => api.get('/reports/map', { params }),
  getHeatmap: (params?: Record<string, unknown>) => api.get('/reports/heatmap', { params }),
  getStats: (params?: Record<string, unknown>) => api.get('/reports/stats', { params }),
};

// Publications
export const publicationsAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/publications', { params }),
  getById: (id: string) => api.get(`/publications/${id}`),
  create: (data: FormData) => api.post('/publications', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, data: Record<string, unknown>) => api.put(`/publications/${id}`, data),
  delete: (id: string) => api.delete(`/publications/${id}`),
  addComment: (id: string, content: string) => api.post(`/publications/${id}/comments`, { content }),
};

// Campaigns
export const campaignsAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/campaigns', { params }),
  getById: (id: string) => api.get(`/campaigns/${id}`),
  create: (data: FormData) => api.post('/campaigns', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  join: (id: string) => api.post(`/campaigns/${id}/join`),
  signPetition: (petitionId: string) => api.post(`/campaigns/petitions/${petitionId}/sign`),
};

// Innovations
export const innovationsAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/innovations', { params }),
  submit: (data: FormData) => api.post('/innovations', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  vote: (id: string) => api.post(`/innovations/${id}/vote`),
  validate: (id: string) => api.patch(`/innovations/${id}/validate`),
};

// Admin
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getProvinceDashboard: (province: string) => api.get(`/admin/province/${province}`),
  getDistrictDashboard: (district: string) => api.get(`/admin/district/${district}`),
  getUsers: (params?: Record<string, unknown>) => api.get('/admin/users', { params }),
  updateUser: (id: string, data: Record<string, unknown>) => api.patch(`/admin/users/${id}`, data),
  getPendingComments: () => api.get('/admin/comments/pending'),
  moderateComment: (id: string, action: string) => api.patch(`/admin/comments/${id}/moderate`, { action }),
  exportReports: (params?: Record<string, unknown>) => api.get('/admin/reports/export', { params }),
  broadcast: (data: Record<string, unknown>) => api.post('/admin/notifications/broadcast', data),
  // Provincial Admins
  getProvincialAdmins: () => api.get('/admin/provincial-admins'),
  createProvincialAdmin: (data: Record<string, unknown>) => api.post('/admin/provincial-admins', data),
  updateProvincialAdmin: (id: string, data: Record<string, unknown>) => api.patch(`/admin/provincial-admins/${id}`, data),
  deleteProvincialAdmin: (id: string) => api.delete(`/admin/provincial-admins/${id}`),
  resetProvincialAdminPassword: (id: string, password: string) => api.post(`/admin/provincial-admins/${id}/reset-password`, { password }),
  // District Admins
  getDistrictAdmins: (province?: string) => api.get('/admin/district-admins', { params: province ? { province } : {} }),
  createDistrictAdmin: (data: Record<string, unknown>) => api.post('/admin/district-admins', data),
  updateDistrictAdmin: (id: string, data: Record<string, unknown>) => api.patch(`/admin/district-admins/${id}`, data),
  deleteDistrictAdmin: (id: string) => api.delete(`/admin/district-admins/${id}`),
  resetDistrictAdminPassword: (id: string, password: string) => api.post(`/admin/district-admins/${id}/reset-password`, { password }),
  // Members
  getMemberStats: () => api.get('/admin/users/stats'),
  createMember: (data: Record<string, unknown>) => api.post('/admin/users', data),
};

// Territories
export const territoriesAPI = {
  list: (params?: Record<string, unknown>) => api.get('/territories', { params }),
  stats: (province?: string) => api.get(province ? `/territories/stats/${province}` : '/territories/stats'),
  ancestors: (id: string) => api.get(`/territories/${id}/ancestors`),
  create: (data: Record<string, unknown>) => api.post('/territories', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/territories/${id}`, data),
  delete: (id: string) => api.delete(`/territories/${id}`),
};

// Events (public)
export const eventsAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/events', { params }),
  getById: (id: string) => api.get(`/events/${id}`),
  create: (data: Record<string, unknown>) => api.post('/events', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
};

// Newsletter & Contact (public — no auth)
export const newsletterAPI = {
  subscribe: (email: string) => api.post('/newsletter/subscribe', { email }),
  unsubscribe: (token: string) => api.get(`/newsletter/unsubscribe/${token}`),
  contact: (data: Record<string, unknown>) => api.post('/newsletter/contact', data),
  getSubscribers: () => api.get('/newsletter/subscribers'),
  getContactMessages: () => api.get('/newsletter/contacts'),
  markContactRead: (id: string) => api.patch(`/newsletter/contacts/${id}/read`),
};

// Join Requests (public)
export const joinAPI = {
  submit: (data: Record<string, unknown>) => api.post('/join', data),
  list:   (params?: Record<string, unknown>) => api.get('/join', { params }),
  review: (id: string, data: Record<string, unknown>) => api.patch(`/join/${id}`, data),
};

// Notifications
export const notificationsAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/notifications', { params }),
  markAsRead: (ids?: string[]) => api.put('/notifications/read', { ids }),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};
