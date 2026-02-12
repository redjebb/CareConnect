import { useEffect, useMemo, useState } from 'react';
import type { ClientHistoryEntry, ClientRegistryEntry } from '../types';
import { getClientMonthlyReport } from '../services/reportService';
import { X, User, MapPin, Phone, Calendar, Printer, PlusCircle, AlertCircle, Clock, ChevronRight } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  entry: ClientRegistryEntry | null;
  history: ClientHistoryEntry[];
  isLoading: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onQuickSchedule?: (entry: ClientRegistryEntry) => void; 
}

type MonthlyDeliveryData = {
  id: string;
  date: string;
  time: string;
  mealType: string;
  mealCount: number;
  status: string;
  hasIssue?: boolean;
  completed?: boolean;
  issueType?: string;
  issueDescription?: string;
};

const getSafeDate = (val: any): Date | null => {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (typeof val.seconds === 'number') return new Date(val.seconds * 1000);
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const monthInputValueFromDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const dateFromMonthInputValue = (value: string) => {
  const [yRaw, mRaw] = (value ?? '').split('-');
  const y = Number(yRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return new Date();
  return new Date(y, m - 1, 1);
};

export default function UserProfileModal({
  isOpen,
  entry,
  isLoading,
  errorMessage,
  onClose,
  onQuickSchedule
}: UserProfileModalProps) {
  const [reportDate, setReportDate] = useState(new Date());
  const [currentMonthData, setCurrentMonthData] = useState<MonthlyDeliveryData[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    const egn = entry?.egn?.trim();
    if (!egn) {
      setCurrentMonthData([]);
      return;
    }
    let isCancelled = false;
    const fetchDeliveries = async () => {
      setReportLoading(true);
      try {
        const data = await getClientMonthlyReport(egn, reportDate);
        if (isCancelled) return;
        const deliveriesRaw = (data as any)?.deliveries || [];
        const normalized: MonthlyDeliveryData[] = deliveriesRaw.map((row: any, index: number) => {
          const d = getSafeDate(row?.timestamp);
          return {
            id: row?.id || `delivery-${index}`,
            date: d ? d.toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-',
            time: d ? d.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' }) : '-',
            mealType: row?.mealType || '—',
            mealCount: Number(row?.mealCount) || 1,
            status: row?.status || '',
            hasIssue: row?.hasIssue === true,
            completed: row?.completed === true,
            issueType: row?.issueType || '',
            issueDescription: row?.issueDescription || ''
          };
        });
        setCurrentMonthData(normalized);
      } catch (err) {
        if (!isCancelled) setCurrentMonthData([]);
      } finally {
        if (!isCancelled) setReportLoading(false);
      }
    };
    void fetchDeliveries();
    return () => { isCancelled = true; };
  }, [reportDate, entry?.egn]);

  const reportPeriodLabel = useMemo(() => {
    return reportDate.toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' });
  }, [reportDate]);

  const successfulDeliveriesCount = currentMonthData.filter(item => (item.status === 'success' || item.completed === true) && !item.hasIssue).length;
  const issuesCount = currentMonthData.filter(item => item.status === 'issue' || item.hasIssue === true).length;
  const deliveredPortionsThisMonth = currentMonthData
    .filter(item => (item.status === 'success' || item.completed === true) && !item.hasIssue)
    .reduce((sum, item) => sum + (Number(item?.mealCount) || 1), 0);

  if (!isOpen || !entry) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95">
        
        {/* НОВИЯТ ОЛЕКОТЕН CSS ЗА ПЕЧАТ */}
        <style>{`
          @media screen { 
            #printable-report { display: none !important; } 
          }
          @media print {
            /* 1. Правим всичко на страницата невидимо */
            body * { 
              visibility: hidden !important; 
            }
            
            /* 2. Показваме САМО отчета и неговите деца */
            #printable-report, #printable-report * { 
              visibility: visible !important; 
            }
            
            /* 3. Форсираме отчета да застане най-горе на листа */
            #printable-report { 
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              display: block !important;
            }

            @page {
              size: A4;
              margin: 10mm;
            }
          }
        `}</style>

        {/* HEADER */}
        <header className="flex items-center justify-between px-8 py-6 border-b border-slate-50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <User className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-tight">{entry.name}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">ЕГН: {entry.egn}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          <div 
            onClick={() => onQuickSchedule?.(entry)}
            className="group cursor-pointer bg-white rounded-[2rem] p-5 border-2 border-blue-500/20 hover:border-blue-500 flex items-center justify-between transition-all shadow-sm hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Бързо действие</p>
                <p className="text-sm font-bold text-slate-700">Добави клиента в днешния график</p>
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50/50 rounded-3xl p-5 border border-emerald-100/50">
               <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Успешни</p>
               <p className="text-3xl font-black text-emerald-700 mt-1">{successfulDeliveriesCount}</p>
            </div>
            <div className="bg-blue-50/50 rounded-3xl p-5 border border-blue-100/50">
               <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Порции за месеца</p>
               <p className="text-3xl font-black text-blue-700 mt-1">{deliveredPortionsThisMonth}</p>
            </div>
            <div className="bg-red-50/50 rounded-3xl p-5 border border-red-100/50">
               <p className="text-[10px] font-black uppercase text-red-600 tracking-widest">Проблеми</p>
               <p className="text-3xl font-black text-red-700 mt-1">{issuesCount}</p>
            </div>
          </section>

          <div className="grid lg:grid-cols-[300px_1fr] gap-8">
            <aside className="space-y-6">
              <div className="space-y-4">
                 <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-2"><MapPin className="w-3 h-3"/> Адрес</p>
                    <p className="text-xs font-bold text-slate-600 leading-relaxed">{entry.address}</p>
                 </div>
                 <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-2"><Phone className="w-3 h-3"/> Телефон</p>
                    <p className="text-xs font-bold text-slate-600">{entry.phone || '—'}</p>
                 </div>
              </div>

              <div className="p-6 bg-white border-2 border-slate-100 rounded-[2rem] space-y-4">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Генериране на отчет</p>
                <input
                  type="month"
                  value={monthInputValueFromDate(reportDate)}
                  onChange={e => setReportDate(e.target.value ? dateFromMonthInputValue(e.target.value) : new Date())}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
                />
                <button 
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
                >
                  <Printer className="w-4 h-4" /> Печат на отчет
                </button>
              </div>
            </aside>

            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">История на доставките</h3>
                {reportLoading && <Clock className="w-4 h-4 text-blue-500 animate-spin" />}
              </div>

              <div className="space-y-3">
                {currentMonthData.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100">
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Няма записи за периода</p>
                  </div>
                ) : (
                  currentMonthData.map((item, index) => {
                    const isIssue = item.status === 'issue' || item.hasIssue;
                    return (
                      <div key={item.id || index} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isIssue ? 'bg-red-50/30 border-red-100' : 'bg-white border-slate-100'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isIssue ? 'bg-red-100 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                            {isIssue ? <AlertCircle className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900">{item.date} <span className="opacity-30 ml-1 font-bold">{item.time}</span></p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{item.mealCount}× {item.mealType}</p>
                          </div>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${isIssue ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {isIssue ? 'Проблем' : 'Доставено'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>

        {/* ПЕЧАТЕН ОТЧЕТ - ТУК НЕ ПИПАМЕ НИЩО ВЪТРЕ */}
        <div id="printable-report">
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.5 }}>МЕСЕЧЕН ОТЧЕТ ЗА ДОСТАВКА НА ХРАНА</div>
          <div style={{ marginTop: 6, fontSize: 12, color: '#475569' }}>CareConnect • Период: {reportPeriodLabel}</div>
          <div style={{ marginTop: 14, fontSize: 12 }}>
            <div><strong>Клиент:</strong> {entry?.name}</div>
            <div><strong>ЕГН:</strong> {entry?.egn}</div>
            <div><strong>Адрес:</strong> {entry?.address}</div>
          </div>
          <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ color: '#059669' }}>
                <div style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>Успешни порции</div>
                <div style={{ fontSize: 20, fontWeight: 'bold' }}>{deliveredPortionsThisMonth}</div>
              </div>
              <div style={{ color: '#dc2626' }}>
                <div style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>Проблеми</div>
                <div style={{ fontSize: 20, fontWeight: 'bold' }}>{issuesCount}</div>
              </div>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 14, fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #e2e8f0', padding: 10, background: '#f8fafc', textAlign: 'left' }}>Дата</th>
                <th style={{ border: '1px solid #e2e8f0', padding: 10, background: '#f8fafc', textAlign: 'center' }}>Статус</th>
                <th style={{ border: '1px solid #e2e8f0', padding: 10, background: '#f8fafc', textAlign: 'center' }}>Брой</th>
              </tr>
            </thead>
            <tbody>
              {currentMonthData.map((d, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #e2e8f0', padding: 10 }}>{d.date}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: 10, textAlign: 'center', fontWeight: 'bold', color: (d.status==='issue'||d.hasIssue) ? '#dc2626' : '#059669' }}>
                    {(d.status==='issue'||d.hasIssue) ? 'ПРОБЛЕМ' : 'ДОСТАВЕНО'}
                  </td>
                  <td style={{ border: '1px solid #e2e8f0', padding: 10, textAlign: 'center' }}>{d.mealCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}