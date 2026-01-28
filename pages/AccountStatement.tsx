
import React, { useRef, useState, useMemo } from 'react';
import { PropertyFile, Transaction } from '../types';
import { Download, Loader2, ArrowLeft } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface Props {
  file: PropertyFile;
  onBack?: () => void;
}

const AccountStatement: React.FC<Props> = ({ file, onBack }) => {
  const statementRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  /**
   * Numeric Formatter: Converts 0, null, or undefined to "-"
   */
  const format = (val?: number | null) => {
    if (val === null || val === undefined || val === 0 || isNaN(val)) return '-';
    return Math.round(val).toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  /**
   * String Sanitizer: Converts empty, NULL, or undefined strings to "-"
   */
  const v = (val?: string | null) => {
    if (!val || val === 'NULL' || val === '' || val === 'null' || val === '-') return '-';
    return val;
  };

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

  const shouldHideDate = (type: string) => {
    const t = (type || '').toUpperCase();
    return t.includes('POSSESSION') || t.includes('PLOTTING') || t.includes('BALLOTING');
  };

  const groupedTransactions = useMemo(() => {
    const paymentPlanGroups: Record<number, { 
      receivableRow: Transaction, 
      receipts: Transaction[] 
    }> = {};

    const otherTransactions: Transaction[] = [];

    file.transactions.forEach(t => {
      if (t.u_intno > 0) {
        if (!paymentPlanGroups[t.u_intno]) {
          paymentPlanGroups[t.u_intno] = {
            receivableRow: { ...t, amount_paid: 0, receipt_date: '', surcharge: 0, mode: '', instrument_no: '' },
            receipts: []
          };
        }
        
        if ((t.receivable && t.receivable > 0)) {
          paymentPlanGroups[t.u_intno].receivableRow = { ...t };
        }
        
        const hasPayment = (t.amount_paid && t.amount_paid > 0);
        const hasSurcharge = (t.surcharge && t.surcharge > 0);
        const hasDate = (t.receipt_date && t.receipt_date !== 'NULL' && t.receipt_date !== '');
        
        if (hasPayment || hasSurcharge || hasDate) {
          paymentPlanGroups[t.u_intno].receipts.push(t);
        }
      } else {
        otherTransactions.push(t);
      }
    });

    return {
      paymentPlan: Object.values(paymentPlanGroups).sort((a, b) => a.receivableRow.u_intno - b.receivableRow.u_intno),
      other: otherTransactions.sort((a, b) => a.seq - b.seq)
    };
  }, [file.transactions]);

  const totals = useMemo(() => {
    let planRec = 0, planReceived = 0, planSurcharge = 0, otherRec = 0, otherReceived = 0, otherSurcharge = 0, totalOverdue = 0;
    const today = new Date(); today.setHours(0,0,0,0);

    groupedTransactions.paymentPlan.forEach(g => {
      const rec = g.receivableRow;
      planRec += (rec.receivable || 0);
      const totalPaidForThisInt = g.receipts.reduce((s, r) => s + (r.amount_paid || 0), 0);
      const remainingForThisInt = Math.max(0, (rec.receivable || 0) - totalPaidForThisInt);
      const dueDate = parseSAPDate(rec.duedate);
      if (dueDate && dueDate < today && remainingForThisInt > 0) totalOverdue += remainingForThisInt;
      g.receipts.forEach(r => {
        planReceived += (r.amount_paid || 0);
        planSurcharge += (r.surcharge || 0);
      });
    });

    groupedTransactions.other.forEach(t => {
      otherRec += (t.receivable || 0);
      otherReceived += (t.amount_paid || 0);
      otherSurcharge += (t.surcharge || 0);
      const dueDate = parseSAPDate(t.duedate);
      const osBal = t.balduedeb || 0;
      if (dueDate && dueDate < today && osBal > 0) totalOverdue += osBal;
    });

    return { 
      planBalance: Math.max(0, planRec - planReceived), 
      grandRec: planRec + otherRec, 
      grandReceived: planReceived + otherReceived, 
      grandSurcharge: planSurcharge + otherSurcharge, 
      grandBalance: Math.max(0, (planRec + otherRec) - (planReceived + otherReceived)), 
      totalOverdue, 
      planRec, 
      planReceived, 
      planSurcharge 
    };
  }, [groupedTransactions]);

  const downloadPDF = async () => {
    if (!statementRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(statementRef.current, {
        scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff',
        height: statementRef.current.scrollHeight,
        windowHeight: statementRef.current.scrollHeight,
        onclone: (clonedDoc) => {
          const el = clonedDoc.querySelector('[data-statement-container]');
          if (el) (el as HTMLElement).style.transform = 'none';
        }
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; 
      const pageHeight = 297; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`DIN_Account_Statement_${file.fileNo}.pdf`);
    } catch (e) { alert('PDF generation failed.'); }
    finally { setIsDownloading(false); }
  };

  const Logo = () => (
    <svg viewBox="0 0 300 120" className="w-full h-auto max-w-[160px]" xmlns="http://www.w3.org/2000/svg">
      <path fill="#6e6f72" d="M3.81,83.07c.44-1.57.68-3.15,1.25-4.69,5.64-15.3,24.1-15.79,36.44-22.4l5.16-3.01-.6,3.09c-1.54.92-3.04,1.93-4.61,2.78-12.11,6.59-31.14,7.31-36.2,22.64-.36,1.08-.92,2.75-.57,3.82-.12.57-.3,1.14-.34,1.72-.33-.12-.1-1.42-.52-1.72v-2.24Z"/>
      <polygon fill="#6e6f72" points="18.61 62.61 18.61 12.56 28.4 18.85 28.84 19.27 28.91 58.71 18.61 62.61"/>
      <path fill="#0c0b0b" d="M256.92,68.45c-.06,1.49.79,3.01,1.4,4.36,2.31,5.06,5.63,10.96,8.49,15.76.11.19.18.47.43.51.03-6.89.09-13.78-.51-20.64h5.85c-.43,2.37-.27,4.75-.34,7.14-.21,6.9-.32,13.9,0,20.8.04.94.28,2.05.34,3.01h-6.02c-.36-1.54-1.25-3.06-1.98-4.48-2.93-5.67-6.23-11.16-9.12-16.85-.08,7.1-.33,14.25.26,21.33h-5.85c.08-.84.3-1.84.34-2.67.35-7.35.25-14.83,0-22.18-.07-2.04.1-4.09-.34-6.11h7.05Z"/>
      <path fill="#0c0b0b" d="M95,68.45c.13,1.1.47,1.98.88,2.99.84,2.02,2.13,4.33,3.16,6.31,1.96,3.78,4.15,7.45,6.2,11.18.39.07.23-.17.26-.43.28-3.26-.09-6.72-.18-9.97s.09-6.74-.51-10.07h6.02c-.45,1.61-.27,3.26-.34,4.91-.29,7.01-.29,14.13,0,21.14.07,1.64-.11,3.3.34,4.91h-6.02l-11.1-21.15c-.39-.07-.23.17-.26.43-.31,3.71.1,7.65.18,11.35.06,3.13-.2,6.28.34,9.38h-5.85c.45-3.11.27-6.25.34-9.38.13-5.85.22-11.68.01-17.54-.05-1.29-.29-2.73-.35-4.03h6.88Z"/>
      <path fill="#0aa98f" d="M4.32,87.03c.04-.58.23-1.15.34-1.72,3.52-17.37,24.06-18.15,36.83-25.02,1.32-.71,2.59-1.53,3.87-2.32.12-.04.11.13.09.26-.3,1.98-2.24,5.93-3.3,7.71-5.53,9.21-14.94,13.33-24.66,16.8-3.8,1.36-8.51,3.15-12.34,4.18-.27.07-.54.15-.83.12Z"/>
      <path fill="#0c0b0b" d="M176.91,99.41l.35-4.21c.14-5.46.09-10.9-.01-16.34-.07-3.48.11-6.96-.34-10.41,3.83.15,7.81-.19,11.62,0,5.29.26,10.21,1.66,11.21,7.54s-1.96,9.41-7.35,10.61l8.95,12.81h-7.92c-.16-1.59-.97-3.02-1.69-4.42-.5-.97-4.79-8.31-5.28-8.31h-3.87c0,4.25-.04,8.52.52,12.73h-6.19ZM182.59,83.07h6.97c.85,0,2.9-.84,3.53-1.46,1.88-1.82,1.79-5.82-.36-7.39-.52-.38-2.41-1.13-3-1.13h-6.97l-.17,9.97Z"/>
      <path fill="#0c0b0b" d="M202.72,99.41c.16-1.86.11-3.73.17-5.6.01-.45.18-.87.19-1.36.19-8-.02-16.03-.35-24,6.81.37,15.72-1.82,19.93,5.11,3.18,5.23,3.37,15,.24,20.29-4.32,7.28-13.01,5.27-20.16,5.56ZM208.4,94.77h4.73c7.48,0,7.5-13.28,5.23-17.95-.76-1.57-2.88-3.55-4.71-3.55h-5.25v21.5Z"/>
      <path fill="#0c0b0b" d="M53.88,99.41c.09-.89.3-1.96.34-2.84.33-7.13.22-14.36,0-21.49-.07-2.22.1-4.44-.34-6.63,7.19.37,16.1-1.92,20.33,5.56,2.88,5.08,2.98,14.37.17,19.49-4.21,7.67-13.19,5.63-20.5,5.9ZM59.73,94.77h4.56c7.61,0,7.71-13.12,5.37-17.92-.77-1.58-2.83-3.58-4.68-3.58h-5.25v21.5Z"/>
      <path fill="#0aa98f" d="M44.07,105.43c-4.6,1.67-9.06,2.57-13.94,1.64-8.71-1.66-15.07-8.8-21.5-14.28-1.25-1.07-3.02-2.18-4.13-3.26-.18-.18-.4-.3-.34-.6,4.34-1.7,8.64-2.59,13.28-1.67,8.12,1.6,14.37,8.73,20.53,13.7,1.97,1.59,4.02,3.05,6.1,4.47Z"/>
      <path fill="#0c0b0b" d="M148.35,99.41c3-9.01,6.47-17.92,8.93-27.1.16-.6.67-3.54.78-3.69.27-.39,6.61-.03,7.56-.17,2.93,10.47,6.3,20.85,10.26,30.97h-6.37c.02-1.39-.36-2.95-.81-4.26-.19-.55-.27-1.45-.98-1.43l-11.68.04c-.25.08-.28.29-.37.49-.69,1.47-.69,3.7-1.38,5.16h-5.94ZM157.29,89.26h9.46l-4.91-14.1-4.56,14.1Z"/>
      <path fill="#0c0b0b" d="M244.53,86.68c-3.64-.57-7.34-.27-11.01-.34l.17,8.08c2.9-.15,5.8.23,8.7.18.41,0,.78-.17,1.19-.19,1.7-.09,3.24.12,4.91-.51l-.52,5.84-20.48-.6c.1-1.03.31-2.25.35-3.27.25-6.31.16-12.61,0-18.91-.07-2.85.09-5.69-.34-8.52l19.63-.27.5,5.77c-1.2-.47-2.57-.62-3.86-.69-3.34-.18-6.74.1-10.07.18l-.17,8.08c3.67-.09,7.38.26,11.01-.34v5.5Z"/>
      <path fill="#0c0b0b" d="M144.56,75.68c-6.48-5.9-12.65-1.98-13.25,6.11-.52,7.01,1.13,16.32,10.47,12.79-.1-4.51.37-9.11-.32-13.56h5.51v18.4c-.92-.11-2.11-.32-3.01-.34-4.7-.13-8.27,2.91-13.15-.79-7.21-5.48-6.95-24.38,1.31-28.93,4.27-2.35,7.44-1.51,11.75-.28.33.09.81.02,1.05.16.38.22-.35,1.69-.35,2.07v4.39Z"/>
      <path fill="#6e6f72" d="M5.01,31.99l6.28,3.95c.58.38,3.74,2.38,3.84,2.7l.04,25.6-.18.5c-3.7,2.41-6.93,5.64-9.04,9.54l-.94,2.07V31.99Z"/>
      <path fill="#0c0b0b" d="M294.94,69.66c-.06,2.19-.14,4.33,0,6.53-.3.08-.34-.12-.52-.26-2.86-2.21-4.42-3.32-8.35-3.02-2.45.19-7.16,2.07-5.21,5.22,1.36,2.2,7.74,3.83,10.24,5.24,8.54,4.85,5.61,14.97-3.52,16.49-4.02.67-7.96-.22-11.92-.89l-.16-6.46c3.11,2.35,7.41,3.14,11.18,2.15,3.52-.93,5.2-4.22,1.78-6.59-3.12-2.16-7.36-2.75-10.38-5.28-5.45-4.56-3.08-12.15,3.35-14.2,4.76-1.51,8.92-.22,13.51,1.04Z"/>
      <path fill="#6e6f72" d="M32.54,27.35l7.83,4.98,2.29,1.67.05,19.06-.12.27c-3.24,1.62-6.49,3.46-10.05,4.28v-30.27Z"/>
      <path fill="#0c0b0b" d="M85.54,68.45c-.53,3.27-.27,6.59-.34,9.9-.12,5.98-.29,12.06-.01,18.06.04.95.3,2.04.35,3h-6.28v-30.96h6.28Z"/>
    </svg>
  );

  return (
    <div className="space-y-6 pb-24 overflow-x-hidden flex flex-col items-center">
      <div className="w-full max-w-[210mm] flex justify-between items-center px-4 pt-4">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-2 p-2 text-slate-500 hover:text-slate-900 border rounded-lg transition-all">
            <ArrowLeft size={16} /> <span className="text-xs font-bold uppercase">Back</span>
          </button>
        )}
        <button onClick={downloadPDF} disabled={isDownloading} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-lg font-bold text-xs uppercase tracking-widest disabled:opacity-50 shadow-xl active:scale-95 transition-all">
          {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Export Official PDF
        </button>
      </div>

      <div className="origin-top scale-[0.4] sm:scale-[0.6] md:scale-[0.8] lg:scale-100 min-w-[210mm]">
        <div 
          ref={statementRef} 
          data-statement-container
          className="bg-white p-10 w-[210mm] min-h-[297mm] shadow-2xl border" 
          style={{ fontFamily: 'Arial, sans-serif', fontSize: '10.5px', color: '#000' }}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col items-start gap-1">
              <Logo />
              <div className="font-bold text-[10px] tracking-[0.2em] pl-1 uppercase text-slate-500">FAISALABAD</div>
            </div>
            <div className="text-center flex-1">
              <h1 className="text-[14px] font-bold">DIN Properties (Pvt.) Ltd.</h1>
              <h2 className="text-[16px] font-bold border-b-2 border-black inline-block px-4 pb-0.5 mt-1 underline">Customer Account Statement</h2>
            </div>
            <div className="w-[120px]"></div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-x-20 mb-4">
            <div className="space-y-1">
              <div className="grid grid-cols-[130px_1fr]"><span className="font-bold">Reg Date:</span> <span>{v(file.regDate)}</span></div>
              <div className="grid grid-cols-[130px_1fr]"><span className="font-bold">Currency No:</span> <span>{v(file.currencyNo)}</span></div>
              <div className="grid grid-cols-[130px_1fr]"><span className="font-bold">Plot Size:</span> <span>{v(file.plotSize)}</span></div>
              <div className="grid grid-cols-[130px_1fr]"><span className="font-bold">Plot Value (PKR):</span> <span>{format(file.plotValue)}</span></div>
              <div className="grid grid-cols-[130px_1fr]"><span className="font-bold">Balance (PKR):</span> <span>{format(totals.grandBalance)}</span></div>
              <div className="grid grid-cols-[130px_1fr]"><span className="font-bold">OverDue (PKR):</span> <span className="font-bold">{format(totals.totalOverdue)}</span></div>
              <div className="grid grid-cols-[130px_1fr]"><span className="font-bold">Surcharge (PKR):</span> <span className="font-bold">{format(totals.grandSurcharge)}</span></div>
            </div>
            <div className="space-y-1">
              <div className="grid grid-cols-[100px_1fr]"><span className="font-bold">File No:</span> <span className="font-bold">{v(file.fileNo)}</span></div>
              <div className="grid grid-cols-[100px_1fr]"><span className="font-bold">Owner CNIC:</span> <span>{v(file.ownerCNIC)}</span></div>
              <div className="grid grid-cols-[100px_1fr]"><span className="font-bold">Owner Name:</span> <span className="uppercase">{v(file.ownerName)}</span></div>
              <div className="grid grid-cols-[100px_1fr]"><span className="font-bold">S/O, D/O, W/O:</span> <span className="uppercase">{v(file.fatherName)}</span></div>
              <div className="grid grid-cols-[100px_1fr]"><span className="font-bold">Cell No:</span> <span>{v(file.cellNo)}</span></div>
              <div className="grid grid-cols-[100px_1fr]"><span className="font-bold">Address:</span> <span className="leading-[1.1] uppercase">{v(file.address)}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-5 text-[9px] font-bold mb-3 border-b border-black pb-1 uppercase">
            <div>Plot No: {v(file.plotNo)}</div>
            <div>Block: {v(file.block)}</div>
            <div>Park: {v(file.park)}</div>
            <div>Corner: {v(file.corner)}</div>
            <div>MB: {v(file.mainBoulevard)}</div>
          </div>

          <div className="border border-black p-1 text-[9px] mb-4 font-bold text-center uppercase">
            Note: Payments are due by the 10th of every month. 3.5% per month surcharge will apply on late payment.
          </div>

          {/* SAP Ledger Table */}
          <table className="w-full border-collapse text-[9px]">
            <thead>
              <tr className="border border-black font-bold text-center bg-white">
                <th colSpan={4} className="border-r border-black py-1">Receivable</th>
                <th colSpan={4} className="border-r border-black py-1">Received</th>
                <th colSpan={2} className="py-1">Balance</th>
              </tr>
              <tr className="border border-black font-bold text-center bg-white">
                <th className="border-r border-black px-1 py-1 w-[65px]">Due Date</th>
                <th className="border-r border-black px-1 py-1 w-[35px]">Int No</th>
                <th className="border-r border-black px-1 py-1 text-left pl-2">Installment Type</th>
                <th className="border-r border-black px-1 py-1 w-[80px] text-right pr-1">receivable</th>
                <th className="border-r border-black px-1 py-1 w-[70px]">Receipt Date</th>
                <th className="border-r border-black px-1 py-1 text-left pl-2">Mode of Payment</th>
                <th className="border-r border-black px-1 py-1 w-[70px]">Instrument No</th>
                <th className="border-r border-black px-1 py-1 w-[75px] text-right pr-1">Amount</th>
                <th className="border-r border-black px-1 py-1 w-[80px] text-right pr-1">OS Balance</th>
                <th className="px-1 py-1 w-[65px] text-right pr-1">Surcharge</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={10} className="px-1 font-bold italic underline py-1 uppercase">Payment Plan</td></tr>
              {groupedTransactions.paymentPlan.map((group, groupIdx) => {
                const rec = group.receivableRow;
                const recVal = rec.receivable || 0;
                const today = new Date(); today.setHours(0, 0, 0, 0);
                let cumulativePaid = 0;
                const totalPaidForThisInt = group.receipts.reduce((s, r) => s + (r.amount_paid || 0), 0);
                const isFullyPaid = totalPaidForThisInt >= recVal;
                const dueDate = parseSAPDate(rec.duedate);
                const shouldHighlightGroup = (dueDate && dueDate < today && !isFullyPaid);
                const hideDate = shouldHideDate(rec.u_intname);

                if (group.receipts.length === 0) {
                  return (
                    <tr key={groupIdx} className={`border-b border-gray-200 ${shouldHighlightGroup ? 'bg-[#ffff00]' : ''}`}>
                      <td className="border-x border-gray-200 text-center py-1">{hideDate ? '-' : v(rec.duedate)}</td>
                      <td className="border-r border-gray-200 text-center py-1">{v(rec.u_intno?.toString())}</td>
                      <td className="border-r border-gray-200 pl-2 uppercase">{v(rec.u_intname)}</td>
                      <td className="border-r border-gray-200 text-right pr-1">{format(recVal)}</td>
                      <td className="border-r border-gray-200 text-center">-</td>
                      <td className="border-r border-gray-200 pl-2">-</td>
                      <td className="border-r border-gray-200 text-center">-</td>
                      <td className="border-r border-gray-200 text-right pr-1">-</td>
                      <td className="border-r border-gray-200 text-right pr-1 font-medium">{format(recVal)}</td>
                      <td className="text-right pr-1 font-bold">-</td>
                    </tr>
                  );
                }

                return group.receipts.map((receipt, rIdx) => {
                  cumulativePaid += (receipt.amount_paid || 0);
                  const installmentBalance = Math.max(0, recVal - cumulativePaid);
                  const isInstallmentClearedNow = cumulativePaid >= recVal;
                  const isLastReceiptOfInstallment = rIdx === group.receipts.length - 1;
                  return (
                    <tr key={`${groupIdx}-${rIdx}`} className={`border-b border-gray-200 ${shouldHighlightGroup ? 'bg-[#ffff00]' : ''}`}>
                      <td className="border-x border-gray-200 text-center py-1">{rIdx === 0 ? (hideDate ? '-' : v(rec.duedate)) : ''}</td>
                      <td className="border-r border-gray-200 text-center py-1">{rIdx === 0 ? v(rec.u_intno?.toString()) : ''}</td>
                      <td className="border-r border-gray-200 pl-2 uppercase">{rIdx === 0 ? v(rec.u_intname) : ''}</td>
                      <td className="border-r border-gray-200 text-right pr-1">{rIdx === 0 ? format(recVal) : ''}</td>
                      <td className="border-r border-gray-200 text-center">{v(receipt.receipt_date)}</td>
                      <td className="border-r border-gray-200 pl-2 uppercase">{v(receipt.mode)}</td>
                      <td className="border-r border-gray-200 text-center">{v(receipt.instrument_no)}</td>
                      <td className="border-r border-gray-200 text-right pr-1">{format(receipt.amount_paid)}</td>
                      <td className="border-r border-gray-200 text-right pr-1 font-medium">
                        {isLastReceiptOfInstallment && !isInstallmentClearedNow ? format(installmentBalance) : '-'}
                      </td>
                      <td className="text-right pr-1 font-bold">{format(receipt.surcharge)}</td>
                    </tr>
                  );
                });
              })}

              <tr><td colSpan={10} className="px-1 font-bold italic underline py-1 uppercase">Other / Adjustments</td></tr>
              {groupedTransactions.other.map((t, idx) => {
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const dueDate = parseSAPDate(t.duedate);
                const osBal = t.balduedeb || 0;
                const highlight = dueDate && dueDate < today && osBal > 0;
                const hideDate = shouldHideDate(t.u_intname);
                return (
                  <tr key={`other-${idx}`} className={`border-b border-gray-200 ${highlight ? 'bg-[#ffff00]' : ''}`}>
                    <td className="border-x border-gray-200 text-center py-1">{hideDate ? '-' : v(t.duedate)}</td>
                    <td className="border-r border-gray-200 text-center py-1">-</td>
                    <td className="border-r border-gray-200 pl-2 uppercase">{v(t.u_intname) || 'OTHER'}</td>
                    <td className="border-r border-gray-200 text-right pr-1">{format(t.receivable)}</td>
                    <td className="border-r border-gray-200 text-center">{v(t.receipt_date)}</td>
                    <td className="border-r border-gray-200 pl-2 uppercase">{v(t.mode)}</td>
                    <td className="border-r border-gray-200 text-center">{v(t.instrument_no)}</td>
                    <td className="border-r border-gray-200 text-right pr-1">{format(t.amount_paid)}</td>
                    <td className="border-r border-gray-200 text-right pr-1 font-medium">{format(t.balduedeb)}</td>
                    <td className="text-right pr-1 font-bold">{format(t.surcharge)}</td>
                  </tr>
                );
              })}
              
              <tr className="font-bold border-y border-black">
                <td colSpan={3} className="px-2 py-1 text-right uppercase">Total Payment Plan (PKR) :</td>
                <td className="border-x border-black text-right pr-1">{format(totals.planRec)}</td>
                <td colSpan={3} className="border-r border-black"></td>
                <td className="border-r border-black text-right pr-1">{format(totals.planReceived)}</td>
                <td className="border-r border-black text-right pr-1 font-bold">{format(totals.planBalance)}</td>
                <td className="text-right pr-1">{format(totals.planSurcharge)}</td>
              </tr>

              <tr className="font-bold border-b-4 border-black border-double">
                <td colSpan={3} className="px-2 py-1 text-right uppercase">Grand Total (PKR) :</td>
                <td className="border-x border-black text-right pr-1">{format(totals.grandRec)}</td>
                <td colSpan={3} className="border-r border-black"></td>
                <td className="border-r border-black text-right pr-1">{format(totals.grandReceived)}</td>
                <td className="border-r border-black text-right pr-1 font-bold">{format(totals.grandBalance)}</td>
                <td className="text-right pr-1">{format(totals.grandSurcharge)}</td>
              </tr>
            </tbody>
          </table>

          {/* Footer Metadata */}
          <div className="mt-auto pt-20 flex justify-between items-end text-[9px]">
            <div className="text-slate-500"><p>Page 1 of 1</p></div>
            <div className="text-right text-slate-500">
              <p>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} &nbsp; {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</p>
              <p className="font-bold uppercase text-black">Printed By: manager</p>
              <p className="italic">Printed by SAP Business One</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountStatement;
