import { describe, expect, test } from 'vitest';
import { haversineKm } from './geo';
import {
  clampNote,
  hasValidEgnChecksum,
  isValidEgn,
  isValidEmail,
  isValidPhone,
  normalizeEmail
} from './validation';
import { resolveSosRecipient } from './sos';

describe('haversineKm', () => {
  test('Sofia to Plovdiv is about 130-140 km', () => {
    const km = haversineKm({ lat: 42.6977, lng: 23.3219 }, { lat: 42.1354, lng: 24.7453 });
    expect(km).toBeGreaterThan(130);
    expect(km).toBeLessThan(140);
  });

  test('distance to the same point is zero and symmetric', () => {
    const a = { lat: 43.2141, lng: 27.9147 };
    const b = { lat: 42.5048, lng: 27.4626 };
    expect(haversineKm(a, a)).toBe(0);
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 9);
  });
});

describe('validation', () => {
  test('EGN must be exactly ten digits', () => {
    expect(isValidEgn('7523169263')).toBe(true);
    expect(isValidEgn(' 7523169263 ')).toBe(true);
    expect(isValidEgn('752316926')).toBe(false);
    expect(isValidEgn('75231692AB')).toBe(false);
  });

  test('EGN checksum accepts a real-format number and rejects tampering', () => {
    expect(hasValidEgnChecksum('7523169263')).toBe(true);
    expect(hasValidEgnChecksum('7523169264')).toBe(false);
    expect(hasValidEgnChecksum('1111111111')).toBe(false);
  });

  test('EGN checksum rejects impossible dates', () => {
    expect(hasValidEgnChecksum('7502309263')).toBe(false);
  });

  test('phone accepts separators but needs ten digits', () => {
    expect(isValidPhone('0888 123-456')).toBe(true);
    expect(isValidPhone('088812345')).toBe(false);
  });

  test('e-mail format and normalisation', () => {
    expect(isValidEmail('driver@careconnect.bg')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(normalizeEmail('  Driver@CareConnect.BG ')).toBe('driver@careconnect.bg');
  });

  test('notes are trimmed and capped', () => {
    expect(clampNote('  етаж 3  ', 500)).toBe('етаж 3');
    expect(clampNote('x'.repeat(600), 500)).toHaveLength(500);
  });
});

describe('resolveSosRecipient', () => {
  const schedule = [
    { clientId: 'c1', driverId: 'd1', assignedByAdminEmail: 'a@x.bg' },
    { clientId: 'c2', driverId: 'd1', assignedByAdminEmail: 'b@x.bg' },
    { clientId: 'c3', driverId: 'd1', assignedByAdminEmail: '  ' }
  ];

  test('routes the alert to the dispatcher who planned that visit', () => {
    expect(resolveSosRecipient(schedule, 'c1', 'd1')).toBe('a@x.bg');
    expect(resolveSosRecipient(schedule, 'c2', 'd1')).toBe('b@x.bg');
  });

  test('returns null when nobody can be notified', () => {
    expect(resolveSosRecipient(schedule, 'c3', 'd1')).toBeNull();
    expect(resolveSosRecipient(schedule, 'c1', 'other-driver')).toBeNull();
  });
});
