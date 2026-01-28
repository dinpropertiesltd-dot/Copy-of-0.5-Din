
import React, { useState } from 'react';
import { Notice } from '../types';
import { ShieldCheck, ChevronRight, Calendar, ExternalLink, Bell } from 'lucide-react';

interface PublicNoticesProps {
  notices: Notice[];
}

const PublicNotices: React.FC<PublicNoticesProps> = ({ notices }) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Public' | 'Policy' | 'Alert'>('All');

  const filteredNotices = notices.filter(n => activeTab === 'All' || n.type === activeTab);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">NOTICES & POLICIES</h2>
          <p className="text-slate-500 font-medium">Official verified updates from the management of DIN Properties.</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm self-start">
          {['All', 'Public', 'Policy', 'Alert'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredNotices.map((notice) => (
          <div key={notice.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all group">
            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                notice.type === 'Policy' ? 'bg-blue-600 text-white shadow-blue-600/20' : 
                notice.type === 'Alert' ? 'bg-red-600 text-white shadow-red-600/20' : 
                'bg-emerald-600 text-white shadow-emerald-600/20'
              }`}>
                {notice.type === 'Alert' ? <Bell size={28} /> : <ShieldCheck size={28} />}
              </div>
              
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${
                    notice.type === 'Policy' ? 'bg-blue-100 text-blue-700' : 
                    notice.type === 'Alert' ? 'bg-red-100 text-red-700' : 
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {notice.type} UPDATED
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[11px]">
                    <Calendar size={14} />
                    {notice.date}
                  </div>
                </div>
                
                <h3 className="text-xl font-black text-slate-900 mb-3 group-hover:text-emerald-600 transition-colors leading-tight">
                  {notice.title}
                </h3>
                
                <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">
                  {notice.content}
                </p>
                
                <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                  <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors">
                    Access Documents
                    <ExternalLink size={14} />
                  </button>
                  <ChevronRight size={20} className="text-slate-200 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredNotices.length === 0 && (
          <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} className="text-slate-200" />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No notifications in this category</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicNotices;
