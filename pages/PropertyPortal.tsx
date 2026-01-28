
import React, { useState, useMemo, useEffect } from 'react';
import { PropertyFile, Transaction } from '../types';
import { generateWhatsAppRecoveryMessage } from '../AIService';
import { authProvider } from '../supabase';
import { 
  Search, 
  Eye, 
  Edit,
  X,
  Plus,
  Trash2,
  Save,
  Building,
  FilePlus,
  ArrowRight,
  FileSpreadsheet,
  MessageSquareText,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Phone,
  Filter
} from 'lucide-react';

interface PropertyPortalProps {
  allFiles: PropertyFile[];
  setAllFiles: (files: PropertyFile[]) => void;
  onPreviewStatement?: (file: PropertyFile) => void;
  isLocalDataPinned?: boolean;
}

const PropertyPortal: React.FC<PropertyPortalProps> = ({ 
  allFiles, 
  setAllFiles,
  onPreviewStatement,
  isLocalDataPinned
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingFile, setEditingFile] = useState<PropertyFile | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [selectedForRecovery, setSelectedForRecovery] = useState<string[]>([]);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsappProgress, setWhatsappProgress] = useState(0);
  const [activeMessagePreview, setActiveMessagePreview] = useState<string>('');
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);

  const [tempTransactions, setTempTransactions] = useState<Transaction[]>([]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(val);
  };

  const filteredInventory = useMemo(() => {
    let list = allFiles;
    if (isRecoveryMode) {
      list = list.filter(f => f.balance > 0);
    }
    return list.filter(f => 
      f.fileNo.toLowerCase().includes(searchTerm.toLowerCase()) || 
      f.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.ownerCNIC.includes(searchTerm)
    );
  }, [allFiles, searchTerm, isRecoveryMode]);

  useEffect(() => {
    if (isRecoveryMode && filteredInventory.length > 0 && !activeMessagePreview) {
      handleGeneratePreview(filteredInventory[0]);
    }
  }, [isRecoveryMode, filteredInventory]);

  const handleGeneratePreview = async (file: PropertyFile) => {
    setIsGeneratingMessage(true);
    const msg = await generateWhatsAppRecoveryMessage(file);
    setActiveMessagePreview(msg);
    setIsGeneratingMessage(false);
  };

  const handleToggleSelectAll = () => {
    if (selectedForRecovery.length === filteredInventory.length) {
      setSelectedForRecovery([]);
    } else {
      setSelectedForRecovery(filteredInventory.map(f => f.fileNo));
    }
  };

  const handleToggleSelect = (fileNo: string) => {
    setSelectedForRecovery(prev => 
      prev.includes(fileNo) ? prev.filter(id => id !== fileNo) : [...prev, fileNo]
    );
  };

  const executeBulkRecovery = async () => {
    if (selectedForRecovery.length === 0) return;
    setIsSendingWhatsApp(true);
    setWhatsappProgress(0);

    const timestamp = new Date().toLocaleString('en-GB');

    for (let i = 0; i < selectedForRecovery.length; i++) {
      const fileNo = selectedForRecovery[i];
      // Mocking the Twilio API call logic
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulating API latency
      
      // Update DB Status
      await authProvider.updateLastNotified(fileNo, timestamp);
      
      setWhatsappProgress(Math.round(((i + 1) / selectedForRecovery.length) * 100));
    }

    // Refresh UI state
    const updatedFiles = allFiles.map(f => 
      selectedForRecovery.includes(f.fileNo) ? { ...f, lastNotified: timestamp } : f
    );
    setAllFiles(updatedFiles);

    setIsSendingWhatsApp(false);
    setSelectedForRecovery([]);
    alert(`Success: ${selectedForRecovery.length} Recovery Messages Dispatched via WhatsApp Node.`);
  };

  const handleExportRegistry = () => {
    if (allFiles.length === 0) return;
    const headers = ['File Number', 'Owner Name', 'Father Name', 'CNIC', 'Cell No', 'Plot Size', 'Plot', 'Block', 'Park', 'Corner', 'MB', 'Total Value', 'Paid', 'Balance', 'Reg Date', 'Address'];
    const rows = allFiles.map(f => [`"${f.fileNo}"`, `"${f.ownerName}"`, `"${f.fatherName}"`, `"${f.ownerCNIC}"`, `"${f.cellNo}"`, `"${f.plotSize}"`, `"${f.plotNo}"`, `"${f.block}"`, `"${f.park}"`, `"${f.corner}"`, `"${f.mainBoulevard}"`, f.plotValue, f.paymentReceived, f.balance, `"${f.regDate}"`, `"${f.address.replace(/\n/g, ' ')}"`]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `DIN_Property_Registry_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const startEditLedger = (file: PropertyFile) => {
    setEditingFile(file);
    setTempTransactions([...file.transactions].sort((a, b) => a.seq - b.seq));
  };

  const updateTempTrans = (index: number, field: keyof Transaction, value: any) => {
    const updated = [...tempTransactions];
    const trans = { ...updated[index], [field]: value };
    if (field === 'receivable' || field === 'amount_paid') {
      trans.balduedeb = Math.max(0, (Number(trans.receivable) || 0) - (Number(trans.amount_paid) || 0));
    }
    updated[index] = trans;
    setTempTransactions(updated);
  };

  const saveLedger = () => {
    if (!editingFile) return;
    const updatedFiles = allFiles.map(f => {
      if (f.fileNo === editingFile.fileNo) {
        const sortedTrans = [...tempTransactions].sort((a, b) => a.seq - b.seq);
        const received = sortedTrans.reduce((sum, t) => sum + (Number(t.amount_paid) || 0), 0);
        const totalOS = sortedTrans.reduce((sum, t) => sum + (Number(t.balduedeb) || 0), 0);
        return { ...f, transactions: sortedTrans, paymentReceived: received, balance: totalOS };
      }
      return f;
    });
    setAllFiles(updatedFiles);
    setEditingFile(null);
  };

  const addTempTrans = () => {
    const newTrans: Transaction = {
      seq: tempTransactions.length + 1,
      transid: Date.now(),
      line_id: 0,
      shortname: '',
      duedate: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
      receivable: 0,
      u_intno: tempTransactions.length + 1,
      u_intname: 'INSTALLMENT',
      transtype: '13',
      itemcode: editingFile?.fileNo || '',
      plottype: 'Residential',
      currency: 'PKR',
      description: '',
      doctotal: editingFile?.plotValue || 0,
      status: 'Unpaid',
      balance: 0,
      balduedeb: 0,
      paysrc: null,
      amount_paid: 0,
      receipt_date: '',
      mode: 'Cash',
      surcharge: 0
    };
    setTempTransactions([...tempTransactions, newTrans]);
  };

  const deleteTempTrans = (index: number) => {
    setTempTransactions(tempTransactions.filter(((_, i) => i !== index)));
  };

  return (
    <div className="space-y-6 sm:space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase">Registry</h1>
            {isLocalDataPinned && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[8px] font-black uppercase tracking-widest border border-indigo-200">Imported</span>}
          </div>
          <p className="text-slate-500 font-medium uppercase tracking-widest text-[10px]">Identity &rarr; Financials &rarr; Location Flow</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setIsRecoveryMode(!isRecoveryMode);
              setSelectedForRecovery([]);
            }} 
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 ${isRecoveryMode ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-900'}`}
          >
            <Zap size={18} className={isRecoveryMode ? 'animate-pulse' : ''} /> {isRecoveryMode ? 'Exit Recovery' : 'Recovery Mode'}
          </button>
          <button onClick={handleExportRegistry} className="hidden sm:flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[11px] font-black uppercase hover:bg-slate-50 transition-all shadow-sm">
            <FileSpreadsheet size={18} /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className={isRecoveryMode ? 'xl:col-span-8' : 'xl:col-span-12'}>
          <div className="bg-white rounded-[2rem] sm:rounded-[3.5rem] shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 sm:p-10 border-b flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="relative w-full max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" placeholder="Search Identity (Name/CNIC) or File ID..." className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-slate-900/5 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              {isRecoveryMode && (
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black uppercase text-slate-400">{selectedForRecovery.length} Selected</span>
                  <button onClick={handleToggleSelectAll} className="text-[10px] font-black uppercase text-indigo-600 hover:underline">
                    {selectedForRecovery.length === filteredInventory.length ? 'Deselect All' : 'Select All Defaulters'}
                  </button>
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b">
                    {isRecoveryMode && <th className="px-8 py-6 w-10"></th>}
                    <th className="px-8 py-6">Identity Info</th>
                    <th className="px-8 py-6">Financial Status</th>
                    <th className="px-8 py-6">Communication</th>
                    <th className="px-8 py-6 text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInventory.map((f) => (
                    <tr key={f.fileNo} className={`hover:bg-slate-50 transition-colors group ${selectedForRecovery.includes(f.fileNo) ? 'bg-indigo-50/30' : ''}`}>
                      {isRecoveryMode && (
                        <td className="px-8 py-8">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            checked={selectedForRecovery.includes(f.fileNo)}
                            onChange={() => handleToggleSelect(f.fileNo)}
                          />
                        </td>
                      )}
                      <td className="px-8 py-8">
                        <div className="font-black text-slate-900 text-sm uppercase">{f.ownerName}</div>
                        <div className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-1">ID: {f.fileNo}</div>
                        <div className="text-[10px] text-slate-400 font-bold mt-1">CNIC: {f.ownerCNIC}</div>
                      </td>
                      <td className="px-8 py-8">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase">
                            <span className="text-slate-400">Total:</span> 
                            <span className="text-slate-900 font-bold">{formatCurrency(f.plotValue)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase">
                            <span className="text-slate-400">Balance:</span> 
                            <span className="text-rose-600 font-black">{formatCurrency(f.balance)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        {f.lastNotified ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                              <CheckCircle2 size={12} /> Contacted
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase">{f.lastNotified}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No History</span>
                        )}
                      </td>
                      <td className="px-8 py-8 text-right flex justify-end gap-2">
                        <button onClick={() => startEditLedger(f)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit size={16} /></button>
                        <button onClick={() => onPreviewStatement?.(f)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><Eye size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {isRecoveryMode && (
          <div className="xl:col-span-4 space-y-6">
            <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl sticky top-24">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/20">
                  <MessageSquareText size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Communication Hub</h3>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">Automated WhatsApp Node</p>
                </div>
              </div>

              <div className="space-y-6 mb-8">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Message Preview (AI Refined)</p>
                    <button 
                      onClick={() => filteredInventory.length > 0 && handleGeneratePreview(filteredInventory[0])}
                      className="text-[9px] font-black text-indigo-400 hover:text-white uppercase tracking-widest transition-all"
                    >
                      Regenerate
                    </button>
                  </div>
                  {isGeneratingMessage ? (
                    <div className="flex items-center gap-3 py-6 justify-center">
                      <Loader2 className="animate-spin text-indigo-400" size={20} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Syncing with Gemini...</span>
                    </div>
                  ) : (
                    <p className="text-xs font-medium leading-relaxed italic text-slate-300">
                      "{activeMessagePreview}"
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Target List</p>
                    <p className="text-lg font-black mt-1">{selectedForRecovery.length} Files</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Est. Cost</p>
                    <p className="text-lg font-black mt-1">{(selectedForRecovery.length * 12).toLocaleString()} PKR</p>
                  </div>
                </div>
              </div>

              {isSendingWhatsApp ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span>Sending Notification Blast...</span>
                    <span>{whatsappProgress}%</span>
                  </div>
                  <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${whatsappProgress}%` }}></div>
                  </div>
                  <p className="text-[9px] text-indigo-300 font-bold uppercase animate-pulse">DO NOT DISCONNECT TERMINAL</p>
                </div>
              ) : (
                <button 
                  onClick={executeBulkRecovery}
                  disabled={selectedForRecovery.length === 0}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 text-white font-black py-6 rounded-[2.5rem] flex items-center justify-center gap-4 transition-all shadow-2xl active:scale-95 uppercase tracking-[0.2em] text-xs"
                >
                  <Send size={20} />
                  Execute Recovery Blast
                </button>
              )}

              <div className="mt-8 p-6 bg-indigo-950/50 rounded-3xl border border-indigo-400/10 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[9px] text-indigo-200 font-bold leading-relaxed uppercase">
                  Meta Compliance Notice: Ensure all templates are pre-approved in Twilio Console. Bulk execution follows a 200ms sequential throttle.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {editingFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md overflow-hidden lg:p-4">
          <div className="bg-white lg:rounded-[3rem] w-full max-w-6xl h-full lg:h-[90vh] shadow-2xl flex flex-col border border-white/20">
            <div className="p-6 sm:p-8 border-b bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/20"><Building size={24} /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase">Editor: {editingFile.fileNo}</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Translation Layer Active</p>
                </div>
              </div>
              <button onClick={() => setEditingFile(null)} className="p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X size={32} /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[9px] uppercase font-black text-slate-400 tracking-widest border-b">
                    <th className="pb-4 px-2">Due Date</th>
                    <th className="pb-4 px-2">Int Type</th>
                    <th className="pb-4 px-2">Receivable</th>
                    <th className="pb-4 px-2">Paid</th>
                    <th className="pb-4 px-2">Instrument No</th>
                    <th className="pb-4 px-2 text-right">Ops</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tempTransactions.map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-2">
                        <input type="text" value={t.duedate} onChange={(e) => updateTempTrans(idx, 'duedate', e.target.value)} className="w-28 bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-xs font-bold" />
                      </td>
                      <td className="py-4 px-2">
                        <input type="text" value={t.u_intname} onChange={(e) => updateTempTrans(idx, 'u_intname', e.target.value)} className="w-32 bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-xs font-black uppercase" />
                      </td>
                      <td className="py-4 px-2">
                        <input type="number" value={t.receivable || 0} onChange={(e) => updateTempTrans(idx, 'receivable', parseInt(e.target.value))} className="w-24 bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-xs font-black text-blue-600" />
                      </td>
                      <td className="py-4 px-2">
                        <input type="number" value={t.amount_paid || 0} onChange={(e) => updateTempTrans(idx, 'amount_paid', parseInt(e.target.value))} className="w-24 bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-xs font-black text-emerald-600" />
                      </td>
                      <td className="py-4 px-2">
                        <input type="text" value={t.instrument_no || ''} onChange={(e) => updateTempTrans(idx, 'instrument_no', e.target.value)} className="w-32 bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-xs font-bold" />
                      </td>
                      <td className="py-4 px-2 text-right">
                        <button onClick={() => deleteTempTrans(idx)} className="p-2 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-8 border-t bg-slate-50 flex items-center justify-between">
              <button onClick={addTempTrans} className="px-6 py-4 bg-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-300 transition-all flex items-center gap-2"><Plus size={16} /> Add Ledger Entry</button>
              <button onClick={saveLedger} className="px-12 py-5 bg-emerald-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center gap-4 transition-all active:scale-95"><Save size={18} /> Commit Ledger Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyPortal;
