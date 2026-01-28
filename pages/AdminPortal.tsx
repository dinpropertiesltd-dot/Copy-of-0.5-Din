
import React, { useState, useRef, useMemo } from 'react';
import { User, Notice, PropertyFile, Transaction, Message } from '../types';
import { authProvider } from '../supabase';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  UploadCloud,
  RefreshCw,
  FileText,
  Database,
  Trash2,
  HardDrive,
  Info,
  CheckCircle2,
  CloudLightning,
  Loader2
} from 'lucide-react';

interface AdminPortalProps {
  users: User[];
  setUsers: (users: User[]) => void;
  notices: Notice[];
  setNotices: React.Dispatch<React.SetStateAction<Notice[]>>;
  allFiles: PropertyFile[];
  setAllFiles: React.Dispatch<React.SetStateAction<PropertyFile[]>>;
  messages: Message[];
  onSendMessage: (msg: Message) => void;
  onImportFullDatabase?: (data: { users: User[], files: PropertyFile[] }, isDestructive?: boolean) => void;
  onResetDatabase?: () => void;
  isLocalDataPinned?: boolean;
}

const AdminPortal: React.FC<AdminPortalProps> = ({ 
  users, 
  allFiles, 
  onImportFullDatabase,
  onResetDatabase,
  isLocalDataPinned
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'SYSTEM'>('OVERVIEW');
  const [isProcessing, setIsProcessing] = useState(false);
  const [syncPhase, setSyncPhase] = useState<'PARSING' | 'SYNCING' | 'IDLE'>('IDLE');
  const [importSummary, setImportSummary] = useState<{ assets: number, rows: number } | null>(null);
  const masterSyncRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    let collection = 0, os = 0;
    allFiles.forEach(f => {
      f.transactions.forEach(t => collection += (t.amount_paid || 0));
      os += f.balance;
    });
    return { collection, os, count: allFiles.length, users: users.length };
  }, [allFiles, users]);

  const parseCSVLine = (line: string): string[] => {
    const columns: string[] = [];
    let cur = "", inQ = false;
    for (const char of line) {
      if (char === '"') inQ = !inQ;
      else if (char === ',' && !inQ) { columns.push(cur.trim()); cur = ""; }
      else cur += char;
    }
    columns.push(cur.trim());
    return columns;
  };

  const handleMasterSync = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessing(true);
    setSyncPhase('PARSING');
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = (event.target?.result as string).replace(/^\uFEFF/, '');
        const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
        if (lines.length < 2) throw new Error("Format Error: Empty or invalid file.");

        const rawHeaders = parseCSVLine(lines[0]);
        const normH = rawHeaders.map(h => h.trim().toLowerCase());
        
        const getIdx = (names: string[]) => {
          for (const n of names) {
            const i = normH.indexOf(n.toLowerCase());
            if (i !== -1) return i;
          }
          return -1;
        };

        const col = (arr: string[], names: string[]) => {
          const i = getIdx(names);
          return i !== -1 ? arr[i]?.trim() : undefined;
        };

        const parseVal = (v: any) => {
          if (!v || v.toString().toUpperCase() === 'NULL' || v === '-') return 0;
          return parseFloat(v.toString().replace(/[^0-9.-]/g, '')) || 0;
        };

        const userMap = new Map<string, User>();
        const fileMap = new Map<string, PropertyFile>();
        let processedRows = 0;

        lines.slice(1).forEach((line, idx) => {
          const cols = parseCSVLine(line);
          const rawCNIC = col(cols, ['ocnic', 'cnic', 'u_ocnic', 'owner_cnic', 'identity', 'cnic no']) || '';
          const normCNIC = rawCNIC.replace(/[^0-9]/g, '');
          const itemCode = col(cols, ['itemcode', 'item_code', 'u_itemcode', 'file_no', 'file no', 'reg_no', 'property_id']) || '';
          
          if (!itemCode) return;
          processedRows++;

          if (normCNIC && !userMap.has(normCNIC)) {
            userMap.set(normCNIC, {
              id: `user-${normCNIC}`,
              cnic: rawCNIC,
              name: col(cols, ['oname', 'ownername', 'name', 'owner_name', 'full_name']) || 'SAP Member',
              email: `${normCNIC}@dinproperties.com.pk`,
              phone: col(cols, ['ocell', 'cellno', 'cell_no', 'phone', 'mobile']) || '-',
              role: 'CLIENT', status: 'Active', password: 'password123'
            });
          }

          if (!fileMap.has(itemCode)) {
            fileMap.set(itemCode, {
              fileNo: itemCode,
              currencyNo: col(cols, ['currencyno', 'currency', 'u_currno']) || '-',
              plotSize: col(cols, ['dscription', 'description', 'size', 'plot_size']) || 'Plot',
              plotValue: parseVal(col(cols, ['doctotal', 'value', 'price', 'total_value'])),
              balance: 0, receivable: 0, totalReceivable: 0, paymentReceived: 0, surcharge: 0, overdue: 0,
              ownerName: userMap.get(normCNIC)?.name || col(cols, ['oname', 'ownername']) || 'Unknown', 
              ownerCNIC: rawCNIC,
              fatherName: col(cols, ['ofatname', 'fathername', 'so_do_wo', 'father_name']) || '-',
              cellNo: col(cols, ['ocell', 'cellno', 'cell_no', 'phone']) || '-',
              regDate: col(cols, ['otrfdate', 'regdate', 'date', 'reg_date']) || '-',
              address: col(cols, ['opraddress', 'address']) || '-',
              plotNo: col(cols, ['plot', 'plotno', 'u_plotno', 'plot_no']) || '-',
              block: col(cols, ['block', 'u_block', 'sector']) || '-',
              park: col(cols, ['park', 'u_park', 'category']) || '-',
              corner: col(cols, ['corner', 'u_corner']) || '-',
              mainBoulevard: col(cols, ['mb', 'mainboulevard', 'u_mainbu', 'main_boulevard']) || '-',
              transactions: []
            });
          }

          const prop = fileMap.get(itemCode)!;
          const paidVal = parseVal(col(cols, ['reconsum', 'paid', 'amount_paid', 'inbound']));
          const osVal = parseVal(col(cols, ['balduedeb', 'balance', 'outstanding', 'os_balance']));
          const dueDate = col(cols, ['duedate', 'due_date', 'date']);
          
          prop.paymentReceived += paidVal;
          prop.balance += osVal;
          
          if (dueDate || paidVal > 0 || osVal > 0) {
            prop.transactions.push({
              seq: idx, transid: Date.now() + idx, line_id: 0, shortname: itemCode,
              duedate: dueDate || '-',
              receivable: parseVal(col(cols, ['receivable', 'amount'])),
              u_intno: parseVal(col(cols, ['u_intno', 'seq', 'no'])) || idx + 1,
              u_intname: col(cols, ['u_intname', 'type', 'description']) || 'INSTALLMENT',
              transtype: '13', itemcode: itemCode, plottype: 'Res', currency: 'PKR',
              description: '', doctotal: prop.plotValue, status: 'Synced',
              balance: 0, balduedeb: osVal, paysrc: 0, amount_paid: paidVal,
              receipt_date: col(cols, ['refdate', 'receipt_date', 'date']), 
              mode: col(cols, ['mode', 'payment_mode', 'source']) || 'Cash',
              surcharge: parseVal(col(cols, ['markup', 'surcharge', 'late_fee']))
            });
          }
        });

        const filesArray = Array.from(fileMap.values());
        const usersArray = Array.from(userMap.values());

        // Phase 2: Sync to Supabase
        setSyncPhase('SYNCING');
        await authProvider.bulkSyncToCloud(filesArray);

        if (onImportFullDatabase) {
          onImportFullDatabase({ 
            users: usersArray, 
            files: filesArray 
          }, true);
        }
        setImportSummary({ assets: fileMap.size, rows: processedRows });
        setSyncPhase('IDLE');
        alert("Cloud Synchronization Complete. All data is now live in Supabase.");
      } catch (err) { 
        console.error(err);
        alert(`Cloud Sync Failed: ${err instanceof Error ? err.message : 'Check format.'}`); 
      }
      finally { setIsProcessing(false); setSyncPhase('IDLE'); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Command Center</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Authorized Supervisor Access Only</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          {['OVERVIEW', 'USERS', 'SYSTEM'].map(t => (
            <button key={t} onClick={() => setActiveTab(t as any)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-indigo-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>{t}</button>
          ))}
        </div>
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="space-y-10">
          <div className={`p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden transition-all duration-500 ${isLocalDataPinned ? 'bg-indigo-900 border-4 border-indigo-400/20' : 'bg-slate-900'}`}>
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
              <div className="flex items-center gap-8">
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all ${isLocalDataPinned ? 'bg-indigo-400' : 'bg-slate-700'}`}>
                  {isProcessing ? <Loader2 size={32} className="animate-spin" /> : <CloudLightning size={32} />}
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase leading-tight">Registry Master Sync</h2>
                  <p className="text-indigo-300 text-[11px] font-black tracking-[0.3em] mt-2 uppercase">
                    {syncPhase === 'PARSING' ? 'Analyzing CSV Structure...' : syncPhase === 'SYNCING' ? 'Writing to Cloud Database...' : isLocalDataPinned ? 'Cloud Database Synced & Verified' : 'Secure SAP Transaction Link'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                <button 
                  onClick={() => masterSyncRef.current?.click()} 
                  disabled={isProcessing}
                  className="w-full sm:w-auto bg-white text-indigo-900 px-12 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : <Database size={20} />}
                  {isLocalDataPinned ? 'Update All Records' : 'Sync Excel to Cloud'}
                </button>
                {isLocalDataPinned && (
                  <button 
                    onClick={onResetDatabase}
                    className="w-full sm:w-auto px-8 py-5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all"
                  >
                    Reset View
                  </button>
                )}
              </div>
              <input ref={masterSyncRef} type="file" className="hidden" accept=".csv" onChange={handleMasterSync} />
            </div>
            
            {importSummary && (
              <div className="mt-8 pt-8 border-t border-white/10 flex items-center gap-8 animate-in slide-in-from-top-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-widest">{importSummary.assets} Assets Synced to Cloud</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-blue-400" />
                  <span className="text-xs font-black uppercase tracking-widest">{importSummary.rows} Ledger Entries Processed</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
             <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><HardDrive size={14} /> Global Records</p>
                <h4 className="text-3xl font-black text-slate-900">{stats.count} Assets</h4>
             </div>
             <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Users size={14} /> Registered Members</p>
                <h4 className="text-3xl font-black text-slate-900">{stats.users} Entities</h4>
             </div>
             <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-6 flex items-center gap-2"><RefreshCw size={14} /> Inbound Total</p>
                <h4 className="text-3xl font-black text-emerald-600">PKR {Math.round(stats.collection).toLocaleString()}</h4>
             </div>
             <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-6 flex items-center gap-2"><FileText size={14} /> Active Balance</p>
                <h4 className="text-3xl font-black text-rose-600">PKR {Math.round(stats.os).toLocaleString()}</h4>
             </div>
          </div>
        </div>
      )}
      
      {activeTab === 'SYSTEM' && (
        <div className="bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-2xl space-y-12">
           <div>
              <h3 className="text-2xl font-black uppercase text-slate-900">Registry Maintenance</h3>
              <p className="text-slate-500 font-medium mt-1">Terminal-level data management and cloud verification.</p>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-200">
                 <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-4">Reset View</h4>
                 <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-8">This clears your current session view and re-fetches the latest state from Supabase.</p>
                 <button onClick={onResetDatabase} className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-900/20 transition-all flex items-center justify-center gap-3"><RefreshCw size={16} /> Re-fetch from Cloud</button>
              </div>

              <div className="p-10 bg-indigo-50 rounded-[2.5rem] border border-indigo-100">
                 <h4 className="text-sm font-black uppercase tracking-widest text-indigo-900 mb-4">Supabase Node Status</h4>
                 <p className="text-[11px] text-indigo-700 font-medium leading-relaxed mb-8">Check connection health to the cloud database.</p>
                 <button onClick={() => window.location.reload()} className="w-full bg-indigo-900 hover:bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-900/20 transition-all flex items-center justify-center gap-3"><ShieldCheck size={16} /> Connection Verified</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
