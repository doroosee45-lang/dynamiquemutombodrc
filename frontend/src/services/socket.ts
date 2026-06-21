import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

let socket: Socket | null = null;

export const getSocket = (): Socket | null => socket;

export const connectSocket = (): Socket => {
  const token = useAuthStore.getState().accessToken;
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => console.log('Socket connected'));
  socket.on('disconnect', () => console.log('Socket disconnected'));

  socket.on('online_count', (count: number) => {
    useUIStore.getState().setOnlineCount(count);
  });

  socket.on('notification:new', (notification) => {
    useUIStore.getState().addNotification(notification);
  });

  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const joinRoom = (room: string) => socket?.emit('join_room', room);
export const leaveRoom = (room: string) => socket?.emit('leave_room', room);

export const sendGlobalMessage = (content: string) =>
  socket?.emit('chat:global', { content });

export const sendGroupMessage = (content: string, groupId: string) =>
  socket?.emit('chat:group', { content, groupId });

export const sendDirectMessage = (content: string, receiverId: string) =>
  socket?.emit('chat:direct', { content, receiverId });

export const sendTyping = (room: string, isTyping: boolean) =>
  socket?.emit('typing', { room, isTyping });
