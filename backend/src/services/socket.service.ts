import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../models/User.model';
import { Message } from '../models/Message.model';
import { Notification } from '../models/Notification.model';
import { logger } from '../utils/logger';
import { config } from '../config';
import { Types } from 'mongoose';

interface SocketUser { userId: string; role: string; province?: string }

const onlineUsers = new Map<string, string>();

export const initSocket = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: [config.frontendUrl, 'http://localhost:5174', 'http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = verifyAccessToken(token);
      (socket.data as SocketUser) = payload as SocketUser;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data as SocketUser;
    onlineUsers.set(socket.id, user.userId);
    socket.join(`user:${user.userId}`);
    if (user.province) socket.join(`province:${user.province}`);
    socket.join('global');
    io.emit('online_count', onlineUsers.size);
    logger.info(`Socket connected: ${user.userId}`);

    socket.on('join_room', (room: string) => socket.join(room));
    socket.on('leave_room', (room: string) => socket.leave(room));

    socket.on('chat:global', async (data: { content: string }) => {
      try {
        if (!data.content?.trim() || data.content.length > 1000) return;
        const [sender, msg] = await Promise.all([
          User.findById(user.userId).select('fullName avatar role').lean(),
          Message.create({ content: data.content.trim(), type: 'GLOBAL', sender: new Types.ObjectId(user.userId) }),
        ]);
        io.to('global').emit('chat:message', { ...msg.toObject(), sender, room: 'global' });
      } catch (err) { logger.error('Chat global error', err); }
    });

    socket.on('chat:group', async (data: { content: string; groupId: string }) => {
      try {
        if (!data.content?.trim() || !data.groupId) return;
        const [sender, msg] = await Promise.all([
          User.findById(user.userId).select('fullName avatar role').lean(),
          Message.create({ content: data.content.trim(), type: 'GROUP', groupId: data.groupId, sender: new Types.ObjectId(user.userId) }),
        ]);
        io.to(`group:${data.groupId}`).emit('chat:message', { ...msg.toObject(), sender, room: data.groupId });
      } catch (err) { logger.error('Chat group error', err); }
    });

    socket.on('chat:direct', async (data: { content: string; receiverId: string }) => {
      try {
        if (!data.content?.trim() || !data.receiverId) return;
        const sender = await User.findById(user.userId).select('fullName avatar').lean();
        const msg = await Message.create({
          content: data.content.trim(),
          type: 'DIRECT',
          sender: new Types.ObjectId(user.userId),
          receiverId: new Types.ObjectId(data.receiverId),
        });
        const notif = await Notification.create({
          userId: new Types.ObjectId(data.receiverId),
          title: `Message de ${sender?.fullName ?? 'Membre'}`,
          body: data.content.slice(0, 100),
          type: 'DIRECT_MESSAGE',
          data: { messageId: msg._id, senderId: user.userId },
        });
        io.to(`user:${data.receiverId}`).emit('chat:message', { ...msg.toObject(), sender });
        io.to(`user:${data.receiverId}`).emit('notification:new', notif);
      } catch (err) { logger.error('Chat direct error', err); }
    });

    socket.on('typing', (data: { room: string; isTyping: boolean }) => {
      socket.to(data.room).emit('typing', { userId: user.userId, isTyping: data.isTyping });
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      io.emit('online_count', onlineUsers.size);
      logger.info(`Socket disconnected: ${user.userId}`);
    });
  });

  return io;
};

export const sendNotificationToUser = (io: Server, userId: string, notification: unknown) =>
  io.to(`user:${userId}`).emit('notification:new', notification);

export const sendProvinceAlert = (io: Server, province: string, alert: unknown) =>
  io.to(`province:${province}`).emit('alert:province', alert);

export const sendGlobalAlert = (io: Server, alert: unknown) =>
  io.to('global').emit('alert:global', alert);
