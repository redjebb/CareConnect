import { useEffect, useMemo, useState } from 'react';
import { ClientHistoryEntry, ClientRegistryEntry } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  entry: ClientRegistryEntry | null;
  history: ClientHistoryEntry[];
  isLoading: boolean;
  errorMessage: string | null;
  onClose: () => void;
}

const extractHistoryDate = (entry: ClientHistoryEntry): Date | null => {
  const serviceDate = entry.serviceDate?.trim();
  if (serviceDate) {
    const parsed = new Date(serviceDate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const lastCheckIn = entry.lastCheckIn?.trim();
  if (lastCheckIn) {
    const isoMatch = lastCheckIn.match(/\d{4}-\d{2}-\d{2}T[^\s]+/);
    const candidate = isoMatch ? isoMatch[0] : lastCheckIn;
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const createdAt = entry.createdAt?.trim();
  if (createdAt) {
    const parsed = new Date(createdAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

const formatHistoryDate = (entry: ClientHistoryEntry) => {
  const date = extractHistoryDate(entry);
  if (!date) {
    return '—';
  }

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

const isDelivered = (entry: ClientHistoryEntry) =>
  Boolean(getSignatureUrl(entry) || entry.lastCheckIn?.trim());

export default function UserProfileModal({
  isOpen,
  entry,
  history,
  isLoading,
  errorMessage,
  onClose
}: UserProfileModalProps) {
  const [signaturePreviewUrl, setSignaturePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSignaturePreviewUrl(null);
    }
  }, [isOpen, entry?.id]);

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      const dateA = extractHistoryDate(a)?.getTime() ?? 0;
      const dateB = extractHistoryDate(b)?.getTime() ?? 0;
      return dateB - dateA;
    });
  }, [history]);

  const totalDeliveredThisMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return sortedHistory.filter(item => {
      const date = extractHistoryDate(item);
      if (!date) {
        return false;
      }
      const isCurrentMonth = date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      return isCurrentMonth && isDelivered(item);
    }).length;
  }, [sortedHistory]);

  if (!isOpen || !entry) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{entry.name}</h2>
            <p className="text-sm text-slate-500">ЕГН: {entry.egn}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Затвори
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-700">Основна информация</h3>
              <dl className="mt-3 space-y-2 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Адрес</dt>
                  <dd className="text-right font-medium text-slate-800">{entry.address}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Телефон</dt>
                  <dd className="text-right font-medium text-slate-800">{entry.phone}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Стандартно меню</dt>
                  <dd className="text-right font-medium text-slate-800">
                    {entry.defaultMealCount}× {entry.defaultMealType}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <h3 className="text-sm font-semibold text-emerald-900">Месечна статистика</h3>
              <p className="mt-2 text-3xl font-semibold text-emerald-700">{totalDeliveredThisMonth}</p>
              <p className="text-sm text-emerald-700">Total deliveries this month</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
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
                      <th className="px-3 py-2 font-medium text-right">Подпис</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedHistory.map(item => {
                      const delivered = isDelivered(item);
                      const signatureUrl = getSignatureUrl(item);
                      return (
                        <tr key={item.id}>
                          <td className="px-3 py-3 text-slate-600">{formatHistoryDate(item)}</td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                                delivered
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  delivered ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                              />
                              {delivered ? 'Delivered' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSignaturePreviewUrl(signatureUrl)}
                              disabled={!signatureUrl}
                              className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              View Signature
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {signaturePreviewUrl ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700">Подпис</h4>
              <button
                type="button"
                onClick={() => setSignaturePreviewUrl(null)}
                className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Затвори
              </button>
            </div>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <img src={signaturePreviewUrl} alt="Подпис" className="w-full rounded-lg" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
