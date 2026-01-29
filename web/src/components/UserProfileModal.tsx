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
  hasIssue?: boolean;
  completed?: boolean;
  issueType?: string;
  issueDescription?: string;
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

  const createdAt = (entry as any)?.createdAt?.trim();
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
  entry?.clientSignature ?? entry?.driverSignature ?? null;

const isDelivered = (entry: ClientHistoryEntry) => Boolean(getSignatureUrl(entry));

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

        // Map results into clean format with proper status fields
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

  // Helper function to determine delivery status with priority
  const getDeliveryStatus = (item: MonthlyDeliveryData): { 
    type: 'issue' | 'success' | 'pending'; 
    label: string; 
    className: string;
    emoji: string;
  } => {
    // Priority 1: Check for issue status
    if (item.status === 'issue' || item.hasIssue === true) {
      return {
        type: 'issue',
        label: 'ПРОБЛЕМ',
        className: 'bg-red-100 text-red-700 ring-1 ring-red-200',
        emoji: '🔴'
      };
    }
    
    // Priority 2: Check for success/completed status
    if (item.status === 'success' || item.completed === true) {
      return {
        type: 'success',
        label: 'ДОСТАВЕНО',
        className: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
        emoji: '✅'
      };
    }
    
    // Default: Pending
    return {
      type: 'pending',
      label: 'ПРЕДСТОИ',
      className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
      emoji: '⏳'
    };
  };

  const reportPeriodLabel = useMemo(() => {
    try {
      return reportDate.toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' });
    } catch {
      return '';
    }
  }, [reportDate]);

  // Count total deliveries for the period
  const totalDeliveriesCount = currentMonthData.length;

  // Count successful deliveries (for display)
  const successfulDeliveriesCount = useMemo(() => {
    return currentMonthData.filter(item => {
      const isIssue = item.status === 'issue' || item.hasIssue === true;
      const isSuccess = item.status === 'success' || item.completed === true;
      return isSuccess && !isIssue;
    }).length;
  }, [currentMonthData]);

  // Count issues (for display)
  const issuesCount = useMemo(() => {
    return currentMonthData.filter(item => 
      item.status === 'issue' || item.hasIssue === true
    ).length;
  }, [currentMonthData]);

  // Calculate portions from ONLY successful deliveries - exclude issues
  const deliveredPortionsThisMonth = useMemo(() => {
    if (currentMonthData.length === 0) return 0;
    
    return currentMonthData
      .filter(item => {
        const isIssue = item.status === 'issue' || item.hasIssue === true;
        const isSuccess = item.status === 'success' || item.completed === true;
        return isSuccess && !isIssue;
      })
      .reduce((sum, item) => {
        const n = Number(item?.mealCount);
        return sum + (Number.isFinite(n) && n > 0 ? n : 1);
      }, 0);
  }, [currentMonthData]);

  // Helper to check if delivery is an issue
  const isDeliveryIssue = (item: MonthlyDeliveryData): boolean => {
    return item.status === 'issue' || item.hasIssue === true;
  };

  // Helper to get print status text
  const getPrintStatusText = (item: MonthlyDeliveryData): string => {
    if (isDeliveryIssue(item)) return '* ПРОБЛЕМ';
    if (item.status === 'success' || item.completed === true) return 'Доставено';
    return 'Предстои';
  };

  // Helper to get portion count for print (0 for issues)
  const getPrintPortionCount = (item: MonthlyDeliveryData): number => {
    if (isDeliveryIssue(item)) return 0;
    return Number(item.mealCount) || 1;
  };

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
      <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
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

        {/* Statistics Cards */}
        <div className="px-6 pt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-xs font-semibold text-emerald-800">Успешни доставки</div>
            <div className="mt-2 text-3xl font-bold text-emerald-700">{successfulDeliveriesCount}</div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="text-xs font-semibold text-blue-800">Общо порции</div>
            <div className="mt-2 text-3xl font-bold text-blue-700">{deliveredPortionsThisMonth}</div>
            <div className="mt-1 text-xs text-blue-600">Период: {reportPeriodLabel}</div>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="text-xs font-semibold text-red-800">Проблеми</div>
            <div className="mt-2 text-3xl font-bold text-red-700">{issuesCount}</div>
          </div>
        </div>

        {/* History Section */}
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
            <div className="mt-4 space-y-3">
              {currentMonthData.map((item, index) => {
                const deliveryStatus = getDeliveryStatus(item);
                const isIssue = deliveryStatus.type === 'issue';
                
                return (
                  <div 
                    key={item.id || `row-${index}`}
                    className={`rounded-lg border p-4 ${
                      isIssue 
                        ? 'border-red-200 bg-red-50/50' 
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-700">
                          {item.date}
                        </span>
                        <span className="text-sm text-slate-500">
                          {item.time}
                        </span>
                      </div>
                      
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${deliveryStatus.className}`}>
                        <span>{deliveryStatus.emoji}</span>
                        {deliveryStatus.label}
                      </span>
                    </div>

                    {/* Meal info for successful deliveries */}
                    {deliveryStatus.type === 'success' && item.mealType && item.mealType !== '—' && (
                      <div className="mt-2 text-sm text-slate-600">
                        {item.mealCount}× {item.mealType}
                      </div>
                    )}

                    {/* Issue details - show reason in red text below badge */}
                    {isIssue && (item.issueType || item.issueDescription) && (
                      <div className="mt-2 rounded-md bg-red-100/50 p-2">
                        {item.issueType && (
                          <p className="text-xs font-semibold text-red-700">
                            Тип: {item.issueType}
                          </p>
                        )}
                        {item.issueDescription && (
                          <p className="mt-1 text-xs text-red-600">
                            {item.issueDescription}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
            </div>

            {/* Summary Section */}
            <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4 }}>
              <div style={{ fontSize: 12 }}>
                <div><strong>Общо записи за периода:</strong> {totalDeliveriesCount}</div>
                <div style={{ color: '#059669', marginTop: 4 }}>
                  <strong>✓ Успешно доставени:</strong> {successfulDeliveriesCount}
                </div>
                <div style={{ color: '#059669' }}>
                  <strong>✓ Общо доставени порции:</strong> {deliveredPortionsThisMonth}
                </div>
                {issuesCount > 0 && (
                  <div style={{ color: '#dc2626', marginTop: 4 }}>
                    <strong>✗ Пропуснати/Проблемни:</strong> {issuesCount}
                  </div>
                )}
              </div>
            </div>

            {/* Simplified Table - Only Date, Status, Portions */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 14, fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #e2e8f0', padding: 10, background: '#f8fafc', textAlign: 'left', width: '40%' }}>Дата</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: 10, background: '#f8fafc', textAlign: 'center', width: '35%' }}>Статус</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: 10, background: '#f8fafc', textAlign: 'center', width: '25%' }}>Брой порции</th>
                </tr>
              </thead>
              <tbody>
                {currentMonthData.map((d, idx) => {
                  const isIssue = isDeliveryIssue(d);
                  const rowBackground = isIssue ? '#fef2f2' : 'transparent';
                  const portionCount = getPrintPortionCount(d);
                  const statusText = isIssue ? '* ПРОБЛЕМ' : 'ДОСТАВЕНО';
                  
                  return (
                    <tr key={d.id || `print-${idx}`} style={{ background: rowBackground }}>
                      <td style={{ border: '1px solid #e2e8f0', padding: 10 }}>
                        {d.date}
                      </td>
                      <td style={{ 
                        border: '1px solid #e2e8f0', 
                        padding: 10,
                        textAlign: 'center',
                        color: isIssue ? '#dc2626' : '#059669',
                        fontWeight: 'bold'
                      }}>
                        {statusText}
                      </td>
                      <td style={{ 
                        border: '1px solid #e2e8f0', 
                        padding: 10,
                        textAlign: 'center',
                        color: isIssue ? '#dc2626' : 'inherit',
                        fontWeight: isIssue ? 'bold' : 'normal'
                      }}>
                        {portionCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Total Row */}
              <tfoot>
                <tr style={{ background: '#f1f5f9' }}>
                  <td style={{ border: '1px solid #e2e8f0', padding: 10, fontWeight: 'bold' }} colSpan={2}>
                    ОБЩО ДОСТАВЕНИ ПОРЦИИ:
                  </td>
                  <td style={{ 
                    border: '1px solid #e2e8f0', 
                    padding: 10, 
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#059669',
                    fontSize: 14
                  }}>
                    {deliveredPortionsThisMonth}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Footer note for issues */}
            {issuesCount > 0 && (
              <div style={{ marginTop: 12, fontSize: 10, color: '#64748b' }}>
                * Редовете маркирани с ПРОБЛЕМ не са включени в общия брой доставени порции.
              </div>
            )}

            {/* Signature line */}
            <div style={{ marginTop: 32, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
              <div>
              </div>
              <div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
