export interface DeliveryRecord {
  clientId?: string;
  egn?: string;
  driverId?: string;
  driverName?: string;
  status?: 'success' | 'issue' | string;
  mealCount?: number;
  issueType?: string;
  timestamp: Date;
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD (local)
  delivered: number;
  issues: number;
  meals: number;
}

export interface DriverPerformance {
  driverId: string;
  driverName: string;
  delivered: number;
  issues: number;
  successRate: number; // 0..1
}

export interface AnalyticsSummary {
  totalDelivered: number;
  totalIssues: number;
  totalMeals: number;
  successRate: number;
  uniqueClients: number;
  daily: DailyPoint[];
  drivers: DriverPerformance[];
  topIssues: { type: string; count: number }[];
}

export const toLocalDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Builds every statistic shown on the analytics panel from raw delivery
// history; `days` zero-filled buckets make the chart continuous.
export function summarizeDeliveries(records: DeliveryRecord[], days: number, today = new Date()): AnalyticsSummary {
  const buckets = new Map<string, DailyPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = toLocalDateKey(d);
    buckets.set(key, { date: key, delivered: 0, issues: 0, meals: 0 });
  }

  const drivers = new Map<string, DriverPerformance>();
  const issueTypes = new Map<string, number>();
  const clients = new Set<string>();
  let totalDelivered = 0;
  let totalIssues = 0;
  let totalMeals = 0;

  for (const record of records) {
    const bucket = buckets.get(toLocalDateKey(record.timestamp));
    if (!bucket) continue;

    const isIssue = record.status === 'issue';
    const key = record.driverId ?? 'unknown';
    const driver =
      drivers.get(key) ??
      { driverId: key, driverName: record.driverName || 'Неизвестен', delivered: 0, issues: 0, successRate: 0 };

    if (isIssue) {
      bucket.issues++;
      driver.issues++;
      totalIssues++;
      const type = record.issueType || 'Друго';
      issueTypes.set(type, (issueTypes.get(type) ?? 0) + 1);
    } else {
      const meals = Number(record.mealCount) || 1;
      bucket.delivered++;
      bucket.meals += meals;
      driver.delivered++;
      totalDelivered++;
      totalMeals += meals;
    }

    const clientKey = record.egn && record.egn !== 'N/A' ? record.egn : record.clientId;
    if (clientKey) clients.add(clientKey);
    drivers.set(key, driver);
  }

  const driverList = [...drivers.values()]
    .map(d => ({ ...d, successRate: d.delivered + d.issues === 0 ? 0 : d.delivered / (d.delivered + d.issues) }))
    .sort((a, b) => b.delivered - a.delivered);

  const total = totalDelivered + totalIssues;
  return {
    totalDelivered,
    totalIssues,
    totalMeals,
    successRate: total === 0 ? 0 : totalDelivered / total,
    uniqueClients: clients.size,
    daily: [...buckets.values()],
    drivers: driverList,
    topIssues: [...issueTypes.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  };
}

// Visits that were planned for a past day but have no delivery or issue record.
export function findMissedVisits<T extends { clientId: string; date: string }>(
  planned: T[],
  records: Pick<DeliveryRecord, 'clientId' | 'timestamp'>[],
  now = new Date()
): T[] {
  const done = new Set(records.map(r => `${r.clientId}|${toLocalDateKey(r.timestamp)}`));
  const todayKey = toLocalDateKey(now);
  return planned.filter(visit => {
    const visitDate = new Date(visit.date);
    if (Number.isNaN(visitDate.getTime())) return false;
    const key = toLocalDateKey(visitDate);
    return key < todayKey && !done.has(`${visit.clientId}|${key}`);
  });
}
