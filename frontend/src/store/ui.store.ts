import { create } from 'zustand';
import { Notification } from '@/types';

interface UIState {
  sidebarOpen: boolean;
  notificationCount: number;
  onlineCount: number;
  notifications: Notification[];
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setNotificationCount: (count: number) => void;
  setOnlineCount: (count: number) => void;
  addNotification: (notification: Notification) => void;
  setNotifications: (notifications: Notification[]) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  notificationCount: 0,
  onlineCount: 0,
  notifications: [],
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setNotificationCount: (count) => set({ notificationCount: count }),
  setOnlineCount: (count) => set({ onlineCount: count }),
  addNotification: (notification) =>
    set((s) => ({
      notifications: [notification, ...s.notifications].slice(0, 50),
      notificationCount: s.notificationCount + 1,
    })),
  setNotifications: (notifications) => set({ notifications }),
}));
