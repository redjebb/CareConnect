import React, { useEffect, useState, useMemo } from 'react';
import { X, FileBarChart, Users, Package, AlertTriangle, Clock, Printer, Loader2, MapPin, User } from 'lucide-react';
import { getGlobalMonthlyReport } from '../services/reportService';
import { useNotification } from './NotificationProvider';
import DriverProfileModal from './DriverProfileModal';

interface GlobalMonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminEmail: string;
}

export default function GlobalMonthlyReportModal({ isOpen, onClose, adminEmail }: GlobalMonthlyReportModalProps) {
  const { showNotification } = useNotification();
  const [reportDate, setReportDate] = useState(new Date());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [selectedDriver, setSelectedDriver] = useState<any>(null);

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

  const handlePrint = () => {
    if (!data) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showNotification('Моля, разрешете изскачащите прозорци (pop-ups), за да отпечатате отчета.', 'warning');
      return;
    }

    const rowsHtml = data.driverStats.map((d: any) => `
      <tr>
        <td style="border-bottom: 1px solid #e2e8f0; padding: 12px 8px; font-weight: bold;">${d.driverName}</td>
        <td style="border-bottom: 1px solid #e2e8f0; padding: 12px 8px; color: #64748b;">${d.routeArea || '---'}</td>
        <td style="border-bottom: 1px solid #e2e8f0; padding: 12px 8px; text-align: center; font-weight: bold;">${d.deliveriesCount}</td>
        <td style="border-bottom: 1px solid #e2e8f0; padding: 12px 8px; text-align: right; font-weight: bold; color: #2563eb;">${d.totalTime}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Глобален Отчет - ${reportPeriodLabel}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #0f172a; margin: 0; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
            .header-title { margin: 0; font-size: 24px; text-transform: uppercase; font-weight: 900; letter-spacing: 1px; }
            .header-subtitle { margin: 5px 0 0 0; font-size: 14px; font-weight: bold; color: #64748b; }
            .header-right { text-align: right; }
            .header-date { font-size: 14px; font-weight: 900; margin: 0; }
            .header-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin: 5px 0 0 0; }
            
            .stats-grid { display: flex; gap: 20px; margin-bottom: 40px; }
            .stat-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; background: #f8fafc; }
            .stat-label { font-size: 10px; font-weight: 900; text-transform: uppercase; margin: 0 0 5px 0; }
            .stat-val { font-size: 28px; font-weight: 900; margin: 0; }
            .color-blue { color: #2563eb; }
            .color-emerald { color: #059669; }
            .color-red { color: #dc2626; }

            table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 50px; }
            th { border-bottom: 2px solid #0f172a; padding: 12px 8px; text-align: left; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #475569; }
            th.center { text-align: center; }
            th.right { text-align: right; }
            
            .signature-area { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 30px; display: flex; justify-content: flex-end; }
            .stamp-box { width: 150px; height: 70px; border: 2px dashed #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
            .stamp-text { font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }

            @media print {
              body { padding: 0; }
              @page { margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <h1 class="header-title">Глобален Месечен Отчет</h1>
              <p class="header-subtitle">CareConnect Logistics Platform</p>
            </div>
            <div class="header-right">
              <p class="header-date">${reportPeriodLabel}</p>
              <p class="header-label">Системна справка</p>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-box">
              <p class="stat-label color-blue">Общо Клиенти</p>
              <p class="stat-val color-blue">${data.stats.uniqueClients}</p>
            </div>
            <div class="stat-box">
              <p class="stat-label color-emerald">Изпълнени Доставки</p>
              <p class="stat-val color-emerald">${data.stats.totalDeliveries}</p>
            </div>
            <div class="stat-box">
              <p class="stat-label color-red">Проблемни</p>
              <p class="stat-val color-red">${data.stats.totalIssues}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Служител</th>
                <th>Район</th>
                <th class="center">Доставки</th>
                <th class="right">Време за месеца</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="4" style="text-align:center; padding: 20px; color:#94a3b8; font-style:italic;">Няма данни за избрания период.</td></tr>'}
            </tbody>
          </table>

          <div class="signature-area">
            <div class="stamp-box">
              <span class="stamp-text">Място за печат</span>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 border border-slate-100">
        
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
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-200"
                  >
                    <Printer className="w-4 h-4" /> Печат
                  </button>
                </div>

                <div className="grid gap-3">
                  {data.driverStats.map((driver: any, idx: number) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedDriver({
                        id: driver.driverId,
                        name: driver.driverName,
                        routeArea: driver.routeArea
                      })}
                      className="group flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 hover:border-blue-200 transition-all hover:shadow-md cursor-pointer"
                    >
                      <div className="flex items-center gap-5">
                        <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 leading-none">{driver.driverName}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                              <MapPin className="w-3 h-3" /> {driver.routeArea || '---'}
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
      </div>

      {selectedDriver && (
        <DriverProfileModal
          isOpen={!!selectedDriver}
          onClose={() => setSelectedDriver(null)}
          driver={selectedDriver}
        />
      )}
    </div>
  );
}