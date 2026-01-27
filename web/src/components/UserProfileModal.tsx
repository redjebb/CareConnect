import { useEffect, useMemo, useState } from 'react';
import type { ClientHistoryEntry, ClientRegistryEntry } from '../types';
import { getClientMonthlyReport } from '../services/reportService';

interface UserProfileModalProps {
  isOpen: boolean;
  entry: ClientRegistryEntry | null;
  history: ClientHistoryEntry[];
  isLoading: boolean;
  errorMessage: string | null;
  onClose: () => void;
}

type MonthlyDeliveryData = {
  id: string;
  date: string;
  time: string;
  mealType: string;
  mealCount: number;
  status: string;
};

const getSafeDate = (val: any): Date | null => {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate(); // Firebase Timestamp
  if (typeof val.seconds === 'number') return new Date(val.seconds * 1000); // Serialized Timestamp
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const extractHistoryDate = (entry: ClientHistoryEntry): Date | null => {
  const serviceDate = entry?.serviceDate?.trim();
  if (serviceDate) {
    const parsed = new Date(serviceDate);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const lastCheckIn = entry?.lastCheckIn?.trim();
  if (lastCheckIn) {
    const isoMatch = lastCheckIn.match(/\d{4}-\d{2}-\d{2}T[^\s]+/);
    const candidate = isoMatch ? isoMatch[0] : lastCheckIn;
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const createdAt = entry?.createdAt?.trim();
  if (createdAt) {
    const parsed = new Date(createdAt);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
};

const formatHistoryDate = (entry: ClientHistoryEntry) => {
  const date = extractHistoryDate(entry);
  if (!date) return '—';

  return date.toLocaleString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getSignatureUrl = (entry: ClientHistoryEntry) =>
  entry?.clientSignature ?? entry?.lastSignature ?? entry?.driverSignature ?? null;

const isDelivered = (entry: ClientHistoryEntry) => Boolean(getSignatureUrl(entry) || entry?.lastCheckIn?.trim());

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

const isSameMonth = (date: Date, monthDate: Date) =>
  date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth();

const sumMealCountFromHistory = (items: ClientHistoryEntry[]) => {
  return items.reduce((sum, item) => {
    const n = Number((item as any)?.mealCount);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
};

export default function UserProfileModal({
  isOpen,
  entry,
  history = [],
  isLoading,
  errorMessage,
  onClose
}: UserProfileModalProps) {
  // Guard
  if (!isOpen || !entry) return null;

  // State
  const [reportDate, setReportDate] = useState(new Date());
  const [currentMonthData, setCurrentMonthData] = useState<MonthlyDeliveryData[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  // Auto-fetch deliveries when month or EGN changes
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

        // Map results into clean format
        const normalized: MonthlyDeliveryData[] = deliveriesRaw.map((row: any, index: number) => {
          const d = getSafeDate(row?.timestamp);
          return {
            id: row?.id || `delivery-${index}`,
            date: d ? d.toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-',
            time: d ? d.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' }) : '-',
            mealType: row?.mealType || '—',
            mealCount: Number(row?.mealCount) || 1,
            status: row?.status || 'success'
          };
        });

        setCurrentMonthData(normalized);
      } catch (err) {
        console.error('Error fetching monthly deliveries:', err);
        if (!isCancelled) {
          setCurrentMonthData([]);
        }
      } finally {
        if (!isCancelled) {
          setReportLoading(false);
        }
      }
    };

    void fetchDeliveries();

    return () => {
      isCancelled = true;
    };
  }, [reportDate, entry?.egn]);

  const reportPeriodLabel = useMemo(() => {
    try {
      return reportDate.toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' });
    } catch {
      return '';
    }
  }, [reportDate]);

  // Calculate portions from currentMonthData only
  const deliveredPortionsThisMonth = useMemo(() => {
    if (currentMonthData.length === 0) return 0;
    return currentMonthData.reduce((sum, item) => {
      const n = Number(item?.mealCount);
      return sum + (Number.isFinite(n) && n > 0 ? n : 1);
    }, 0);
  }, [currentMonthData]);

  const handleGenerateReport = async () => {
    if (currentMonthData.length === 0) {
      alert('Няма данни за избрания период');
      return;
    }

    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
        {/* Print-only CSS + template visibility */}
        <style>{`
          @media screen {
            #printable-report { display: none; }
          }
          @media print {
            body * { visibility: hidden; }
            #printable-report, #printable-report * { visibility: visible; }
            #printable-report { display: block; position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
          }
        `}</style>

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{entry?.name ?? 'Профил'}</h2>
            <p className="text-sm text-slate-500">ЕГН: {entry?.egn ?? '—'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Затвори
          </button>
        </div>

        {/* Green Summary Section */}
        <div className="px-6 pt-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-xs font-semibold text-emerald-800">Общо доставени порции за месеца</div>
            <div className="mt-2 text-3xl font-semibold text-emerald-700">{deliveredPortionsThisMonth}</div>
            <div className="mt-1 text-xs text-emerald-700">Период: {reportPeriodLabel}</div>
          </div>
        </div>

        {/* History Section - uses currentMonthData only */}
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">История на доставките</h3>
            {reportLoading ? <span className="text-xs text-slate-500">Зареждане...</span> : null}
          </div>

          {errorMessage ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{errorMessage}</p>
          ) : null}

          {reportLoading ? (
            <p className="mt-4 text-sm text-slate-500">Зареждане на история...</p>
          ) : currentMonthData.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Няма намерена история за този клиент за избрания месец.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2 font-medium">Дата</th>
                    <th className="px-3 py-2 font-medium">Час</th>
                    <th className="px-3 py-2 font-medium">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentMonthData.map((item, index) => {
                    const delivered = item.status === 'success';
                    return (
                      <tr key={item.id || `row-${index}`}>
                        <td className="px-3 py-3 text-slate-600">{item.date}</td>
                        <td className="px-3 py-3 text-slate-600">{item.time}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                              delivered ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${delivered ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            />
                            {delivered ? 'Доставено' : 'Предстои'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Report Section */}
        <div className="px-6 pb-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-800">Месечен отчет</div>
                <div className="mt-1 text-xs text-slate-500">Изберете месец и генерирайте отчет за печат.</div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="text-xs font-semibold text-slate-600">
                  Месец
                  <input
                    type="month"
                    value={monthInputValueFromDate(reportDate)}
                    onChange={e => {
                      const raw = e.target.value;
                      setReportDate(raw ? dateFromMonthInputValue(raw) : new Date());
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void handleGenerateReport()}
                  disabled={reportLoading}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-60"
                >
                  {reportLoading ? 'Зареждане...' : 'Генерирай месечен отчет'}
                </button>
              </div>
            </div>
          </div>

          {/* Print Content */}
          <div id="printable-report">
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.5 }}>
              МЕСЕЧЕН ОТЧЕТ ЗА ДОСТАВКА НА ХРАНА
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: '#475569' }}>
              CareConnect • Период: {reportPeriodLabel}
            </div>

            <div style={{ marginTop: 14, fontSize: 12 }}>
              <div><strong>Клиент:</strong> {entry?.name ?? ''}</div>
              <div><strong>ЕГН:</strong> {entry?.egn ?? ''}</div>
              <div><strong>Адрес:</strong> {entry?.address ?? ''}</div>
              <div><strong>Месец:</strong> {reportPeriodLabel}</div>
              <div style={{ marginTop: 8 }}><strong>Общ брой доставки за месеца:</strong> {currentMonthData.length}</div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 14, fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #e2e8f0', padding: 8, background: '#f8fafc', textAlign: 'left' }}>Дата</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: 8, background: '#f8fafc', textAlign: 'left' }}>Час</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: 8, background: '#f8fafc', textAlign: 'left' }}>Меню</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: 8, background: '#f8fafc', textAlign: 'left' }}>Брой</th>
                </tr>
              </thead>
              <tbody>
                {currentMonthData.map((d, idx) => (
                  <tr key={d.id || `print-${idx}`}>
                    <td style={{ border: '1px solid #e2e8f0', padding: 8 }}>{d.date}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: 8 }}>{d.time}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: 8 }}>{d.mealType}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: 8 }}>{d.mealCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
