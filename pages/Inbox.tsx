
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Message, User } from '../types';
import { 
  Search, 
  Send, 
  MoreVertical, 
  Smile, 
  CheckCheck, 
  ShieldCheck, 
  User as UserIcon,
  ArrowLeft,
  Circle,
  Plus,
  X,
  UserPlus
} from 'lucide-react';

interface InboxProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  currentUser: User;
  onSendMessage: (msg: Message) => void;
  users: User[];
  initialPartnerId?: string | null;
}

const Inbox: React.FC<InboxProps> = ({ messages, setMessages, currentUser, onSendMessage, users, initialPartnerId }) => {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialPartnerId || null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [clientSearchText, setClientSearchText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversations = useMemo(() => {
    const groups: Record<string, { user: Partial<User>, lastMessage: Message, unreadCount: number, messages: Message[] }> = {};
    messages.forEach(msg => {
      let otherId = '';
      let otherName = '';
      if (currentUser.role === 'ADMIN') {
        otherId = msg.senderId === 'admin' ? msg.receiverId : msg.senderId;
        const foundUser = users.find(u => u.id === otherId);
        otherName = foundUser ? foundUser.name : (msg.senderId === 'admin' ? 'System' : msg.senderName);
      } else {
        otherId = 'admin';
        otherName = 'DIN Support';
      }
      if (otherId === 'ALL' && currentUser.role !== 'ADMIN') return;
      if (otherId === currentUser.id) return;
      if (!groups[otherId]) {
        groups[otherId] = {
          user: { id: otherId, name: otherName },
          lastMessage: msg,
          unreadCount: 0,
          messages: []
        };
      }
      groups[otherId].messages.push(msg);
      if (new Date(msg.date) >= new Date(groups[otherId].lastMessage.date)) {
        groups[otherId].lastMessage = msg;
      }
      if (!msg.isRead && msg.receiverId === currentUser.id) {
        groups[otherId].unreadCount++;
      }
    });
    return Object.values(groups).sort((a, b) => 
      new Date(b.lastMessage.date).getTime() - new Date(a.lastMessage.date).getTime()
    );
  }, [messages, currentUser, users]);

  useEffect(() => {
    if (initialPartnerId) {
      setActiveThreadId(initialPartnerId);
    } else if (currentUser.role === 'CLIENT' && !activeThreadId) {
      setActiveThreadId('admin');
    }
  }, [currentUser, initialPartnerId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeThreadId, messages]);

  const activeChatMessages = messages
    .filter(m => {
      if (!activeThreadId) return false;
      return (m.senderId === activeThreadId && m.receiverId === currentUser.id) || 
             (m.senderId === currentUser.id && m.receiverId === activeThreadId);
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeThreadId) return;
    const msg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId: activeThreadId,
      subject: 'Secure Transmission',
      body: newMessage,
      date: new Date().toISOString(),
      isRead: false,
      type: 'Direct'
    };
    onSendMessage(msg);
    setNewMessage('');
  };

  const markAsRead = (threadId: string) => {
    setMessages(prev => prev.map(m => 
      (m.senderId === threadId && m.receiverId === currentUser.id) ? { ...m, isRead: true } : m
    ));
  };

  const currentChatPartner = useMemo(() => {
    const conv = conversations.find(c => c.user.id === activeThreadId);
    if (conv) return conv.user;
    const foundUser = users.find(u => u.id === activeThreadId);
    if (foundUser) return foundUser;
    if (activeThreadId === 'admin') return { id: 'admin', name: 'DIN Support' };
    return null;
  }, [activeThreadId, conversations, users]);

  const filteredClients = users.filter(u => 
    u.role === 'CLIENT' && 
    (u.name.toLowerCase().includes(clientSearchText.toLowerCase()) || u.cnic.includes(clientSearchText))
  );

  return (
    <div className="h-[calc(100vh-14rem)] bg-white rounded-[3rem] shadow-2xl overflow-hidden flex border border-slate-200">
      {/* Thread List Sidebar */}
      <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 transition-all ${activeThreadId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-8 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Inbound</h2>
            {currentUser.role === 'ADMIN' && (
              <button 
                onClick={() => setIsSearchingClients(true)}
                className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-95"
              >
                <Plus size={24} />
              </button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Filter Registry..." 
              className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center text-slate-300">
              <UserIcon size={48} className="mb-4 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">No Active Channels</p>
            </div>
          ) : conversations
              .filter(c => c.user.name?.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((conv) => (
            <button
              key={conv.user.id}
              onClick={() => {
                setActiveThreadId(conv.user.id!);
                markAsRead(conv.user.id!);
              }}
              className={`w-full flex items-center gap-4 p-6 border-b border-slate-50 transition-all ${activeThreadId === conv.user.id ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
            >
              <div className="relative shrink-0">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg ${conv.user.id === 'admin' ? 'bg-emerald-600' : 'bg-slate-900'}`}>
                  {conv.user.name?.charAt(0)}
                </div>
                {conv.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-4 border-white">
                    {conv.unreadCount}
                  </div>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-black text-slate-900 text-xs uppercase truncate">{conv.user.name}</span>
                  <span className="text-[9px] font-black text-slate-400">
                    {new Date(conv.lastMessage.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'font-black text-slate-900' : 'font-medium text-slate-400'}`}>
                  {conv.lastMessage.senderId === currentUser.id ? 'You: ' : ''}{conv.lastMessage.body}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Message Viewport */}
      <div className={`flex-1 flex flex-col bg-[#f0f2f5] relative ${!activeThreadId ? 'hidden md:flex' : 'flex'}`}>
        {activeThreadId ? (
          <>
            <div className="p-6 bg-white border-b border-slate-200 flex items-center justify-between z-10 shadow-sm">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveThreadId(null)} className="md:hidden p-2 text-slate-400 hover:bg-slate-50 rounded-xl"><ArrowLeft size={24} /></button>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl ${activeThreadId === 'admin' ? 'bg-emerald-600' : 'bg-slate-900'}`}>
                  {currentChatPartner?.name?.charAt(0) || 'D'}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase text-xs leading-none">{currentChatPartner?.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Circle size={8} fill="currentColor" className="text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Secure Node Active</span>
                  </div>
                </div>
              </div>
              <MoreVertical size={24} className="text-slate-300 cursor-pointer hover:text-slate-900" />
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-6 z-10 custom-scrollbar scroll-smooth">
              <div className="flex justify-center mb-8">
                <span className="px-5 py-1.5 bg-white/80 backdrop-blur-md rounded-2xl text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border border-white shadow-sm">Transmission History Verified</span>
              </div>

              {activeChatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`max-w-[85%] sm:max-w-[70%] p-4 rounded-2xl shadow-sm relative ${msg.senderId === currentUser.id ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none border border-slate-100'}`}>
                    <p className="text-sm font-medium leading-relaxed">{msg.body}</p>
                    <div className={`flex items-center justify-end gap-2 mt-2 ${msg.senderId === currentUser.id ? 'text-slate-400' : 'text-slate-300'}`}>
                      <span className="text-[9px] font-black uppercase">{new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.senderId === currentUser.id && <CheckCheck size={14} className={msg.isRead ? 'text-emerald-400' : ''} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-white border-t border-slate-200 z-10">
              <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-center gap-4 bg-slate-50 p-3 rounded-[2.5rem] border border-slate-100 focus-within:ring-8 focus-within:ring-slate-900/5 transition-all">
                <button type="button" className="p-2 text-slate-300 hover:text-slate-900"><Smile size={28} /></button>
                <input 
                  type="text" 
                  placeholder="Type secure data..." 
                  className="flex-1 py-3 px-2 text-sm font-bold outline-none bg-transparent"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-90 disabled:opacity-20"
                >
                  <Send size={24} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-300">
            <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl border border-white">
              <ShieldCheck size={48} className="text-emerald-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Encrypted Message Node</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-3">Select Identity to Synchronize</p>
          </div>
        )}
      </div>

      {/* New Transmission Dialog */}
      {isSearchingClients && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
          <div className="bg-white rounded-[3.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-500 border border-white/20">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-600/30"><UserPlus size={28} /></div>
                <div><h3 className="text-2xl font-black uppercase tracking-tight">Initiate Transmission</h3><p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-0.5">Verified Client Registry Search</p></div>
              </div>
              <button onClick={() => setIsSearchingClients(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={32} /></button>
            </div>
            <div className="p-10">
              <div className="relative mb-8">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Enter Name or CNIC..." 
                  className="w-full pl-16 pr-8 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-black uppercase outline-none focus:ring-8 focus:ring-slate-900/5 transition-all"
                  value={clientSearchText}
                  onChange={e => setClientSearchText(e.target.value)}
                />
              </div>
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-3 pr-4">
                {filteredClients.map(u => (
                  <button 
                    key={u.id}
                    onClick={() => {
                      setActiveThreadId(u.id);
                      setIsSearchingClients(false);
                      setClientSearchText('');
                    }}
                    className="w-full flex items-center gap-6 p-6 hover:bg-slate-50 rounded-3xl border border-transparent hover:border-slate-100 transition-all group"
                  >
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 text-xl group-hover:bg-slate-900 group-hover:text-white transition-all">{u.name.charAt(0)}</div>
                    <div className="text-left">
                      <p className="font-black text-sm uppercase text-slate-900">{u.name}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">CNIC: {u.cnic}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inbox;
