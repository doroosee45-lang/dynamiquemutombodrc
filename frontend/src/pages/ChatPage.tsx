import React, { useState, useEffect, useRef } from 'react';
import { Send, Hash, Globe, Users } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getSocket, connectSocket, sendGlobalMessage, sendGroupMessage, joinRoom } from '@/services/socket';
import { getInitials, timeAgo } from '@/utils/helpers';
import { THEMATIC_GROUPS } from '@/utils/constants';
import { Message } from '@/types';
import { useUIStore } from '@/store/ui.store';

const ROOMS = [
  { id: 'global', label: 'Canal Global', icon: Globe, type: 'global' as const },
  ...THEMATIC_GROUPS.map(g => ({ id: g.id, label: g.label, icon: Hash, type: 'group' as const })),
];

export const ChatPage: React.FC = () => {
  const { user } = useAuthStore();
  const { onlineCount } = useUIStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [activeRoom, setActiveRoom] = useState(ROOMS[0]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socket = getSocket() || connectSocket();

  useEffect(() => {
    setMessages([]);
    if (activeRoom.type === 'group') joinRoom(`group:${activeRoom.id}`);
    else joinRoom('global');
  }, [activeRoom]);

  useEffect(() => {
    if (!socket) return;

    const handler = (msg: Message & { room?: string }) => {
      if (
        (activeRoom.type === 'global' && !msg.groupId) ||
        (activeRoom.type === 'group' && msg.groupId === activeRoom.id)
      ) {
        setMessages(prev => [...prev.slice(-200), msg]);
      }
    };

    socket.on('chat:message', handler);
    return () => { socket.off('chat:message', handler); };
  }, [socket, activeRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (activeRoom.type === 'global') sendGlobalMessage(input.trim());
    else sendGroupMessage(input.trim(), activeRoom.id);

    setInput('');
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Rooms sidebar */}
      <div className="w-56 flex-shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-sm">Communauté</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs text-gray-500">{onlineCount} en ligne</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {ROOMS.map(room => (
            <button key={room.id}
              onClick={() => setActiveRoom(room)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors
                ${activeRoom.id === room.id ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>
              <room.icon size={14} className="flex-shrink-0" />
              <span className="truncate">{room.label}</span>
            </button>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
          <p>Messagerie modérée</p>
          <p>Respect des valeurs Dynamique</p>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <activeRoom.icon size={16} className="text-primary-600" />
          <span className="font-semibold text-gray-800">{activeRoom.label}</span>
          {activeRoom.id === 'global' && (
            <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
              <Users size={12} /> {onlineCount} membres connectés
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                <activeRoom.icon size={20} className="text-gray-300" />
              </div>
              <p className="text-sm">Soyez le premier à écrire dans {activeRoom.label}</p>
            </div>
          )}
          {messages.map((msg) => {
            const isOwn = msg.sender?.id === user?.id;
            return (
              <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                {msg.sender?.avatar ? (
                  <img src={msg.sender.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white
                    ${isOwn ? 'bg-primary-600' : 'bg-gray-400'}`}>
                    {getInitials(msg.sender?.fullName || '?')}
                  </div>
                )}
                <div className={`max-w-xs lg:max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  {!isOwn && <p className="text-xs text-gray-400 px-1">{msg.sender?.fullName}</p>}
                  <div className={`px-3 py-2 rounded-2xl text-sm
                    ${isOwn
                      ? 'bg-primary-600 text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                    {msg.content}
                  </div>
                  <p className="text-[10px] text-gray-400 px-1">{timeAgo(msg.createdAt)}</p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-100 flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Message dans ${activeRoom.label}...`}
            maxLength={1000}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button type="submit" disabled={!input.trim()}
            className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 transition-colors">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
