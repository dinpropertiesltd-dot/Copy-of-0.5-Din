
import React, { useState } from 'react';
import { Search, FileText, ChevronRight, BookOpen, HelpCircle } from 'lucide-react';

const SOPs: React.FC = () => {
  const [search, setSearch] = useState('');

  const procedures = [
    { title: 'How to book property in Smart City?', category: 'Bookings' },
    { title: 'How to verify a property?', category: 'Verification' },
    { title: 'Statement of Dues / No Demand Certificate', category: 'Finance' },
    { title: 'Regular Transfer', category: 'Transfer' },
    { title: 'Gift / Hiba Transfer', category: 'Transfer' },
    { title: 'Legal Heir(s) Transfer', category: 'Transfer' },
    { title: 'Foreign Transfer (Seller Abroad)', category: 'Transfer' },
    { title: 'Foreign Transfer (Purchaser Abroad)', category: 'Transfer' }
  ];

  const filtered = procedures.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">Standard Operating Procedures</h2>
        <p className="text-slate-500">Find detailed step-by-step guides for all property-related transactions and services.</p>
        
        <div className="mt-8 relative max-w-lg mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search for a procedure..." 
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-lg outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((sop, idx) => (
          <button key={idx} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group text-left">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <BookOpen size={20} />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{sop.category}</p>
            <h3 className="font-bold text-slate-900 text-lg group-hover:text-emerald-700 transition-colors leading-tight">{sop.title}</h3>
            <div className="mt-4 flex items-center gap-2 text-emerald-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              VIEW GUIDE
              <ChevronRight size={14} />
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400">
            <HelpCircle size={48} className="mb-4 text-slate-200" />
            <p className="text-lg font-medium">No procedures found matching "{search}"</p>
            <button onClick={() => setSearch('')} className="mt-2 text-emerald-600 font-bold hover:underline">Clear search</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SOPs;
