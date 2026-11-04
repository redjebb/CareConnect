import { describe, expect, test } from 'vitest';
import { formatDuration, isAfterTomorrow, isSameDay, isTomorrow } from './dates';

describe('date helpers', () => {
  const now = new Date();
  const plusDays = (n: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + n, 15, 30);

  test('isSameDay ignores the time of day', () => {
    expect(isSameDay(new Date(2026, 9, 26, 1), new Date(2026, 9, 26, 23))).toBe(true);
    expect(isSameDay(new Date(2026, 9, 26), new Date(2026, 9, 27))).toBe(false);
  });

  test('classifies tomorrow and later days', () => {
    expect(isTomorrow(plusDays(1))).toBe(true);
    expect(isTomorrow(plusDays(2))).toBe(false);
    expect(isAfterTomorrow(plusDays(2))).toBe(true);
    expect(isAfterTomorrow(plusDays(1))).toBe(false);
  });

  test('formats shift duration in hours and minutes', () => {
    const start = new Date(Date.now() - (2 * 60 + 5) * 60 * 1000).toISOString();
    expect(formatDuration(start)).toBe('2ч 5мин');
  });
});
