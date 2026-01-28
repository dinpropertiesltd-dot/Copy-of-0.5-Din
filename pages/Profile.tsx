
import React, { useState } from 'react';
import { User } from '../types';
import { 
  User as UserIcon, 
  Lock, 
  Phone, 
  Save, 
  CheckCircle, 
  ShieldCheck, 
  UserCircle,
  AlertCircle
} from 'lucide-react';

interface ProfileProps {
  user: User;
  onUpdate: (updatedUser: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate }) => {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [password, setPassword] = useState(user.password || 'password123');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccess(false);
    setIsError(false);

    if (!name.trim() || !phone.trim() || !password.trim()) {
      setIsError(true);
      return;
    }

    const updatedUser: User = {
      ...user,
      name,
      phone,
      password
    };

    onUpdate(updatedUser);
    setIsSuccess(true);
    
    setTimeout(() => setIsSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tighter">Security Profile</h2>
          <p className="text-slate-400 font-bold mt-1 text-sm sm:text-base tracking-tight">Identity Management: {user.cnic}</p>
        </div>
        <div className="hidden sm:flex bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100 items-center gap-4">
          <ShieldCheck size={20} className="text-emerald-600" />
          <div className="text-left">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Profile Status</p>
            <p className="text-[11px] font-black text-emerald-600 uppercase">Authenticated & Verified</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-slate-900/20 mb-6">
              {user.name.charAt(0)}
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase">{user.name}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 mb-6">{user.role} TERMINAL</p>
            
            <div className="w-full space-y-4 pt-6 border-t border-slate-50">
               <div className="flex items-center justify-between">
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Login</span>
                 <span className="text-[10px] font-black text-slate-900">{new Date().toLocaleDateString('en-GB')}</span>
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Encryption</span>
                 <span className="text-[10px] font-black text-emerald-600">AES-256 Enabled</span>
               </div>
            </div>
          </div>

          <div className="bg-amber-50 rounded-[2rem] p-6 border border-amber-100">
             <div className="flex items-center gap-3 mb-4">
               <AlertCircle size={18} className="text-amber-600" />
               <h4 className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Security Advisory</h4>
             </div>
             <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
               Updating your profile info requires immediate re-synchronization with our master registry. Ensure your contact details are accurate for SMS notifications.
             </p>
          </div>
        </div>

        {/* Main Settings Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="p-8 sm:p-12">
              <form onSubmit={handleSubmit} className="space-y-8">
                {isSuccess && (
                  <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-4 text-emerald-700 animate-in zoom-in duration-300">
                    <CheckCircle size={24} className="text-emerald-500" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">Update Successful</p>
                      <p className="text-[10px] font-bold opacity-80 mt-0.5">Your profile registry has been synchronized across all nodes.</p>
                    </div>
                  </div>
                )}

                {isError && (
                  <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 text-rose-700 animate-in shake duration-300">
                    <AlertCircle size={24} className="text-rose-500" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">Registry Error</p>
                      <p className="text-[10px] font-bold opacity-80 mt-0.5">Please ensure all required identity fields are populated.</p>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                      <UserCircle size={14} /> Full Identity Name
                    </label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none focus:ring-8 focus:ring-slate-900/5 transition-all"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                      <Phone size={14} /> Registered Cell Number
                    </label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-8 focus:ring-slate-900/5 transition-all"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                      <Lock size={14} /> Security Password
                    </label>
                    <div className="relative">
                      <input 
                        type="password"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-8 focus:ring-slate-900/5 transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold px-1 italic">Use a strong alphanumeric string for maximum security.</p>
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-black text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 flex items-center justify-center gap-4 transition-all active:scale-95"
                  >
                    <Save size={18} /> Update Profile Registry
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
