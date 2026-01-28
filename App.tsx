
import React, { useState, useEffect, useCallback } from 'react';
import { User, PropertyFile, Message, Notice } from './types';
import { MOCK_USERS, MOCK_FILES, MOCK_NOTICES, MOCK_MESSAGES } from './data';
import { supabase, authProvider, normalizeCNIC } from './supabase';
import { 
  LayoutDashboard, 
  Mail, 
  LogOut, 
  Menu, 
  Settings,
  ShieldCheck,
  Home,
  FileText,
  User as UserIcon,
  Loader2,
  Database
} from 'lucide-react';

// Components
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import AccountStatement from './pages/AccountStatement';
import PublicNotices from './pages/PublicNotices';
import Inbox from './pages/Inbox';
import AdminPortal from './pages/AdminPortal';
import PropertyPortal from './pages/PropertyPortal';
import AIChatAssistant from './pages/AIChatAssistant';
import Profile from './pages/Profile';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [allFiles, setAllFiles] = useState<PropertyFile[]>(MOCK_FILES);
  const [userFiles, setUserFiles] = useState<PropertyFile[]>([]);
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<PropertyFile | null>(null);
  const [notices, setNotices] = useState<Notice[]>(MOCK_NOTICES);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [isLocalDataPinned, setIsLocalDataPinned] = useState(false);

  const syncPropertyRecords = useCallback(async (cnic: string, role: string) => {
    if (isLocalDataPinned) return;
    try {
      if (role === 'ADMIN') {
        const { data, error } = await authProvider.fetchAllFiles();
        if (!error && data && data.length > 0) {
          setAllFiles(data);
        }
        return;
      }
      const { data, error } = await authProvider.fetchUserFiles(cnic);
      if (!error && data) {
        setUserFiles(data);
      }
    } catch (e) {
      console.warn("Registry Sync Suspended. Falling back to local cache.");
    }
  }, [isLocalDataPinned]);

  useEffect(() => {
    const initAuth = async () => {
      const session = await authProvider.getSession();
      const wasAuthorized = sessionStorage.getItem('din_authorized') === 'true';

      if (session?.user && wasAuthorized) {
        setIsAuthorized(true);
        await handleAuthSuccess(session.user);
      } else {
        setIsLoading(false);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user && sessionStorage.getItem('din_authorized') === 'true') {
          setIsAuthorized(true);
          await handleAuthSuccess(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAuthorized(false);
          sessionStorage.removeItem('din_authorized');
          setUserFiles([]);
          setIsLoading(false);
          setIsLocalDataPinned(false);
        }
      });
      return () => subscription.unsubscribe();
    };
    initAuth();
  }, [syncPropertyRecords]);

  const handleAuthSuccess = async (supabaseUser: any) => {
    setIsLoading(true);
    const { data: profile } = await authProvider.getProfile(supabaseUser.id);
    const loggedInUser: User = {
      id: supabaseUser.id,
      name: profile?.name || supabaseUser.user_metadata?.name || 'Member',
      email: supabaseUser.email || '',
      cnic: profile?.cnic || supabaseUser.user_metadata?.cnic || 'PENDING',
      phone: profile?.phone || supabaseUser.user_metadata?.phone || '',
      role: (profile?.role || supabaseUser.user_metadata?.role || 'CLIENT') as any,
      status: 'Active'
    };
    setUser(loggedInUser);
    await syncPropertyRecords(loggedInUser.cnic, loggedInUser.role);
    setIsLoading(false);
  };

  const handleFinalAuthorization = (finalUser: User) => {
    sessionStorage.setItem('din_authorized', 'true');
    setIsAuthorized(true);
    setUser(finalUser);
    syncPropertyRecords(finalUser.cnic, finalUser.role);
  };

  const handleLogout = async () => {
    await authProvider.signOut();
  };

  const handleImportDatabase = (data: { users: User[], files: PropertyFile[] }, isDestructive: boolean = false) => {
    setIsLocalDataPinned(true); 
    if (isDestructive) {
      setUsers(data.users);
      setAllFiles(data.files);
    }
  };

  const handleResetDatabase = () => {
    if (window.confirm("Purge imported registry? Dashboard will revert to official cloud records.")) {
      setUsers(MOCK_USERS);
      setAllFiles(MOCK_FILES);
      setIsLocalDataPinned(false);
      if (user) syncPropertyRecords(user.cnic, user.role);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
      <Loader2 className="text-emerald-500 animate-spin mb-8" size={60} />
      <h2 className="text-white font-black uppercase tracking-[0.4em] text-xs">Registry Node Sync</h2>
      <p className="text-slate-500 text-[10px] font-bold uppercase mt-3 tracking-widest">Authenticated Session Establishing...</p>
    </div>
  );

  if (!user || !isAuthorized) {
    return <LoginPage onLogin={handleFinalAuthorization} users={users} onRegister={() => {}} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'property', label: 'Inventory', icon: Home, hidden: user.role !== 'ADMIN' },
    { id: 'notices', label: 'Policies', icon: ShieldCheck },
    { id: 'inbox', label: 'Security Mail', icon: Mail },
    { id: 'profile', label: 'ID Settings', icon: UserIcon },
    { id: 'admin', label: 'Terminal', icon: Settings, hidden: user.role !== 'ADMIN' },
  ].filter(i => !i.hidden);

  return (
    <div className="flex min-h-screen bg-slate-50 relative overflow-x-hidden text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-8 border-b font-black text-xl tracking-tighter text-slate-900 uppercase">DIN PORTAL</div>
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => { setCurrentPage(item.id); setSelectedFile(null); setIsSidebarOpen(false); }} 
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${currentPage === item.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50'}`}>
                <item.icon size={20} /> <span className="flex-1 text-left">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-6 border-t">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black text-red-600 hover:bg-red-50 transition-colors"><LogOut size={20} /> Terminate</button>
          </div>
        </div>
      </aside>
      <main className={`flex-1 flex flex-col min-w-0 lg:pl-72`}>
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b h-20 flex items-center px-4 lg:px-8 justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 text-slate-900"><Menu size={24} /></button>
            {isLocalDataPinned && <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase border border-indigo-100">Local Cache Mode</div>}
          </div>
          <div className="flex-1 flex justify-end items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase border border-emerald-100">Session Secure</div>
            <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-black">{user.name.charAt(0)}</div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-10">
          {selectedFile ? (
            <AccountStatement file={selectedFile} onBack={() => setSelectedFile(null)} />
          ) : (
            <>
              {currentPage === 'dashboard' && <Dashboard onSelectFile={setSelectedFile} files={user.role === 'ADMIN' ? allFiles : userFiles} userName={user.name} />}
              {currentPage === 'property' && <PropertyPortal allFiles={allFiles} setAllFiles={setAllFiles} onPreviewStatement={setSelectedFile} isLocalDataPinned={isLocalDataPinned} />}
              {currentPage === 'notices' && <PublicNotices notices={notices} />}
              {currentPage === 'inbox' && <Inbox messages={messages} setMessages={setMessages} currentUser={user} onSendMessage={(msg) => setMessages(prev => [...prev, msg])} users={users} />}
              {currentPage === 'profile' && <Profile user={user} onUpdate={(u) => setUser(u)} />}
              {currentPage === 'admin' && <AdminPortal users={users} setUsers={setUsers} notices={notices} setNotices={setNotices} allFiles={allFiles} setAllFiles={setAllFiles} messages={messages} onSendMessage={(msg) => setMessages(prev => [...prev, msg])} onImportFullDatabase={handleImportDatabase} onResetDatabase={handleResetDatabase} isLocalDataPinned={isLocalDataPinned} />}
            </>
          )}
        </div>
      </main>
      <AIChatAssistant currentUser={user} userFiles={userFiles} allFiles={allFiles} />
    </div>
  );
};

export default App;
