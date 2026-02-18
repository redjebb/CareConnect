import React, { useEffect, useState, useMemo } from 'react';
import { X, FileBarChart, Users, Package, AlertTriangle, Clock, Printer, Loader2, MapPin, User } from 'lucide-react';
import { getGlobalMonthlyReport } from '../services/reportService';

interface GlobalMonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminEmail: string;
}

export default function GlobalMonthlyReportModal({ isOpen, onClose, adminEmail }: GlobalMonthlyReportModalProps) {
  const [reportDate, setReportDate] = useState(new Date());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      void fetchData();
    }
  }, [isOpen, reportDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getGlobalMonthlyReport(reportDate);
      setData(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const reportPeriodLabel = useMemo(() => {
    return reportDate.toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' });
  }, [reportDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 border border-slate-100">
        
        <style>{`
          @media screen { 
            #global-print-area { display: none !important; } 
          }
          @media print {
            body * { visibility: hidden !important; }
            #global-print-area, #global-print-area * { visibility: visible !important; }
            #global-print-area { 
              display: block !important; 
              position: absolute !important; 
              left: 0 !important; 
              top: 0 !important; 
              width: 100% !important; 
              padding: 0 !important;
              margin: 0 !important;
            }
            @page { size: auto; margin: 10mm; }
          }
        `}</style>

        <header className="flex items-center justify-between px-8 py-6 border-b border-slate-50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <FileBarChart className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-tight">Глобален Отчет</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Системна заетост за {reportPeriodLabel}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <input
                type="month"
                value={`${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}`}
                onChange={(e) => setReportDate(new Date(e.target.value))}
                className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Агрегиране на данни...</p>
            </div>
          ) : data && (
            <>
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-blue-50/50 rounded-3xl p-6 border border-blue-100/50 transition-all hover:shadow-md">
                   <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-2">
                     <Users className="w-3 h-3"/> Общо Клиенти
                   </p>
                   <p className="text-4xl font-black text-blue-700 mt-2">{data.stats.uniqueClients}</p>
                </div>
                <div className="bg-emerald-50/50 rounded-3xl p-6 border border-emerald-100/50 transition-all hover:shadow-md">
                   <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest flex items-center gap-2">
                     <Package className="w-3 h-3"/> Изпълнени Доставки
                   </p>
                   <p className="text-4xl font-black text-emerald-700 mt-2">{data.stats.totalDeliveries}</p>
                </div>
                <div className="bg-red-50/50 rounded-3xl p-6 border border-red-100/50 transition-all hover:shadow-md">
                   <p className="text-[10px] font-black uppercase text-red-600 tracking-widest flex items-center gap-2">
                     <AlertTriangle className="w-3 h-3"/> Проблемни / Отказани
                   </p>
                   <p className="text-4xl font-black text-red-700 mt-2">{data.stats.totalIssues}</p>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Разбивка по персонал</h3>
                  <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-200"
                  >
                    <Printer className="w-4 h-4" /> Печат
                  </button>
                </div>

                <div className="grid gap-3">
                  {data.driverStats.map((driver: any, idx: number) => (
                    <div key={idx} className="group flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 hover:border-blue-200 transition-all hover:shadow-md">
                      <div className="flex items-center gap-5">
                        <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 leading-none">{driver.driverName}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                              <MapPin className="w-3 h-3" /> {driver.routeArea}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-8">
                        <div className="text-center">
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Доставки</p>
                          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black">{driver.deliveriesCount}</span>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Време</p>
                          <p className="text-xs font-black text-blue-600 flex items-center justify-end gap-1.5">
                            <Clock className="w-3.5 h-3.5 opacity-30" /> {driver.totalTime}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>

        <div id="global-print-area" className="p-10 bg-white">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
            <div>
              <h1 className="text-2xl font-black uppercase">Глобален Месечен Отчет</h1>
              <p className="text-sm font-bold text-slate-500">CareConnect Logistics Platform</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black">{reportPeriodLabel}</p>
              <p className="text-xs text-slate-400 tracking-widest uppercase">Системна справка</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-10">
            <div className="border border-slate-200 p-5 rounded-2xl text-center">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Общо Клиенти</p>
              <p className="text-2xl font-black text-blue-600">{data?.stats.uniqueClients}</p>
            </div>
            <div className="border border-slate-200 p-5 rounded-2xl text-center">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Изпълнени Доставки</p>
              <p className="text-2xl font-black text-emerald-600">{data?.stats.totalDeliveries}</p>
            </div>
            <div className="border border-slate-200 p-5 rounded-2xl text-center">
              <p className="text-[10px] font-black uppercase text-red-400 mb-1">Проблемни</p>
              <p className="text-2xl font-black text-red-600">{data?.stats.totalIssues}</p>
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase tracking-widest">
                <th className="py-4 px-2">Служител</th>
                <th className="py-4 px-2">Район</th>
                <th className="py-4 px-2 text-center">Доставки</th>
                <th className="py-4 px-2 text-right">Време за месеца</th>
              </tr>
            </thead>
            <tbody>
              {data?.driverStats.map((d: any, i: number) => (
                <tr key={i} className="border-b border-slate-100 text-sm">
                  <td className="py-4 px-2 font-bold text-slate-900">{d.driverName}</td>
                  <td className="py-4 px-2 text-slate-500">{d.routeArea}</td>
                  <td className="py-4 px-2 text-center font-black">{d.deliveriesCount}</td>
                  <td className="py-4 px-2 text-right font-black text-blue-600">{d.totalTime}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-20 flex justify-between items-end border-t border-slate-100 pt-8">
            <div className="text-right">
              <div className="w-40 h-16 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center mb-2">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Място за печат</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}