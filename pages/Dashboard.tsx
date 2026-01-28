
import React, { useMemo, useState, useEffect } from 'react';
import { PropertyFile, Transaction } from '../types';
import { generateSmartSummary } from '../AIService';
import { 
  CreditCard, 
  Home, 
  Users, 
  RefreshCcw, 
  AlertOctagon, 
  Layers,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  FileSpreadsheet,
  Calendar,
  Clock,
  ArrowRightCircle,
  ShieldCheck,
  Sparkles,
  Loader2,
  AlertCircle,
  TriangleAlert
} from 'lucide-react';

interface DashboardProps {
  onSelectFile: (file: PropertyFile) => void;
  files: PropertyFile[];
  userName: string;
}

const Dashboard: React.FC<DashboardProps> = ({ onSelectFile, files, userName }) => {
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(true);
  const [alertIndex, setAlertIndex] = useState(0);

  const parseSAPDate = (dateStr: string) => {
    if (!dateStr || dateStr === '-' || dateStr === '' || dateStr === 'NULL') return null;
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return null;
      const day = parseInt(parts[0]);
      const monthStr = parts[1];
      let year = parseInt(parts[2]);
      if (year < 100) year += 2000;
      
      const months: Record<string, number> = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      const normalizedMonth = monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase();
      const month = months[normalizedMonth.substring(0, 3)];
      if (month === undefined) return null;
      
      return new Date(year, month, day);
    } catch (e) { return null; }
  };

  useEffect(() => {
    const fetchSummary = async () => {
      if (files.length === 0) {
        setAiSummary("No active property files found in your registry profile.");
        setIsAiLoading(false);
        return;
      }
      setIsAiLoading(true);
      const mockUser: any = { name: userName };
      const summary = await generateSmartSummary(mockUser, files);
      setAiSummary(summary || '');
      setIsAiLoading(false);
    };
    fetchSummary();
  }, [files, userName]);

  const allAlerts = useMemo(() => {
    const alerts: { trans: Transaction, plotName: string, itemCode: string, file: PropertyFile, isOverdue: boolean }[] = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    files.forEach(file => {
      // Identify all truly overdue installments (past date + remaining balance)
      const overdueTrans = file.transactions
        .filter(t => {
          const d = parseSAPDate(t.duedate);
          return d && d < today && (t.balduedeb || 0) > 0;
        })
        .sort((a, b) => {
          const da = parseSAPDate(a.duedate);
          const db = parseSAPDate(b.duedate);
          return (da?.getTime() || 0) - (db?.getTime() || 0);
        })[0]; // Take the oldest overdue per file

      if (overdueTrans) {
        alerts.push({ trans: overdueTrans, plotName: file.plotSize, itemCode: file.fileNo, file, isOverdue: true });
      } else {
        // If nothing is overdue, find the next upcoming commitment
        const nextCommitment = file.transactions.find(t => {
           const d = parseSAPDate(t.duedate);
           return d && d >= today && (!t.amount_paid || t.amount_paid === 0) && (t.receivable && t.receivable > 0);
        });
        if (nextCommitment) {
           alerts.push({ trans: nextCommitment, plotName: file.plotSize, itemCode: file.fileNo, file, isOverdue: false });
        }
      }
    });

    // Prioritize overdue alerts at the top of the cycle
    return alerts.sort((a, b) => (a.isOverdue === b.isOverdue ? 0 : a.isOverdue ? -1 : 1));
  }, [files]);

  const currentAlert = allAlerts[alertIndex];

  const getFileStatus = (file: PropertyFile) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const hasOverdue = file.transactions.some(t => {
      const d = parseSAPDate(t.duedate);
      return d && d < today && (t.balduedeb || 0) > 0;
    });

    if (hasOverdue) return { label: 'Action Required', color: 'bg-rose-50 text-rose-600 border-rose-100' };
    if (file.balance > 0) return { label: 'Active Ledger', color: 'bg-blue-50 text-blue-600 border-blue-100' };
    return { label: 'Clearance Verified', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
  };

  const stats = useMemo(() => {
    const activeRecordsCount = files.filter(f => f.balance > 0).length;
    const overdueCount = allAlerts.filter(a => a.isOverdue).length;
    const transferCount = files.reduce((acc, f) => acc + f.transactions.filter(t => (t.u_intname || '').toUpperCase() === 'TRANSFER').length, 0);

    return [
      { label: 'Verified Assets', value: files.length.toString().padStart(2, '0'), icon: Home, color: 'bg-blue-600' },
      { label: 'Active Records', value: activeRecordsCount.toString().padStart(2, '0'), icon: CreditCard, color: 'bg-emerald-600' },
      { label: 'Joint Members', value: '00', icon: Users, color: 'bg-amber-600' }, 
      { label: 'Transfers', value: transferCount.toString().padStart(2, '0'), icon: RefreshCcw, color: 'bg-purple-600' },
      { label: 'Alerts', value: overdueCount.toString().padStart(2, '0'), icon: AlertOctagon, color: 'bg-rose-600' },
    ];
  }, [files, allAlerts]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(val);
  };

  const handleExportSummary = () => {
    if (files.length === 0) return;
    const headers = ['Item Code', 'Plot Description', 'Item Value', 'Paid To Date', 'OS Balance', 'Reg Date'];
    const rows = files.map(f => [f.fileNo, f.plotSize, f.plotValue, f.paymentReceived, f.balance, f.regDate]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Portfolio_Summary_${userName.replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 sm:space-y-10 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tighter">Verified Portfolio</h2>
          <p className="text-slate-400 font-bold mt-1 text-sm sm:text-base">Authenticated Identity: {userName}</p>
        </div>
        <div className="flex bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm items-center gap-4 self-start md:self-center">
          <Calendar size={20} className="text-emerald-600" />
          <div>
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Portal Access Date</p>
            <p className="text-[11px] font-black text-slate-900">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-5 sm:p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all group cursor-pointer">
            <div className={`w-10 h-10 ${stat.color} rounded-2xl flex items-center justify-center text-white mb-3 shadow-lg shadow-current/20 group-hover:scale-110 transition-transform`}>
              <stat.icon size={20} />
            </div>
            <p className="text-slate-400 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em]">{stat.label}</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-2 sm:px-4">
            <h3 className="text-[10px] sm:text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              Asset Synchronization Unit
            </h3>
            <button 
              onClick={handleExportSummary}
              disabled={files.length === 0}
              className="px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-900 text-white hover:bg-black rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-20 shadow-lg shadow-slate-900/10"
            >
              <FileSpreadsheet size={14} /> <span className="hidden sm:inline">Global Export</span>
            </button>
          </div>
          
          <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/40 border border-slate-200 overflow-hidden">
            <div className="hidden lg:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[9px] uppercase font-black tracking-[0.2em] border-b border-slate-100">
                    <th className="px-10 py-6">Item Code & Classification</th>
                    <th className="px-10 py-6">Next Commitment</th>
                    <th className="px-10 py-6">Recovery Index</th>
                    <th className="px-10 py-6">Status</th>
                    <th className="px-10 py-6 text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {files.map((file) => {
                    const status = getFileStatus(file);
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    
                    const overdue = file.transactions.find(t => {
                      const d = parseSAPDate(t.duedate);
                      return d && d < today && (t.balduedeb || 0) > 0;
                    });

                    const next = overdue || file.transactions.find(t => (!t.amount_paid || t.amount_paid === 0) && (t.receivable && t.receivable > 0));
                    const recoveryPercent = file.plotValue > 0 ? Math.round((file.paymentReceived / file.plotValue) * 100) : 0;
                    
                    return (
                      <tr key={file.fileNo} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-10 py-8">
                          <div className="font-black text-slate-900 text-sm uppercase tracking-tight">{file.plotSize}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">ID: {file.fileNo}</span>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          {next ? (
                            <div>
                              <div className={`text-xs font-black ${overdue ? 'text-rose-600' : 'text-slate-900'}`}>{formatCurrency(overdue ? (overdue.balduedeb || 0) : (next.receivable || 0))}</div>
                              <div className={`text-[9px] font-bold uppercase tracking-tight mt-0.5 flex items-center gap-1 ${overdue ? 'text-rose-400' : 'text-slate-400'}`}>
                                {overdue ? <TriangleAlert size={10} /> : <Clock size={10} />}
                                {next.duedate}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                              <ShieldCheck size={12} /> Registry Clear
                            </div>
                          )}
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-slate-900">{formatCurrency(file.paymentReceived)}</span>
                            <span className="text-[9px] font-black text-slate-400">{recoveryPercent}% Secured</span>
                          </div>
                          <div className="w-40 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${recoveryPercent > 70 ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                              style={{ width: `${recoveryPercent}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${status.color}`}>
                            {status.label}
                          </div>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <button 
                            onClick={() => onSelectFile(file)}
                            className="bg-slate-900 text-white hover:bg-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                          >
                            Ledger Summary <ArrowRightCircle size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden p-4 sm:p-6 space-y-4">
              {files.map((file) => {
                const status = getFileStatus(file);
                const today = new Date();
                today.setHours(0,0,0,0);
                const overdue = file.transactions.find(t => {
                   const d = parseSAPDate(t.duedate);
                   return d && d < today && (t.balduedeb || 0) > 0;
                });
                const next = overdue || file.transactions.find(t => (!t.amount_paid || t.amount_paid === 0) && (t.receivable && t.receivable > 0));
                const recoveryPercent = file.plotValue > 0 ? Math.round((file.paymentReceived / file.plotValue) * 100) : 0;

                return (
                  <div key={file.fileNo} className="bg-slate-50/50 rounded-3xl p-6 border border-slate-200/60 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <div className="max-w-[70%]">
                        <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{file.plotSize}</div>
                        <div className="text-[9px] text-emerald-600 font-black uppercase mt-1.5 tracking-widest">ID: {file.fileNo}</div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${status.color}`}>
                        {status.label.split(' ')[0]}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{overdue ? 'Overdue Balance' : 'Target Inbound'}</p>
                        <p className={`text-xs font-black mt-1 ${overdue ? 'text-rose-600' : 'text-slate-900'}`}>{next ? formatCurrency(overdue ? (overdue.balduedeb || 0) : (next.receivable || 0)) : 'Registry Clear'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Secured Ratio</p>
                        <p className="text-xs font-black text-slate-900 mt-1">{recoveryPercent}%</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => onSelectFile(file)}
                      className="w-full bg-white border border-slate-200 text-slate-900 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-sm active:scale-95 transition-all"
                    >
                      Extract Ledger <ArrowRightCircle size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="w-16 h-16 bg-emerald-600 rounded-3xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-600/30">
                {isAiLoading ? <Loader2 size={32} className="animate-spin" /> : <Sparkles size={32} />}
              </div>
              <div className="flex-1">
                <h3 className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">AI Registry Intelligence</h3>
                <div className="text-white text-sm sm:text-base font-medium leading-relaxed">
                  {isAiLoading ? (
                    <div className="flex gap-2 items-center">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <span className="text-slate-500 ml-2 italic">Scanning secure ledger nodes...</span>
                    </div>
                  ) : (
                    <p className="animate-in fade-in slide-in-from-left-4 duration-500">{aiSummary}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <div className={`rounded-[3.5rem] p-8 sm:p-10 text-white relative overflow-hidden shadow-2xl flex flex-col min-h-[500px] border transition-all duration-500 ${currentAlert?.isOverdue ? 'bg-[#1a0a0d] border-rose-500/20 shadow-rose-900/20' : 'bg-[#0b1424] border-white/5 shadow-slate-900/20'}`}>
            <div className={`absolute top-0 right-0 w-80 h-80 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl ${currentAlert?.isOverdue ? 'bg-rose-500/10' : 'bg-emerald-500/5'}`}></div>
            
            <div className="relative z-10 h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all ${currentAlert?.isOverdue ? 'bg-rose-600 shadow-rose-600/20' : 'bg-[#10b981] shadow-emerald-500/20'}`}>
                  {currentAlert?.isOverdue ? <TriangleAlert size={28} /> : <TrendingUp size={28} />}
                </div>
                {allAlerts.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setAlertIndex(prev => (prev > 0 ? prev - 1 : allAlerts.length - 1))}
                      className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{alertIndex + 1} / {allAlerts.length}</span>
                    <button 
                      onClick={() => setAlertIndex(prev => (prev < allAlerts.length - 1 ? prev + 1 : 0))}
                      className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
              
              <h4 className={`text-[10px] font-black uppercase tracking-[0.4em] mb-8 ${currentAlert?.isOverdue ? 'text-rose-500 animate-pulse' : 'text-[#10b981]'}`}>
                {currentAlert?.isOverdue ? 'CRITICAL OVERDUE ALERT' : 'PORTFOLIO ALERT'}
              </h4>
              
              {currentAlert ? (
                <div className="flex-1 flex flex-col">
                  <div className="mb-10">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Asset Reference</p>
                    <p className="text-3xl font-black text-white uppercase tracking-tight leading-tight mb-1">{currentAlert.plotName}</p>
                    <p className={`text-[11px] font-bold uppercase tracking-widest ${currentAlert.isOverdue ? 'text-rose-400' : 'text-[#10b981]'}`}>
                      ITEM CODE: {currentAlert.itemCode}
                    </p>
                  </div>

                  <div className="space-y-6 flex-1">
                    <div className={`bg-white/5 border p-8 rounded-[2.5rem] backdrop-blur-sm transition-all ${currentAlert.isOverdue ? 'border-rose-500/30' : 'border-white/10'}`}>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                        {currentAlert.isOverdue ? 'Amount Overdue' : 'Amount Outstanding'}
                      </p>
                      <p className={`text-4xl font-black ${currentAlert.isOverdue ? 'text-rose-500' : 'text-white'}`}>
                        {formatCurrency(currentAlert.isOverdue ? (currentAlert.trans.balduedeb || 0) : (currentAlert.trans.receivable || 0))}
                      </p>
                    </div>
                    
                    <div className={`flex items-center gap-5 px-4 py-6 bg-white/5 rounded-3xl border transition-all ${currentAlert.isOverdue ? 'border-rose-500/30' : 'border-white/10'}`}>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${currentAlert.isOverdue ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20'}`}>
                        <Calendar size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          {currentAlert.isOverdue ? 'Date Missed' : 'Target Date'}
                        </p>
                        <p className={`text-lg font-black ${currentAlert.isOverdue ? 'text-rose-200' : 'text-white'}`}>
                          {currentAlert.trans.duedate}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => onSelectFile(currentAlert.file)}
                    className={`w-full font-black py-6 rounded-[2.5rem] transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[11px] mt-10 ${currentAlert.isOverdue ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' : 'bg-[#10b981] hover:bg-[#0ea372] shadow-[#10b981]/20'}`}
                  >
                    {currentAlert.isOverdue ? 'Resolve Overdue Ledger' : 'Proceed To Payment'}
                    <ChevronRight size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                  <ShieldCheck size={80} className="text-[#10b981] mb-8" />
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-white leading-relaxed">
                    Registry Synchronized<br/>Portfolio Status: Clear
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl shadow-slate-200/20">
             <div className="flex items-center gap-3 mb-6">
                <AlertCircle size={18} className="text-amber-500" />
                <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Security Advisory</h5>
             </div>
             <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Payments are due by the 10th of every month. A 3.5% monthly surcharge applies to all late submissions. Ensure your bank instruments are verified before the target date.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
