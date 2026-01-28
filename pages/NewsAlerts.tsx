
import React, { useState } from 'react';
import { Bell, Calendar, ChevronDown, ChevronUp, Clock } from 'lucide-react';

const NewsAlerts: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const alerts = [
    {
      id: '1',
      title: 'International Office (London) - Relocation Notice',
      date: '23-Apr-2024',
      preview: 'We have moved our office to a new location on 22nd April 2024.',
      content: 'Dear valued customers, we have moved our office to a new location on 22nd April 2024. The phone number and fax number remain unchanged.\n\nNew Address: 768 Romford Road, Manor Park, London, United Kingdom.\n\nTel: +44 20 3150 0550\nCell: +44 7881 388270'
    },
    {
      id: '2',
      title: 'Villa Possession Handover Announcement - Capital Smart City',
      date: '04-May-2023',
      preview: 'Great news for all members who have completed their payments.',
      content: 'We are pleased to announce the handover of the first phase of villas. Members with 100% payment clearance are requested to visit our head office for the possession certificate application.'
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">News Alerts</h2>
        <p className="text-slate-500">Stay updated with the latest happenings at DIN Properties.</p>
      </div>

      <div className="space-y-4">
        {alerts.map((alert) => (
          <div key={alert.id} className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
            <button 
              onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{alert.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {alert.date}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> 10:30 AM</span>
                  </div>
                </div>
              </div>
              {expandedId === alert.id ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </button>
            
            {expandedId === alert.id && (
              <div className="p-5 pt-0 border-t border-slate-50 animate-in slide-in-from-top-2 duration-300">
                <div className="prose prose-slate prose-sm max-w-none mt-4 text-slate-600 whitespace-pre-wrap">
                  {alert.content}
                </div>
                <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">Attached Files</p>
                  <a href="#" className="text-emerald-700 text-sm font-medium hover:underline flex items-center gap-2">
                    Possession_Guide_2024.pdf (2.4 MB)
                  </a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsAlerts;
