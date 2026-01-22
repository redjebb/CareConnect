import { useMemo, useState } from 'react';
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

type MonthlyDelivery = {
  date: string;
  time: string;
};

const extractHistoryDate = (entry: ClientHistoryEntry): Date | null => {
  const serviceDate = entry.serviceDate?.trim();
  if (serviceDate) {
    const parsed = new Date(serviceDate);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const lastCheckIn = entry.lastCheckIn?.trim();
  if (lastCheckIn) {
    const isoMatch = lastCheckIn.match(/\d{4}-\d{2}-\d{2}T[^\s]+/);
    const candidate = isoMatch ? isoMatch[0] : lastCheckIn;
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const createdAt = entry.createdAt?.trim();
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
  entry.clientSignature ?? entry.lastSignature ?? entry.driverSignature ?? null;

const isDelivered = (entry: ClientHistoryEntry) => Boolean(getSignatureUrl(entry) || entry.lastCheckIn?.trim());

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

  const safeHistory = Array.isArray(history) ? history : [];

  // State
  const [reportDate, setReportDate] = useState(new Date());
  const [monthlyDeliveries, setMonthlyDeliveries] = useState<MonthlyDelivery[]>([]); // ✅ always []
  const [reportLoading, setReportLoading] = useState(false);

  // Timestamp-safe date extraction (Firestore Timestamp, {seconds}, Date/string/number)
  const getHistoryTimestampDate = (item: any): Date | null => {
    const ts = item?.timestamp;
    if (!ts) return null;
    if (typeof ts?.toDate === 'function') {
      const d = ts.toDate();
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof ts?.seconds === 'number') {
      const d = new Date(ts.seconds * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (ts instanceof Date || typeof ts === 'string' || typeof ts === 'number') {
      const d = new Date(ts);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const sortedHistory = useMemo(() => {
    return [...safeHistory].sort((a, b) => {
      const dateA = (getHistoryTimestampDate(a) ?? extractHistoryDate(a))?.getTime() ?? 0;
      const dateB = (getHistoryTimestampDate(b) ?? extractHistoryDate(b))?.getTime() ?? 0;
      return dateB - dateA;
    });
  }, [safeHistory]); // getHistoryTimestampDate is defined in-component; safe for this use

  const reportPeriodLabel = useMemo(() => {
    try {
      return reportDate.toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' });
    } catch {
      return '';
    }
  }, [reportDate]);

  // If report has data, use it; otherwise fall back to history (requested)
  const displayHistory = useMemo(() => {
    return monthlyDeliveries.length > 0 ? monthlyDeliveries : safeHistory;
  }, [monthlyDeliveries, safeHistory]);

  // Sum up portions from displayHistory; fallback to 1 if mealCount missing (so it won't show 0)
  const deliveredPortionsThisMonth = useMemo(() => {
    return displayHistory.reduce((sum, item: any) => {
      const n = Number(item?.mealCount);
      if (Number.isFinite(n) && n > 0) return sum + n;
      // monthlyDeliveries rows don't include mealCount -> treat each row as 1 portion by default
      return sum + 1;
    }, 0);
  }, [displayHistory]);

  const handleGenerateReport = async () => {
    const safeReportDate =
      reportDate instanceof Date && !Number.isNaN(reportDate.getTime()) ? reportDate : new Date();

    // Full-month range (00:00:00.000 -> 23:59:59.999)
    const startOfMonth = new Date(
      safeReportDate.getFullYear(),
      safeReportDate.getMonth(),
      1,
      0,
      0,
      0,
      0
    );
    const endOfMonth = new Date(
      safeReportDate.getFullYear(),
      safeReportDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    console.log('Fetching for ID:', entry.id, 'Date:', safeReportDate, 'Range:', startOfMonth, endOfMonth);

    try {
      setReportLoading(true);

      // Pass range; if the service only accepts (id, date), extra args are ignored at runtime.
      const data = await (getClientMonthlyReport as any)(entry.id, startOfMonth, endOfMonth);

      const deliveriesRaw: any[] = Array.isArray((data as any)?.deliveries)
        ? (data as any).deliveries
        : Array.isArray(data)
          ? (data as any)
          : [];

      if (!deliveriesRaw.length) {
        setMonthlyDeliveries([]);
        console.log('monthlyDeliveries: [] (no rows from service)', { data });
        alert('Няма данни за избрания период');
        return;
      }

      const normalized: MonthlyDelivery[] = deliveriesRaw.map((row: any) => {
        const deliveredAt = row?.deliveredAt ? new Date(row.deliveredAt) : null;
        const date =
          (row?.date as string | undefined) ??
          (deliveredAt && !Number.isNaN(deliveredAt.getTime())
            ? deliveredAt.toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '—');
        const time =
          (row?.time as string | undefined) ??
          (deliveredAt && !Number.isNaN(deliveredAt.getTime())
            ? deliveredAt.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })
            : '—');
        return { date, time };
      });

      console.log('monthlyDeliveries:', normalized);
      setMonthlyDeliveries(normalized);
      queueMicrotask(() => window.print());
    } catch (err) {
      console.error(err);
      setMonthlyDeliveries([]);
      alert('Няма данни за избрания период');
    } finally {
      setReportLoading(false);
    }
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

        {/* History Section */}
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">История на доставките</h3>
            {isLoading ? <span className="text-xs text-slate-500">Зареждане...</span> : null}
          </div>

          {errorMessage ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{errorMessage}</p>
          ) : null}

          {isLoading ? (
            <p className="mt-4 text-sm text-slate-500">Зареждане на история...</p>
          ) : sortedHistory.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Няма намерена история за този клиент.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2 font-medium">Дата</th>
                    <th className="px-3 py-2 font-medium">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedHistory.map(item => {
                    const delivered = isDelivered(item);
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-3 text-slate-600">
                          {(() => {
                            const ts = (item as any).timestamp;
                            if (!ts) return '-';
                            const d = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
                            return isNaN(d.getTime())
                              ? '-'
                              : d.toLocaleDateString('bg-BG') +
                                  ' ' +
                                  d.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' });
                          })()}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                              delivered ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${delivered ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            />
                            {delivered ? 'Delivered' : 'Pending'}
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
                      // ✅ if empty, default to current month
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
                  {reportLoading ? 'Генериране...' : 'Генерирай месечен отчет'}
                </button>
              </div>
            </div>
          </div>

          {/* ✅ Print Content: Name/EGN/Address + Date/Time table only (no km) */}
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
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 14, fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #e2e8f0', padding: 8, background: '#f8fafc', textAlign: 'left' }}>
                    Дата
                  </th>
                  <th style={{ border: '1px solid #e2e8f0', padding: 8, background: '#f8fafc', textAlign: 'left' }}>
                    Час
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyDeliveries.map((d, idx) => (
                  <tr key={`${d.date}-${d.time}-${idx}`}>
                    <td style={{ border: '1px solid #e2e8f0', padding: 8 }}>{d.date}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: 8 }}>{d.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ...existing code... */}
      </div>
    </div>
  );
}
