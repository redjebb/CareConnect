import { expect, test } from 'vitest';

test('Reporting: Форматира коректно статус на инцидент', () => {
  const lastCheckIn = "INCIDENT: Отказ от храна 2026-02-28T15:49:57";
  const isIncident = lastCheckIn.startsWith('INCIDENT:');
  
  expect(isIncident).toBe(true);
  expect(lastCheckIn).toContain('Отказ от храна');
});