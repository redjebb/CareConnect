import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { X, MapPin, Phone, Mail, Package, AlertTriangle, CheckCircle, FileText, Printer } from 'lucide-react';

interface DriverProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: any;
}

export default function DriverProfileModal({ isOpen, onClose, driver }: DriverProfileModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    dailySuccess: 0,
    dailyIssues: 0,
    monthlySuccess: 0,
    monthlyIssues: 0
  });

  useEffect(() => {
    if (isOpen && driver) {
      fetchDriverHistory();
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

  const handlePrintReport = (type: 'daily' | 'monthly') => {
    const now = new Date();
    const title = type === 'daily' 
      ? `Дневен отчет - ${now.toLocaleDateString('bg-BG')}` 
      : `Месечен отчет - ${now.toLocaleString('bg-BG', { month: 'long', year: 'numeric' })}`;
    
    const reportData = history.filter(item => {
      const date = item.timestamp?.toDate ? item.timestamp.toDate() : new Date();
      if (type === 'daily') return date.toDateString() === now.toDateString();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: "Segoe UI", Tahoma, sans-serif; padding: 40px; color: #1e293b; }
            .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .header-info h1 { color: #2563eb; margin: 0; font-size: 24px; }
            .header-meta { margin-top: 10px; font-size: 14px; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-top: 25px; font-size: 13px; }
            th { background: #f1f5f9; text-align: left; padding: 12px; border: 1px solid #e2e8f0; font-weight: bold; }
            td { padding: 10px; border: 1px solid #e2e8f0; }
            .status-success { color: #059669; font-weight: bold; }
            .status-issue { color: #dc2626; font-weight: bold; }
            .summary { margin-top: 30px; display: grid; grid-template-cols: repeat(2, 1fr); gap: 20px; background: #f8fafc; padding: 20px; border-radius: 8px; }
            .footer { margin-top: 60px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-info">
              <h1>${title}</h1>
              <div class="header-meta">
                <strong>Шофьор:</strong> ${driver.name} <br>
                <strong>Район:</strong> ${driver.routeArea || 'Неопределен'} <br>
                <strong>Имейл:</strong> ${driver.email}
              </div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #64748b;">
              Генерирано на: ${now.toLocaleString('bg-BG')}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Дата/Час</th>
                <th>Клиент</th>
                <th>Меню / Грамаж</th>
                <th>Брой</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.length > 0 ? reportData.map(item => `
                <tr>
                  <td>${item.timestamp?.toDate().toLocaleString('bg-BG')}</td>
                  <td>${item.clientName || '---'}</td>
                  <td>${item.mealType || 'Стандартно'}</td>
                  <td>${item.mealCount || 1}</td>
                  <td class="${item.status === 'success' ? 'status-success' : 'status-issue'}">
                    ${item.status === 'success' ? 'ДОСТАВЕНО' : 'ПРОБЛЕМ'}
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="5" style="text-align:center;">Няма данни за избрания период</td></tr>'}
            </tbody>
          </table>

          <div class="summary">
            <div><strong>Общо успешни доставки:</strong> ${reportData.filter(i => i.status === 'success').length}</div>
            <div><strong>Общо проблемни:</strong> ${reportData.filter(i => i.status !== 'success').length}</div>
          </div>

          <div class="footer">
            CareConnect Logistics System - Официален документ за отчетност
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    // Даваме малко време за зареждане на стиловете преди принтиране
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-b p-6 bg-slate-50 gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {driver.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{driver.name}</h2>
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                <MapPin className="w-3.5 h-3.5" /> {driver.routeArea || 'Няма район'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={() => handlePrintReport('daily')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" /> Дневен отчет
            </button>
            <button 
              onClick={() => handlePrintReport('monthly')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 px-4 py-2.5 rounded-xl text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
            >
              <FileText className="w-4 h-4" /> Месечен отчет
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors ml-2">
              <X className="w-6 h-6 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Контактна информация */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <Phone className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Телефон</p>
                <p className="text-slate-900 font-semibold">{driver.phone || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <Mail className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Имейл</p>
                <p className="text-slate-900 font-semibold text-sm">{driver.email}</p>
              </div>
            </div>
          </div>

          {/* Карти със статистика */}
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

          {/* История на доставките */}
          <div>
            <h3 className="text-md font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-slate-400" /> Последна активност
            </h3>
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-slate-400 border-2 border-dashed rounded-3xl border-slate-100">
                Няма открита история на доставките.
              </div>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 20).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl ${item.status === 'success' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        {item.status === 'success' ? (
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {item.clientName || 'Клиент'} — {item.mealType || 'Меню'}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {item.timestamp?.toDate().toLocaleString('bg-BG')} • {item.mealCount || 1} порции
                        </p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                      item.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {item.status === 'success' ? 'УСПЕХ' : 'ПРОБЛЕМ'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}