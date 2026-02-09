import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { X, MapPin, Phone, Mail, Package, AlertTriangle, CheckCircle, FileText, Printer, ArrowLeft } from 'lucide-react';

interface DriverProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: any;
}

export default function DriverProfileModal({ isOpen, onClose, driver }: DriverProfileModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewType, setPreviewType] = useState<'daily' | 'monthly' | null>(null); // Логика за преглед
  const [stats, setStats] = useState({
    dailySuccess: 0,
    dailyIssues: 0,
    monthlySuccess: 0,
    monthlyIssues: 0
  });

  useEffect(() => {
    if (isOpen && driver) {
      fetchDriverHistory();
      setPreviewType(null); // Нулираме прегледа при всяко отваряне
    }
  }, [isOpen, driver]);

  const fetchDriverHistory = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'deliveryHistory'),
        where('driverId', '==', driver.id),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(docs);

      const now = new Date();
      const todayStr = now.toDateString();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const newStats = docs.reduce((acc, curr: any) => {
        const date = curr.timestamp?.toDate ? curr.timestamp.toDate() : new Date();
        const isToday = date.toDateString() === todayStr;
        const isThisMonth = date.getMonth() === currentMonth && date.getFullYear() === currentYear;

        if (isToday) {
          if (curr.status === 'success') acc.dailySuccess++;
          else acc.dailyIssues++;
        }
        if (isThisMonth) {
          if (curr.status === 'success') acc.monthlySuccess++;
          else acc.monthlyIssues++;
        }
        return acc;
      }, { dailySuccess: 0, dailyIssues: 0, monthlySuccess: 0, monthlyIssues: 0 });

      setStats(newStats);
    } catch (err) {
      console.error("Грешка при зареждане на историята:", err);
    } finally {
      setLoading(false);
    }
  };

  // Филтриране на данните за конкретния отчет
  const getFilteredReportData = () => {
    const now = new Date();
    return history.filter(item => {
      const date = item.timestamp?.toDate ? item.timestamp.toDate() : new Date();
      if (previewType === 'daily') return date.toDateString() === now.toDateString();
      if (previewType === 'monthly') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      return false;
    });
  };

  const executePrint = () => {
    const reportData = getFilteredReportData();
    const now = new Date();
    const title = previewType === 'daily' 
      ? `Дневен отчет - ${now.toLocaleDateString('bg-BG')}` 
      : `Месечен отчет - ${now.toLocaleString('bg-BG', { month: 'long', year: 'numeric' })}`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1e293b; }
            .header { border-bottom: 3px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
            th { background: #f8fafc; }
            .status-success { color: #059669; font-weight: bold; }
            .status-issue { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${title}</h2>
            <p>Шофьор: ${driver.name} | Район: ${driver.routeArea || '---'}</p>
          </div>
          <table>
            <thead>
              <tr><th>Дата/Час</th><th>Клиент</th><th>Меню</th><th>Брой</th><th>Статус</th></tr>
            </thead>
            <tbody>
              ${reportData.map(item => `
                <tr>
                  <td>${item.timestamp?.toDate().toLocaleString('bg-BG')}</td>
                  <td>${item.clientName}</td>
                  <td>${item.mealType}</td>
                  <td>${item.mealCount || 1}</td>
                  <td class="${item.status === 'success' ? 'status-success' : 'status-issue'}">${item.status === 'success' ? 'ДОСТАВЕНО' : 'ПРОБЛЕМ'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  if (!isOpen) return null;

  const reportData = previewType ? getFilteredReportData() : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-b p-6 bg-slate-50 gap-4 text-slate-900">
          <div className="flex items-center gap-4">
            {previewType ? (
              <button 
                onClick={() => setPreviewType(null)}
                className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-blue-600" />
              </button>
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                {driver.name.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold">{previewType ? (previewType === 'daily' ? 'Дневен Отчет (Преглед)' : 'Месечен Отчет (Преглед)') : driver.name}</h2>
              <p className="text-xs text-slate-500 font-medium">{driver.routeArea || 'Няма район'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!previewType ? (
              <>
                <button onClick={() => setPreviewType('daily')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                  <FileText className="w-4 h-4 text-blue-600" /> Преглед Дневен
                </button>
                <button onClick={() => setPreviewType('monthly')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                  <FileText className="w-4 h-4 text-blue-600" /> Преглед Месечен
                </button>
              </>
            ) : (
              <button onClick={executePrint} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 px-6 py-2.5 rounded-xl text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                <Printer className="w-4 h-4" /> ГЕНЕРИРАЙ PDF / ПЕЧАТ
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors ml-2">
              <X className="w-6 h-6 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-900">
          {!previewType ? (
            /* ГЛАВЕН ИЗГЛЕД НА ПРОФИЛА */
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Phone className="w-5 h-5 text-blue-600" />
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold">Телефон</p><p className="font-semibold">{driver.phone || 'N/A'}</p></div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold">Имейл</p><p className="font-semibold text-sm">{driver.email}</p></div>
                </div>
              </div>

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

              <div>
                <h3 className="text-md font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-slate-400" /> Последна активност
                </h3>
                {loading ? <div className="text-center py-10">Зареждане...</div> : (
                  <div className="space-y-3">
                    {history.slice(0, 10).map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-xl ${item.status === 'success' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                            {item.status === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{item.clientName || 'Клиент'} — {item.mealType}</p>
                            <p className="text-[11px] text-slate-400">{item.timestamp?.toDate().toLocaleString('bg-BG')}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${item.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {item.status === 'success' ? 'УСПЕХ' : 'ПРОБЛЕМ'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ИЗГЛЕД НА ПРЕГЛЕДА ПРЕДИ ПЕЧАТ */
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-inner">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 font-bold text-slate-700">Дата/Час</th>
                      <th className="px-4 py-3 font-bold text-slate-700">Клиент</th>
                      <th className="px-4 py-3 font-bold text-slate-700 text-center">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {reportData.length > 0 ? reportData.map(item => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-xs">{item.timestamp?.toDate().toLocaleString('bg-BG')}</td>
                        <td className="px-4 py-3 font-medium">{item.clientName || '---'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={item.status === 'success' ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                            {item.status === 'success' ? 'Успех' : 'Проблем'}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} className="px-4 py-10 text-center text-slate-400 italic">Няма данни за избрания период.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}