import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { X, MapPin, Phone, Mail, Package, AlertTriangle, CheckCircle, FileText, Printer, ArrowLeft, Clock, BarChart3, PenTool } from 'lucide-react';
import SignatureViewerModal from '../components/SignatureViewerModal';

interface DriverProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: any;
}

export default function DriverProfileModal({ isOpen, onClose, driver }: DriverProfileModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewType, setPreviewType] = useState<'daily' | 'monthly' | null>(null);
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // State за подписите
  const [previewSignatures, setPreviewSignatures] = useState<{clientName: string, driver: string, client: string} | null>(null);

  const [stats, setStats] = useState({
    dailySuccess: 0,
    dailyIssues: 0,
    monthlySuccess: 0,
    monthlyIssues: 0
  });

  useEffect(() => {
    if (isOpen && driver) {
      fetchDriverHistory();
      setPreviewType(null);
    }
  }, [isOpen, driver]);

  const calculateDuration = (start: any, end: any) => {
    if (!start || !end) return 0;
    const s = start.toDate ? start.toDate() : new Date(start);
    const e = end.toDate ? end.toDate() : new Date(end);
    return e.getTime() - s.getTime();
  };

  const formatMsToTime = (ms: number) => {
    if (ms <= 0) return "0 ч. и 0 мин.";
    const totalMins = Math.floor(ms / (1000 * 60));
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h} ч. и ${m} мин.`;
  };

  const fetchDriverHistory = async () => {
    setLoading(true);
    try {
      const qDeliveries = query(
        collection(db, 'deliveryHistory'), 
        where('driverId', '==', driver.id), 
        orderBy('timestamp', 'desc') 
      );
      const qShifts = query(
        collection(db, 'shifts'), 
        where('driverId', '==', driver.id), 
        orderBy('startTime', 'desc')
      );

      const [deliveriesSnap, shiftsSnap] = await Promise.all([getDocs(qDeliveries), getDocs(qShifts)]);
      const deliveriesDocs = deliveriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const shiftsDocs = shiftsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setHistory(deliveriesDocs);
      setShifts(shiftsDocs);
      
      const now = new Date();
      const todayStr = now.toDateString();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const newStats = deliveriesDocs.reduce((acc, curr: any) => {
        const date = curr.timestamp?.toDate ? curr.timestamp.toDate() : new Date();
        const mealCount = Number(curr.mealCount) || 1;
        if (date.toDateString() === todayStr) {
          if (curr.status === 'success') acc.dailySuccess += mealCount;
          else acc.dailyIssues++;
        }
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
          if (curr.status === 'success') acc.monthlySuccess += mealCount;
          else acc.monthlyIssues++;
        }
        return acc;
      }, { dailySuccess: 0, dailyIssues: 0, monthlySuccess: 0, monthlyIssues: 0 });

      setStats(newStats);
    } catch (err) {
      console.error("Грешка при зареждане:", err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityData = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toDateString();
      
      const dayItems = history.filter(h => h.timestamp?.toDate().toDateString() === dayStr);
      const successCount = dayItems.filter(h => h.status === 'success').length;
      const issueCount = dayItems.filter(h => h.status !== 'success').length;

      days.push({ 
        day: d.toLocaleDateString('bg-BG', { weekday: 'short' }), 
        success: successCount, 
        issues: issueCount,
        total: successCount + issueCount 
      });
    }
    const maxTotal = Math.max(...days.map(d => d.total), 1);
    return { days, maxTotal };
  };

  const getFilteredReportData = () => {
    return history.filter(item => {
      const date = item.timestamp?.toDate ? item.timestamp.toDate() : new Date();
      if (previewType === 'daily') return date.toDateString() === new Date(selectedDate).toDateString();
      if (previewType === 'monthly') return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
      return false;
    });
  };

  const executePrint = () => {
    const reportData = [...getFilteredReportData()].sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
    
    const periodShifts = shifts.filter(s => {
      const sDate = s.startTime?.toDate();
      if (previewType === 'daily') return sDate.toDateString() === new Date(selectedDate).toDateString();
      return sDate.getMonth() === selectedMonth && sDate.getFullYear() === selectedYear;
    });

    const totalMs = periodShifts.reduce((acc, s) => acc + calculateDuration(s.startTime, s.endTime), 0);
    const timeLabel = previewType === 'daily' ? "Отработено време за деня" : "Общо отработено време за месеца";
    const title = previewType === 'daily' ? `Дневен отчет - ${new Date(selectedDate).toLocaleDateString('bg-BG')}` : `Месечен отчет - ${new Date(selectedYear, selectedMonth).toLocaleString('bg-BG', { month: 'long', year: 'numeric' })}`;
    
    const totalSuccess = reportData.filter(i => i.status === 'success').reduce((sum, item) => sum + (Number(item.mealCount) || 0), 0);
    const totalIssues = reportData.filter(i => i.status !== 'success').length;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1e293b; }
            .header { border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 25px; }
            .summary { margin-bottom: 25px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 11px; }
            th { background: #f1f5f9; font-weight: bold; }
            .status-success { color: #059669; font-weight: bold; }
            .status-issue { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header"><h2>${title}</h2><p>Шофьор: ${driver.name} | Район: ${driver.routeArea || '---'}</p></div>
          <div class="summary">
            <p><strong>${timeLabel}:</strong> ${formatMsToTime(totalMs)}</p>
            <p><strong>Доставени порции:</strong> <span class="status-success">${totalSuccess}</span> | <strong>Проблеми:</strong> <span class="status-issue">${totalIssues}</span></p>
          </div>
          <table>
            <thead><tr><th>Час</th><th>Клиент</th><th>Меню</th><th>Брой</th><th>Статус</th></tr></thead>
            <<tbody>${reportData.map(item => `<tr><td>${item.timestamp?.toDate().toLocaleTimeString('bg-BG', {hour:'2-digit', minute:'2-digit'})}</td><td>${item.clientName}</td><td>${item.mealType || '---'}</td><td>${item.mealCount || 1}</td><td class="${item.status === 'success' ? 'status-success' : 'status-issue'}">${item.status === 'success' ? 'ДОСТАВЕНО' : 'ПРОБЛЕМ'}</td></tr>`).join('')}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  if (!isOpen) return null;
  const activity = getActivityData();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-b p-6 bg-slate-50 gap-4 text-slate-900">
          <div className="flex items-center gap-4">
            {previewType ? (
              <button onClick={() => setPreviewType(null)} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100"><ArrowLeft className="w-5 h-5 text-blue-600" /></button>
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">{driver.name.charAt(0)}</div>
            )}
            <div>
              <h2 className="text-xl font-bold">{previewType ? (previewType === 'daily' ? 'Дневен Отчет' : 'Месечен Отчет') : driver.name}</h2>
              {previewType === 'daily' && <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="mt-1 text-xs font-bold text-blue-600 bg-transparent border-none p-0 focus:ring-0 cursor-pointer" />}
              {previewType === 'monthly' && (
                <div className="flex gap-2 mt-1">
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="text-[10px] font-bold text-blue-600 bg-transparent border-none p-0 focus:ring-0 uppercase">
                    {['Ян', 'Фев', 'Мар', 'Апр', 'Май', 'Юни', 'Юли', 'Авг', 'Сеп', 'Окт', 'Ное', 'Дек'].map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="text-[10px] font-bold text-blue-600 bg-transparent border-none p-0 focus:ring-0">
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              )}
              {!previewType && <p className="text-xs text-slate-500 font-medium">{driver.routeArea || 'Няма район'}</p>}
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!previewType ? (
              <>
                <button onClick={() => setPreviewType('daily')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"><FileText className="w-4 h-4 text-blue-600" /> Дневен</button>
                <button onClick={() => setPreviewType('monthly')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"><FileText className="w-4 h-4 text-blue-600" /> Месечен</button>
              </>
            ) : (
              <button onClick={executePrint} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 px-6 py-2.5 rounded-xl text-xs font-bold text-white hover:bg-blue-700 shadow-lg"><Printer className="w-4 h-4" /> ПЕЧАТ</button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors ml-2"><X className="w-6 h-6 text-slate-500" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-900">
          {!previewType ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                  <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Днес Успешни</p>
                  <p className="text-2xl font-black text-emerald-700">{stats.dailySuccess}</p>
                </div>
                <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-center">
                  <p className="text-[10px] text-red-600 font-bold uppercase mb-1">Днес Проблеми</p>
                  <p className="text-2xl font-black text-red-700">{stats.dailyIssues}</p>
                </div>
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                  <p className="text-[10px] text-blue-600 font-bold uppercase mb-1">Месец Успешни</p>
                  <p className="text-2xl font-black text-blue-700">{stats.monthlySuccess}</p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                  <p className="text-[10px] text-amber-600 font-bold uppercase mb-1">Месец Проблеми</p>
                  <p className="text-2xl font-black text-amber-700">{stats.monthlyIssues}</p>
                </div>
              </div>

              <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 shadow-inner">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Дневна активност (7 дни)</h3>
                  </div>
                  <div className="flex gap-4 text-[9px] font-black uppercase tracking-tighter">
                    <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Успешни</div>
                    <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />Проблеми</div>
                  </div>
                </div>

                <div className="flex items-end justify-between h-40 gap-3 px-2 mt-4">
                  {activity.days.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                      <div className="relative w-full flex flex-col justify-end h-40">
                        <div className="relative w-full flex flex-col justify-end" style={{ height: `${(d.total / activity.maxTotal) * 85}%` }}>
                          <div 
                            style={{ height: `${(d.issues / (d.total || 1)) * 100}%` }}
                            className="w-full bg-red-500/90 rounded-t-md z-10 shadow-sm transition-all duration-700"
                          />
                          <div 
                            style={{ height: `${(d.success / (d.total || 1)) * 100}%` }}
                            className="w-full bg-emerald-500/90 rounded-b-md shadow-sm transition-all duration-700"
                          />
                        </div>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[9px] px-2 py-1 rounded-md pointer-events-none whitespace-nowrap z-20">
                          {d.success} ✓ / {d.issues} ⚠️
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase">{d.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-md font-bold text-slate-900 mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-slate-400" /> Последна активност (14 дни)</h3>
                {loading ? <div className="text-center py-10 italic text-slate-400">Зареждане...</div> : (
                  <div className="space-y-3">
                    {history.filter(item => {
                      const d = item.timestamp?.toDate();
                      const limit = new Date(); limit.setDate(limit.getDate() - 14);
                      return d >= limit;
                    }).slice(0, 10).map(item => {
                      const hasSignatures = !!(item.driverSignature || item.clientSignature);

                      return (
                        <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white shadow-sm transition-all">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-xl ${item.status === 'success' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                              {item.status === 'success' ? (
                                <CheckCircle className="w-5 h-5 text-emerald-500" />
                              ) : (
                                <X className="w-5 h-5 text-red-500" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold">{item.clientName || 'Клиент'} — {item.mealType}</p>
                              <p className="text-[11px] text-slate-400">{item.timestamp?.toDate().toLocaleString('bg-BG')}</p>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${item.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {item.status === 'success' ? 'ДОСТАВЕНО' : 'ПРОБЛЕМ'}
                            </span>
                            
                            {item.status === 'success' && hasSignatures && (
                              <button 
                                onClick={() => setPreviewSignatures({ 
                                  clientName: item.clientName || 'Клиент',
                                  driver: item.driverSignature || '', 
                                  client: item.clientSignature || '' 
                                })}
                                className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded-md hover:bg-blue-50"
                              >
                                <PenTool className="w-3 h-3" />
                                Подписи
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-inner">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100"><tr><th className="px-4 py-3 font-bold text-slate-700 text-left">Дата/Час</th><th className="px-4 py-3 font-bold text-slate-700 text-left">Клиент</th><th className="px-4 py-3 font-bold text-slate-700 text-center">Порции</th><th className="px-4 py-3 font-bold text-slate-700 text-center">Статус</th></tr></thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
                  {getFilteredReportData().length > 0 ? getFilteredReportData().map(item => (
                    <tr key={item.id}><td className="px-4 py-3 text-xs">{item.timestamp?.toDate().toLocaleString('bg-BG')}</td><td className="px-4 py-3 font-medium">{item.clientName || '---'}</td><td className="px-4 py-3 text-center">{item.mealCount || 1}</td><td className="px-4 py-3 text-center"><span className={item.status === 'success' ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>{item.status === 'success' ? 'ДОСТАВЕНО' : 'ПРОБЛЕМ'}</span></td></tr>
                  )) : (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400 italic">Няма данни за избрания период.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <SignatureViewerModal
        isOpen={!!previewSignatures}
        onClose={() => setPreviewSignatures(null)}
        clientName={previewSignatures?.clientName || ''}
        driver={previewSignatures?.driver || ''}
        client={previewSignatures?.client || ''}
      />

    </div>
  );
}