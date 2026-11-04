import { describe, expect, test, vi } from 'vitest';
import { commitWithOfflineGrace } from './offline';
import { optimizeStops, pathLengthKm } from './route';
import { findMissedVisits, summarizeDeliveries } from './analytics';

describe('commitWithOfflineGrace', () => {
  test('reports synced when the server confirms quickly', async () => {
    await expect(commitWithOfflineGrace(Promise.resolve('ok'), { graceMs: 50 })).resolves.toBe('synced');
  });

  test('reports queued when confirmation never arrives (offline)', async () => {
    const never = new Promise(() => undefined);
    await expect(commitWithOfflineGrace(never, { graceMs: 20 })).resolves.toBe('queued');
  });

  test('propagates a rejection that happens before the grace period', async () => {
    await expect(
      commitWithOfflineGrace(Promise.reject(new Error('permission-denied')), { graceMs: 50 })
    ).rejects.toThrow('permission-denied');
  });

  test('late rejection of a queued write is reported, not thrown', async () => {
    const onLateError = vi.fn();
    const late = new Promise((_, reject) => setTimeout(() => reject(new Error('late')), 40));
    await expect(commitWithOfflineGrace(late, { graceMs: 10, onLateError })).resolves.toBe('queued');
    await new Promise(r => setTimeout(r, 60));
    expect(onLateError).toHaveBeenCalledTimes(1);
  });
});

describe('optimizeStops', () => {
  const origin = { lat: 42.6977, lng: 23.3219 };
  const stop = (name: string, lat: number, lng: number) => ({ item: name, coords: { lat, lng } });

  test('visits nearest stops first instead of the planned order', () => {
    const stops = [stop('far', 42.9, 23.9), stop('near', 42.7, 23.33), stop('mid', 42.75, 23.5)];
    expect(optimizeStops(origin, stops)).toEqual(['near', 'mid', 'far']);
  });

  test('never makes the route longer than the original order', () => {
    const stops = [
      stop('a', 42.9, 23.1),
      stop('b', 42.5, 23.6),
      stop('c', 42.8, 23.2),
      stop('d', 42.6, 23.5),
      stop('e', 42.7, 23.4)
    ];
    const lengthOf = (names: string[]) =>
      pathLengthKm(origin, names.map(n => stops.find(s => s.item === n)!.coords));
    const optimized = optimizeStops(origin, stops);
    expect(lengthOf(optimized)).toBeLessThanOrEqual(lengthOf(stops.map(s => s.item)));
    expect([...optimized].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  test('keeps stops without coordinates at the end', () => {
    const stops = [{ item: 'unknown' }, stop('x', 42.7, 23.3)];
    expect(optimizeStops(origin, stops)).toEqual(['x', 'unknown']);
  });

  test('handles empty input and works without a start position', () => {
    expect(optimizeStops(null, [])).toEqual([]);
    expect(optimizeStops(null, [stop('only', 1, 1)])).toEqual(['only']);
  });
});

describe('summarizeDeliveries', () => {
  const today = new Date(2026, 9, 26, 12);
  const at = (day: number) => new Date(2026, 9, day, 9);

  test('counts deliveries, meals, issues and success rate', () => {
    const summary = summarizeDeliveries(
      [
        { driverId: 'd1', driverName: 'Иван', status: 'success', mealCount: 2, egn: '1', timestamp: at(26) },
        { driverId: 'd1', driverName: 'Иван', status: 'success', mealCount: 1, egn: '2', timestamp: at(25) },
        { driverId: 'd2', driverName: 'Мария', status: 'issue', issueType: 'Липсва', egn: '3', timestamp: at(26) },
        { driverId: 'd2', status: 'success', egn: '1', timestamp: new Date(2026, 8, 1) }
      ],
      7,
      today
    );
    expect(summary.totalDelivered).toBe(2);
    expect(summary.totalMeals).toBe(3);
    expect(summary.totalIssues).toBe(1);
    expect(summary.successRate).toBeCloseTo(2 / 3);
    expect(summary.uniqueClients).toBe(3);
    expect(summary.daily).toHaveLength(7);
    expect(summary.daily[6]).toMatchObject({ date: '2026-10-26', delivered: 1, issues: 1 });
    expect(summary.topIssues[0]).toEqual({ type: 'Липсва', count: 1 });
    expect(summary.drivers[0].driverName).toBe('Иван');
  });

  test('empty history yields zeros, not NaN', () => {
    const summary = summarizeDeliveries([], 3, today);
    expect(summary.successRate).toBe(0);
    expect(summary.daily.every(d => d.delivered === 0)).toBe(true);
  });
});

describe('findMissedVisits', () => {
  test('flags past visits with no delivery record only', () => {
    const planned = [
      { clientId: 'c1', date: '2026-10-24T08:00:00' },
      { clientId: 'c2', date: '2026-10-24T08:00:00' },
      { clientId: 'c3', date: '2026-10-26T08:00:00' }
    ];
    const records = [{ clientId: 'c1', timestamp: new Date(2026, 9, 24, 10) }];
    const missed = findMissedVisits(planned, records, new Date(2026, 9, 26, 12));
    expect(missed.map(m => m.clientId)).toEqual(['c2']);
  });
});
