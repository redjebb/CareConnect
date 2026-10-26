import { useEffect, useMemo, useState } from 'react';
import { getDeliveryRecords } from '../services/reportService';
import { getScheduleItems } from '../services/scheduleService';
import { getClients } from '../services/clientService';
import { DeliveryRecord, findMissedVisits, summarizeDeliveries } from '../utils/analytics';
import type { Client, ScheduleItem } from '../types';

const RANGES = [7, 14, 30] as const;

const percent = (value: number) => `${Math.round(value * 100)}%`;

function KpiCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function AnalyticsPanel() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(14);
  const [records, setRecords] = useState<DeliveryRecord[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([getDeliveryRecords(30), getScheduleItems(), getClients()])
      .then(([history, scheduleItems, clientList]) => {
        if (!active) return;
        setRecords(history);
        setSchedule(scheduleItems);
        setClients(clientList);
      })
      .catch(() => active && setError('Неуспешно зареждане на статистиката.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => summarizeDeliveries(records, days), [records, days]);

  const clientNames = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

  const missed = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const inRange = schedule.filter(item => new Date(item.date) >= cutoff);
    return findMissedVisits(inRange, records).sort((a, b) => b.date.localeCompare(a.date));
  }, [schedule, records, days]);

  const maxDaily = Math.max(1, ...summary.daily.map(d => d.delivered + d.issues));

  if (loading) {
    return <p className="p-8 text-center text-sm font-bold text-slate-500">Зареждане на статистиката...</p>;
  }
  if (error) {
    return <p className="rounded-2xl bg-red-50 p-4 text-center text-sm font-bold text-red-600">{error}</p>;
  }

  const chartWidth = 640;
  const chartHeight = 180;
  const barSlot = chartWidth / summary.daily.length;
  const barWidth = Math.max(4, barSlot * 0.6);

  return (
    <section className="space-y-6" aria-label="Аналитика">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-slate-900">Аналитика</h2>
        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1" role="group" aria-label="Период">
          {RANGES.map(range => (
            <button
              key={range}
              type="button"
              onClick={() => setDays(range)}
              aria-pressed={days === range}
              className={`rounded-xl px-4 py-2 text-xs font-black transition-all ${
                days === range ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {range} дни
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Доставки" value={summary.totalDelivered} hint={`${summary.totalMeals} порции`} />
        <KpiCard label="Успеваемост" value={percent(summary.successRate)} hint="доставки без проблем" />
        <KpiCard label="Проблеми / SOS" value={summary.totalIssues} />
        <KpiCard label="Обслужени клиенти" value={summary.uniqueClients} />
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-black text-slate-900">Доставки по дни</h3>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight + 24}`}
          className="mt-3 w-full"
          role="img"
          aria-label="Стълбчата диаграма на доставките по дни"
        >
          {summary.daily.map((day, index) => {
            const x = index * barSlot + (barSlot - barWidth) / 2;
            const deliveredH = (day.delivered / maxDaily) * chartHeight;
            const issuesH = (day.issues / maxDaily) * chartHeight;
            return (
              <g key={day.date}>
                <title>{`${day.date}: ${day.delivered} доставки, ${day.issues} проблема`}</title>
                <rect x={x} y={chartHeight - deliveredH} width={barWidth} height={deliveredH} rx={2} fill="#10b981" />
                <rect x={x} y={chartHeight - deliveredH - issuesH} width={barWidth} height={issuesH} rx={2} fill="#ef4444" />
                {(days <= 14 || index % 5 === 0) && (
                  <text x={x + barWidth / 2} y={chartHeight + 16} textAnchor="middle" fontSize="10" fill="#64748b">
                    {day.date.slice(8)}
                  </text>
                )}
              </g>
            );
          })}
          <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#cbd5e1" />
        </svg>
        <div className="mt-2 flex gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Доставени</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Проблеми</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-black text-slate-900">Шофьори</h3>
          {summary.drivers.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Няма данни за периода.</p>
          ) : (
            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="py-2">Име</th>
                  <th>Доставки</th>
                  <th>Проблеми</th>
                  <th>Успеваемост</th>
                </tr>
              </thead>
              <tbody>
                {summary.drivers.map(driver => (
                  <tr key={driver.driverId} className="border-t border-slate-100">
                    <td className="py-2 font-bold text-slate-800">{driver.driverName}</td>
                    <td>{driver.delivered}</td>
                    <td>{driver.issues}</td>
                    <td>{percent(driver.successRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-black text-slate-900">Най-чести проблеми</h3>
          {summary.topIssues.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Няма докладвани проблеми.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {summary.topIssues.map(issue => (
                <li key={issue.type} className="flex justify-between border-t border-slate-100 pt-2">
                  <span className="font-bold text-slate-800">{issue.type}</span>
                  <span className="text-slate-500">{issue.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="text-sm font-black text-amber-900">Пропуснати посещения ({missed.length})</h3>
        <p className="text-xs text-amber-800">Планирани в минал ден, без доставка и без подаден сигнал.</p>
        {missed.length === 0 ? (
          <p className="mt-3 text-sm text-amber-900">Няма пропуснати посещения. 🎉</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm text-amber-900">
            {missed.slice(0, 10).map(item => (
              <li key={item.id} className="flex justify-between">
                <span className="font-bold">{clientNames.get(item.clientId) ?? 'Изтрит клиент'}</span>
                <span>{new Date(item.date).toLocaleDateString('bg-BG')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
